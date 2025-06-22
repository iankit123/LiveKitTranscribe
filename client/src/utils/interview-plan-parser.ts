import type { InterviewBlock } from '@/hooks/use-interview-timer';

export function parseInterviewPlan(planText: string): InterviewBlock[] {
  if (!planText.trim()) {
    return [];
  }

  const lines = planText.split('\n').filter(line => line.trim());
  const blocks: InterviewBlock[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Match patterns like "Intro - 10", "Project discussion - 15", etc.
    const match = trimmedLine.match(/^(.+?)\s*-\s*(\d+)$/);
    
    if (match) {
      const label = match[1].trim();
      const minutes = parseInt(match[2], 10);
      
      if (label && minutes > 0) {
        blocks.push({ label, minutes });
      }
    }
  }

  return blocks;
}

export function formatInterviewPlan(blocks: InterviewBlock[]): string {
  return blocks.map(block => `${block.label} - ${block.minutes}`).join('\n');
}

export function calculateTotalTime(blocks: InterviewBlock[]): number {
  return blocks.reduce((total, block) => total + block.minutes, 0);
}

export function getBlockAtTime(blocks: InterviewBlock[], elapsedMinutes: number): { 
  currentBlock: InterviewBlock | null; 
  nextBlock: InterviewBlock | null;
  blockIndex: number;
} {
  if (!blocks.length) {
    return { currentBlock: null, nextBlock: null, blockIndex: -1 };
  }

  let cumulative = 0;
  
  for (let i = 0; i < blocks.length; i++) {
    cumulative += blocks[i].minutes;
    
    if (elapsedMinutes < cumulative) {
      return {
        currentBlock: blocks[i],
        nextBlock: i < blocks.length - 1 ? blocks[i + 1] : null,
        blockIndex: i
      };
    }
  }

  // If we've exceeded all planned time, return the last block
  return {
    currentBlock: blocks[blocks.length - 1],
    nextBlock: null,
    blockIndex: blocks.length - 1
  };
}