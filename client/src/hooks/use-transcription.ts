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
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const startTranscription = useCallback(async () => {
    try {
      setError(null);
      
      // Get user media for audio with settings optimized for speech recognition
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,        // Match Deepgram exactly
          channelCount: 1,
        } 
      });
      
      audioStreamRef.current = stream;

      // Clean up any existing audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          await audioContextRef.current.close();
        } catch (e) {
          console.warn('Error closing existing audio context:', e);
        }
      }

      // Use Web Audio API with exact Deepgram sample rate
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(1024, 1, 1);
      
      processorRef.current.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        const maxAmplitude = Math.max(...inputData.map(Math.abs));
        
        // Downsample from 44.1kHz to 16kHz for Deepgram
        const downsampleRatio = 44100 / 16000;
        const outputLength = Math.floor(inputData.length / downsampleRatio);
        const downsampledData = new Float32Array(outputLength);
        
        // Simple decimation downsampling
        for (let i = 0; i < outputLength; i++) {
          const sourceIndex = Math.floor(i * downsampleRatio);
          downsampledData[i] = inputData[sourceIndex];
        }
        
        // Convert to 16-bit PCM
        const pcmData = new Int16Array(outputLength);
        for (let i = 0; i < outputLength; i++) {
          const sample = Math.max(-1, Math.min(1, downsampledData[i]));
          pcmData[i] = Math.round(sample * 32767);
        }
        
        // Send audio with active speech detection
        if (maxAmplitude > 0.005) {
          transcriptionServiceRef.current.sendAudio(pcmData.buffer);
          
          if (Math.random() < 0.03) {
            console.log(`Speech audio sent: ${outputLength} samples, amplitude=${maxAmplitude.toFixed(3)}`);
          }
        }
      };
      
      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      
      console.log('Using Web Audio API for PCM audio capture');
      
      // Store references for cleanup (fake MediaRecorder for compatibility)
      mediaRecorderRef.current = { 
        stop: () => {
          // This will be handled by the proper stopTranscription function
        },
        state: 'recording'
      } as any;

      let isRecording = true;

      // Set up transcription service callbacks
      transcriptionServiceRef.current.onTranscription((result: TranscriptionResult) => {
        console.log(`📝 Received transcription: "${result.transcript}" (final=${result.isFinal}, confidence=${result.confidence})`);
        
        // Process all transcripts including debugging ones
        if (!result.transcript || result.transcript.trim().length === 0) {
          console.log('⚠️ Empty transcript received');
          return;
        }
        
        console.log(`📝 Processing transcript: "${result.transcript}"`);
        
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

        setTranscriptions(prev => {
          const finalEntries = prev.filter(t => t.isFinal);
          const newTranscriptions = result.isFinal ? [...finalEntries, entry] : [...finalEntries, entry];
          
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
      console.log('Transcription started successfully with Web Audio API');

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
      
      // Clean up audio processor
      if (processorRef.current) {
        console.log('Disconnecting audio processor...');
        try {
          processorRef.current.disconnect();
          processorRef.current.onaudioprocess = null;
        } catch (e) {
          console.warn('Error disconnecting processor:', e);
        }
        processorRef.current = null;
      }
      
      // Clean up audio source
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (e) {
          console.warn('Error disconnecting source:', e);
        }
        sourceRef.current = null;
      }
      
      // Clean up audio context with state check
      if (audioContextRef.current) {
        console.log('Audio context state:', audioContextRef.current.state);
        if (audioContextRef.current.state !== 'closed') {
          console.log('Closing audio context...');
          try {
            await audioContextRef.current.close();
          } catch (e) {
            console.warn('Error closing audio context:', e);
          }
        }
        audioContextRef.current = null;
      }

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
      audioContextRef.current = null;
      processorRef.current = null;
      sourceRef.current = null;
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
