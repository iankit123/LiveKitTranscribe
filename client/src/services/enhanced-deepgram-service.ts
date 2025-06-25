// Enhanced Deepgram Service with Audio Source Tagging
// Replace your enhanced-deepgram-service.ts with this

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

  // Track pending audio chunks with their source
  private pendingAudioSources: Map<string, string> = new Map();
  private audioChunkCounter: number = 0;

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

      console.log('🔧 SETTING UP SEPARATE AUDIO CALLBACKS...');

      // Set up separate callbacks for local and remote audio
      this.audioCaptureService.onLocalAudio((audioData: ArrayBuffer) => {
        console.log("🎤 SENDING LOCAL AUDIO to Deepgram");
        this.sendAudioWithSource(audioData, "local");
      });

      this.audioCaptureService.onRemoteAudio((audioData: ArrayBuffer) => {
        console.log("🎤 SENDING REMOTE AUDIO to Deepgram");
        this.sendAudioWithSource(audioData, "remote");
      });

      console.log('✅ SEPARATE AUDIO CALLBACKS CONFIGURED');
    }
  }

  private sendAudioWithSource(
    audioData: ArrayBuffer,
    source: "local" | "remote",
  ): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Create unique ID for this audio chunk
      const chunkId = `${Date.now()}-${this.audioChunkCounter++}`;

      // Store the source for this chunk
      this.pendingAudioSources.set(chunkId, source);

      // Convert audio data
      const uint8Array = new Uint8Array(audioData);
      const base64Audio = btoa(String.fromCharCode(...uint8Array));

      // Send audio with source metadata
      this.ws.send(
        JSON.stringify({
          type: "audio_data",
          audio: base64Audio,
          source: source, // Tag the audio with its source
          chunkId: chunkId, // Unique identifier
          timestamp: Date.now(),
        }),
      );

      if (Math.random() < 0.01) {
        // 1% logging
        console.log(
          `🎤 Sent ${source.toUpperCase()} audio: chunk=${chunkId}, size=${audioData.byteLength}`,
        );
      }

      // Clean up old entries (keep only recent ones)
      if (this.pendingAudioSources.size > 100) {
        const entries = Array.from(this.pendingAudioSources.entries());
        // Keep only the most recent 50 entries
        this.pendingAudioSources.clear();
        entries.slice(-50).forEach(([key, value]) => {
          this.pendingAudioSources.set(key, value);
        });
      }
    }
  }

  private determineSpeakerFromRecentActivity(): string {
    // Look at recent audio activity to determine most likely speaker
    const now = Date.now();
    const recentThreshold = 3000; // 3 seconds

    let recentLocalActivity = false;
    let recentRemoteActivity = false;

    // Check recent audio sources
    for (const [chunkId, source] of this.pendingAudioSources.entries()) {
      const timestamp = parseInt(chunkId.split("-")[0]);
      if (now - timestamp < recentThreshold) {
        if (source === "local") {
          recentLocalActivity = true;
        } else if (source === "remote") {
          recentRemoteActivity = true;
        }
      }
    }

    console.log("🎯 ACTIVITY ANALYSIS:", {
      recentLocal: recentLocalActivity,
      recentRemote: recentRemoteActivity,
      pendingChunks: this.pendingAudioSources.size,
    });

    // Determine speaker based on recent activity
    if (recentLocalActivity && !recentRemoteActivity) {
      console.log("👤 DETECTED: Interviewer (recent local activity)");
      return "Interviewer";
    } else if (recentRemoteActivity && !recentLocalActivity) {
      console.log("👤 DETECTED: Candidate (recent remote activity)");
      return "Candidate";
    } else if (recentLocalActivity && recentRemoteActivity) {
      console.log("👤 DETECTED: Mixed Audio (both active)");
      return "Candidate"; 
    --Mixed Audio (Both)
    } else {
      // Fallback to URL role
      const urlParams = new URLSearchParams(window.location.search);
      const role = urlParams.get("role");
      const speaker = role === "interviewer" ? "Interviewer" : "Candidate";
      console.log(`👤 FALLBACK: ${speaker} (based on role)`);
      return speaker;
    }
  }

  async start(): Promise<void> {
    if (!this.room) {
      throw new Error("Room not initialized. Call initialize() first.");
    }

    // Start WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = async () => {
      console.log("✅ Connected to Deepgram via WebSocket proxy");
      if (this.ws) {
        this.ws.send(JSON.stringify({ type: "start_transcription" }));
      }

      // Start audio capture with source tagging
      if (this.audioCaptureService) {
        try {
          await this.audioCaptureService.startCapture();
          console.log("🎤 Audio capture started with SOURCE TAGGING");
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

          // Determine speaker based on recent audio source activity
          const speaker = this.determineSpeakerFromRecentActivity();

          const result: TranscriptionResult = {
            transcript: data.data.transcript,
            isFinal: data.data.is_final,
            confidence: data.data.confidence,
            timestamp: data.data.timestamp,
            speaker: speaker,
          };

          console.log(
            `📝 TRANSCRIPTION RESULT: speaker=${speaker}, text="${data.data.transcript}"`,
          );
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

  // Required abstract method (not used in this implementation)
  sendAudio(audioData: ArrayBuffer): void {
    // This method is required by the abstract class but not used
    // since we're using sendAudioWithSource instead
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

    // Clear pending audio sources
    this.pendingAudioSources.clear();

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