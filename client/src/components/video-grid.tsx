// video-grid.tsx
import { addTrackToDeepgramStream } from "@/services/deepgram-service";

import {
  Room,
  LocalParticipant,
  RemoteParticipant,
  Track,
  ParticipantEvent,
} from "livekit-client";
import { User } from "lucide-react";
import { useEffect, useRef } from "react";

// Declare window hook for Deepgram audio forwarding
declare global {
  interface Window {
    forwardAudioToDeepgram?: (track: Track, identity: string) => void;
  }
}

interface VideoGridProps {
  room: Room;
  localParticipant: LocalParticipant | null;
  participants: RemoteParticipant[];
  userRole?: string;
}

function AudioEnabledParticipant({
  participant,
  isLocal,
  userRole,
}: {
  participant: LocalParticipant | RemoteParticipant;
  isLocal: boolean;
  userRole?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!participant) return;

    const handleTrackSubscribed = (track: Track) => {
      // video branch omitted for brevity
      if (track.kind === Track.Kind.Audio && !isLocal && audioRef.current) {
        track.attach(audioRef.current);
        audioRef.current.volume = 1.0;
        audioRef.current.muted = false;
        console.log(`✅ Audio attached for: ${participant.identity}`);

        // 🚀 Forward the audio track into Deepgram’s stream:
        addTrackToDeepgramStream(track.mediaStreamTrack);
        console.log(`🎧 Forwarding to Deepgram: ${participant.identity}`);

        audioRef.current
          .play()
          .catch((e) => console.log("Audio autoplay prevented:", e));
      }
    };

    const handleTrackUnsubscribed = (track: Track) => {
      console.log(
        `❌ Track unsubscribed: ${track.kind} from ${participant.identity}`,
      );

      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.detach(videoRef.current);
      } else if (track.kind === Track.Kind.Audio && audioRef.current) {
        track.detach(audioRef.current);
      }
    };

    // Attach existing tracks
    participant.audioTrackPublications.forEach((pub) => {
      if (pub.track) handleTrackSubscribed(pub.track);
    });
    participant.videoTrackPublications.forEach((pub) => {
      if (pub.track) handleTrackSubscribed(pub.track);
    });

    participant.on(ParticipantEvent.TrackSubscribed, handleTrackSubscribed);
    participant.on(ParticipantEvent.TrackUnsubscribed, handleTrackUnsubscribed);

    return () => {
      participant.off(ParticipantEvent.TrackSubscribed, handleTrackSubscribed);
      participant.off(
        ParticipantEvent.TrackUnsubscribed,
        handleTrackUnsubscribed,
      );
    };
  }, [participant, isLocal]);

  const getDisplayName = () => {
    if (isLocal) {
      return userRole === "interviewer"
        ? "You (Interviewer)"
        : "You (Candidate)";
    } else {
      const role = participant.identity.includes("interviewer")
        ? "Interviewer"
        : "Candidate";
      const id = participant.identity.split("-").pop()?.substring(0, 6) || "";
      return `${role}-${id}`;
    }
  };

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
        muted={isLocal}
      />
      {!isLocal && (
        <audio
          ref={audioRef}
          autoPlay
          playsInline
          style={{ display: "none" }}
        />
      )}
      <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
        {getDisplayName()}
      </div>
    </div>
  );
}

export default function VideoGrid({
  room,
  localParticipant,
  participants,
  userRole,
}: VideoGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
      {localParticipant && (
        <AudioEnabledParticipant
          participant={localParticipant}
          isLocal={true}
          userRole={userRole}
        />
      )}
      {participants.map((participant) => (
        <AudioEnabledParticipant
          key={participant.identity}
          participant={participant}
          isLocal={false}
          userRole={userRole}
        />
      ))}
      {participants.length === 0 && localParticipant && (
        <div className="bg-gray-100 rounded-lg aspect-video flex items-center justify-center border-2 border-dashed border-gray-300">
          <div className="text-center text-gray-500">
            <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Waiting for{" "}
              {userRole === "interviewer" ? "candidate" : "interviewer"}...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
