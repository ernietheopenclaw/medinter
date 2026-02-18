"use client";

export function ConnectionStatus({ connected }: { connected: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium">
      <span
        className={`w-3 h-3 rounded-full ${
          connected ? "bg-accent animate-pulse" : "bg-danger"
        }`}
      />
      <span className={connected ? "text-accent" : "text-danger"}>
        {connected ? "Connected to GB10" : "Disconnected"}
      </span>
    </div>
  );
}
