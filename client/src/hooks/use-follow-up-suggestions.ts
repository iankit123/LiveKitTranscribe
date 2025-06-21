import { useState, useCallback } from 'react';
import { geminiService, FollowUpResponse } from '@/services/gemini-service';
import type { TranscriptionEntry } from '@/components/transcription-panel';

export function useFollowUpSuggestions() {
  const [suggestions, setSuggestions] = useState<FollowUpResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSuggestions = useCallback(async (transcriptions: TranscriptionEntry[]) => {
    try {
      console.log('🔍 Starting follow-up question generation...');
      setIsLoading(true);
      setError(null);
      
      // Get recent candidate responses (last 8 messages from non-"You" speakers)
      const candidateResponses = transcriptions
        .filter(t => t.isFinal && t.speaker !== 'You')
        .slice(-8);

      console.log('📝 Found candidate responses:', candidateResponses.length);
      
      if (candidateResponses.length === 0) {
        setError('No candidate responses found to analyze');
        return;
      }

      // Format transcript for analysis
      const transcriptText = candidateResponses
        .map(t => `[Candidate]: ${t.text}`)
        .join('\n');

      console.log('📋 Formatted transcript for LLM:', transcriptText);
      console.log('🚀 Sending request to Gemini API...');

      const response = await geminiService.getFollowUpSuggestions(transcriptText);
      
      console.log('✅ Received response from Gemini:', response);
      setSuggestions(response);
    } catch (err) {
      console.error('❌ Error generating suggestions:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
    } finally {
      setIsLoading(false);
      console.log('🏁 Follow-up generation completed');
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions(null);
    setError(null);
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    generateSuggestions,
    clearSuggestions
  };
}