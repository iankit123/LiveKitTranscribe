// deepgram-service.ts
import { TranscriptionService, TranscriptionResult } from './transcription-service';

let mediaStreamForDeepgram: MediaStream | null = new MediaStream();

export function addTrackToDeepgramStream(track: MediaStreamTrack) {
  if (!mediaStreamForDeepgram) {
    mediaStreamForDeepgram = new MediaStream();
  }

  const exists = mediaStreamForDeepgram.getTracks().some(t => t.id === track.id);
  if (!exists) {
    mediaStreamForDeepgram.addTrack(track);
    console.log(`🎤 Track added to Deepgram stream: ${track.label}`);
  }
}

export function getDeepgramMediaStream(): MediaStream | null {
  return mediaStreamForDeepgram;
}

export class DeepgramService extends TranscriptionService {
  private ws: WebSocket | null = null;
  private onTranscriptionCallback?: (result: TranscriptionResult) => void;
  private onErrorCallback?: (error: string) => void;
  private mediaRecorder?: MediaRecorder;
  private streamStarted = false;

  async start(): Promise<void> {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = async () => {
      console.log('Connected to Deepgram via WebSocket proxy');

      if (this.ws) {
        this.ws.send(JSON.stringify({ type: 'start_transcription' }));
      }

      const stream = getDeepgramMediaStream();
      if (!stream || stream.getTracks().length === 0) {
        console.warn("⚠️ No audio tracks found for Deepgram!");
        return;
      }

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          event.data.arrayBuffer().then(buffer => {
            this.sendAudio(buffer);
          });
        }
      };

      this.mediaRecorder.start(250); // every 250ms
      this.streamStarted = true;
      console.log("🎙️ MediaRecorder started for Deepgram stream");
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`🎧 CLIENT RECEIVED: type=${data.type}`, data);

        if (data.type === 'transcription' && this.onTranscriptionCallback) {
          this.onTranscriptionCallback({
            transcript: data.data.transcript,
            isFinal: data.data.is_final,
            confidence: data.data.confidence,
            timestamp: data.data.timestamp
          });
        } else if (data.type === 'transcription_started') {
          console.log(`✅ TRANSCRIPTION SERVICE STARTED`);
        } else if (data.type === 'error' && this.onErrorCallback) {
          console.error(`❌ TRANSCRIPTION ERROR:`, data.error);
          this.onErrorCallback(data.error);
        } else {
          console.log(`📡 OTHER MESSAGE: type=${data.type}`);
        }
      } catch (error) {
        console.error('❌ CLIENT PARSE ERROR:', error);
        if (this.onErrorCallback) {
          this.onErrorCallback('Failed to parse transcription response');
        }
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback('WebSocket connection error');
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket connection closed');
    };
  }

  async stop(): Promise<void> {
    if (this.ws) {
      this.ws.send(JSON.stringify({ type: 'stop_transcription' }));
      this.ws.close();
      this.ws = null;
    }

    if (this.mediaRecorder && this.streamStarted) {
      this.mediaRecorder.stop();
      this.streamStarted = false;
      console.log("🛑 MediaRecorder stopped");
    }
  }

  sendAudio(audioData: ArrayBuffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const uint8Array = new Uint8Array(audioData);
      const base64Audio = btoa(String.fromCharCode(...uint8Array));

      if (Math.random() < 0.01) {
        console.log(`🎤 Sending audio: size=${audioData.byteLength}bytes, ws_state=${this.ws.readyState}`);
      }

      this.ws.send(JSON.stringify({
        type: 'audio_data',
        audio: base64Audio
      }));
    } else {
      console.warn('⚠️ WebSocket not ready for audio data, state:', this.ws?.readyState);
    }
  }

  onTranscription(callback: (result: TranscriptionResult) => void): void {
    this.onTranscriptionCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }
}
