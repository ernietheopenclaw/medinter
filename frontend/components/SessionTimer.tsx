"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/utils";

export function SessionTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <span className="text-sm font-mono text-gray-500">
      ⏱ {formatDuration(elapsed)}
    </span>
  );
}
