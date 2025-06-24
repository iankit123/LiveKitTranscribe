// Complete enhanced-deepgram-service.ts - Copy and paste this entire file

import { Room } from "livekit-client";
import {
  TranscriptionService,
  TranscriptionResult,
} from "./transcription-service";
import AudioCaptureService from "./audio-capture-service";

export class EnhancedDeepgramService extends TranscriptionService {
  private ws: WebSocket | null = null;
  private onTranscriptionCallback?: (result: TranscriptionResult) => void;
  private onErrorCallback?: (error: string) => void;
  private audioCaptureService: AudioCaptureService | null = null;
  private room: Room | null = null;

  // Track audio activity to determine speaker
  private lastLocalActivity: number = 0;
  private lastRemoteActivity: number = 0;
  private localAudioLevel: number = 0;
  private remoteAudioLevel: number = 0;

  constructor() {
    super();
    this.audioCaptureService = new AudioCaptureService({
      sampleRate: 16000,
      channelCount: 1,
      bufferSize: 4096,
    });
  }

  async initialize(room: Room): Promise<void> {
    this.room = room;
    if (this.audioCaptureService) {
      await this.audioCaptureService.initialize(room);

      // Track local audio activity
      this.audioCaptureService.onLocalAudio((audioData: ArrayBuffer) => {
        this.trackLocalActivity(audioData);
        this.sendAudio(audioData);
      });

      // Track remote audio activity
      this.audioCaptureService.onRemoteAudio((audioData: ArrayBuffer) => {
        this.trackRemoteActivity(audioData);
        this.sendAudio(audioData);
      });
    }
  }

  private trackLocalActivity(audioData: ArrayBuffer): void {
    const now = Date.now();
    // The audioData is Int16Array buffer, not Float32Array
    const audioArray = new Int16Array(audioData);
    // Convert Int16 to Float32 for level calculation
    const level = Math.max(
      ...Array.from(audioArray).map((sample) => Math.abs(sample / 32768)),
    );

    if (level > 0.01) {
      this.lastLocalActivity = now;
      this.localAudioLevel = level;

      if (Math.random() < 0.1) {
        // 10% logging
        console.log(
          `🎤 LOCAL ACTIVITY: level=${level.toFixed(4)}, time=${now}`,
        );
      }
    }
  }

  private trackRemoteActivity(audioData: ArrayBuffer): void {
    const now = Date.now();
    // The audioData is Int16Array buffer, not Float32Array
    const audioArray = new Int16Array(audioData);
    // Convert Int16 to Float32 for level calculation
    const level = Math.max(
      ...Array.from(audioArray).map((sample) => Math.abs(sample / 32768)),
    );

    if (level > 0.01) {
      this.lastRemoteActivity = now;
      this.remoteAudioLevel = level;

      if (Math.random() < 0.1) {
        // 10% logging
        console.log(
          `🎤 REMOTE ACTIVITY: level=${level.toFixed(4)}, time=${now}`,
        );
      }
    }
  }

  private determineSpeaker(): string {
    const now = Date.now();
    const recentThreshold = 2000; // Increased to 2 seconds for better detection

    const timeSinceLocal = now - this.lastLocalActivity;
    const timeSinceRemote = now - this.lastRemoteActivity;
    const recentLocalActivity = timeSinceLocal < recentThreshold;
    const recentRemoteActivity = timeSinceRemote < recentThreshold;

    console.log("🎯 SPEAKER ANALYSIS:", {
      localLevel: this.localAudioLevel.toFixed(4),
      remoteLevel: this.remoteAudioLevel.toFixed(4),
      recentLocal: recentLocalActivity,
      recentRemote: recentRemoteActivity,
      timeSinceLocal: timeSinceLocal,
      timeSinceRemote: timeSinceRemote,
      lastLocalActivity: this.lastLocalActivity,
      lastRemoteActivity: this.lastRemoteActivity,
    });

    // Priority 1: Recent activity (within 2 seconds)
    if (recentLocalActivity && !recentRemoteActivity) {
      console.log("👤 DETECTED: Interviewer (recent local activity)");
      return "Interviewer";
    }

    if (recentRemoteActivity && !recentLocalActivity) {
      console.log("👤 DETECTED: Candidate (recent remote activity)");
      return "Candidate";
    }

    // Priority 2: Compare audio levels if both have recent activity
    if (recentLocalActivity && recentRemoteActivity) {
      if (this.localAudioLevel > this.remoteAudioLevel * 1.5) {
        console.log("👤 DETECTED: Interviewer (higher local level)");
        return "Interviewer";
      } else if (this.remoteAudioLevel > this.localAudioLevel * 1.5) {
        console.log("👤 DETECTED: Candidate (higher remote level)");
        return "Candidate";
      }
    }

    // Priority 3: Most recent activity
    if (
      this.lastLocalActivity > this.lastRemoteActivity &&
      this.lastLocalActivity > 0
    ) {
      console.log("👤 DETECTED: Interviewer (most recent local)");
      return "Interviewer";
    } else if (
      this.lastRemoteActivity > this.lastLocalActivity &&
      this.lastRemoteActivity > 0
    ) {
      console.log("👤 DETECTED: Candidate (most recent remote)");
      return "Candidate";
    }

    // Default fallback
    console.log("👤 FALLBACK: Mixed Audio (Both)");
    return "Mixed Audio (Both)";
  }

  async start(): Promise<void> {
    if (!this.room) {
      throw new Error("Room not initialized. Call initialize() first.");
    }

    // Start single WebSocket connection (your existing approach)
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = async () => {
      console.log("✅ Connected to Deepgram via WebSocket proxy");
      if (this.ws) {
        this.ws.send(JSON.stringify({ type: "start_transcription" }));
      }

      // Start audio capture
      if (this.audioCaptureService) {
        try {
          await this.audioCaptureService.startCapture();
          console.log(
            "🎤 Enhanced audio capture started with speaker detection",
          );
        } catch (error) {
          console.error("❌ Failed to start audio capture:", error);
          if (this.onErrorCallback) {
            this.onErrorCallback("Failed to start audio capture");
          }
        }
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`🎧 CLIENT RECEIVED: type=${data.type}`, data);

        if (data.type === "transcription" && this.onTranscriptionCallback) {
          console.log(`🎯 PROCESSING TRANSCRIPT: "${data.data.transcript}"`);

          // Determine speaker based on recent audio activity
          const speaker = this.determineSpeaker();

          const result: TranscriptionResult = {
            transcript: data.data.transcript,
            isFinal: data.data.is_final,
            confidence: data.data.confidence,
            timestamp: data.data.timestamp,
            speaker: speaker,
          };

          this.onTranscriptionCallback(result);
        } else if (data.type === "transcription_started") {
          console.log(`✅ TRANSCRIPTION SERVICE STARTED`);
        } else if (data.type === "error" && this.onErrorCallback) {
          console.error(`❌ TRANSCRIPTION ERROR:`, data.error);
          this.onErrorCallback(data.error);
        }
      } catch (error) {
        console.error("❌ CLIENT PARSE ERROR:", error);
        if (this.onErrorCallback) {
          this.onErrorCallback("Failed to parse transcription response");
        }
      }
    };

    this.ws.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
      if (this.onErrorCallback) {
        this.onErrorCallback("WebSocket connection error");
      }
    };

    this.ws.onclose = () => {
      console.log("🔌 WebSocket connection closed");
      if (this.audioCaptureService) {
        this.audioCaptureService.stopCapture();
      }
    };
  }

  sendAudio(audioData: ArrayBuffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const uint8Array = new Uint8Array(audioData);
      const base64Audio = btoa(String.fromCharCode(...uint8Array));

      if (Math.random() < 0.005) {
        console.log(
          `🎤 Sending enhanced audio: size=${audioData.byteLength}bytes`,
        );
      }

      this.ws.send(
        JSON.stringify({
          type: "audio_data",
          audio: base64Audio,
        }),
      );
    }
  }

  async stop(): Promise<void> {
    if (this.audioCaptureService) {
      this.audioCaptureService.stopCapture();
    }

    if (this.ws) {
      this.ws.send(JSON.stringify({ type: "stop_transcription" }));
      this.ws.close();
      this.ws = null;
    }

    console.log("🛑 Enhanced Deepgram service stopped");
  }

  onTranscription(callback: (result: TranscriptionResult) => void): void {
    this.onTranscriptionCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  cleanup(): void {
    this.stop();
    if (this.audioCaptureService) {
      this.audioCaptureService.cleanup();
      this.audioCaptureService = null;
    }
    this.room = null;
  }
}
