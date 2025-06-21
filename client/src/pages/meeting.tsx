import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Copy, Share2 } from "lucide-react";
import { useMeeting } from "@/hooks/use-meeting";
import { useTranscription } from "@/hooks/use-transcription";
import VideoGrid from "@/components/video-grid";
import TranscriptionPanel from "@/components/transcription-panel";
import MeetingControls from "@/components/meeting-controls";
import FollowUpSuggestions from "@/components/follow-up-suggestions";
import { useToast } from "@/hooks/use-toast";
import { LiveKitRoom } from "@livekit/components-react";

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

  // Determine if this user is the interviewer (creator of the room)
  // The interviewer is the one whose identity starts with "interviewer-"
  const isInterviewer = localParticipant?.identity?.startsWith('interviewer-') || false;
  
  const {
    transcriptions,
    isTranscribing,
    startTranscription,
    stopTranscription,
    clearTranscriptions
  } = useTranscription('deepgram', room, isInterviewer);

  useEffect(() => {
    if (roomName && !isConnecting && !isConnected && !error) {
      // Generate role-based participant name
      const uniqueId = Math.random().toString(36).substring(2, 8);
      const participantName = isInterviewer ? `Interviewer-${uniqueId}` : `Candidate-${uniqueId}`;
      console.log('Connecting to room with participant name:', participantName, 'Role:', isInterviewer ? 'Interviewer' : 'Candidate');
      connectToRoom(roomName, participantName);
    }

    return () => {
      if (isConnected) {
        disconnectFromRoom();
      }
    };
  }, [roomName]);

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

  const handleCopyLink = () => {
    const meetingUrl = window.location.href;
    navigator.clipboard.writeText(meetingUrl).then(() => {
      toast({
        title: "Link copied!",
        description: "Meeting link has been copied to clipboard. Note: The other person needs to access this from the same network or you may need to deploy the app publicly.",
      });
    }).catch(() => {
      toast({
        title: "Copy failed",
        description: "Please copy the URL manually from the address bar",
        variant: "destructive",
      });
    });
  };

  const handleShare = async () => {
    const meetingUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my video meeting',
          text: `Join me in this video meeting room: ${roomName}`,
          url: meetingUrl,
        });
      } catch (err) {
        // User cancelled sharing, fallback to copy
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  if (error && !isConnecting) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold mb-4 text-red-400">Connection Error</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <div className="space-x-4">
            <Button 
              onClick={() => {
                setError(null);
                const uniqueId = Math.random().toString(36).substring(2, 8);
                const participantName = isInterviewer ? `Interviewer-${uniqueId}` : `Candidate-${uniqueId}`;
                connectToRoom(roomName, participantName);
              }} 
              className="bg-blue-600 hover:bg-blue-700"
            >
              Try Again
            </Button>
            <Button onClick={() => setLocation('/')} className="bg-gray-600 hover:bg-gray-700">
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isConnecting || !isConnected || !room) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-livekit mx-auto mb-4"></div>
          <p className="text-gray-400">
            {isConnecting ? 'Connecting to room...' : 'Setting up room...'}
          </p>
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
          {participants.length === 0 && (
            <div className="text-xs text-yellow-400 bg-yellow-900 px-2 py-1 rounded">
              Waiting for others to join...
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Transcription Status */}
          <div className="flex items-center space-x-2 bg-gray-700 px-3 py-1 rounded-full">
            <div className={`w-2 h-2 rounded-full ${isTranscribing ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className="text-xs">{isTranscribing ? 'Transcribing' : 'Transcription Off'}</span>
          </div>

          {/* Share Meeting */}
          <Button 
            onClick={handleShare}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            <Share2 className="mr-2" size={16} />
            Share
          </Button>
          
          <Button 
            onClick={handleCopyLink}
            className="bg-gray-600 hover:bg-gray-700 text-white"
            size="sm"
          >
            <Copy className="mr-2" size={16} />
            Copy Link
          </Button>
          
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
        {/* Video Grid with LiveKit Context */}
        {room && (
          <LiveKitRoom
            room={room}
            className="h-auto"
          >
            <VideoGrid 
              room={room}
              localParticipant={localParticipant}
              participants={participants}
            />
          </LiveKitRoom>
        )}

        {/* Live Transcription Panel - Only show to interviewer */}
        {isInterviewer && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TranscriptionPanel
              transcriptions={transcriptions}
              isTranscribing={isTranscribing}
              onStartTranscription={startTranscription}
              onStopTranscription={stopTranscription}
              onClearTranscriptions={clearTranscriptions}
              provider="deepgram"
            />
            
            <FollowUpSuggestions transcriptions={transcriptions} />
          </div>
        )}
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
