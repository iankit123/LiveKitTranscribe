// use-transcription.ts

import { useState, useCallback, useEffect, useRef } from "react";
import {
  TranscriptionServiceFactory,
  TranscriptionResult,
  addTrackToDeepgramStream,
} from "@/services/transcription-service";
import type { TranscriptionEntry } from "@/components/transcription-panel";

export function useTranscription(
  provider: "deepgram" | "elevenlabs" = "deepgram",
  room?: any,
  isInterviewer: boolean = false,
) {
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>(
    [],
  );
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transcriptionServiceRef = useRef(
    TranscriptionServiceFactory.create(provider),
  );

  const startTranscription = useCallback(async () => {
    try {
      setError(null);

      // Start Deepgram WebSocket
      await transcriptionServiceRef.current.start();
      setIsTranscribing(true);
      console.log(
        "🧠 Deepgram transcription started (audio tracks will be added from video-grid)",
      );

      // Hook for incoming transcription results
      transcriptionServiceRef.current.onTranscription(
        (result: TranscriptionResult) => {
          if (!result.transcript?.trim()) return;

          const participantIdentity = room?.localParticipant?.identity || "";
          const speakerRole = participantIdentity.startsWith("Interviewer-")
            ? "Interviewer"
            : participantIdentity.startsWith("Candidate-")
              ? "Candidate"
              : isInterviewer
                ? "Interviewer"
                : "Candidate";

          const entry: TranscriptionEntry = {
            id: `${Date.now()}-${Math.random()}`,
            speaker: speakerRole,
            text: result.transcript,
            timestamp: result.timestamp,
            isFinal: result.isFinal,
            confidence: result.confidence,
          };

          setTranscriptions((prev) => {
            const finalEntries = prev.filter((t) => t.isFinal);
            const newTranscriptions = result.isFinal
              ? [...finalEntries, entry]
              : [...finalEntries, entry];

            // Send final transcript to interviewer
            if (result.isFinal && room?.localParticipant && !isInterviewer) {
              try {
                const transcriptionData = JSON.stringify({
                  type: "transcription",
                  entry,
                });
                room.localParticipant.publishData(
                  new TextEncoder().encode(transcriptionData),
                  { reliable: true },
                );
                console.log(
                  "📤 Sent transcription to interviewer:",
                  entry.text,
                );
              } catch (err) {
                console.error("Error sending transcription:", err);
              }
            }

            return newTranscriptions;
          });
        },
      );

      transcriptionServiceRef.current.onError((errorMessage: string) => {
        console.error("Transcription error:", errorMessage);
        setError(errorMessage);
        setIsTranscribing(false);
      });
    } catch (err) {
      console.error("Failed to start transcription:", err);
      setError(
        err instanceof Error ? err.message : "Transcription start error",
      );
      setIsTranscribing(false);
    }
  }, [room, isInterviewer]);

  const stopTranscription = useCallback(async () => {
    if (!isTranscribing) return;

    try {
      await transcriptionServiceRef.current.stop();
      setIsTranscribing(false);
      setError(null);
      console.log("🛑 Transcription stopped");
    } catch (err) {
      console.error("Failed to stop transcription:", err);
      setError(err instanceof Error ? err.message : "Stop error");
    }
  }, [isTranscribing]);

  const clearTranscriptions = useCallback(() => {
    setTranscriptions([]);
  }, []);

  // Listen for transcript broadcast if interviewer
  useEffect(() => {
    if (!room || !isInterviewer) return;

    const handleDataReceived = (payload: Uint8Array, participant: any) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === "transcription") {
          const speakerName = participant.identity?.startsWith("interviewer-")
            ? "Interviewer"
            : "Candidate";
          const entry: TranscriptionEntry = {
            ...data.entry,
            speaker: speakerName,
            id: `${participant.identity}-${data.entry.id}`,
          };
          setTranscriptions((prev) => [...prev, entry]);
        }
      } catch (err) {
        console.error("Failed to parse transcript message:", err);
      }
    };

    room.on("dataReceived", handleDataReceived);
    return () => room.off("dataReceived", handleDataReceived);
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
