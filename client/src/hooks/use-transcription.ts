import { useState, useCallback, useEffect, useRef } from 'react';
import { TranscriptionServiceFactory, TranscriptionResult } from '@/services/transcription-service';
import type { TranscriptionEntry } from '@/components/transcription-panel';

export function useTranscription(provider: 'deepgram' | 'elevenlabs' = 'deepgram', room?: any, isInterviewer: boolean = false) {
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const transcriptionServiceRef = useRef(TranscriptionServiceFactory.create(provider));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const startTranscription = useCallback(async () => {
    try {
      setError(null);
      
      // Get user media for audio (simplified approach from working version)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      audioStreamRef.current = stream;
      
      // Setup MediaRecorder with proper error handling
      try {
        // Check MediaRecorder support first
        if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          console.log('opus not supported, trying webm');
          if (!MediaRecorder.isTypeSupported('audio/webm')) {
            console.log('webm not supported, using default');
            mediaRecorderRef.current = new MediaRecorder(stream);
          } else {
            mediaRecorderRef.current = new MediaRecorder(stream, {
              mimeType: 'audio/webm'
            });
          }
        } else {
          mediaRecorderRef.current = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
          });
        }
        
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            console.log('MediaRecorder data available:', event.data.size, 'bytes');
            
            // Convert blob to audio buffer for transcription
            const reader = new FileReader();
            reader.onload = () => {
              const arrayBuffer = reader.result as ArrayBuffer;
              transcriptionServiceRef.current.sendAudio(arrayBuffer);
            };
            reader.readAsArrayBuffer(event.data);
          }
        };
        
        mediaRecorderRef.current.onerror = (event) => {
          console.error('MediaRecorder error:', event);
          setError('MediaRecorder error occurred');
        };
        
        // Start recording with intervals
        mediaRecorderRef.current.start(1000);
        console.log('MediaRecorder started successfully');
        
      } catch (error) {
        console.error('MediaRecorder setup failed:', error);
        throw error;
      }

      // Set up transcription service callbacks
      transcriptionServiceRef.current.onTranscription((result: TranscriptionResult) => {
        console.log(`📝 HOOK: Received transcription: "${result.transcript}" (final=${result.isFinal}, confidence=${result.confidence})`);
        
        // Process all transcripts including debugging ones
        if (!result.transcript || result.transcript.trim().length === 0) {
          console.log('⚠️ HOOK: Empty transcript received');
          return;
        }
        
        console.log(`📝 HOOK: Processing transcript: "${result.transcript}"`);
        
        // Determine speaker based on participant identity or role
        const participantIdentity = room?.localParticipant?.identity || '';
        const speakerRole = participantIdentity.startsWith('Interviewer-') ? 'Interviewer' : 
                           participantIdentity.startsWith('Candidate-') ? 'Candidate' :
                           (isInterviewer ? 'Interviewer' : 'Candidate');
        
        const entry: TranscriptionEntry = {
          id: `${Date.now()}-${Math.random()}`,
          speaker: speakerRole,
          text: result.transcript,
          timestamp: result.timestamp,
          isFinal: result.isFinal,
          confidence: result.confidence,
        };

        console.log(`📝 HOOK: Adding transcript to state:`, entry);
        setTranscriptions(prev => {
          const newTranscriptions = [...prev, entry];
          console.log(`📝 HOOK: New transcriptions array length: ${newTranscriptions.length}`);
          console.log(`📝 HOOK: All transcriptions:`, newTranscriptions.map(t => t.text));
          
          // Broadcast final transcription to interviewer via data channel
          if (result.isFinal && room?.localParticipant && !isInterviewer) {
            try {
              const transcriptionData = JSON.stringify({
                type: 'transcription',
                entry: entry
              });
              room.localParticipant.publishData(
                new TextEncoder().encode(transcriptionData),
                { reliable: true }
              );
              console.log('Broadcasting transcription to interviewer:', entry.text);
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
      console.log('Transcription started successfully with MediaRecorder');

    } catch (err) {
      console.error('Failed to start transcription:', err);
      setError(err instanceof Error ? err.message : 'Failed to start transcription');
      setIsTranscribing(false);
    }
  }, []);

  const stopTranscription = useCallback(async () => {
    if (!isTranscribing) return;

    try {
      console.log('Stopping transcription service...');
      
      // Stop transcription service first
      if (transcriptionServiceRef.current) {
        await transcriptionServiceRef.current.stop();
      }
      
      // Stop MediaRecorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      // MediaRecorder cleanup (no audio context needed)

      // Stop audio stream
      if (audioStreamRef.current) {
        console.log('Stopping media stream...');
        try {
          audioStreamRef.current.getTracks().forEach(track => track.stop());
        } catch (e) {
          console.warn('Error stopping media tracks:', e);
        }
        audioStreamRef.current = null;
      }

      // Clean up MediaRecorder reference
      mediaRecorderRef.current = null;
      
      setIsTranscribing(false);
      setError(null);
      console.log('Transcription stopped successfully');
      
    } catch (err) {
      console.error('Failed to stop transcription:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop transcription');
      
      // Force cleanup even if error occurred
      audioStreamRef.current = null;
      mediaRecorderRef.current = null;
      setIsTranscribing(false);
    }
  }, [isTranscribing]);

  const clearTranscriptions = useCallback(() => {
    setTranscriptions([]);
  }, []);

  // Clean up on unmount with proper async handling
  useEffect(() => {
    return () => {
      if (isTranscribing) {
        stopTranscription().catch(console.error);
      }
    };
  }, [isTranscribing, stopTranscription]);

  // Additional cleanup for page navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isTranscribing && audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          // Synchronous emergency cleanup
          if (processorRef.current) {
            processorRef.current.disconnect();
          }
          if (sourceRef.current) {
            sourceRef.current.disconnect();
          }
          audioContextRef.current.close();
        } catch (e) {
          console.warn('Emergency cleanup failed:', e);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isTranscribing]);

  // Listen for transcriptions from other participants (only if interviewer)
  useEffect(() => {
    if (!room || !isInterviewer) return;

    const handleDataReceived = (payload: Uint8Array, participant: any) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === 'transcription') {
          const speakerName = participant.identity?.startsWith('interviewer-') ? 'Interviewer' : 'Candidate';
          const entry: TranscriptionEntry = {
            ...data.entry,
            speaker: speakerName,
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
  }, [room, isInterviewer]);

  return {
    transcriptions,
    isTranscribing,
    error,
    startTranscription,
    stopTranscription,
    clearTranscriptions,
  };
}
