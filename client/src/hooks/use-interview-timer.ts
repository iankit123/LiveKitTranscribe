import { useState, useEffect, useRef, useCallback } from 'react';

export interface InterviewBlock {
  label: string;
  minutes: number;
}

export interface TimerState {
  elapsedMinutes: number;
  elapsedSeconds: number;
  currentBlock: InterviewBlock | null;
  nextBlock: InterviewBlock | null;
  shouldShowNudge: boolean;
  currentBlockIndex: number;
}

export function useInterviewTimer(interviewPlan: InterviewBlock[]) {
  const [timerState, setTimerState] = useState<TimerState>({
    elapsedMinutes: 0,
    elapsedSeconds: 0,
    currentBlock: null,
    nextBlock: null,
    shouldShowNudge: false,
    currentBlockIndex: -1,
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const nudgeShownRef = useRef<Set<number>>(new Set());
  const startTimeRef = useRef<number | null>(null);

  // Calculate cumulative times for each block
  const getCumulativeTimes = useCallback(() => {
    let cumulative = 0;
    return interviewPlan.map(block => {
      cumulative += block.minutes;
      return cumulative;
    });
  }, [interviewPlan]);

  // Determine current and next blocks based on elapsed time
  const updateBlockState = useCallback((elapsedMinutes: number) => {
    if (!interviewPlan.length) return;

    const cumulativeTimes = getCumulativeTimes();
    let currentBlockIndex = -1;
    let shouldShowNudge = false;

    // Find which block we should be in
    for (let i = 0; i < cumulativeTimes.length; i++) {
      if (elapsedMinutes < cumulativeTimes[i]) {
        currentBlockIndex = i;
        break;
      }
    }

    // If we've exceeded all planned time, we're in the last block
    if (currentBlockIndex === -1) {
      currentBlockIndex = interviewPlan.length - 1;
    }

    // Check if we should show a nudge (time for next block but haven't moved on)
    if (currentBlockIndex < interviewPlan.length - 1) {
      const targetTime = cumulativeTimes[currentBlockIndex];
      if (elapsedMinutes >= targetTime && !nudgeShownRef.current.has(currentBlockIndex)) {
        shouldShowNudge = true;
        nudgeShownRef.current.add(currentBlockIndex);
      }
    }

    const currentBlock = interviewPlan[currentBlockIndex] || null;
    const nextBlock = currentBlockIndex < interviewPlan.length - 1 
      ? interviewPlan[currentBlockIndex + 1] 
      : null;

    setTimerState(prev => ({
      ...prev,
      currentBlock,
      nextBlock,
      shouldShowNudge,
      currentBlockIndex,
    }));
  }, [interviewPlan, getCumulativeTimes]);

  // Start the timer
  const startTimer = useCallback(() => {
    if (isRunning) return;
    
    startTimeRef.current = Date.now();
    setIsRunning(true);
    
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - (startTimeRef.current || now)) / 1000);
      const elapsedMinutes = Math.floor(elapsed / 60);
      const elapsedSeconds = elapsed % 60;
      
      setTimerState(prev => ({
        ...prev,
        elapsedMinutes,
        elapsedSeconds,
      }));
      
      updateBlockState(elapsedMinutes);
    }, 1000);
  }, [isRunning, updateBlockState]);

  // Stop the timer
  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  // Reset the timer
  const resetTimer = useCallback(() => {
    stopTimer();
    nudgeShownRef.current.clear();
    startTimeRef.current = null;
    setTimerState({
      elapsedMinutes: 0,
      elapsedSeconds: 0,
      currentBlock: null,
      nextBlock: null,
      shouldShowNudge: false,
      currentBlockIndex: -1,
    });
  }, [stopTimer]);

  // Dismiss the current nudge
  const dismissNudge = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      shouldShowNudge: false,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    timerState,
    isRunning,
    startTimer,
    stopTimer,
    resetTimer,
    dismissNudge,
  };
}