import { useState, useCallback, useEffect, useRef } from 'react';
import { TranscriptionServiceFactory, TranscriptionResult } from '@/services/transcription-service';
import type { TranscriptionEntry } from '@/components/transcription-panel';

export function useTranscription(provider: 'deepgram' | 'elevenlabs' = 'deepgram') {
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
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        } 
      });
      
      audioStreamRef.current = stream;

      // Set up MediaRecorder to capture audio with different format
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = '';
          }
        }
      }
      
      console.log('Using MediaRecorder mimeType:', mimeType);
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      
      mediaRecorderRef.current = mediaRecorder;

      let isRecording = false;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && isRecording) {
          event.data.arrayBuffer().then(buffer => {
            console.log('Sending audio data to transcription service, size:', buffer.byteLength);
            transcriptionServiceRef.current.sendAudio(buffer);
          }).catch(err => {
            console.error('Error processing audio data:', err);
          });
        }
      };

      mediaRecorder.onstart = () => {
        console.log('MediaRecorder started');
        isRecording = true;
      };

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped');
        isRecording = false;
      };

      // Set up transcription service callbacks
      transcriptionServiceRef.current.onTranscription((result: TranscriptionResult) => {
        console.log('Received transcription:', result);
        const entry: TranscriptionEntry = {
          id: `${Date.now()}-${Math.random()}`,
          speaker: 'You',
          text: result.transcript,
          timestamp: result.timestamp,
          isFinal: result.isFinal,
          confidence: result.confidence,
        };

        setTranscriptions(prev => {
          // Remove any existing non-final entries and add the new one
          const finalEntries = prev.filter(t => t.isFinal);
          return result.isFinal ? [...finalEntries, entry] : [...finalEntries, entry];
        });
      });

      transcriptionServiceRef.current.onError((errorMessage: string) => {
        console.error('Transcription error:', errorMessage);
        setError(errorMessage);
        setIsTranscribing(false);
      });

      // Start transcription service
      await transcriptionServiceRef.current.start();
      
      // Start recording with smaller intervals for more real-time processing
      mediaRecorder.start(250); // Send data every 250ms
      setIsTranscribing(true);
      console.log('Transcription started successfully');

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

  return {
    transcriptions,
    isTranscribing,
    error,
    startTranscription,
    stopTranscription,
    clearTranscriptions,
  };
}
