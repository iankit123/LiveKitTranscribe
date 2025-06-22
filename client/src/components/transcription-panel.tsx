import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Pause, Play, Trash2, User } from "lucide-react";

export interface TranscriptionEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: string;
  isFinal: boolean;
  confidence: number;
}

interface TranscriptionPanelProps {
  transcriptions: TranscriptionEntry[];
  isTranscribing: boolean;
  onStartTranscription: () => void;
  onStopTranscription: () => void;
  onClearTranscriptions: () => void;
  provider: 'deepgram' | 'elevenlabs';
}

export default function TranscriptionPanel({
  transcriptions,
  isTranscribing,
  onStartTranscription,
  onStopTranscription,
  onClearTranscriptions,
  provider
}: TranscriptionPanelProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const finalTranscriptions = transcriptions.filter(t => t.isFinal);
  const currentTranscription = transcriptions.find(t => !t.isFinal);

  return (
    <Card className="bg-white text-gray-900">
      <CardHeader className="px-4 py-3 border-b border-gray-200 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center space-x-3">
          <h3 className="font-semibold">Live Transcription</h3>
          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium capitalize">
            {provider}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={isTranscribing ? onStopTranscription : onStartTranscription}
            variant="outline"
            size="sm"
          >
            {isTranscribing ? (
              <>
                <Pause className="mr-1" size={14} />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-1" size={14} />
                Start
              </>
            )}
          </Button>
          
          <Button
            onClick={onClearTranscriptions}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 h-64 overflow-y-auto">
        <div className="space-y-3">
          {console.log(`UI: Rendering transcription panel - total: ${transcriptions.length}, final: ${finalTranscriptions.length}, current: ${currentTranscription ? 'yes' : 'no'}`)}
          {finalTranscriptions.length === 0 && !currentTranscription && (
            <div className="text-center py-8 text-gray-500">
              <User size={32} className="mx-auto mb-2" />
              <p className="text-sm">
                {isTranscribing ? "Start speaking to see live transcription" : "Click 'Start' to begin transcription"}
              </p>
            </div>
          )}

          {finalTranscriptions.map((entry) => {
            console.log(`UI: Rendering transcript entry:`, entry);
            return (
              <div key={entry.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-livekit rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">U</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-sm">{entry.speaker}</span>
                    <span className="text-xs text-gray-500">{formatTime(entry.timestamp)}</span>
                    {entry.confidence && (
                      <span className="text-xs text-gray-400">
                        {Math.round(entry.confidence * 100)}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800">{entry.text}</p>
                </div>
              </div>
            );
          })}

          {/* Live transcription indicator */}
          {currentTranscription && (
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-livekit rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">U</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-sm">{currentTranscription.speaker}</span>
                  <span className="text-xs text-gray-500">Now</span>
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-livekit rounded-full animate-pulse"></div>
                    <div className="w-1 h-1 bg-livekit rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-1 h-1 bg-livekit rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 italic">{currentTranscription.text}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
