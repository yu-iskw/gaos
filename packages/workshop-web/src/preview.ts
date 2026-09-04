import capnwebSrc from 'capnweb?raw';

const CSP =
  "default-src 'none'; frame-src 'none'; script-src data: 'unsafe-inline'; style-src data: 'unsafe-inline'; img-src data:; media-src data:; object-src 'none'; base-uri 'none'; form-action 'none'; connect-src 'none';";

export const HANDSHAKE_MESSAGE = 'handshake';
export const GADGET_ERROR_TYPE = 'gaos-gadget-error';

const ERROR_REPORTER = `(function () {
  var reported = false;
  function reportGadgetError(err) {
    if (reported) {
      return;
    }
    reported = true;
    var message = err && err.message ? String(err.message) : String(err);
    if (message.length > 500) {
      message = message.slice(0, 500);
    }
    var el = document.getElementById('gaos-gadget-error');
    if (el === null) {
      el = document.createElement('pre');
      el.id = 'gaos-gadget-error';
      el.setAttribute('role', 'alert');
      el.style.margin = '0';
      el.style.padding = '12px';
      el.style.font = '12px/1.4 ui-monospace, monospace';
      el.style.whiteSpace = 'pre-wrap';
      el.style.color = '#7f1d1d';
      el.style.background = '#fef2f2';
      document.body.appendChild(el);
    }
    el.textContent = message;
    window.parent.postMessage({ type: '${GADGET_ERROR_TYPE}', message: message }, '*');
  }
  window.addEventListener('error', function (event) {
    reportGadgetError(event.error || event.message);
  });
  window.addEventListener('unhandledrejection', function (event) {
    reportGadgetError(event.reason);
  });
})();`;

let cachedHandshakePrefix: string | undefined;

function handshakePrefix(): string {
  if (cachedHandshakePrefix !== undefined) {
    return cachedHandshakePrefix;
  }
  const bundle = `//# sourceURL=jsrpc.js\n${capnwebSrc}`;
  cachedHandshakePrefix = encodeURIComponent(`//# sourceURL=client-prefix.js
import { newMessagePortRpcSession } from "data:text/javascript;charset=utf-8;base64,${btoa(bundle)}";
let gadget;
{
  let {port1, port2} = new MessageChannel();
  window.parent.postMessage("${HANDSHAKE_MESSAGE}", "*", [port2]);
  gadget = newMessagePortRpcSession(port1);
}
`);
  return cachedHandshakePrefix;
}

export function gadgetSrcdoc(clientJs: string): string {
  const body = handshakePrefix() + encodeURIComponent(clientJs);
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="${CSP}">
</head>
<body>
  <script>${ERROR_REPORTER}</script>
  <script type="module" src="data:text/javascript;charset=utf-8,${body}"></script>
</body>
</html>`;
}

function isFromOpaqueIframe(event: MessageEvent, source: Window | null): boolean {
  return event.source === source && event.origin === 'null';
}

export function isHandshakeMessage(event: MessageEvent, source: Window | null): boolean {
  return (
    isFromOpaqueIframe(event, source) && event.data === HANDSHAKE_MESSAGE && event.ports.length > 0
  );
}

export function readGadgetErrorMessage(event: MessageEvent, source: Window | null): string | null {
  if (!isFromOpaqueIframe(event, source)) {
    return null;
  }
  const data: unknown = event.data;
  if (typeof data !== 'object' || data === null || !('type' in data) || !('message' in data)) {
    return null;
  }
  if (data.type !== GADGET_ERROR_TYPE || typeof data.message !== 'string') {
    return null;
  }
  return data.message.length > 0 ? data.message : null;
}
