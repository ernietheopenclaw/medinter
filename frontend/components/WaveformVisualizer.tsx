"use client";

import { useEffect, useRef } from "react";

interface Props {
  getFrequencyData: () => Uint8Array;
  active: boolean;
}

export function WaveformVisualizer({ getFrequencyData, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      // Clear canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const data = getFrequencyData();
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      const barCount = Math.min(data.length, 32);
      const barWidth = w / barCount - 2;

      for (let i = 0; i < barCount; i++) {
        const val = data[i] / 255;
        const barH = Math.max(2, val * h);
        const x = i * (barWidth + 2);
        const y = (h - barH) / 2;

        ctx.fillStyle = `rgba(30, 64, 175, ${0.3 + val * 0.7})`;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, 2);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [active, getFrequencyData]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={48}
      className="w-full h-12 rounded-lg"
    />
  );
}
