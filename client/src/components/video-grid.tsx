import { Room, LocalParticipant, RemoteParticipant } from "livekit-client";
import { VideoTrack, AudioTrack, ParticipantTile, RoomAudioRenderer } from "@livekit/components-react";
import { User, Mic, MicOff, Video as VideoIcon, VideoOff } from "lucide-react";

interface VideoGridProps {
  room: Room;
  localParticipant: LocalParticipant | null;
  participants: RemoteParticipant[];
}

export default function VideoGrid({ room, localParticipant, participants }: VideoGridProps) {
  const allParticipants = localParticipant ? [localParticipant, ...participants] : participants;

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <RoomAudioRenderer />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allParticipants.map((participant) => (
          <div key={participant.sid} className="relative aspect-video bg-gray-700 rounded-lg overflow-hidden">
            <ParticipantTile
              participant={participant}
              className="w-full h-full"
            />
            
            {/* Participant Info Overlay */}
            <div className="absolute bottom-3 left-3 flex items-center space-x-2">
              <div className="bg-black bg-opacity-50 rounded-full px-2 py-1 flex items-center space-x-1">
                {participant.isMicrophoneEnabled ? (
                  <Mic size={12} className="text-white" />
                ) : (
                  <MicOff size={12} className="text-red-400" />
                )}
                <span className="text-xs text-white font-medium">
                  {participant === localParticipant ? 'You' : participant.name || participant.identity}
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
            {participant === localParticipant && (
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
