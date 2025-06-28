import { useState, useCallback } from 'react';
import { geminiService, type FollowUpResponse, type FollowUpSuggestion } from '@/services/gemini-service';
import type { TranscriptionEntry } from '@/components/transcription-panel';

export interface FollowUpHistoryEntry {
  suggestions: FollowUpSuggestion[];
  timestamp: string;
  pinnedQuestions: string[];
}

// Simple cache for responses (in-memory for session)
const responseCache = new Map<string, FollowUpSuggestion[]>();

export function useFollowUpSuggestions() {
  const [suggestions, setSuggestions] = useState<FollowUpSuggestion[] | null>(null);
  const [followUpHistory, setFollowUpHistory] = useState<FollowUpHistoryEntry[]>([]);
  const [pinnedQuestions, setPinnedQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSuggestions = useCallback(async (transcriptions: TranscriptionEntry[], customInstruction?: string) => {
    try {
      console.log('🔍 Starting follow-up question generation...');
      console.log('📝 Received transcriptions:', transcriptions);
      console.log('📝 Transcriptions type:', typeof transcriptions, Array.isArray(transcriptions));
      
      setIsLoading(true);
      setError(null);
      
      // Ensure transcriptions is an array
      const safeTranscriptions = Array.isArray(transcriptions) ? transcriptions : [];
      
      if (safeTranscriptions.length === 0) {
        console.log('⚠️ No transcriptions provided, checking for stored data...');
        
        // Get job description from localStorage/sessionStorage
        const jobDescription = localStorage.getItem('jobDescription') || sessionStorage.getItem('jobDescription');
        
        if (!jobDescription && !customInstruction) {
          setError('No conversation found. Start transcription or provide job description first.');
          return;
        }
        
        // Use job description as base for suggestions if no transcripts
        const baseText = jobDescription || "General technical interview discussion";
        
        try {
          const response = await geminiService.getFollowUpSuggestions(baseText, jobDescription, customInstruction);
          console.log('✅ Job-based suggestions generated:', response);
          setSuggestions(response.suggestions);
        } catch (error) {
          console.error('❌ Failed to generate suggestions:', error);
          setError('Failed to generate suggestions. Please check API configuration.');
        }
        return;
      }
      
      // Get recent candidate responses (last 8 messages from candidates)
      const candidateResponses = safeTranscriptions
        .filter(t => t.isFinal && t.speaker === 'Candidate')
        .slice(-8);

      console.log('📝 Found candidate responses:', candidateResponses.length);
      console.log('📝 All transcriptions:', safeTranscriptions.map(t => ({ speaker: t.speaker, text: t.text, isFinal: t.isFinal })));
      
      if (candidateResponses.length === 0) {
        console.log('⚠️ No candidate responses found, using all transcriptions for analysis');
        // Fallback: use all final transcriptions if no specific candidate responses
        const allFinalResponses = safeTranscriptions.filter(t => t.isFinal).slice(-5);
        candidateResponses.push(...allFinalResponses);
      }

      // Format transcript for analysis
      let transcriptText = candidateResponses
        .map(t => `[${t.speaker}]: ${t.text}`)
        .join('\n');

      // If still no transcript text, use available transcriptions (including non-final)
      if (!transcriptText.trim()) {
        const allAvailableTranscriptions = safeTranscriptions.slice(-5);
        transcriptText = allAvailableTranscriptions
          .map(t => `[${t.speaker}]: ${t.text}`)
          .join('\n');
        console.log('📝 Using all available transcriptions for analysis');
      }

      console.log('📋 Formatted transcript for LLM:', transcriptText);

      // Ensure we have meaningful transcript text
      if (!transcriptText.trim() || transcriptText.trim().length < 10) {
        console.log('⚠️ Transcript too short, using fallback approach');
        const jobDescription = sessionStorage.getItem('jobDescription');
        if (customInstruction?.trim()) {
          // Use custom instruction as the base for generating questions
          transcriptText = `Interview context: ${customInstruction.trim()}`;
        } else if (jobDescription?.trim()) {
          // Use job description as context
          transcriptText = `Job role: ${jobDescription.trim()}`;
        } else {
          // Use generic technical interview context
          transcriptText = "Technical interview in progress. Generate relevant follow-up questions.";
        }
        console.log('📋 Updated transcript text:', transcriptText);
      }

      console.log('🚀 Sending request to Gemini API...');

      // Get job description from session storage
      const jobDescription = sessionStorage.getItem('jobDescription');

      try {
        // Clean the inputs to prevent circular references
        const cleanTranscriptText = String(transcriptText || '');
        const cleanJobDescription = jobDescription ? String(jobDescription) : null;
        const cleanCustomInstruction = customInstruction ? String(customInstruction) : undefined;
        
        const response = await geminiService.getFollowUpSuggestions(cleanTranscriptText, cleanJobDescription, cleanCustomInstruction);
        
        console.log('✅ Received response from Gemini:', JSON.stringify(response, null, 2));
        
        // Ensure response has the expected structure
        if (response && response.suggestions && Array.isArray(response.suggestions)) {
          console.log('✅ Setting suggestions in state:', response);
          console.log('✅ Suggestions array:', response.suggestions);
          
          // Set suggestions directly as the array for simpler UI handling
          const suggestionsArray = response.suggestions;
          setSuggestions(suggestionsArray);
          
          // Cache the response for future use
          responseCache.set(cacheKey, suggestionsArray);
          console.log('✅ Suggestions set as array and cached:', suggestionsArray);
          
          // Add to history
          if (response.suggestions.length > 0) {
            const historyEntry: FollowUpHistoryEntry = {
              suggestions: response.suggestions,
              timestamp: new Date().toLocaleTimeString(),
              pinnedQuestions: []
            };
            setFollowUpHistory(prev => [historyEntry, ...prev]);
          }
        } else {
          throw new Error('Invalid response format from API');
        }
      } catch (apiError) {
        console.error('❌ API call failed:', apiError);
        throw apiError;
      }
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

  const clearHistory = useCallback(() => {
    setFollowUpHistory([]);
    setPinnedQuestions([]);
  }, []);

  const togglePinQuestion = useCallback((question: string) => {
    setPinnedQuestions(prev => 
      prev.includes(question) 
        ? prev.filter(q => q !== question)
        : [...prev, question]
    );
  }, []);

  return {
    suggestions,
    followUpHistory,
    pinnedQuestions,
    isLoading,
    error,
    generateSuggestions,
    clearSuggestions,
    clearHistory,
    togglePinQuestion,
  };
}