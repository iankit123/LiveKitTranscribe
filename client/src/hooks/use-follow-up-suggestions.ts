import { useState, useCallback } from 'react';
import { geminiService, FollowUpResponse } from '@/services/gemini-service';
import type { TranscriptionEntry } from '@/components/transcription-panel';

export function useFollowUpSuggestions() {
  const [suggestions, setSuggestions] = useState<FollowUpResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSuggestions = useCallback(async (transcriptions: TranscriptionEntry[], customInstruction?: string) => {
    try {
      console.log('🔍 Starting follow-up question generation...');
      setIsLoading(true);
      setError(null);
      
      // Get recent candidate responses (last 8 messages from candidates)
      const candidateResponses = transcriptions
        .filter(t => t.isFinal && t.speaker === 'Candidate')
        .slice(-8);

      console.log('📝 Found candidate responses:', candidateResponses.length);
      console.log('📝 All transcriptions:', transcriptions.map(t => ({ speaker: t.speaker, text: t.text, isFinal: t.isFinal })));
      
      if (candidateResponses.length === 0) {
        console.log('⚠️ No candidate responses found, using all transcriptions for analysis');
        // Fallback: use all final transcriptions if no specific candidate responses
        const allFinalResponses = transcriptions.filter(t => t.isFinal).slice(-5);
        if (allFinalResponses.length === 0) {
          setError('No responses found to analyze');
          return;
        }
        candidateResponses.push(...allFinalResponses);
      }

      // Format transcript for analysis
      const transcriptText = candidateResponses
        .map(t => `[${t.speaker}]: ${t.text}`)
        .join('\n');

      console.log('📋 Formatted transcript for LLM:', transcriptText);
      console.log('🚀 Sending request to Gemini API...');

      // Get job description from session storage
      const jobDescription = sessionStorage.getItem('jobDescription');

      const response = await geminiService.getFollowUpSuggestions(transcriptText, jobDescription, customInstruction);
      
      console.log('✅ Received response from Gemini:', response);
      
      // Add to history before setting current suggestions
      if (response.suggestions.length > 0) {
        const historyEntry: FollowUpHistoryEntry = {
          suggestions: response.suggestions,
          timestamp: new Date().toLocaleTimeString(),
          pinnedQuestions: []
        };
        setFollowUpHistory(prev => [historyEntry, ...prev]);
      }
      
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