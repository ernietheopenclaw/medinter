"use client";

export class AudioRecorderUtil {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private _recording = false;
  private onChunk: ((b64: string) => void) | null = null;
  private analyser: AnalyserNode | null = null;

  get recording(): boolean {
    return this._recording;
  }

  get analyserNode(): AnalyserNode | null {
    return this.analyser;
  }

  async start(onChunk: (b64: string) => void): Promise<void> {
    this.onChunk = onChunk;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      this.context = new AudioContext({ sampleRate: 16000 });
      this.source = this.context.createMediaStreamSource(this.stream);
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 256;

      // Use ScriptProcessor for raw PCM access (deprecated but widely supported)
      this.processor = this.context.createScriptProcessor(4096, 1, 1);

      this.source.connect(this.analyser);
      this.analyser.connect(this.processor);
      this.processor.connect(this.context.destination);

      this.processor.onaudioprocess = (e) => {
        if (!this._recording) return;
        const float32 = e.inputBuffer.getChannelData(0);
        // Convert to 16-bit PCM
        const pcm16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        // Base64 encode
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const b64 = btoa(binary);
        this.onChunk?.(b64);
      };

      this._recording = true;
    } catch (err) {
      console.error("Microphone access error:", err);
      throw err;
    }
  }

  stop(): void {
    this._recording = false;
    this.processor?.disconnect();
    this.analyser?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.context?.close();
    this.processor = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
    this.context = null;
  }

  getFrequencyData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }
}

export function playAudioBase64(b64: string): HTMLAudioElement {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.play().catch(() => {});
  audio.onended = () => URL.revokeObjectURL(url);
  return audio;
}
