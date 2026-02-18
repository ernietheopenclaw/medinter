"use client";

import { useEffect, useState } from "react";
import { getApiUrl, formatDuration, LANGUAGES } from "@/lib/utils";

interface HealthData {
  status: string;
  mock_mode: boolean;
  services: { riva_asr: boolean; riva_tts: boolean; nim_llm: boolean };
  gpu: { available: boolean; usage_percent: number; memory_used_gb: number; memory_total_gb: number };
  active_sessions: number;
  daily_sessions: number;
}

interface ActiveSession {
  session_id: string;
  source_lang: string;
  target_lang: string;
  exchange_count: number;
  duration_seconds: number;
  current_speaker: string;
  mode: string;
}

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hRes, sRes] = await Promise.all([
          fetch(getApiUrl("/api/health")),
          fetch(getApiUrl("/api/sessions/active")),
        ]);
        setHealth(await hRes.json());
        const sData = await sRes.json();
        setSessions(sData.sessions || []);
      } catch (e) {
        console.error("Dashboard fetch error:", e);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const svcStatus = (ok: boolean) => (ok ? "🟢" : "🔴");
  const langName = (code: string) => LANGUAGES.find((l) => l.code === code)?.name || code;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">🏥 MedInter — Command Post</h1>
        <p className="text-gray-400 mt-1">NVIDIA DGX Spark GB10 Dashboard</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <div className="bg-gray-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">System Health</h2>
          {health ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Status</span>
                <span className="text-green-400 font-semibold">{health.status}</span>
              </div>
              <div className="flex justify-between">
                <span>Mock Mode</span>
                <span className={health.mock_mode ? "text-yellow-400" : "text-green-400"}>
                  {health.mock_mode ? "ON" : "OFF"}
                </span>
              </div>
              <hr className="border-gray-700" />
              <div className="flex justify-between">
                <span>Riva ASR</span>
                <span>{svcStatus(health.services.riva_asr)} {health.services.riva_asr ? "Online" : "Offline"}</span>
              </div>
              <div className="flex justify-between">
                <span>NIM LLM</span>
                <span>{svcStatus(health.services.nim_llm)} {health.services.nim_llm ? "Online" : "Offline"}</span>
              </div>
              <div className="flex justify-between">
                <span>Riva TTS</span>
                <span>{svcStatus(health.services.riva_tts)} {health.services.riva_tts ? "Online" : "Offline"}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Loading...</p>
          )}
        </div>

        {/* GPU */}
        <div className="bg-gray-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">GPU Status</h2>
          {health?.gpu.available ? (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span>Utilization</span>
                  <span>{health.gpu.usage_percent}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-green-500 rounded-full h-3 transition-all"
                    style={{ width: `${health.gpu.usage_percent}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span>Memory</span>
                  <span>{health.gpu.memory_used_gb} / {health.gpu.memory_total_gb} GB</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-blue-500 rounded-full h-3 transition-all"
                    style={{ width: `${(health.gpu.memory_used_gb / health.gpu.memory_total_gb) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">GPU not available</p>
          )}
        </div>

        {/* Sessions */}
        <div className="bg-gray-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Sessions</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Active Now</span>
              <span className="text-2xl font-bold text-blue-400">{health?.active_sessions ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Today Total</span>
              <span className="text-2xl font-bold text-green-400">{health?.daily_sessions ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Active Sessions List */}
        <div className="bg-gray-800 rounded-2xl p-6 md:col-span-2 lg:col-span-3">
          <h2 className="text-xl font-semibold mb-4">Active Sessions</h2>
          {sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((s) => (
                <div key={s.session_id} className="flex items-center justify-between bg-gray-700 rounded-xl p-4">
                  <div>
                    <span className="font-mono text-sm text-gray-400">{s.session_id}</span>
                    <div className="text-sm mt-1">
                      {langName(s.source_lang)} → {langName(s.target_lang)} · {s.mode}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">{s.exchange_count} exchanges</div>
                    <div className="text-sm text-gray-400">{formatDuration(s.duration_seconds)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No active sessions</p>
          )}
        </div>

        {/* Languages */}
        <div className="bg-gray-800 rounded-2xl p-6 md:col-span-2 lg:col-span-3">
          <h2 className="text-xl font-semibold mb-4">Supported Languages</h2>
          <div className="flex flex-wrap gap-3">
            {LANGUAGES.map((l) => (
              <span key={l.code} className="bg-gray-700 px-3 py-2 rounded-lg text-sm">
                {l.flag} {l.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
