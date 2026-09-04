import { RpcTarget, newMessagePortRpcSession } from 'capnweb';
import { useLayoutEffect, useMemo, useRef } from 'react';

import { gadgetSrcdoc, isHandshakeMessage, readGadgetErrorMessage } from './preview';

import type { AuthedRpc } from './gaos-api';

class GadgetBridge extends RpcTarget {
  public constructor(
    private readonly gadgetIdRef: { current: string | null },
    private readonly stubRef: { current: AuthedRpc },
  ) {
    super();
  }

  public fetch(): Promise<{ body: string; status: number }> {
    const gadgetId = this.gadgetIdRef.current;
    if (gadgetId === null) {
      return Promise.resolve({ body: '', status: 0 });
    }
    return this.stubRef.current.proxyGadget(gadgetId);
  }
}

export default function GadgetPreview({
  clientJs,
  gadgetId,
  stub,
  onError,
}: {
  clientJs: string;
  gadgetId: string | null;
  stub: AuthedRpc;
  onError?: (message: string) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const gadgetIdRef = useRef(gadgetId);
  gadgetIdRef.current = gadgetId;
  const stubRef = useRef(stub);
  stubRef.current = stub;
  const srcdoc = useMemo(() => (clientJs.length === 0 ? '' : gadgetSrcdoc(clientJs)), [clientJs]);

  useLayoutEffect(() => {
    const iframe = iframeRef.current;
    if (iframe === null || srcdoc.length === 0) {
      return;
    }
    const onMessage = (event: MessageEvent) => {
      const previewError = readGadgetErrorMessage(event, iframe.contentWindow);
      if (previewError !== null) {
        onErrorRef.current?.(previewError);
        return;
      }
      if (!isHandshakeMessage(event, iframe.contentWindow)) {
        return;
      }
      const port = event.ports.at(0);
      if (port === undefined) {
        return;
      }
      newMessagePortRpcSession(port, new GadgetBridge(gadgetIdRef, stubRef));
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, [srcdoc]);

  if (srcdoc.length === 0) {
    return (
      <div
        className="relative h-full min-h-[16rem]"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--color-kumo-line) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <p className="absolute inset-0 flex items-center justify-center text-sm text-kumo-subtle">
          No gadget yet. Send a message.
        </p>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      title="gadget preview"
      sandbox="allow-scripts"
      srcDoc={srcdoc}
      className="block h-full min-h-[16rem] w-full border-0"
    />
  );
}
