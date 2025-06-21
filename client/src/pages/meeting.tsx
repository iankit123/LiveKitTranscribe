import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { LogOut, Settings, Copy, Share2, Clock, Play, Pause, RotateCcw, MessageSquare, Lightbulb, Users, Video, Mic, MicOff, VideoOff, AlertTriangle } from "lucide-react";
import { useMeeting } from "@/hooks/use-meeting";
import { useTranscription } from "@/hooks/use-transcription";
import { useFollowUpSuggestions } from "@/hooks/use-follow-up-suggestions";
import { useInterviewTimer } from "@/hooks/use-interview-timer";
import VideoGrid from "@/components/video-grid";
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
  const urlRole = urlParams.get('role');
  const isInterviewer = urlRole === 'interviewer';
  const isCurrentUserInterviewer = isInterviewer;

  // Get meeting state from localStorage or default
  const jobDescription = localStorage.getItem(`jobDescription_${roomName}`) || '';
  const interviewPlanText = localStorage.getItem(`interviewPlan_${roomName}`) || '';
  const interviewPlan = parseInterviewPlan(interviewPlanText);

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
    isVideoDisabled
  } = useMeeting();

  // Transcription hooks
  const {
    transcriptions,
    isTranscribing,
    startTranscription,
    stopTranscription,
    clearTranscriptions
  } = useTranscription('deepgram', room, isInterviewer);

  // Follow-up suggestions hooks
  const {
    suggestions,
    isLoading,
    generateSuggestions
  } = useFollowUpSuggestions();

  const handleGenerateSuggestions = () => {
    console.log('🎯 Generate suggestions clicked');
    console.log('📝 Current transcriptions:', transcriptions);
    console.log('📝 Transcriptions length:', transcriptions?.length);
    console.log('📝 Transcriptions type:', typeof transcriptions, Array.isArray(transcriptions));
    
    // Ensure transcriptions is an array
    const safeTranscriptions = Array.isArray(transcriptions) ? transcriptions : [];
    generateSuggestions(safeTranscriptions, customInstruction);
  };

  // Timer hooks
  const {
    timerState,
    isRunning: isTimerRunning,
    startTimer,
    stopTimer,
    resetTimer,
    dismissNudge
  } = useInterviewTimer(interviewPlan);

  // Connect to room on mount
  useEffect(() => {
    const participantName = isInterviewer ? 
      `Interviewer-${Math.random().toString(36).substring(2, 8)}` : 
      `Candidate-${Math.random().toString(36).substring(2, 8)}`;
    
    console.log('Connecting to room with participant name:', participantName, 'Role:', isInterviewer ? 'Interviewer' : 'Candidate');
    connectToRoom(roomName, participantName);

    return () => {
      disconnectFromRoom();
    };
  }, [roomName, isInterviewer]);

  const handleLeaveRoom = () => {
    disconnectFromRoom();
    setLocation('/');
  };

  const handleShare = () => {
    const shareUrl = isCurrentUserInterviewer ? 
      `${window.location.origin}/meeting/${roomName}?role=candidate` :
      `${window.location.origin}/meeting/${roomName}?role=interviewer`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Join Interview',
        url: shareUrl
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied!",
        description: `${isCurrentUserInterviewer ? 'Candidate' : 'Interviewer'} link copied to clipboard`,
      });
    }
  };

  const handleCopyLink = () => {
    const shareUrl = isCurrentUserInterviewer ? 
      `${window.location.origin}/meeting/${roomName}?role=candidate` :
      `${window.location.origin}/meeting/${roomName}?role=interviewer`;
    
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link copied!",
      description: `${isCurrentUserInterviewer ? 'Candidate' : 'Interviewer'} link copied to clipboard`,
    });
  };

  const formatTime = (minutes: number, seconds: number) => {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const [customInstruction, setCustomInstruction] = useState('');

  if (error && !isConnecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-red-900 mb-2">Connection Error</h2>
            <p className="text-red-700 mb-6">{error}</p>
            <Button onClick={() => setLocation('/')} className="w-full">
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
            {isConnecting ? 'Connecting to room...' : 'Setting up room...'}
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
              <div className={`w-2 h-2 rounded-full ${isTranscribing ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="font-medium">{isTranscribing ? 'Transcribing' : 'Not Recording'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="font-medium">Connected</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-3 h-3" />
              <span className="font-mono font-medium">
                {formatTime(timerState.elapsedMinutes, timerState.elapsedSeconds)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-3 h-3" />
              <span>{(participants?.length || 0) + (localParticipant ? 1 : 0)} participants</span>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Interview: {roomName}</h1>
            <p className="text-gray-600">{isInterviewer ? 'Interviewer Dashboard' : 'Candidate View'}</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button 
              onClick={handleShare}
              variant="outline"
              size="sm"
            >
              <Share2 className="mr-2" size={16} />
              Share {isCurrentUserInterviewer ? 'Candidate' : 'Interviewer'} Link
            </Button>
            
            <Button 
              onClick={handleCopyLink}
              variant="outline"
              size="sm"
            >
              <Copy className="mr-2" size={16} />
              Copy Link
            </Button>
            
            <Button 
              onClick={handleLeaveRoom}
              variant="destructive"
              size="sm"
            >
              <LogOut className="mr-2" size={16} />
              Leave
            </Button>
          </div>
        </div>
      </div>

      {/* Main Dashboard */}
      <div className="p-6 pt-20">
        {/* Video Section - Optimized for 2 participants */}
        {isConnected && room && (
          <div className="mb-6">
            <LiveKitRoom room={room}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {localParticipant && (
                  <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video">
                    <video
                      ref={(video) => {
                        console.log('🎥 Setting up local video element:', video);
                        console.log('🎥 Local participant:', localParticipant);
                        console.log('🎥 Video track publications:', localParticipant?.videoTrackPublications);
                        
                        if (video && localParticipant) {
                          // Try to get video track from publications or cameraTrack
                          let videoTrack = null;
                          
                          if (localParticipant.videoTrackPublications.size > 0) {
                            videoTrack = Array.from(localParticipant.videoTrackPublications.values())[0]?.videoTrack;
                          } else if (localParticipant.cameraTrack) {
                            videoTrack = localParticipant.cameraTrack;
                          }
                          
                          console.log('🎥 Found video track:', videoTrack);
                          
                          if (videoTrack) {
                            try {
                              videoTrack.attach(video);
                              console.log('✅ Local video attached successfully');
                            } catch (error) {
                              console.error('❌ Error attaching local video:', error);
                            }
                          } else {
                            console.log('⚠️ No video track found, trying to enable camera...');
                            // Try to enable camera if not already done
                            if (room) {
                              room.localParticipant.setCameraEnabled(true).then(() => {
                                console.log('📷 Camera enabled successfully');
                              }).catch(err => {
                                console.error('❌ Failed to enable camera:', err);
                              });
                            }
                          }
                        } else {
                          console.log('⚠️ Local video element or participant not available');
                        }
                      }}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      playsInline
                    />
                    <div className="absolute bottom-3 left-3 bg-black/60 text-white px-2 py-1 rounded text-sm">
                      You (Interviewer)
                    </div>
                    <div className="absolute top-3 right-3">
                      {isMuted ? <MicOff className="w-5 h-5 text-red-500" /> : <Mic className="w-5 h-5 text-green-500" />}
                    </div>
                  </div>
                )}
                
                {participants.length > 0 ? (
                  participants.slice(0, 1).map((participant) => (
                    <div key={participant.identity} className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video">
                      <video
                        ref={(video) => {
                          if (video && participant.videoTrackPublication?.videoTrack) {
                            participant.videoTrackPublication.videoTrack.attach(video);
                          }
                        }}
                        className="w-full h-full object-cover"
                        autoPlay
                        playsInline
                      />
                      <div className="absolute bottom-3 left-3 bg-black/60 text-white px-2 py-1 rounded text-sm">
                        {participant.name || 'Candidate'}
                      </div>
                      <div className="absolute top-3 right-3">
                        {participant.isMuted ? <MicOff className="w-5 h-5 text-red-500" /> : <Mic className="w-5 h-5 text-green-500" />}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-gray-100 rounded-xl aspect-video flex items-center justify-center border-2 border-dashed border-gray-300">
                    <div className="text-center text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Waiting for candidate...</p>
                    </div>
                  </div>
                )}
              </div>
            </LiveKitRoom>
          </div>
        )}

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
                    {formatTime(timerState?.elapsedMinutes || 0, timerState?.elapsedSeconds || 0)}
                  </div>
                  <div className="text-sm text-gray-600 mb-4">Elapsed Time</div>
                  
                  {/* Interview Plan Progress */}
                  {timerState?.currentBlock && (
                    <div className="mb-4 text-sm">
                      <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full mb-2">
                        Current: {timerState.currentBlock.label} ({timerState.currentBlock.minutes}min)
                      </div>
                      {timerState.nextBlock && (
                        <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                          Next: {timerState.nextBlock.label} ({timerState.nextBlock.minutes}min)
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-center space-x-2">
                    <Button
                      onClick={() => {
                        console.log('🎯 Timer button clicked, isRunning:', isTimerRunning);
                        if (isTimerRunning) {
                          console.log('⏸️ Stopping timer');
                          stopTimer();
                        } else {
                          console.log('▶️ Starting timer');
                          startTimer();
                        }
                      }}
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      onClick={() => {
                        console.log('🔄 Reset timer clicked');
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
                        <span className="text-sm font-medium text-green-800">Current Section</span>
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
                          <span className="text-sm font-medium text-blue-800">Next Section</span>
                          <Badge variant="outline" className="text-blue-800 border-blue-300">
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
                        <p className="text-sm font-medium text-orange-800 mb-2">Time Reminder</p>
                        <p className="text-sm text-orange-700 mb-3">
                          You planned to start "{timerState.nextBlock.label}" now. Continue with current section or move on?
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
              <Card className="rounded-xl bg-white/90 backdrop-blur shadow-lg border-0">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center text-xl">
                      <MessageSquare className="w-5 h-5 mr-2 text-cyan-600" />
                      Live Transcription
                    </CardTitle>
                    <Button
                      onClick={isTranscribing ? stopTranscription : startTranscription}
                      size="sm"
                      className={isTranscribing ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
                    >
                      {isTranscribing ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="max-h-64 overflow-y-auto space-y-3">
                    {(transcriptions?.length || 0) === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">Start transcription to see live conversation</p>
                      </div>
                    ) : (
                      (transcriptions || []).slice(-10).map((transcription) => (
                        <div key={transcription.id} className="border-l-2 border-gray-200 pl-3 py-2">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant={transcription.speaker === 'Interviewer' ? 'default' : 'secondary'}>
                              {transcription.speaker}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(transcription.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="text-xs text-gray-400">
                              {Math.round(transcription.confidence * 100)}%
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{transcription.text}</p>
                        </div>
                      ))
                    )}
                  </div>
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
                    onClick={handleGenerateSuggestions}
                    disabled={isLoading}
                    className="w-full bg-amber-600 hover:bg-amber-700"
                  >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    {isLoading ? 'Generating...' : 'Get Follow-Up Questions'}
                  </Button>

                  {/* Suggestions List */}
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {(suggestions?.length || 0) === 0 ? (
                      <div className="text-center py-6">
                        <Lightbulb className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">Generate follow-up questions based on the conversation</p>
                      </div>
                    ) : (
                      (suggestions || []).slice(0, 5).map((suggestion, index) => (
                        <div key={index} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-sm text-gray-800 font-medium mb-2">
                            {suggestion.question}
                          </p>
                          {suggestion.reasoning && (
                            <p className="text-xs text-amber-700">
                              {suggestion.reasoning}
                            </p>
                          )}
                          <Button
                            onClick={() => navigator.clipboard.writeText(suggestion.question)}
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Candidate View</h2>
            <p className="text-gray-600">Focus on the interview - your responses are being recorded</p>
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