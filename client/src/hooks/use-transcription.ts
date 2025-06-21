import { useState, useCallback, useEffect, useRef } from 'react';
import { TranscriptionServiceFactory, TranscriptionResult } from '@/services/transcription-service';
import type { TranscriptionEntry } from '@/components/transcription-panel';

export function useTranscription(provider: 'deepgram' | 'elevenlabs' = 'deepgram', room?: any) {
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const transcriptionServiceRef = useRef(TranscriptionServiceFactory.create(provider));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const startTranscription = useCallback(async () => {
    try {
      setError(null);
      
      // Get user media for audio (separate from LiveKit for transcription)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 16000,
          channelCount: 1,
        } 
      });
      
      audioStreamRef.current = stream;

      // Use Web Audio API to get raw PCM data instead of compressed audio
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Convert float32 to int16 PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }
        
        // Send PCM data to transcription service
        transcriptionServiceRef.current.sendAudio(pcmData.buffer);
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      console.log('Using Web Audio API for PCM audio capture');
      
      // Store references for cleanup
      mediaRecorderRef.current = { 
        stop: () => {
          processor.disconnect();
          source.disconnect();
          audioContext.close();
        }
      } as any;

      let isRecording = true;

      // Set up transcription service callbacks
      transcriptionServiceRef.current.onTranscription((result: TranscriptionResult) => {
        console.log('Received transcription:', result);
        const participantName = room?.localParticipant?.name || 'You';
        const entry: TranscriptionEntry = {
          id: `${Date.now()}-${Math.random()}`,
          speaker: participantName,
          text: result.transcript,
          timestamp: result.timestamp,
          isFinal: result.isFinal,
          confidence: result.confidence,
        };

        setTranscriptions(prev => {
          const finalEntries = prev.filter(t => t.isFinal);
          const newTranscriptions = result.isFinal ? [...finalEntries, entry] : [...finalEntries, entry];
          
          // Broadcast final transcription to other participants via data channel
          if (result.isFinal && room?.localParticipant) {
            try {
              const transcriptionData = JSON.stringify({
                type: 'transcription',
                entry: entry
              });
              room.localParticipant.publishData(
                new TextEncoder().encode(transcriptionData),
                { reliable: true }
              );
            } catch (error) {
              console.error('Error broadcasting transcription:', error);
            }
          }
          
          return newTranscriptions;
        });
      });

      transcriptionServiceRef.current.onError((errorMessage: string) => {
        console.error('Transcription error:', errorMessage);
        setError(errorMessage);
        setIsTranscribing(false);
      });

      // Start transcription service
      await transcriptionServiceRef.current.start();
      
      setIsTranscribing(true);
      console.log('Transcription started successfully with Web Audio API');

    } catch (err) {
      console.error('Failed to start transcription:', err);
      setError(err instanceof Error ? err.message : 'Failed to start transcription');
      setIsTranscribing(false);
    }
  }, []);

  const stopTranscription = useCallback(async () => {
    try {
      // Stop media recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      // Stop audio stream
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }

      // Stop transcription service
      await transcriptionServiceRef.current.stop();
      
      setIsTranscribing(false);
    } catch (err) {
      console.error('Failed to stop transcription:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop transcription');
    }
  }, []);

  const clearTranscriptions = useCallback(() => {
    setTranscriptions([]);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isTranscribing) {
        stopTranscription();
      }
    };
  }, [isTranscribing, stopTranscription]);

  // Listen for transcriptions from other participants
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array, participant: any) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === 'transcription') {
          const entry: TranscriptionEntry = {
            ...data.entry,
            speaker: participant.name || participant.identity,
            id: `${participant.identity}-${data.entry.id}`,
          };
          
          setTranscriptions(prev => [...prev, entry]);
        }
      } catch (error) {
        console.error('Error parsing transcription data:', error);
      }
    };

    room.on('dataReceived', handleDataReceived);

    return () => {
      room.off('dataReceived', handleDataReceived);
    };
  }, [room]);

  return {
    transcriptions,
    isTranscribing,
    error,
    startTranscription,
    stopTranscription,
    clearTranscriptions,
  };
}
