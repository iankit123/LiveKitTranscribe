import { useState, useCallback, useEffect } from 'react';
import { Room, RemoteParticipant, LocalParticipant, RoomEvent } from 'livekit-client';
import { liveKitService } from '@/services/livekit-service';

export function useMeeting() {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [localParticipant, setLocalParticipant] = useState<LocalParticipant | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);

  const connectToRoom = useCallback(async (roomName: string, participantName: string) => {
    try {
      setIsConnecting(true);
      setError(null);

      const connectedRoom = await liveKitService.connectToRoom(roomName, participantName);
      
      setRoom(connectedRoom);
      setLocalParticipant(connectedRoom.localParticipant);
      setParticipants(Array.from(connectedRoom.remoteParticipants.values()));
      setIsConnected(true);

      // Set up event listeners
      connectedRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        setParticipants(prev => [...prev, participant]);
      });

      connectedRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        setParticipants(prev => prev.filter(p => p.sid !== participant.sid));
      });

      connectedRoom.on(RoomEvent.LocalTrackPublished, () => {
        setIsMuted(!connectedRoom.localParticipant.isMicrophoneEnabled);
        setIsVideoDisabled(!connectedRoom.localParticipant.isCameraEnabled);
      });

      connectedRoom.on(RoomEvent.LocalTrackUnpublished, () => {
        setIsMuted(!connectedRoom.localParticipant.isMicrophoneEnabled);
        setIsVideoDisabled(!connectedRoom.localParticipant.isCameraEnabled);
      });

      connectedRoom.on(RoomEvent.Disconnected, () => {
        setIsConnected(false);
        setRoom(null);
        setLocalParticipant(null);
        setParticipants([]);
      });

    } catch (err) {
      console.error('Failed to connect to room:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to room');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectFromRoom = useCallback(async () => {
    try {
      await liveKitService.disconnectFromRoom();
      setRoom(null);
      setLocalParticipant(null);
      setParticipants([]);
      setIsConnected(false);
      setError(null);
    } catch (err) {
      console.error('Failed to disconnect from room:', err);
      setError(err instanceof Error ? err.message : 'Failed to disconnect from room');
    }
  }, []);

  const toggleMute = useCallback(async () => {
    try {
      const muted = await liveKitService.toggleMute();
      setIsMuted(!muted);
    } catch (err) {
      console.error('Failed to toggle mute:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle microphone');
    }
  }, []);

  const toggleVideo = useCallback(async () => {
    try {
      const videoEnabled = await liveKitService.toggleVideo();
      setIsVideoDisabled(!videoEnabled);
    } catch (err) {
      console.error('Failed to toggle video:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle camera');
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (room && isConnected) {
        liveKitService.disconnectFromRoom();
      }
    };
  }, [room, isConnected]);

  return {
    room,
    isConnecting,
    isConnected,
    error,
    participants,
    localParticipant,
    isMuted,
    isVideoDisabled,
    connectToRoom,
    disconnectFromRoom,
    toggleMute,
    toggleVideo,
  };
}
