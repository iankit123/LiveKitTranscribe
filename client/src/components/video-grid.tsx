import { Room, LocalParticipant, RemoteParticipant, Track, RoomEvent, ParticipantEvent } from "livekit-client";
import { VideoTrack, AudioTrack, RoomAudioRenderer, useParticipants, useLocalParticipant } from "@livekit/components-react";
import { User, Mic, MicOff, Video as VideoIcon, VideoOff } from "lucide-react";
import { useEffect, useRef } from "react";

interface VideoGridProps {
  room: Room;
  localParticipant: LocalParticipant | null;
  participants: RemoteParticipant[];
}

function ParticipantVideo({ participant, isLocal = false, userRole }: { 
  participant: LocalParticipant | RemoteParticipant, 
  isLocal?: boolean,
  userRole?: string 
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Determine correct display name based on role
  const getDisplayName = () => {
    if (isLocal) {
      return userRole === 'interviewer' ? 'You (Interviewer)' : 'You (Candidate)';
    } else {
      // For remote participants, determine their role from their identity
      const participantRole = participant.identity.includes('interviewer') ? 'Interviewer' : 'Candidate';
      const shortId = participant.identity.split('-').pop()?.substring(0, 6) || '';
      return `${participantRole}-${shortId}`;
    }
  };

  const displayName = getDisplayName();

  useEffect(() => {
    if (!videoRef.current) return;

    const videoElement = videoRef.current;

    if (isLocal) {
      // Handle local participant
      const localParticipant = participant as LocalParticipant;
      
      const attachLocalVideo = async () => {
        try {
          // Enable camera first
          await localParticipant.setCameraEnabled(true);
          
          // Get video track
          const videoTrack = localParticipant.videoTrackPublications.size > 0 
            ? Array.from(localParticipant.videoTrackPublications.values())[0]?.videoTrack
            : localParticipant.cameraTrack;

          if (videoTrack) {
            videoTrack.attach(videoElement);
            console.log('Local video attached for:', localParticipant.identity);
          }
        } catch (error) {
          console.error('Error setting up local video:', error);
        }
      };

      attachLocalVideo();

      const handleTrackPublished = () => {
        setTimeout(attachLocalVideo, 100);
      };

      localParticipant.on(ParticipantEvent.LocalTrackPublished, handleTrackPublished);

      return () => {
        localParticipant.off(ParticipantEvent.LocalTrackPublished, handleTrackPublished);
      };
    } else {
      // Handle remote participant
      const remoteParticipant = participant as RemoteParticipant;

      const attachRemoteVideo = () => {
        const videoTrack = Array.from(remoteParticipant.videoTrackPublications.values())[0]?.videoTrack;
        if (videoTrack) {
          videoTrack.attach(videoElement);
          console.log('Remote video attached for:', remoteParticipant.identity);
        }
      };

      const handleTrackSubscribed = (track: Track) => {
        if (track.kind === Track.Kind.Video) {
          track.attach(videoElement);
          console.log('Remote video track subscribed for:', remoteParticipant.identity);
        }
      };

      const handleTrackUnsubscribed = (track: Track) => {
        if (track.kind === Track.Kind.Video) {
          track.detach(videoElement);
          console.log('Remote video track unsubscribed for:', remoteParticipant.identity);
        }
      };

      // Attach existing tracks
      attachRemoteVideo();

      // Listen for new tracks
      remoteParticipant.on(ParticipantEvent.TrackSubscribed, handleTrackSubscribed);
      remoteParticipant.on(ParticipantEvent.TrackUnsubscribed, handleTrackUnsubscribed);

      return () => {
        remoteParticipant.off(ParticipantEvent.TrackSubscribed, handleTrackSubscribed);
        remoteParticipant.off(ParticipantEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      };
    }
  }, [participant, isLocal]);

  const hasVideo = participant.videoTrackPublications.size > 0;

  return (
    <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-cover"
      />
      
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center text-gray-300">
            <User size={48} className="mx-auto mb-2" />
            <div className="text-sm font-medium">{displayName}</div>
            <div className="text-xs text-gray-400 mt-1">Camera Off</div>
          </div>
        </div>
      )}
      
      {/* Participant Info Overlay */}
      <div className="absolute bottom-3 left-3 flex items-center space-x-2">
        <div className="bg-black bg-opacity-70 rounded px-2 py-1 flex items-center space-x-1">
          {participant.isMicrophoneEnabled ? (
            <Mic size={12} className="text-green-400" />
          ) : (
            <MicOff size={12} className="text-red-400" />
          )}
          <span className="text-xs text-white font-medium">
            {displayName}
          </span>
        </div>
      </div>

      {/* Speaking Indicator */}
      {participant.isSpeaking && (
        <div className="absolute top-3 left-3">
          <div className="bg-green-500 px-2 py-1 rounded-full flex items-center space-x-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-white">Speaking</span>
          </div>
        </div>
      )}

      {/* Video Controls for Local Participant */}
      {isLocal && (
        <div className="absolute bottom-3 right-3 flex space-x-2">
          <button className="w-8 h-8 bg-black bg-opacity-50 rounded-full flex items-center justify-center hover:bg-opacity-70 transition-colors">
            {participant.isCameraEnabled ? (
              <VideoIcon size={14} className="text-white" />
            ) : (
              <VideoOff size={14} className="text-red-400" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default function VideoGrid({ room, localParticipant, participants }: VideoGridProps) {
  const allParticipants = localParticipant ? [localParticipant, ...participants] : participants;

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <RoomAudioRenderer />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {localParticipant && (
          <ParticipantVideo participant={localParticipant} isLocal={true} />
        )}
        {participants.map((participant) => (
          <ParticipantVideo key={participant.sid} participant={participant} />
        ))}

        {/* Empty Participant Slots */}
        {allParticipants.length < 6 && (
          <div className="relative aspect-video bg-gray-700 rounded-lg overflow-hidden border-2 border-dashed border-gray-600">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <User size={32} className="mx-auto mb-2" />
                <div className="text-sm">Waiting for participants...</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
