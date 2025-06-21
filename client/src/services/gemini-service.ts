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
    try {
      console.log('🌐 Making API request to /api/gemini/follow-up-suggestions');
      
      const response = await fetch('/api/gemini/follow-up-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptText,
          jobDescription,
          customInstruction
        }),
      });

      console.log('📡 API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data: FollowUpResponse = await response.json();
      console.log('✅ Successfully parsed API response:', data);
      return data;
    } catch (error) {
      console.error('❌ Error in getFollowUpSuggestions:', error);
      throw new Error(`Failed to get follow-up suggestions: ${error}`);
    }
  }
}

export const geminiService = new GeminiService();