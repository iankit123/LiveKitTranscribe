import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, Settings } from "lucide-react";
import { useMeeting } from "@/hooks/use-meeting";
import { useTranscription } from "@/hooks/use-transcription";
import VideoGrid from "@/components/video-grid";
import TranscriptionPanel from "@/components/transcription-panel";
import MeetingControls from "@/components/meeting-controls";
import { useToast } from "@/hooks/use-toast";

interface MeetingProps {
  params: {
    roomName: string;
  };
}

export default function Meeting({ params }: MeetingProps) {
  const { roomName } = params;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const {
    room,
    isConnecting,
    isConnected,
    error,
    participants,
    localParticipant,
    connectToRoom,
    disconnectFromRoom,
    toggleMute,
    toggleVideo,
    isMuted,
    isVideoDisabled
  } = useMeeting();

  const {
    transcriptions,
    isTranscribing,
    startTranscription,
    stopTranscription,
    clearTranscriptions
  } = useTranscription();

  useEffect(() => {
    if (roomName) {
      connectToRoom(roomName, 'User');
    }

    return () => {
      disconnectFromRoom();
    };
  }, [roomName, connectToRoom, disconnectFromRoom]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Connection Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleLeaveRoom = () => {
    disconnectFromRoom();
    setLocation('/');
  };

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-livekit mx-auto mb-4"></div>
          <p>Connecting to room...</p>
        </div>
      </div>
    );
  }

  if (!isConnected || !room) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to connect to room</p>
          <Button onClick={handleLeaveRoom} variant="outline">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header Bar */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">{roomName}</span>
            <span className="text-xs text-gray-400">
              {participants.length + (localParticipant ? 1 : 0)} participant{participants.length + (localParticipant ? 1 : 0) !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Transcription Status */}
          <div className="flex items-center space-x-2 bg-gray-700 px-3 py-1 rounded-full">
            <div className={`w-2 h-2 rounded-full ${isTranscribing ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className="text-xs">{isTranscribing ? 'Transcribing' : 'Transcription Off'}</span>
          </div>
          
          <Button 
            onClick={handleLeaveRoom}
            className="bg-red-600 hover:bg-red-700 text-white"
            size="sm"
          >
            <LogOut className="mr-2" size={16} />
            Leave
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Video Grid */}
        <VideoGrid 
          room={room}
          localParticipant={localParticipant}
          participants={participants}
        />

        {/* Live Transcription Panel */}
        <TranscriptionPanel
          transcriptions={transcriptions}
          isTranscribing={isTranscribing}
          onStartTranscription={startTranscription}
          onStopTranscription={stopTranscription}
          onClearTranscriptions={clearTranscriptions}
          provider="deepgram"
        />
      </div>

      {/* Meeting Controls Bar */}
      <MeetingControls
        isMuted={isMuted}
        isVideoDisabled={isVideoDisabled}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={() => {/* TODO: Implement screen share */}}
        onOpenSettings={() => {/* TODO: Implement settings */}}
      />
    </div>
  );
}
