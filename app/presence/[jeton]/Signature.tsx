"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

/**
 * Cadre de signature au doigt (ou à la souris) : trait charbon sur fond transparent, image PNG en data URL.
 * `onChange(null)` tant que le cadre est vide.
 */
export default function Signature({ onChange }: { onChange: (png: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dessin = useRef(false);
  const [vide, setVide] = useState(true);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.clientWidth * ratio;
    c.height = c.clientHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#222222";
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function debut(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dessin.current = true;
    const ctx = e.currentTarget.getContext("2d")!;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.1, p.y + 0.1);
    ctx.stroke();
  }

  function trait(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dessin.current) return;
    const ctx = e.currentTarget.getContext("2d")!;
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function fin(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dessin.current) return;
    dessin.current = false;
    setVide(false);
    onChange(e.currentTarget.toDataURL("image/png"));
  }

  function effacer() {
    const c = ref.current;
    if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setVide(true);
    onChange(null);
  }

  return (
    <div className="grid gap-2">
      <canvas ref={ref} aria-label="Cadre de signature : signe avec ton doigt"
        className="h-48 w-full touch-none rounded-xl border-2 border-dashed border-[#7C90A0] bg-white"
        onPointerDown={debut} onPointerMove={trait} onPointerUp={fin} onPointerCancel={fin} onPointerLeave={fin} />
      <div className="flex items-center justify-between text-sm text-[#56646F]">
        <span>{vide ? "Signe dans le cadre avec ton doigt." : "Signature prête."}</span>
        <button type="button" onClick={effacer} disabled={vide}
          className="inline-flex min-h-11 items-center gap-1 rounded-lg px-3 font-semibold text-militant-charbon disabled:opacity-40">
          <Eraser size={16} aria-hidden /> Effacer
        </button>
      </div>
    </div>
  );
}
