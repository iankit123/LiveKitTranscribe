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
      
      const livekitUrl = process.env.LIVEKIT_URL || process.env.LIVEKIT_WS_URL || "ws://localhost:7880";
      const apiKey = process.env.LIVEKIT_API_KEY || process.env.LIVEKIT_KEY || "devkey";
      const apiSecret = process.env.LIVEKIT_API_SECRET || process.env.LIVEKIT_SECRET || "secret";

      // Create or get existing meeting
      let meeting = await storage.getMeetingByRoomName(roomName);
      if (!meeting) {
        meeting = await storage.createMeeting({ roomName });
      }

      // Generate LiveKit access token
      const token = new AccessToken(apiKey, apiSecret, {
        identity: participantName,
        ttl: "2h",
      });

      token.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
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
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket client connected');

    // Handle Deepgram WebSocket proxy
    let deepgramWs: WebSocket | null = null;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'start_transcription') {
          // Initialize Deepgram connection
          const deepgramApiKey = process.env.DEEPGRAM_API_KEY || process.env.DEEPGRAM_KEY || "";
          
          if (!deepgramApiKey) {
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Deepgram API key not configured'
            }));
            return;
          }

          const deepgramUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&interim_results=true&endpointing=300`;
          
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
              
              if (result.channel?.alternatives?.[0]?.transcript) {
                ws.send(JSON.stringify({
                  type: 'transcription',
                  data: {
                    transcript: result.channel.alternatives[0].transcript,
                    is_final: result.is_final || false,
                    confidence: result.channel.alternatives[0].confidence || 0,
                    timestamp: new Date().toISOString()
                  }
                }));
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
            deepgramWs.send(audioBuffer);
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

  return httpServer;
}
