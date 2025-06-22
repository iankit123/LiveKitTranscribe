import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  LogOut,
  Settings,
  Copy,
  Share2,
  Clock,
  Play,
  Pause,
  RotateCcw,
  MessageSquare,
  Lightbulb,
  Users,
  Video,
  Mic,
  MicOff,
  VideoOff,
  AlertTriangle,
} from "lucide-react";
import { useMeeting } from "@/hooks/use-meeting";
import { useTranscription } from "@/hooks/use-transcription";
import { useFollowUpSuggestions } from "@/hooks/use-follow-up-suggestions";
import { useInterviewTimer } from "@/hooks/use-interview-timer";
import VideoGrid from "@/components/video-grid";
import ErrorBoundary from "@/components/error-boundary";
import MeetingControls from "@/components/meeting-controls";
import { parseInterviewPlan } from "@/utils/interview-plan-parser";
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

  // Check URL parameters for role specification
  const urlParams = new URLSearchParams(window.location.search);
  const urlRole = urlParams.get("role");
  const isInterviewer = urlRole === "interviewer";
  const isCurrentUserInterviewer = isInterviewer;

  // Get meeting state from localStorage - check multiple possible keys and sessionStorage
  const jobDescription =
    localStorage.getItem(`jobDescription_${roomName}`) ||
    localStorage.getItem("jobDescription") ||
    sessionStorage.getItem("jobDescription") ||
    "";

  const interviewPlanText =
    localStorage.getItem(`interviewPlan_${roomName}`) ||
    localStorage.getItem("interviewPlan") ||
    sessionStorage.getItem("interviewPlan") ||
    "";

  console.log(
    "📋 Looking for interview plan in localStorage and sessionStorage...",
  );
  console.log("📋 Room-specific key:", `interviewPlan_${roomName}`);
  console.log(
    "📋 localStorage general key:",
    localStorage.getItem("interviewPlan"),
  );
  console.log(
    "📋 sessionStorage general key:",
    sessionStorage.getItem("interviewPlan"),
  );
  console.log(
    "📋 Room-specific key value:",
    localStorage.getItem(`interviewPlan_${roomName}`),
  );
  console.log("📋 Final plan text found:", interviewPlanText);

  // Debug: Check all localStorage keys
  console.log("📋 All localStorage keys:", Object.keys(localStorage));
  console.log("📋 All sessionStorage keys:", Object.keys(sessionStorage));

  const interviewPlan = useMemo(() => {
    // Re-check all possible storage locations
    const currentPlanText =
      localStorage.getItem("interviewPlan") ||
      sessionStorage.getItem("interviewPlan") ||
      interviewPlanText;

    console.log("📋 Final plan text for parsing:", currentPlanText);

    if (!currentPlanText) {
      console.log("⚠️ No interview plan text found, creating fallback plan");
      // Create a fallback plan based on your home page example
      const fallbackPlan = [
        { label: "Intro", minutes: 5 },
        { label: "Past Projects", minutes: 15 },
        { label: "Case Study", minutes: 15 },
        { label: "Coding", minutes: 20 },
        { label: "Wrap-up", minutes: 5 },
      ];
      console.log("📋 Using fallback plan:", fallbackPlan);
      return fallbackPlan;
    }

    console.log("📋 Parsing interview plan text:", currentPlanText);
    const parsed = parseInterviewPlan(currentPlanText);
    console.log("📋 Parsed interview plan result:", parsed);

    if (parsed.length === 0) {
      console.log("⚠️ Parsing resulted in empty plan, using fallback");
      return [
        { label: "Intro", minutes: 5 },
        { label: "Past Projects", minutes: 15 },
        { label: "Case Study", minutes: 15 },
        { label: "Coding", minutes: 20 },
        { label: "Wrap-up", minutes: 5 },
      ];
    }

    return parsed;
  }, [interviewPlanText]);

  // Meeting hooks
  const {
    room,
    localParticipant,
    participants,
    isConnected,
    isConnecting,
    error,
    connectToRoom,
    disconnectFromRoom,
    toggleMute,
    toggleVideo,
    isMuted,
    isVideoDisabled,
  } = useMeeting();

  // FIXED: Pass the current user's role to transcription hook
  // This will help identify who is speaking based on audio source
  const {
    transcriptions,
    isTranscribing,
    startTranscription,
    stopTranscription,
    clearTranscriptions,
  } = useTranscription(
    "deepgram",
    room,
    isInterviewer ? "interviewer" : "candidate",
  );

  // Follow-up suggestions hooks
  const { suggestions, isLoading, generateSuggestions } =
    useFollowUpSuggestions();

  console.log("🎯 Component level - suggestions state:", suggestions);
  console.log("🎯 Component level - isLoading:", isLoading);

  const handleGenerateSuggestions = () => {
    console.log("🎯 Generate suggestions clicked");
    console.log("📝 Current transcriptions:", transcriptions);
    console.log("📝 Transcriptions length:", transcriptions?.length);
    console.log(
      "📝 Transcriptions type:",
      typeof transcriptions,
      Array.isArray(transcriptions),
    );

    // Ensure transcriptions is an array
    const safeTranscriptions = Array.isArray(transcriptions)
      ? transcriptions
      : [];
    generateSuggestions(safeTranscriptions, customInstruction);
  };

  // Timer hooks
  const timerHookResult = useInterviewTimer(interviewPlan);
  const {
    timerState,
    isRunning: isTimerRunning,
    startTimer,
    stopTimer,
    resetTimer,
    dismissNudge,
  } = timerHookResult;

  // Debug timer state
  useEffect(() => {
    console.log("⏰ Timer state updated:", {
      timerState,
      isRunning: isTimerRunning,
      currentBlock: timerState?.currentBlock,
      nextBlock: timerState?.nextBlock,
      interviewPlan: interviewPlan,
    });
  }, [timerState, isTimerRunning, interviewPlan]);

  // Connect to room on mount
  useEffect(() => {
    const participantName = isInterviewer
      ? `Interviewer-${Math.random().toString(36).substring(2, 8)}`
      : `Candidate-${Math.random().toString(36).substring(2, 8)}`;

    console.log(
      "Connecting to room with participant name:",
      participantName,
      "Role:",
      isInterviewer ? "Interviewer" : "Candidate",
    );
    connectToRoom(roomName, participantName);

    return () => {
      disconnectFromRoom();
    };
  }, [roomName, isInterviewer]);

  const handleLeaveRoom = () => {
    disconnectFromRoom();
    setLocation("/");
  };

  const handleShare = () => {
    const shareUrl = isCurrentUserInterviewer
      ? `${window.location.origin}/meeting/${roomName}?role=candidate`
      : `${window.location.origin}/meeting/${roomName}?role=interviewer`;

    if (navigator.share) {
      navigator.share({
        title: "Join Interview",
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied!",
        description: `${isCurrentUserInterviewer ? "Candidate" : "Interviewer"} link copied to clipboard`,
      });
    }
  };

  const handleCopyLink = () => {
    const shareUrl = isCurrentUserInterviewer
      ? `${window.location.origin}/meeting/${roomName}?role=candidate`
      : `${window.location.origin}/meeting/${roomName}?role=interviewer`;

    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link copied!",
      description: `${isCurrentUserInterviewer ? "Candidate" : "Interviewer"} link copied to clipboard`,
    });
  };

  const formatTime = (minutes: number, seconds: number) => {
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const [customInstruction, setCustomInstruction] = useState("");

  // ADDED: Helper function to get proper speaker label
  // FIXED: Updated getSpeakerLabel function with better participant identification
  const getSpeakerLabel = (transcription) => {
    console.log("🎤 Getting speaker label for transcription:", transcription);
    console.log("🎤 Local participant:", localParticipant?.identity);
    console.log("🎤 Current user is interviewer:", isInterviewer);
    console.log(
      "🎤 All participants:",
      participants?.map((p) => ({ identity: p.identity, name: p.name })),
    );

    // Method 1: Use participantId/participantIdentity if available
    const participantId =
      transcription.participantId ||
      transcription.participantIdentity ||
      transcription.participant?.identity;

    if (participantId && localParticipant) {
      console.log(
        "🎤 Comparing participantId:",
        participantId,
        "with local:",
        localParticipant.identity,
      );

      // If it's the local participant (current user)
      if (participantId === localParticipant.identity) {
        const label = isInterviewer ? "Interviewer" : "Candidate";
        console.log("🎤 Local participant speaking:", label);
        return label;
      }

      // If it's a remote participant, find them in the participants list
      const remoteParticipant = participants?.find(
        (p) => p.identity === participantId,
      );
      if (remoteParticipant) {
        // Try to determine role from participant name/identity
        const participantName =
          remoteParticipant.name || remoteParticipant.identity || "";
        console.log("🎤 Remote participant name:", participantName);

        if (participantName.toLowerCase().includes("interviewer")) {
          console.log("🎤 Remote participant is interviewer");
          return "Interviewer";
        } else if (participantName.toLowerCase().includes("candidate")) {
          console.log("🎤 Remote participant is candidate");
          return "Candidate";
        }

        // If we can't determine from name, assume opposite role of current user
        const label = isInterviewer ? "Candidate" : "Interviewer";
        console.log("🎤 Remote participant (opposite role):", label);
        return label;
      }
    }

    // Method 2: Use audio track source ID to identify speaker
    if (transcription.trackSid || transcription.audioTrackSid) {
      const trackSid = transcription.trackSid || transcription.audioTrackSid;
      console.log("🎤 Using track SID:", trackSid);

      // Check if it's the local participant's audio track
      if (localParticipant?.audioTracks) {
        const localAudioTrack = Array.from(
          localParticipant.audioTracks.values(),
        )[0];
        if (localAudioTrack?.trackSid === trackSid) {
          const label = isInterviewer ? "Interviewer" : "Candidate";
          console.log("🎤 Local audio track match:", label);
          return label;
        }
      }

      // Check remote participants' audio tracks
      if (participants) {
        for (const participant of participants) {
          if (participant.audioTracks) {
            const remoteAudioTrack = Array.from(
              participant.audioTracks.values(),
            )[0];
            if (remoteAudioTrack?.trackSid === trackSid) {
              // Try to determine role from participant name
              const participantName =
                participant.name || participant.identity || "";
              if (participantName.toLowerCase().includes("interviewer")) {
                console.log("🎤 Remote audio track - interviewer");
                return "Interviewer";
              } else if (participantName.toLowerCase().includes("candidate")) {
                console.log("🎤 Remote audio track - candidate");
                return "Candidate";
              }

              // Default to opposite role
              const label = isInterviewer ? "Candidate" : "Interviewer";
              console.log("🎤 Remote audio track (opposite role):", label);
              return label;
            }
          }
        }
      }
    }

    // Method 3: Use speaker field if it contains useful information
    if (transcription.speaker) {
      console.log("🎤 Using speaker field:", transcription.speaker);

      // If speaker is already correctly labeled
      if (
        transcription.speaker === "Interviewer" ||
        transcription.speaker === "Candidate"
      ) {
        console.log("🎤 Speaker already labeled:", transcription.speaker);
        return transcription.speaker;
      }

      // If speaker contains role information
      const speakerLower = transcription.speaker.toLowerCase();
      if (speakerLower.includes("interviewer")) {
        console.log("🎤 Speaker contains 'interviewer'");
        return "Interviewer";
      } else if (speakerLower.includes("candidate")) {
        console.log("🎤 Speaker contains 'candidate'");
        return "Candidate";
      }
    }

    // Method 4: Use transcription source/origin if available
    if (transcription.source === "local" || transcription.isLocal) {
      const label = isInterviewer ? "Interviewer" : "Candidate";
      console.log("🎤 Local transcription source:", label);
      return label;
    } else if (transcription.source === "remote" || transcription.isRemote) {
      const label = isInterviewer ? "Candidate" : "Interviewer";
      console.log("🎤 Remote transcription source:", label);
      return label;
    }

    // Final fallback - this shouldn't happen often
    console.log("🎤 Using final fallback - assuming current user");
    return isInterviewer ? "Interviewer" : "Candidate";
  };

  // Note: Transcription hook is already initialized above, no need to duplicate

  // ENHANCED: Better participant name generation in useEffect
  useEffect(() => {
    // Generate more descriptive participant names that include role information
    const timestamp = Math.random().toString(36).substring(2, 8);
    const participantName = isInterviewer
      ? `Interviewer-${roomName}-${timestamp}`
      : `Candidate-${roomName}-${timestamp}`;

    console.log(
      "🎯 Connecting to room with enhanced participant name:",
      participantName,
      "Role:",
      isInterviewer ? "Interviewer" : "Candidate",
      "Room:",
      roomName,
    );

    connectToRoom(roomName, participantName);

    return () => {
      disconnectFromRoom();
    };
  }, [roomName, isInterviewer]);

  // DEBUGGING: Add this function to help debug transcription issues
  const debugTranscription = (transcription) => {
    console.log("🔍 TRANSCRIPTION DEBUG:", {
      transcriptionId: transcription.id,
      text: transcription.text,
      participantId: transcription.participantId,
      participantIdentity: transcription.participantIdentity,
      speaker: transcription.speaker,
      trackSid: transcription.trackSid,
      audioTrackSid: transcription.audioTrackSid,
      source: transcription.source,
      isLocal: transcription.isLocal,
      isRemote: transcription.isRemote,
      localParticipantId: localParticipant?.identity,
      currentUserRole: isInterviewer ? "interviewer" : "candidate",
      participantsCount: participants?.length || 0,
      participantsList: participants?.map((p) => ({
        identity: p.identity,
        name: p.name,
        hasAudio: p.audioTracks?.size > 0,
      })),
    });
  };

  if (error && !isConnecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-red-900 mb-2">
              Connection Error
            </h2>
            <p className="text-red-700 mb-6">{error}</p>
            <Button onClick={() => setLocation("/")} className="w-full">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isConnecting || !isConnected || !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">
            {isConnecting ? "Connecting to room..." : "Setting up room..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Floating Status Bar */}
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-full px-6 py-3 shadow-xl">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${isTranscribing ? "bg-red-500 animate-pulse" : "bg-gray-400"}`}
              ></div>
              <span className="font-medium">
                {isTranscribing ? "Transcribing" : "Not Recording"}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="font-medium">Connected</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-3 h-3" />
              <span className="font-mono font-medium">
                {formatTime(
                  timerState.elapsedMinutes,
                  timerState.elapsedSeconds,
                )}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-3 h-3" />
              <span>
                {(participants?.length || 0) + (localParticipant ? 1 : 0)}{" "}
                participants
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Interview: {roomName}
            </h1>
            <p className="text-gray-600">
              {isInterviewer ? "Interviewer Dashboard" : "Candidate View"}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button onClick={handleShare} variant="outline" size="sm">
              <Share2 className="mr-2" size={16} />
              Share {isCurrentUserInterviewer
                ? "Candidate"
                : "Interviewer"}{" "}
              Link
            </Button>

            <Button onClick={handleCopyLink} variant="outline" size="sm">
              <Copy className="mr-2" size={16} />
              Copy Link
            </Button>

            <Button onClick={handleLeaveRoom} variant="destructive" size="sm">
              <LogOut className="mr-2" size={16} />
              Leave
            </Button>
          </div>
        </div>
      </div>

      {/* Main Dashboard */}
      <div className="p-6 pt-20">
        {/* Video Section */}
        {isConnected && room && localParticipant ? (
          <div className="mb-6">
            <ErrorBoundary
              fallback={
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <p className="text-red-800">
                    Video component failed to load. Please refresh the page.
                  </p>
                </div>
              }
            >
              <VideoGrid
                room={room}
                localParticipant={localParticipant}
                participants={participants}
                userRole={isInterviewer ? "interviewer" : "candidate"}
              />
            </ErrorBoundary>
          </div>
        ) : isConnected && room ? (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <p className="text-yellow-800">Setting up video connection...</p>
          </div>
        ) : null}

        {/* Only show dashboard to interviewer */}
        {isInterviewer && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT PANEL - Interview Flow */}
            <Card className="rounded-xl bg-white/90 backdrop-blur shadow-lg border-0">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-xl">
                  <Clock className="w-5 h-5 mr-2 text-indigo-600" />
                  Interview Flow
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Timer Section */}
                <div className="text-center bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-6">
                  <div className="text-4xl font-mono font-bold text-indigo-600 mb-2">
                    {formatTime(
                      timerState?.elapsedMinutes || 0,
                      timerState?.elapsedSeconds || 0,
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mb-4">Elapsed Time</div>

                  {/* Interview Plan Progress */}
                  {console.log(
                    "🎯 Rendering timer section. Current block:",
                    timerState?.currentBlock,
                    "Next block:",
                    timerState?.nextBlock,
                  )}
                  {interviewPlan.length > 0 ? (
                    <div className="mb-4 text-sm">
                      {timerState?.currentBlock ? (
                        <>
                          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full mb-2">
                            Current: {timerState.currentBlock.label} (
                            {timerState.currentBlock.minutes}min)
                          </div>
                          {console.log(
                            "📍 Rendered current block:",
                            timerState.currentBlock.label,
                          )}
                          {timerState.nextBlock && (
                            <>
                              <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                                Next: {timerState.nextBlock.label} (
                                {timerState.nextBlock.minutes}min)
                              </div>
                              {console.log(
                                "📍 Rendered next block:",
                                timerState.nextBlock.label,
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        <div className="text-gray-500 text-xs">
                          {console.log(
                            "🔍 No current block, showing plan overview",
                          )}
                          Plan:{" "}
                          {interviewPlan
                            .map(
                              (block) => `${block.label} (${block.minutes}m)`,
                            )
                            .join(" → ")}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mb-4 text-sm text-gray-500">
                      {console.log(" �� No interview plan available")}
                      No interview plan set
                    </div>
                  )}

                  <div className="flex justify-center space-x-2">
                    <Button
                      onClick={() => {
                        console.log(
                          "🎯 Timer button clicked, isRunning:",
                          isTimerRunning,
                        );
                        if (isTimerRunning) {
                          console.log("⏸️ Stopping timer");
                          stopTimer();
                        } else {
                          console.log("▶️ Starting timer");
                          startTimer();
                        }
                      }}
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {isTimerRunning ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        console.log("🔄 Reset timer clicked");
                        resetTimer();
                      }}
                      size="sm"
                      variant="outline"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Current Segment */}
                {timerState.currentBlock && (
                  <div className="space-y-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-800">
                          Current Section
                        </span>
                        <Badge className="bg-green-100 text-green-800">
                          {timerState.currentBlock.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-green-700">
                        Target: {timerState.currentBlock.minutes} minutes
                      </p>
                    </div>

                    {timerState.nextBlock && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-800">
                            Next Section
                          </span>
                          <Badge
                            variant="outline"
                            className="text-blue-800 border-blue-300"
                          >
                            {timerState.nextBlock.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-blue-700">
                          Duration: {timerState.nextBlock.minutes} minutes
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Soft Nudge */}
                {timerState.shouldShowNudge && timerState.nextBlock && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-orange-800 mb-2">
                          Time Reminder
                        </p>
                        <p className="text-sm text-orange-700 mb-3">
                          You planned to start "{timerState.nextBlock.label}"
                          now. Continue with current section or move on?
                        </p>
                        <Button
                          onClick={dismissNudge}
                          size="sm"
                          variant="outline"
                          className="border-orange-300 text-orange-700 hover:bg-orange-100"
                        >
                          Got it
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* RIGHT PANEL - Input & Suggestions */}
            <div className="space-y-6">
              {/* Live Transcription */}
              {/* Live Transcription - FIXED VERSION */}
              <Card className="rounded-xl bg-white/90 backdrop-blur shadow-lg border-0">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center text-xl">
                      <MessageSquare className="w-5 h-5 mr-2 text-cyan-600" />
                      Live Transcription
                    </CardTitle>
                    <Button
                      onClick={
                        isTranscribing ? stopTranscription : startTranscription
                      }
                      size="sm"
                      className={
                        isTranscribing
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-green-600 hover:bg-green-700"
                      }
                    >
                      {isTranscribing ? (
                        <MicOff className="w-4 h-4" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="max-h-64 overflow-y-auto space-y-3">
                    {(transcriptions?.length || 0) === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">
                          Start transcription to see live conversation
                        </p>
                      </div>
                    ) : (
                      (transcriptions || []).slice(-10).map((transcription) => {
                        // FIXED: Enhanced speaker identification with debugging
                        console.log(
                          "🎤 Processing transcription for display:",
                          transcription,
                        );

                        // Call debug function to log all available data
                        const debugInfo = {
                          transcriptionId: transcription.id,
                          text: transcription.text,
                          participantId: transcription.participantId,
                          participantIdentity:
                            transcription.participantIdentity,
                          speaker: transcription.speaker,
                          trackSid: transcription.trackSid,
                          audioTrackSid: transcription.audioTrackSid,
                          source: transcription.source,
                          isLocal: transcription.isLocal,
                          isRemote: transcription.isRemote,
                          localParticipantId: localParticipant?.identity,
                          currentUserIsInterviewer: isInterviewer,
                          participantsCount: participants?.length || 0,
                        };
                        console.log("🔍 TRANSCRIPTION DEBUG:", debugInfo);

                        // Use the enhanced getSpeakerLabel function
                        const speakerLabel = getSpeakerLabel(transcription);
                        console.log("🎯 Final speaker label:", speakerLabel);

                        return (
                          <div
                            key={transcription.id}
                            className="border-l-2 border-gray-200 pl-3 py-2"
                          >
                            <div className="flex items-center space-x-2 mb-1">
                              <Badge
                                variant={
                                  speakerLabel === "Interviewer"
                                    ? "default"
                                    : "secondary"
                                }
                                className={
                                  speakerLabel === "Interviewer"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-green-100 text-green-800"
                                }
                              >
                                {speakerLabel}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {new Date(
                                  transcription.timestamp,
                                ).toLocaleTimeString()}
                              </span>
                              <span className="text-xs text-gray-400">
                                {Math.round(
                                  (transcription.confidence || 0) * 100,
                                )}
                                %
                              </span>
                              {/* DEBUG: Show participant ID in development */}
                              {process.env.NODE_ENV === "development" && (
                                <span className="text-xs text-purple-500">
                                  ID:{" "}
                                  {transcription.participantId ||
                                    transcription.participantIdentity ||
                                    "unknown"}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700">
                              {transcription.text}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* ADDED: Debug panel (only in development) */}
                  {process.env.NODE_ENV === "development" && (
                    <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
                      <div className="font-medium mb-2">Debug Info:</div>
                      <div>Local Participant: {localParticipant?.identity}</div>
                      <div>
                        Current User Role:{" "}
                        {isInterviewer ? "Interviewer" : "Candidate"}
                      </div>
                      <div>Participants: {participants?.length || 0}</div>
                      <div>
                        Recent Transcriptions: {transcriptions?.length || 0}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Follow-Up Suggestions */}
              <Card className="rounded-xl bg-white/90 backdrop-blur shadow-lg border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-xl">
                    <Lightbulb className="w-5 h-5 mr-2 text-amber-600" />
                    Follow-Up Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Custom Instruction Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Instructions
                    </label>
                    <Textarea
                      placeholder="e.g., Ask more technical questions about their last project..."
                      value={customInstruction}
                      onChange={(e) => setCustomInstruction(e.target.value)}
                      className="min-h-[60px] text-sm"
                    />
                  </div>

                  <Button
                    onClick={() => {
                      console.log(
                        "🎯 Button clicked, clearing suggestions first",
                      );
                      // Force clear suggestions and regenerate
                      const safeTranscriptions = Array.isArray(transcriptions)
                        ? transcriptions
                        : [];
                      console.log(
                        "🔄 Force regenerating with:",
                        safeTranscriptions.length,
                        "transcriptions",
                      );
                      generateSuggestions(
                        safeTranscriptions,
                        customInstruction,
                      );
                    }}
                    disabled={isLoading}
                    className="w-full bg-amber-600 hover:bg-amber-700"
                  >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    {isLoading ? "Generating..." : "Get Follow-Up Questions"}
                  </Button>

                  {/* Suggestions List */}
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {console.log(
                      "🎯 Rendering suggestions - raw:",
                      suggestions,
                    )}
                    {console.log(
                      "🎯 Rendering suggestions - type:",
                      typeof suggestions,
                      "isArray:",
                      Array.isArray(suggestions),
                    )}
                    {!suggestions ||
                    !Array.isArray(suggestions) ||
                    suggestions.length === 0 ? (
                      <div className="text-center py-6">
                        <Lightbulb className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">
                          Generate follow-up questions based on the conversation
                        </p>
                      </div>
                    ) : (
                      suggestions.slice(0, 5).map((suggestion, index) => (
                        <div
                          key={index}
                          className="bg-amber-50 border border-amber-200 rounded-lg p-3"
                        >
                          <p className="text-sm text-gray-800 font-medium mb-2">
                            {suggestion.question}
                          </p>
                          {suggestion.reasoning && (
                            <p className="text-xs text-amber-700">
                              {suggestion.reasoning}
                            </p>
                          )}
                          <Button
                            onClick={() =>
                              navigator.clipboard.writeText(suggestion.question)
                            }
                            size="sm"
                            variant="ghost"
                            className="mt-2 h-6 px-2 text-xs"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Candidate View */}
        {!isInterviewer && (
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Candidate View
            </h2>
            <p className="text-gray-600">
              Focus on the interview - your responses are being recorded
            </p>
          </div>
        )}
      </div>

      {/* Meeting Controls Bar */}
      <MeetingControls
        isMuted={isMuted}
        isVideoDisabled={isVideoDisabled}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={() => {
          /* TODO: Implement screen share */
        }}
        onOpenSettings={() => {
          /* TODO: Implement settings */
        }}
      />
    </div>
  );
}
