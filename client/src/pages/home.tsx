import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Video, Play, Settings2, Users, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [, setLocation] = useLocation();
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcriptionProvider, setTranscriptionProvider] = useState<'deepgram' | 'elevenlabs'>('deepgram');
  const [joinRoomName, setJoinRoomName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const { toast } = useToast();

  const handleStartMeeting = async () => {
    try {
      setIsConnecting(true);
      
      // Generate a random room name for demo purposes
      const roomName = `room-${Math.random().toString(36).substring(2, 8)}`;
      
      // Navigate to meeting room
      setLocation(`/meeting/${roomName}`);
    } catch (error) {
      console.error('Error starting meeting:', error);
      toast({
        title: "Connection Error",
        description: "Unable to start the meeting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleJoinMeeting = async () => {
    if (!joinRoomName.trim()) {
      toast({
        title: "Room name required",
        description: "Please enter a room name to join",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsConnecting(true);
      
      // Store job description in sessionStorage if provided
      if (jobDescription.trim()) {
        sessionStorage.setItem('jobDescription', jobDescription.trim());
      }
      
      setLocation(`/meeting/${joinRoomName.trim()}`);
    } catch (error) {
      console.error('Error joining meeting:', error);
      toast({
        title: "Connection Error",
        description: "Unable to join the meeting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="p-8 text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-livekit rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">LiveKit Transcription</h1>
            <p className="text-gray-600">Real-time video calls with live speech-to-text transcription</p>
          </div>

          {isConnecting ? (
            <div className="flex items-center justify-center space-x-2 text-gray-600 py-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-livekit"></div>
              <span className="text-sm">Connecting to room...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <Button 
                onClick={handleStartMeeting}
                className="w-full bg-livekit hover:bg-livekit-dark text-white font-semibold py-4 px-6 h-auto"
                size="lg"
              >
                <Play className="mr-2" size={20} />
                Start New Meeting
              </Button>

              <div className="text-center text-gray-500 text-sm">or</div>

              <div className="space-y-2">
                <Input
                  placeholder="Enter room name to join..."
                  value={joinRoomName}
                  onChange={(e) => setJoinRoomName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinMeeting()}
                  className="w-full"
                />
                <Button 
                  onClick={handleJoinMeeting}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6"
                  size="lg"
                  disabled={!joinRoomName.trim()}
                >
                  <Users className="mr-2" size={20} />
                  Join Meeting
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Transcription Provider</h3>
            <div className="flex items-center justify-between bg-gray-100 rounded-lg p-3">
              <div className="text-sm">
                <span className="font-medium text-gray-900">Deepgram</span>
                <div className="text-xs text-gray-500">Real-time STT</div>
              </div>
              <div className="flex items-center space-x-3">
                <Switch
                  checked={transcriptionProvider === 'elevenlabs'}
                  onCheckedChange={(checked) => setTranscriptionProvider(checked ? 'elevenlabs' : 'deepgram')}
                />
              </div>
              <div className="text-sm text-right">
                <span className="font-medium text-gray-900">ElevenLabs</span>
                <div className="text-xs text-gray-500">Coming soon</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
