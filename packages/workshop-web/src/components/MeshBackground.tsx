import { useEffect, useRef } from 'react';

const COLS = 22;
const ROWS = 18;
const LINE_R = 120;
const LINE_G = 118;
const LINE_B = 113;

export default function MeshBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const hexH = 1 / ROWS;
    const hexW = 1 / COLS;
    const rowH = hexH * 0.75;
    const rx = hexW * 0.55;
    const ry = hexH * 0.5;
    const edges: Array<[[number, number], [number, number]]> = [];
    for (let r = -3; r <= ROWS + 3; r += 1) {
      for (let c = -3; c <= COLS + 3; c += 1) {
        const offset = r % 2 !== 0 ? hexW * 0.5 : 0;
        const cx = c * hexW + hexW * 0.5 + offset;
        const cy = r * rowH + hexH * 0.5;
        const v: [[number, number], [number, number], [number, number], [number, number]] = [
          [cx, cy - ry],
          [cx + rx, cy - ry * 0.5],
          [cx + rx, cy + ry * 0.5],
          [cx, cy + ry],
        ];
        edges.push([v[0], v[1]], [v[1], v[2]], [v[2], v[3]]);
      }
    }
    const draw = (w: number, h: number) => {
      ctx.clearRect(0, 0, w, h);
      const vpX = w * 0.5;
      const vpY = h * 0.15;
      for (const [a, b] of edges) {
        const project = (fx: number, fy: number): [number, number] => {
          const depth = Math.max(0, Math.min(1, fy));
          const spread = 1 - depth * 0.85;
          return [vpX + (fx - 0.5) * w * 1.4 * spread, vpY + (1 - depth) * (h * 1.05 - vpY)];
        };
        const [x1, y1] = project(a[0], a[1]);
        const [x2, y2] = project(b[0], b[1]);
        const avgDepth = Math.max(0, Math.min(1, (a[1] + b[1]) * 0.5));
        const nearness = 1 - avgDepth;
        ctx.strokeStyle = `rgba(${String(LINE_R)}, ${String(LINE_G)}, ${String(LINE_B)}, ${String(0.07 + nearness * 0.3)})`;
        ctx.lineWidth = 0.3 + nearness * 0.6;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(rect.width, rect.height);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    return () => {
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}
