import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useMeeting } from '@/hooks/use-meeting';
import { useTranscription } from '@/hooks/use-transcription';
import { useFollowUpSuggestions } from '@/hooks/use-follow-up-suggestions';
import { useInterviewTimer } from '@/hooks/use-interview-timer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import VideoGrid from '@/components/video-grid';
import MeetingControls from '@/components/meeting-controls';
import { ErrorBoundary } from '@/components/error-boundary';
import {
  Video,
  Mic,
  Clock,
  Lightbulb,
  Copy,
  Play,
  Square,
  User,
  Share2,
  ExternalLink
} from 'lucide-react';

interface MeetingProps {
  params: {
    roomName: string;
  };
}

// Clean version - will copy back
export default function Meeting({ params }: MeetingProps) {
  const { roomName } = params;
  const urlParams = new URLSearchParams(window.location.search);
  const isInterviewer = urlParams.get('role') === 'interviewer';
  
  const [customInstruction, setCustomInstruction] = useState('');
  const [interviewPlan, setInterviewPlan] = useState(() => {
    const saved = localStorage.getItem(`interviewPlan-${roomName}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [
          { label: 'Introduction', minutes: 5 },
          { label: 'Technical Questions', minutes: 20 },
          { label: 'Q&A', minutes: 10 },
          { label: 'Wrap-up', minutes: 5 }
        ];
      }
    }
    return [
      { label: 'Introduction', minutes: 5 },
      { label: 'Technical Questions', minutes: 20 },
      { label: 'Q&A', minutes: 10 },
      { label: 'Wrap-up', minutes: 5 }
    ];
  });

  const {
    room,
    localParticipant,
    participants,
    isConnected,
    error,
    connect,
    disconnect,
    isMuted,
    isVideoDisabled,
    toggleMute,
    toggleVideo
  } = useMeeting();

  const {
    transcriptions,
    isTranscribing,
    startTranscription,
    stopTranscription,
    clearTranscriptions
  } = useTranscription('deepgram', room, isInterviewer);

  const {
    suggestions,
    isLoading,
    generateSuggestions
  } = useFollowUpSuggestions();

  const {
    timerState,
    isRunning: isTimerRunning,
    start: startTimer,
    stop: stopTimer,
    reset: resetTimer
  } = useInterviewTimer(interviewPlan);

  const formatTime = (minutes: number, seconds: number) => {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const participantName = isInterviewer ? `interviewer-${Date.now()}` : `candidate-${Date.now()}`;
    connect(roomName, participantName, isInterviewer ? 'interviewer' : 'candidate');

    return () => {
      disconnect();
    };
  }, [roomName, isInterviewer, connect, disconnect]);

  const shareLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const candidateUrl = `${baseUrl}?role=candidate`;
    const interviewerUrl = `${baseUrl}?role=interviewer`;
    
    if (isInterviewer) {
      navigator.clipboard.writeText(candidateUrl);
    } else {
      navigator.clipboard.writeText(interviewerUrl);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="text-red-600 mb-4">
            <Video className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="flex justify-between items-center px-6 py-3">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {roomName}
            </h1>
            <Badge variant={isConnected ? 'default' : 'secondary'} className="text-xs">
              {isConnected ? 'Connected' : 'Connecting...'}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={shareLink}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              <Share2 className="w-3 h-3 mr-1" />
              Share Link
            </Button>
            <Button
              onClick={() => window.open(window.location.href, '_blank')}
              size="sm"
              variant="ghost"
              className="text-xs"
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 pt-20">
        {/* New Meeting Layout for Interviewer */}
        {isInterviewer && isConnected && room && (
          <div className="h-[calc(100vh-200px)] flex gap-4">
            {/* Main Content Area - Candidate Video (70% width) */}
            <div className="flex-1 relative bg-gray-900 rounded-lg overflow-hidden">
              {/* Large Candidate Video */}
              {participants.length > 0 ? (
                participants.map((participant) => (
                  <div key={participant.identity} className="w-full h-full relative">
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <User className="w-24 h-24 text-gray-400" />
                    </div>
                    <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded text-sm">
                      {participant.identity.includes('interviewer') ? 'Interviewer' : 'Candidate'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-white">
                    <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Waiting for candidate to join...</p>
                  </div>
                </div>
              )}

              {/* Bottom Row - Small Interviewer Video + Interview Plan */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                {/* Small Interviewer Video */}
                <div className="w-48 h-32 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-lg relative">
                  <div className="flex items-center justify-center h-full text-white">
                    <Video className="w-8 h-8" />
                  </div>
                  <div className="absolute bottom-1 left-1 bg-black/70 text-white px-2 py-1 rounded text-xs">
                    You (Interviewer)
                  </div>
                </div>

                {/* Interview Plan Mini Panel */}
                <div className="w-48 h-32 bg-white/90 backdrop-blur rounded-lg shadow-lg p-3 overflow-y-auto">
                  <h3 className="font-semibold text-sm mb-2 text-gray-800">Interview Plan</h3>
                  {!timerState?.currentBlock ? (
                    <div className="space-y-1">
                      {interviewPlan.slice(0, 4).map((block, index) => (
                        <div key={index} className="flex justify-between text-xs">
                          <span className="text-gray-600">{block.label}</span>
                          <span className="text-gray-500">{block.minutes}m</span>
                        </div>
                      ))}
                      <Button
                        onClick={startTimer}
                        size="sm"
                        className="w-full mt-2 h-6 text-xs bg-blue-600 hover:bg-blue-700"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Start
                      </Button>
                    </div>
                  ) : (
                    <div className="text-xs">
                      <div className="text-green-600 font-medium">
                        Current: {timerState.currentBlock.label}
                      </div>
                      <div className="text-gray-600">
                        {timerState.elapsedMinutes}:{timerState.elapsedSeconds.toString().padStart(2, '0')}
                      </div>
                      {timerState.nextBlock && (
                        <div className="text-blue-600 mt-1">
                          Next: {timerState.nextBlock.label}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Sidebar (30% width) */}
            <div className="w-[30%] flex flex-col space-y-4">
              {/* Follow-Up Suggestions (Top 50%) */}
              <Card className="flex-1 rounded-xl bg-white/90 backdrop-blur shadow-lg border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-lg">
                    <Lightbulb className="w-4 h-4 mr-2 text-amber-600" />
                    Follow-Up Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 flex-1 overflow-hidden">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Custom Instructions
                    </label>
                    <Textarea
                      placeholder="e.g., Ask more technical questions..."
                      value={customInstruction}
                      onChange={(e) => setCustomInstruction(e.target.value)}
                      className="min-h-[50px] text-xs"
                    />
                  </div>

                  <Button 
                    onClick={() => {
                      const safeTranscriptions = Array.isArray(transcriptions) ? transcriptions : [];
                      generateSuggestions(safeTranscriptions, customInstruction);
                    }}
                    disabled={isLoading}
                    className="w-full bg-amber-600 hover:bg-amber-700 h-8 text-xs"
                  >
                    <Lightbulb className="w-3 h-3 mr-2" />
                    {isLoading ? 'Generating...' : 'Get Questions'}
                  </Button>

                  <div className="flex-1 overflow-y-auto space-y-2">
                    {!suggestions || !Array.isArray(suggestions) || suggestions.length === 0 ? (
                      <div className="text-center py-4">
                        <Lightbulb className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 text-xs">Generate follow-up questions</p>
                      </div>
                    ) : (
                      suggestions.slice(0, 3).map((suggestion, index) => (
                        <div key={index} className="bg-amber-50 border border-amber-200 rounded p-2">
                          <p className="text-xs text-gray-800 font-medium mb-1">
                            {suggestion.question}
                          </p>
                          <Button
                            onClick={() => navigator.clipboard.writeText(suggestion.question)}
                            size="sm"
                            variant="ghost"
                            className="h-5 px-1 text-xs"
                          >
                            <Copy className="w-2 h-2 mr-1" />
                            Copy
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Live Transcription (Bottom 50%) */}
              <Card className="flex-1 rounded-xl bg-white/90 backdrop-blur shadow-lg border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center">
                      <Mic className="w-4 h-4 mr-2 text-green-600" />
                      Live Transcription
                    </div>
                    <Button
                      onClick={isTranscribing ? stopTranscription : startTranscription}
                      variant={isTranscribing ? "destructive" : "default"}
                      size="sm"
                      className="h-6 px-2 text-xs"
                    >
                      {isTranscribing ? (
                        <>
                          <Square className="w-3 h-3 mr-1" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Mic className="w-3 h-3 mr-1" />
                          Start
                        </>
                      )}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  <div className="h-full overflow-y-auto space-y-2">
                    {!transcriptions || transcriptions.length === 0 ? (
                      <div className="text-center py-6">
                        <Mic className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 text-xs">No transcriptions yet</p>
                        <p className="text-xs text-gray-400">Start transcription to see live speech-to-text</p>
                      </div>
                    ) : (
                      (transcriptions || []).slice(-10).map((transcription) => (
                        <div key={transcription.id} className="border-l-2 border-gray-200 pl-2 py-1">
                          <div className="flex items-center space-x-1 mb-1">
                            <Badge variant={transcription.speaker === 'TestBadge' ? 'default' : 'secondary'} className="text-xs px-1 py-0">
                              {transcription.speaker}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(transcription.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="text-xs text-gray-400">
                              {Math.round(transcription.confidence * 100)}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-700">{transcription.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Fallback for when not connected */}
        {!isConnected || !room ? (
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Setting up video connection...</p>
          </div>
        ) : null}

        {/* Candidate View */}
        {!isInterviewer && isConnected && room && (
          <div className="h-[calc(100vh-200px)]">
            <ErrorBoundary fallback={
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-red-800">Video component failed to load. Please refresh the page.</p>
              </div>
            }>
              <VideoGrid 
                room={room} 
                localParticipant={localParticipant}
                participants={participants}
                userRole="candidate"
              />
            </ErrorBoundary>
          </div>
        )}
        
        {!isInterviewer && (!isConnected || !room) && (
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Candidate View</h2>
            <p className="text-gray-600">Setting up your interview connection...</p>
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