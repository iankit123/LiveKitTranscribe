import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { livekitTokenRequestSchema, insertMeetingSchema } from "@shared/schema";
import { AccessToken } from "livekit-server-sdk";

export async function registerRoutes(app: Express): Promise<Server> {
  // LiveKit token generation endpoint
  app.post("/api/livekit/token", async (req, res) => {
    try {
      const { roomName, participantName } = livekitTokenRequestSchema.parse(req.body);
      
      const livekitUrl = process.env.LIVEKIT_URL;
      const apiKey = process.env.LIVEKIT_API_KEY;
      const apiSecret = process.env.LIVEKIT_API_SECRET;

      if (!livekitUrl || !apiKey || !apiSecret) {
        return res.status(500).json({ error: "LiveKit configuration missing" });
      }

      // Create or get existing meeting
      let meeting = await storage.getMeetingByRoomName(roomName);
      if (!meeting) {
        meeting = await storage.createMeeting({ roomName });
      }

      // Check if this is the first participant (interviewer)
      const isFirstParticipant = (meeting.participantCount || 0) === 0;
      
      // Increment participant count
      await storage.incrementMeetingParticipants(meeting.id);
      
      // Generate LiveKit access token with unique identity
      const uniqueIdentity = isFirstParticipant 
        ? `interviewer-${roomName}-${Date.now()}`
        : `candidate-${participantName}-${Date.now()}`;
      console.log('Generating token for participant:', uniqueIdentity, 'in room:', roomName, 'isFirstParticipant:', isFirstParticipant);
      
      const token = new AccessToken(apiKey, apiSecret, {
        identity: uniqueIdentity,
        name: participantName, // Display name
        ttl: '4h', // 4 hours
      });

      token.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        // Add more specific permissions
        roomCreate: false,
        roomList: false,
        roomRecord: false,
        roomAdmin: false,
        ingressAdmin: false,
      });

      const jwt = await token.toJwt();

      res.json({
        token: jwt,
        url: livekitUrl,
        roomName,
        meetingId: meeting.id,
      });
    } catch (error) {
      console.error("Error generating LiveKit token:", error);
      res.status(400).json({ error: "Invalid request" });
    }
  });

  // Meeting management endpoints
  app.post("/api/meetings", async (req, res) => {
    try {
      const meetingData = insertMeetingSchema.parse(req.body);
      const meeting = await storage.createMeeting(meetingData);
      res.json(meeting);
    } catch (error) {
      res.status(400).json({ error: "Invalid meeting data" });
    }
  });

  app.get("/api/meetings/:roomName", async (req, res) => {
    try {
      const { roomName } = req.params;
      const meeting = await storage.getMeetingByRoomName(roomName);
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      res.json(meeting);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for Deepgram proxy and real-time features  
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    perMessageDeflate: false,
    clientTracking: true
  });

  console.log('WebSocket server initialized on path /ws');

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket client connected from:', req.socket.remoteAddress);

    // Handle Deepgram WebSocket proxy
    let deepgramWs: WebSocket | null = null;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'start_transcription') {
          // Initialize Deepgram connection
          const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
          
          if (!deepgramApiKey) {
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Deepgram API key not configured'
            }));
            return;
          }

          // Use PCM audio format for better compatibility
          const deepgramUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&interim_results=true&encoding=linear16&sample_rate=16000&channels=1`;
          console.log('Connecting to Deepgram with URL:', deepgramUrl);
          
          deepgramWs = new WebSocket(deepgramUrl, {
            headers: {
              'Authorization': `Token ${deepgramApiKey}`,
            }
          });

          deepgramWs.on('open', () => {
            console.log('Connected to Deepgram');
            ws.send(JSON.stringify({
              type: 'transcription_started'
            }));
          });

          deepgramWs.on('message', (deepgramMessage) => {
            try {
              const result = JSON.parse(deepgramMessage.toString());
              console.log('Deepgram full response:', JSON.stringify(result, null, 2));
              
              if (result.channel?.alternatives?.[0]?.transcript) {
                const transcript = result.channel.alternatives[0].transcript;
                console.log('Raw transcript from Deepgram:', transcript);
                if (transcript.trim().length > 0) {
                  console.log('Sending transcription to client:', transcript);
                  ws.send(JSON.stringify({
                    type: 'transcription',
                    data: {
                      transcript: transcript,
                      is_final: result.is_final || false,
                      confidence: result.channel.alternatives[0].confidence || 0,
                      timestamp: new Date().toISOString()
                    }
                  }));
                } else {
                  console.log('Empty transcript received from Deepgram');
                }
              } else if (result.type === 'Results' && result.channel) {
                console.log('Deepgram Results response but no transcript:', JSON.stringify(result.channel, null, 2));
              } else {
                console.log('No transcript in Deepgram response, type:', result.type);
              }
            } catch (error) {
              console.error('Error parsing Deepgram response:', error);
            }
          });

          deepgramWs.on('error', (error) => {
            console.error('Deepgram WebSocket error:', error);
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Transcription service error'
            }));
          });

          deepgramWs.on('close', () => {
            console.log('Deepgram connection closed');
            ws.send(JSON.stringify({
              type: 'transcription_ended'
            }));
          });
        } else if (data.type === 'audio_data' && deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
          // Forward audio data to Deepgram
          if (data.audio) {
            const audioBuffer = Buffer.from(data.audio, 'base64');
            console.log('Forwarding audio buffer to Deepgram, size:', audioBuffer.length, 'first 20 bytes:', Array.from(audioBuffer.slice(0, 20)));
            deepgramWs.send(audioBuffer);
          } else {
            console.log('Received audio_data message but no audio data');
          }
        } else if (data.type === 'stop_transcription' && deepgramWs) {
          deepgramWs.close();
          deepgramWs = null;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      if (deepgramWs) {
        deepgramWs.close();
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      if (deepgramWs) {
        deepgramWs.close();
      }
    });
  });

  // Gemini API endpoint for follow-up suggestions
  app.post('/api/gemini/follow-up-suggestions', async (req: Request, res: Response) => {
    try {
      console.log('🚀 Received follow-up suggestions request');
      const { transcriptText } = req.body;

      if (!transcriptText) {
        console.log('❌ No transcript text provided');
        return res.status(400).json({ error: 'Transcript text is required' });
      }

      console.log('📝 Transcript text received:', transcriptText);

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.log('❌ Gemini API key not configured');
        return res.status(500).json({ error: 'Gemini API key not configured' });
      }

      console.log('🔑 Gemini API key found, initializing AI service');
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `You are an expert interviewer. Based on the following transcript of a candidate's responses, suggest 1-2 intelligent follow-up questions that would help assess their technical skills, problem-solving approach, or experience in more depth.

Guidelines:
- Focus on technical details, challenges faced, or decision-making processes
- Avoid yes/no questions
- Make questions specific to what the candidate mentioned
- Questions should feel natural and conversational

Transcript:
${transcriptText}

Please respond with a JSON object in this format:
{
  "suggestions": [
    {
      "question": "What specific challenges did you face when...",
      "reasoning": "This explores their problem-solving approach"
    }
  ]
}`;

      console.log('🧠 Sending request to Gemini AI...');
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    reasoning: { type: "string" }
                  },
                  required: ["question"]
                }
              }
            },
            required: ["suggestions"]
          }
        },
        contents: prompt,
      });

      console.log('📨 Received response from Gemini');
      
      const rawJson = response.text;
      if (rawJson) {
        console.log('✅ Raw JSON from Gemini:', rawJson);
        const data = JSON.parse(rawJson);
        console.log('✅ Parsed data:', data);
        res.json(data);
      } else {
        console.log('❌ Empty response from Gemini');
        res.status(500).json({ error: 'Empty response from Gemini' });
      }
    } catch (error) {
      console.error('❌ Error generating follow-up suggestions:', error);
      res.status(500).json({ error: 'Failed to generate follow-up suggestions' });
    }
  });

  return httpServer;
}
