import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, Monitor, Settings } from "lucide-react";

interface MeetingControlsProps {
  isMuted: boolean;
  isVideoDisabled: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onOpenSettings: () => void;
  
  // Interview tracking props
  isTimerRunning?: boolean;
  onStartTimer?: () => void;
  onStopTimer?: () => void;
  timerState?: any;
}

export default function MeetingControls({
  isMuted,
  isVideoDisabled,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onOpenSettings
}: MeetingControlsProps) {
  return (
    <div className="bg-gray-800 px-4 py-4">
      <div className="flex items-center justify-center space-x-4">
        {/* Mute Button */}
        <Button
          onClick={onToggleMute}
          className={`w-12 h-12 rounded-full transition-colors ${
            isMuted 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
          size="sm"
        >
          {isMuted ? (
            <MicOff className="text-white" size={20} />
          ) : (
            <Mic className="text-white" size={20} />
          )}
        </Button>

        {/* Video Button */}
        <Button
          onClick={onToggleVideo}
          className={`w-12 h-12 rounded-full transition-colors ${
            isVideoDisabled 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
          size="sm"
        >
          {isVideoDisabled ? (
            <VideoOff className="text-white" size={20} />
          ) : (
            <Video className="text-white" size={20} />
          )}
        </Button>

        {/* Screen Share Button */}
        <Button
          onClick={onToggleScreenShare}
          className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
          size="sm"
        >
          <Monitor className="text-white" size={20} />
        </Button>

        {/* Settings Button */}
        <Button
          onClick={onOpenSettings}
          className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
          size="sm"
        >
          <Settings className="text-white" size={20} />
        </Button>
      </div>
    </div>
  );
}
