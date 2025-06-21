import { Room, RemoteParticipant, LocalParticipant, RoomEvent, RemoteTrackPublication } from "livekit-client";

export interface LiveKitTokenResponse {
  token: string;
  url: string;
  roomName: string;
  meetingId: number;
}

export class LiveKitService {
  private room: Room | null = null;

  async getAccessToken(roomName: string, participantName: string): Promise<LiveKitTokenResponse> {
    const response = await fetch('/api/livekit/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomName,
        participantName,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get access token');
    }

    return response.json();
  }

  async connectToRoom(roomName: string, participantName: string): Promise<Room> {
    try {
      const { token, url } = await this.getAccessToken(roomName, participantName);
      
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: {
            width: 1280,
            height: 720,
          },
          facingMode: 'user',
        },
        // Add connection configuration for better stability
        reconnectPolicy: {
          nextRetryDelayInMs: (context) => {
            console.log('Reconnect attempt:', context.retryCount);
            return Math.min(1000 * Math.pow(2, context.retryCount), 30000);
          },
          maxRetryCount: 10,
        },
        publishDefaults: {
          videoSimulcastLayers: [
            { resolution: { width: 320, height: 240 }, encoding: { maxBitrate: 150000 } },
            { resolution: { width: 640, height: 480 }, encoding: { maxBitrate: 500000 } },
          ]
        }
      });

      await this.room.connect(url, token);
      
      // Enable camera and microphone by default
      await this.room.localParticipant.enableCameraAndMicrophone();

      return this.room;
    } catch (error) {
      console.error('Failed to connect to room:', error);
      throw error;
    }
  }

  async disconnectFromRoom(): Promise<void> {
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }
  }

  getRoom(): Room | null {
    return this.room;
  }

  async toggleMute(): Promise<boolean> {
    if (!this.room) return false;
    
    const enabled = this.room.localParticipant.isMicrophoneEnabled;
    await this.room.localParticipant.setMicrophoneEnabled(!enabled);
    return !enabled;
  }

  async toggleVideo(): Promise<boolean> {
    if (!this.room) return false;
    
    const enabled = this.room.localParticipant.isCameraEnabled;
    await this.room.localParticipant.setCameraEnabled(!enabled);
    return !enabled;
  }

  async toggleScreenShare(): Promise<boolean> {
    if (!this.room) return false;
    
    const isSharing = this.room.localParticipant.isScreenShareEnabled;
    await this.room.localParticipant.setScreenShareEnabled(!isSharing);
    return !isSharing;
  }

  onParticipantConnected(callback: (participant: RemoteParticipant) => void): void {
    if (this.room) {
      this.room.on(RoomEvent.ParticipantConnected, callback);
    }
  }

  onParticipantDisconnected(callback: (participant: RemoteParticipant) => void): void {
    if (this.room) {
      this.room.on(RoomEvent.ParticipantDisconnected, callback);
    }
  }

  onTrackPublished(callback: (publication: RemoteTrackPublication, participant: RemoteParticipant) => void): void {
    if (this.room) {
      this.room.on(RoomEvent.TrackPublished, callback);
    }
  }
}

export const liveKitService = new LiveKitService();
