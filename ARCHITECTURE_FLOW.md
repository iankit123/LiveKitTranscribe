# LiveKit Interview Application - Architecture Flow

## System Overview Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              INTERVIEW APPLICATION FLOW                         │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐    ┌─────────────────┐    ┌──────────────────────────────────┐
│   HOME PAGE      │───▶│  MEETING SETUP  │───▶│        MEETING ROOM              │
│                  │    │                 │    │                                  │
│ • Job Description│    │ • Role Detection│    │ ┌─────────────┐ ┌──────────────┐ │
│ • Interview Plan │    │ • Room Creation │    │ │ VIDEO GRID  │ │ TRANSCRIPTION│ │
│ • Custom Prompts │    │ • Token Request │    │ │             │ │   PANEL      │ │
│ • Link Generation│    │ • LiveKit Auth  │    │ │ ┌─────────┐ │ │              │ │
└──────────────────┘    └─────────────────┘    │ │ │Candidate│ │ │ • Live Text  │ │
                                               │ │ │ Video   │ │ │ • Speaker ID │ │
┌──────────────────┐    ┌─────────────────┐    │ │ └─────────┘ │ │ • Confidence │ │
│ ROLE-BASED VIEWS │    │  LIVE SERVICES  │    │ │             │ │ • History    │ │
│                  │    │                 │    │ │ ┌─────────┐ │ └──────────────┘ │
│ Interviewer:     │    │ • LiveKit Room  │    │ │ │Interview│ │                  │
│ • Timer Controls │    │ • Deepgram STT  │    │ │ │ Plan    │ │ ┌──────────────┐ │
│ • AI Suggestions │    │ • Gemini AI     │    │ │ │ Timer   │ │ │ FOLLOW-UP    │ │
│ • Transcripts    │    │ • WebSocket     │    │ │ └─────────┘ │ │ SUGGESTIONS  │ │
│                  │    │ • Audio Stream  │    │ └─────────────┘ │              │ │
│ Candidate:       │    └─────────────────┘    │                 │ • AI Analysis│ │
│ • Basic Controls │                           │ ┌─────────────┐ │ • Question   │ │
│ • Video Only     │                           │ │ INTERVIEWER │ │   Generation │ │
└──────────────────┘                           │ │   VIDEO     │ │ • Context    │ │
                                               │ │  (Overlay)  │ │ • Copy/Pin   │ │
                                               │ └─────────────┘ └──────────────┘ │
                                               └──────────────────────────────────┘
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW DIAGRAM                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

User Input (Speech)
       │
       ▼
┌─────────────────┐    WebRTC Stream    ┌─────────────────┐
│  BROWSER AUDIO  │◄──────────────────▶│   LIVEKIT       │
│   MediaRecorder │                    │   WebRTC Room   │
└─────────────────┘                    └─────────────────┘
       │                                       │
       │ PCM Audio Chunks                      │ Video/Audio Tracks
       ▼                                       ▼
┌─────────────────┐    WebSocket        ┌─────────────────┐
│   DEEPGRAM      │◄──────────────────▶│   VIDEO GRID    │
│   Speech-to-Text│                    │   Component     │
└─────────────────┘                    └─────────────────┘
       │                                       │
       │ Transcript JSON                       │ Participant Events
       ▼                                       ▼
┌─────────────────┐    Real-time        ┌─────────────────┐
│  TRANSCRIPTION  │◄──────────────────▶│   MEETING       │
│     PANEL       │                    │   CONTROLS      │
└─────────────────┘                    └─────────────────┘
       │                                       │
       │ Context Analysis                      │ Timer Events
       ▼                                       ▼
┌─────────────────┐    API Request      ┌─────────────────┐
│   GEMINI AI     │◄──────────────────▶│   INTERVIEW     │
│   Follow-up Gen │                    │   TIMER HOOK    │
└─────────────────┘                    └─────────────────┘
```

## Core Component Architecture

### 1. Meeting Component (`/pages/meeting.tsx`)
**Primary Function**: Main orchestrator and layout manager

```typescript
// Key Responsibilities:
- Role detection (interviewer vs candidate)
- LiveKit room connection management
- Audio/video track publishing
- Layout rendering (70% candidate video, 30% sidebar)
- State management coordination

// Important Functions:
useMeeting() // WebRTC connection handling
useTranscription() // Real-time speech processing
useInterviewTimer() // Time tracking
useFollowUpSuggestions() // AI question generation
```

### 2. Video Grid Component (`/components/video-grid.tsx`)
**Primary Function**: Video rendering with audio attachment

```typescript
// Key Features:
- Automatic video track attachment
- Remote participant audio element creation
- Speaker identification and labeling
- Responsive video layout

// Audio Fix Implementation:
handleTrackSubscribed(track) {
  if (track.kind === 'audio') {
    const audioElement = document.createElement('audio');
    audioElement.autoplay = true;
    track.attach(audioElement); // Critical for candidate-to-interviewer audio
  }
}
```

### 3. Transcription Service (`/services/deepgram-service.ts`)
**Primary Function**: Real-time speech-to-text conversion

```typescript
// Process Flow:
1. MediaRecorder captures browser audio
2. Convert to PCM format for Deepgram
3. Stream via WebSocket to Deepgram API
4. Process JSON responses with speaker detection
5. Display in real-time UI with confidence scores

// Key Functions:
startTranscription() // Initialize WebSocket connection
processAudioChunks() // Convert and stream audio data
handleDeepgramResponse() // Parse and display transcripts
```

### 4. Interview Timer Hook (`/hooks/use-interview-timer.ts`)
**Primary Function**: Time management and progress tracking

```typescript
// State Management:
- Parse interview plan format: "Intro - 5\nTechnical - 20\nQ&A - 10"
- Track elapsed time per segment
- Provide visual progress indicators
- Generate soft nudges for transitions

// Timer State:
{
  elapsedMinutes: number,
  currentBlock: { label: string, minutes: number },
  nextBlock: InterviewBlock | null,
  shouldShowNudge: boolean
}
```

### 5. AI Suggestions Hook (`/hooks/use-follow-up-suggestions.ts`)
**Primary Function**: Context-aware question generation

```typescript
// Process Flow:
1. Analyze last 8 transcription entries
2. Send context to Gemini API with job description
3. Generate relevant follow-up questions
4. Provide copy/pin functionality
5. Maintain suggestion history

// API Integration:
POST /api/gemini/follow-up-suggestions
- Transcript context analysis
- Role-aware prompt engineering  
- JSON response parsing
```

## WebSocket & Real-time Communication

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         REAL-TIME COMMUNICATION FLOW                             │
└─────────────────────────────────────────────────────────────────────────────────┘

Client Browser                    Express Server                    External APIs
      │                                │                                │
      │ 1. WebSocket Connect           │                                │
      │───────────────────────────────▶│                                │
      │                                │ 2. Deepgram WebSocket         │
      │                                │───────────────────────────────▶│
      │ 3. Audio Chunks (PCM)          │                                │
      │───────────────────────────────▶│ 4. Stream to Deepgram         │
      │                                │───────────────────────────────▶│
      │                                │ 5. Transcript Response        │
      │ 6. Transcript JSON             │◄───────────────────────────────│
      │◄───────────────────────────────│                                │
      │                                │                                │
      │ 7. Follow-up Request           │                                │
      │───────────────────────────────▶│ 8. Gemini API Call            │
      │                                │───────────────────────────────▶│
      │                                │ 9. AI Suggestions             │
      │ 10. Generated Questions        │◄───────────────────────────────│
      │◄───────────────────────────────│                                │
```

## Key Technical Implementations

### Audio Communication Fix
```typescript
// Problem: Candidate voice not reaching interviewer
// Solution: Automatic audio element creation in ParticipantVideo component

const handleTrackSubscribed = (track: any) => {
  if (track.kind === 'audio') {
    const audioElement = document.createElement('audio');
    audioElement.autoplay = true;
    audioElement.style.display = 'none';
    document.body.appendChild(audioElement);
    track.attach(audioElement);
  }
}
```

### Role-Based UI Control
```typescript
// Problem: Interview controls visible to candidates
// Solution: Conditional rendering based on URL role parameter

// In MeetingControls component:
{isTimerRunning !== undefined && ( // Only show if timer props provided
  <Button onClick={onStartTimer}>Start Tracking Interview Plan</Button>
)}

// In Meeting page:
{...{isInterviewer && { isTimerRunning, onStartTimer, timerState }}}
```

### Deepgram Integration
```typescript
// Real-time transcription pipeline:
1. MediaRecorder → WebM audio capture
2. PCM conversion for Deepgram compatibility  
3. WebSocket streaming with proper headers
4. JSON response parsing with speaker detection
5. UI updates with confidence scores and timestamps
```

This architecture enables a fully functional interview platform with professional video conferencing, real-time transcription, AI-powered suggestions, and role-based access control.