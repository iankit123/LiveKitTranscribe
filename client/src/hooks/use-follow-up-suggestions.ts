import { useState, useCallback } from 'react';
import { geminiService, type FollowUpResponse, type FollowUpSuggestion } from '@/services/gemini-service';
import type { TranscriptionEntry } from '@/components/transcription-panel';

export interface FollowUpHistoryEntry {
  suggestions: FollowUpSuggestion[];
  timestamp: string;
  pinnedQuestions: string[];
}

export function useFollowUpSuggestions() {
  const [suggestions, setSuggestions] = useState<FollowUpSuggestion[] | null>(null);
  const [followUpHistory, setFollowUpHistory] = useState<FollowUpHistoryEntry[]>([]);
  const [pinnedQuestions, setPinnedQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSuggestions = useCallback(async (transcriptions: TranscriptionEntry[], customInstruction?: string) => {
    const startTime = performance.now();
    try {
      console.log('⏱️ [TIMING] Starting follow-up question generation...', `Start: ${startTime.toFixed(2)}ms`);
      console.log('📝 Received transcriptions:', transcriptions);
      console.log('📝 Transcriptions type:', typeof transcriptions, Array.isArray(transcriptions));
      
      const setupStartTime = performance.now();
      setIsLoading(true);
      setError(null);
      console.log('⏱️ [TIMING] Setup completed', `Duration: ${(performance.now() - setupStartTime).toFixed(2)}ms`);
      
      // Ensure transcriptions is an array
      const transcriptionProcessStartTime = performance.now();
      const safeTranscriptions = Array.isArray(transcriptions) ? transcriptions : [];
      console.log('⏱️ [TIMING] Transcription array processing', `Duration: ${(performance.now() - transcriptionProcessStartTime).toFixed(2)}ms`);
      
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
          const jobBasedStartTime = performance.now();
          console.log('⏱️ [TIMING] Starting job-based suggestions API call');
          const response = await geminiService.getFollowUpSuggestions(baseText, jobDescription, customInstruction);
          console.log('⏱️ [TIMING] Job-based suggestions API completed', `Duration: ${(performance.now() - jobBasedStartTime).toFixed(2)}ms`);
          console.log('✅ Job-based suggestions generated:', response);
          setSuggestions(response.suggestions);
        } catch (error) {
          console.error('❌ Failed to generate suggestions:', error);
          setError('Failed to generate suggestions. Please check API configuration.');
        }
        return;
      }
      
      // Get recent candidate responses (last 8 messages from candidates)
      const candidateFilterStartTime = performance.now();
      const candidateResponses = safeTranscriptions
        .filter(t => t.isFinal && t.speaker === 'Candidate')
        .slice(-8);
      console.log('⏱️ [TIMING] Candidate response filtering', `Duration: ${(performance.now() - candidateFilterStartTime).toFixed(2)}ms`);

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
      const jobDescriptionStartTime = performance.now();
      const jobDescription = sessionStorage.getItem('jobDescription');
      console.log('⏱️ [TIMING] Job description retrieval', `Duration: ${(performance.now() - jobDescriptionStartTime).toFixed(2)}ms`);

      try {
        // Clean the inputs to prevent circular references
        const cleaningStartTime = performance.now();
        const cleanTranscriptText = String(transcriptText || '');
        const cleanJobDescription = jobDescription ? String(jobDescription) : null;
        const cleanCustomInstruction = customInstruction ? String(customInstruction) : undefined;
        console.log('⏱️ [TIMING] Input cleaning', `Duration: ${(performance.now() - cleaningStartTime).toFixed(2)}ms`);
        
        const apiCallStartTime = performance.now();
        console.log('⏱️ [TIMING] Starting main API call to Gemini');
        const response = await geminiService.getFollowUpSuggestions(cleanTranscriptText, cleanJobDescription, cleanCustomInstruction);
        console.log('⏱️ [TIMING] Main API call completed', `Duration: ${(performance.now() - apiCallStartTime).toFixed(2)}ms`);
        
        console.log('✅ Received response from Gemini:', JSON.stringify(response, null, 2));
        
        // Ensure response has the expected structure
        if (response && response.suggestions && Array.isArray(response.suggestions)) {
          console.log('✅ Setting suggestions in state:', response);
          console.log('✅ Suggestions array:', response.suggestions);
          
          // Set suggestions directly as the array for simpler UI handling
          const suggestionsArray = response.suggestions;
          setSuggestions(suggestionsArray);
          console.log('✅ Suggestions set as array:', suggestionsArray);
          
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