"use client";

import { getWsUrl } from "./utils";

export type WsMessage =
  | { type: "config"; source_lang: string; target_lang: string; session_id?: string }
  | { type: "audio_chunk"; audio: string; session_id: string; source_lang: string; target_lang: string }
  | { type: "text_input"; text: string; session_id: string; source_lang: string; target_lang: string }
  | { type: "switch_speaker" }
  | { type: "end_session" };

export type WsResponse =
  | { type: "config_ack"; source_lang: string; target_lang: string }
  | { type: "partial_transcript"; text: string; is_final: boolean }
  | { type: "translation_result"; original: string; translation: string; medical_terms: any[]; flags: string[]; urgency: string; audio?: string }
  | { type: "speaker_switched"; current_speaker: string }
  | { type: "session_ended"; summary: any };

type Listener = (msg: WsResponse) => void;

export class MedIntererWs {
  private ws: WebSocket | null = null;
  private listeners: Set<Listener> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _connected = false;

  get connected(): boolean {
    return this._connected;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const url = getWsUrl();
    if (!url) return;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this._connected = true;
        this.notify({ type: "config_ack", source_lang: "", target_lang: "" });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WsResponse;
          this.notify(msg);
        } catch (e) {
          console.error("WS parse error:", e);
        }
      };

      this.ws.onclose = () => {
        this._connected = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this._connected = false;
      };
    } catch (e) {
      console.error("WS connect error:", e);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this._connected = false;
  }

  send(msg: WsMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  onMessage(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(msg: WsResponse): void {
    this.listeners.forEach((fn) => fn(msg));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2000);
  }
}

// Singleton
let instance: MedIntererWs | null = null;
export function getWsClient(): MedIntererWs {
  if (!instance) instance = new MedIntererWs();
  return instance;
}
