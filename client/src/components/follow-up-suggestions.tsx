import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Copy, RefreshCw, X } from "lucide-react";
import { useFollowUpSuggestions } from "@/hooks/use-follow-up-suggestions";
import { useToast } from "@/hooks/use-toast";
import type { TranscriptionEntry } from "@/components/transcription-panel";

interface FollowUpSuggestionsProps {
  transcriptions: TranscriptionEntry[];
}

export default function FollowUpSuggestions({ transcriptions }: FollowUpSuggestionsProps) {
  const { suggestions, isLoading, error, generateSuggestions, clearSuggestions } = useFollowUpSuggestions();
  const { toast } = useToast();

  const handleGenerateSuggestions = () => {
    generateSuggestions(transcriptions);
  };

  const handleCopyQuestion = (question: string) => {
    navigator.clipboard.writeText(question).then(() => {
      toast({
        title: "Question copied!",
        description: "The follow-up question has been copied to your clipboard",
      });
    }).catch(() => {
      toast({
        title: "Copy failed",
        description: "Please copy the question manually",
        variant: "destructive",
      });
    });
  };

  const candidateResponseCount = transcriptions.filter(t => t.isFinal && t.speaker !== 'You').length;

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <span>Follow-Up Suggestions</span>
          </CardTitle>
          {suggestions && (
            <Button
              onClick={clearSuggestions}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {!suggestions && !error && (
          <div className="text-center py-6">
            <div className="text-gray-500 mb-4">
              <Lightbulb className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {candidateResponseCount === 0 
                  ? "Waiting for candidate responses to analyze..." 
                  : `Ready to analyze ${candidateResponseCount} candidate response${candidateResponseCount !== 1 ? 's' : ''}`
                }
              </p>
            </div>
            <Button 
              onClick={handleGenerateSuggestions}
              disabled={isLoading || candidateResponseCount === 0}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Get Follow-Up Questions
                </>
              )}
            </Button>
          </div>
        )}

        {error && (
          <div className="text-center py-6">
            <div className="text-red-500 mb-4">
              <p className="text-sm">{error}</p>
            </div>
            <Button 
              onClick={handleGenerateSuggestions}
              variant="outline"
              disabled={candidateResponseCount === 0}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}

        {suggestions && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs">
                {suggestions.suggestions.length} suggestion{suggestions.suggestions.length !== 1 ? 's' : ''}
              </Badge>
              <Button 
                onClick={handleGenerateSuggestions}
                variant="ghost"
                size="sm"
                disabled={isLoading}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>

            <div className="space-y-3">
              {suggestions.suggestions.map((suggestion, index) => (
                <div 
                  key={index} 
                  className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {suggestion.question}
                      </p>
                      {suggestion.reasoning && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          💡 {suggestion.reasoning}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => handleCopyQuestion(suggestion.question)}
                      variant="ghost"
                      size="sm"
                      className="ml-2 h-8 w-8 p-0 flex-shrink-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center pt-2">
              <p className="text-xs text-gray-500">
                Questions generated based on recent candidate responses
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}