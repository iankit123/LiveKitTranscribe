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
          echoCancellation: true,   // Enable for cleaner speech
          noiseSuppression: true,   // Enable to reduce background noise
          autoGainControl: true,    // Enable for consistent volume
          sampleRate: 44100,        // Use browser default, resample later
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

      // Use Web Audio API with resampling for Deepgram compatibility
      audioContextRef.current = new AudioContext({ sampleRate: 44100 });
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      processorRef.current.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        const maxAmplitude = Math.max(...inputData.map(Math.abs));
        
        // Only process audio with sufficient volume
        if (maxAmplitude < 0.01) {
          return; // Skip very quiet audio
        }
        
        // Downsample from 44100Hz to 16000Hz for Deepgram
        const downsampleFactor = Math.round(44100 / 16000);
        const downsampledLength = Math.floor(inputData.length / downsampleFactor);
        const downsampledData = new Float32Array(downsampledLength);
        
        for (let i = 0; i < downsampledLength; i++) {
          downsampledData[i] = inputData[i * downsampleFactor];
        }
        
        // Convert to 16-bit PCM with proper scaling
        const pcmData = new Int16Array(downsampledLength);
        for (let i = 0; i < downsampledLength; i++) {
          const sample = downsampledData[i] * 32767;
          pcmData[i] = Math.max(-32768, Math.min(32767, Math.round(sample)));
        }
        
        // Log audio processing
        if (Math.random() < 0.02) {
          console.log(`Audio: original=${inputData.length}, downsampled=${downsampledLength}, max_amp=${maxAmplitude.toFixed(3)}`);
        }
        
        transcriptionServiceRef.current.sendAudio(pcmData.buffer);
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
        
        // Only process non-empty transcripts
        if (!result.transcript || result.transcript.trim().length === 0) {
          console.log('⚠️ Skipping empty transcript');
          return;
        }
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
