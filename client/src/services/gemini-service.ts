import { GoogleGenAI } from "@google/genai";

export interface FollowUpSuggestion {
  question: string;
  reasoning?: string;
}

export interface FollowUpResponse {
  suggestions: FollowUpSuggestion[];
}

class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // In development, we'll use a server endpoint to proxy the Gemini API
    this.ai = new GoogleGenAI({ apiKey: 'proxy' });
  }

  async getFollowUpSuggestions(transcriptText: string, jobDescription?: string | null, customInstruction?: string): Promise<FollowUpResponse> {
    const serviceStartTime = performance.now();
    try {
      console.log('⏱️ [TIMING] GeminiService - Starting API request to /api/gemini/follow-up-suggestions');
      
      // Ensure all values are clean strings to avoid circular references
      const dataProcessingStartTime = performance.now();
      const requestBody = {
        transcriptText: String(transcriptText || ''),
        jobDescription: jobDescription ? String(jobDescription) : null,
        customInstruction: customInstruction ? String(customInstruction) : undefined
      };
      console.log('⏱️ [TIMING] GeminiService - Data processing', `Duration: ${(performance.now() - dataProcessingStartTime).toFixed(2)}ms`);
      
      console.log('📤 Request payload:', {
        transcriptText: requestBody.transcriptText,
        jobDescription: requestBody.jobDescription,
        customInstruction: requestBody.customInstruction
      });
      
      const fetchStartTime = performance.now();
      console.log('⏱️ [TIMING] GeminiService - Starting fetch request');
      const response = await fetch('/api/gemini/follow-up-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      console.log('⏱️ [TIMING] GeminiService - Fetch request completed', `Duration: ${(performance.now() - fetchStartTime).toFixed(2)}ms`);

      console.log('📡 API response status:', response.status);

      if (!response.ok) {
        const errorStartTime = performance.now();
        const errorText = await response.text();
        console.log('⏱️ [TIMING] GeminiService - Error text reading', `Duration: ${(performance.now() - errorStartTime).toFixed(2)}ms`);
        console.error('❌ API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const responseReadStartTime = performance.now();
      const responseText = await response.text();
      console.log('⏱️ [TIMING] GeminiService - Response text reading', `Duration: ${(performance.now() - responseReadStartTime).toFixed(2)}ms`);
      console.log('📥 Raw response text:', responseText);
      
      let data: FollowUpResponse;
      try {
        const parseStartTime = performance.now();
        data = JSON.parse(responseText);
        console.log('⏱️ [TIMING] GeminiService - JSON parsing', `Duration: ${(performance.now() - parseStartTime).toFixed(2)}ms`);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        throw new Error(`Failed to parse JSON response: ${parseError}`);
      }
      
      console.log('✅ Successfully parsed API response:', data);
      
      // Validate response structure
      if (!data || !data.suggestions || !Array.isArray(data.suggestions)) {
        throw new Error('Invalid response structure: missing suggestions array');
      }
      
      console.log('⏱️ [TIMING] GeminiService - TOTAL SERVICE TIME', `Duration: ${(performance.now() - serviceStartTime).toFixed(2)}ms`);
      return data;
    } catch (error) {
      console.error('❌ Error in getFollowUpSuggestions:', error);
      console.log('⏱️ [TIMING] GeminiService - TOTAL SERVICE TIME (with error)', `Duration: ${(performance.now() - serviceStartTime).toFixed(2)}ms`);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();