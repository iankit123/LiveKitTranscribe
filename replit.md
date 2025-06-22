# LiveKit Transcription Application

## Overview

This is a fully functional real-time video conferencing application built with React, Express, and LiveKit that includes live speech-to-text transcription capabilities. Users can create video meetings, see participants in a responsive grid, control their audio/video, and view live transcriptions of their speech using Deepgram's API. The application successfully captures PCM audio data and streams it to Deepgram for real-time speech-to-text conversion.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and production builds
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **UI Framework**: Radix UI components with Tailwind CSS styling using shadcn/ui design system
- **Video/Audio**: LiveKit Client SDK for WebRTC functionality

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Real-time Communication**: WebSocket for transcription services
- **Video Infrastructure**: LiveKit Server SDK for token generation and room management

### Database Schema
- **Users**: Basic user authentication (id, username, password)
- **Meetings**: Meeting rooms with unique names and active status
- **Transcription Sessions**: Track transcription sessions per meeting with provider information

## Key Components

### Video Conferencing
- LiveKit integration for real-time video/audio communication
- Participant management with local and remote participants
- Video controls (mute/unmute, camera on/off, screen sharing)
- Responsive video grid layout supporting multiple participants

### Transcription System
- Abstract transcription service interface supporting multiple providers
- Deepgram service implementation for real-time speech-to-text
- WebSocket-based audio streaming for transcription
- Real-time transcription display with speaker identification and timestamps

### User Interface
- Clean, modern design using shadcn/ui components
- Responsive layout supporting mobile and desktop
- Real-time status indicators for speaking, muting, and connection states
- Integrated transcription panel with provider selection

## Data Flow

1. **Meeting Creation**: User creates a meeting room with a unique name
2. **Authentication**: LiveKit token generation for secure room access
3. **Video Connection**: WebRTC connection establishment through LiveKit
4. **Audio Capture**: MediaRecorder API captures audio for transcription
5. **Transcription Processing**: Audio streamed to transcription service via WebSocket
6. **Real-time Updates**: Transcription results displayed in real-time UI

## External Dependencies

### Core Libraries
- **LiveKit**: WebRTC infrastructure for video/audio communication
- **Drizzle ORM**: Type-safe database operations
- **TanStack Query**: Server state management and caching
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework

### Development Tools
- **Vite**: Fast build tool with HMR support
- **TypeScript**: Type safety across the application
- **ESBuild**: Production bundling for server code

### Database
- **PostgreSQL**: Primary database using Neon serverless
- **Drizzle Kit**: Database migrations and schema management

### Transcription Services
- **Deepgram**: Real-time speech-to-text API
- **ElevenLabs**: Alternative transcription provider (planned)

## Deployment Strategy

### Development Environment
- **Replit**: Cloud-based development environment
- **Hot Module Replacement**: Instant updates during development
- **TypeScript Compilation**: Real-time type checking

### Production Build
- **Client**: Static files built with Vite and served by Express
- **Server**: Bundled with ESBuild for optimal performance
- **Database**: Migrations applied via Drizzle Kit

### Environment Configuration
- **LiveKit**: Server URL and API credentials
- **Database**: PostgreSQL connection string
- **Transcription**: API keys for speech-to-text services

## Changelog

```
Changelog:
- June 21, 2025. Initial setup
- June 21, 2025. Completed full video meeting app with real-time transcription
  * LiveKit video conferencing integration working
  * Real-time speech-to-text with Deepgram using PCM audio
  * Meeting controls (mute/unmute, video on/off)
  * Participant video grid display
  * Live transcription panel with provider switching capability
- June 21, 2025. Added meeting sharing and multi-participant fixes
  * Added Share and Copy Link buttons for meeting room URLs
  * Fixed multi-participant connection issues with unique participant identities
  * Improved reconnection logic and error handling
  * Added deployment configuration for public access
  * Enhanced connection stability with better LiveKit room configuration
- June 21, 2025. Added intelligent follow-up question suggestions
  * Integrated Gemini AI for analyzing transcript context
  * Built follow-up suggestions component with copy functionality
  * Implemented rolling transcript analysis (last 8 candidate messages)
  * Added server-side Gemini API proxy for secure key handling
  * Created smart interviewer prompts for technical question generation
- June 21, 2025. Enhanced interview experience with 4 major features
  * Added job description input on home page for LLM context
  * Fixed proper speaker tagging (Interviewer vs Candidate) in transcripts
  * Implemented follow-up history preservation with pinning functionality
  * Added manual prompt injection for customized LLM suggestions
- June 21, 2025. UI improvements and role-based URL sharing
  * Replaced refresh icon with "Add Instructions" text button for better UX
  * Implemented role-specific meeting URLs with ?role=interviewer/candidate parameters
  * Enhanced meeting link sharing to generate appropriate links for each role
  * Fixed JSON circular reference errors in follow-up suggestions API
- June 21, 2025. Added interview time planning and smart nudges system
  * Built interview plan input on home page with time block parsing (e.g., "Intro - 10")
  * Created interview timer with real-time tracking and block progression
  * Implemented smart nudge system to remind interviewer of planned transitions
  * Added timer panel showing current/next blocks and elapsed time
  * Enhanced interviewer dashboard with time management tools
- June 21, 2025. Redesigned home page with modern glassmorphism UI
  * Created professional interviewer-focused landing page with gradient backgrounds
  * Implemented responsive 2-column layout: info cards + setup form
  * Added animated floating elements and feature badges
  * Enhanced typography with gradient text and better visual hierarchy
  * Improved UX with step-by-step workflow explanation
- June 21, 2025. Redesigned meeting room UI as modern interviewer dashboard
  * Built responsive 2-column grid layout with interview flow and input panels
  * Added floating status bar showing transcription, connection, timer, and participant count
  * Created integrated timer with current/next segment tracking and soft nudges
  * Enhanced live transcription with speaker badges and confidence scores
  * Improved follow-up suggestions with custom instruction input and copy functionality
- June 21, 2025. Fixed critical interview plan and follow-up suggestions issues
  * Resolved interview plan display - now properly shows current/next segments
  * Fixed follow-up suggestions generation to work consistently on repeat clicks
  * Enhanced state management with proper clearing and refresh mechanisms
  * Added comprehensive error handling for WebSocket and AudioContext operations
  * Successfully implemented plan format: "start - 1\nQuestion1 - 2\nQuestion2 - 1\nEnd - 1"
- June 22, 2025. Fixed video display and track publishing issues
  * Resolved "No room provided" LiveKit component context errors
  * Fixed duplicate track publishing that caused connection failures
  * Enhanced video track attachment logic with proper error handling
  * Improved participant role labeling for interviewer vs candidate views
  * Added camera/microphone enablement during room connection process
- June 22, 2025. Comprehensive stability fixes and error handling
  * Fixed ErrorBoundary import issue causing component crashes
  * Enhanced LiveKit room configuration with DTX disabled to prevent silence detection
  * Added timeout protection for metadata operations to prevent connection hangs
  * Improved error handling for media enablement with graceful fallbacks
  * Enhanced connection monitoring with reduced auto-reconnect attempts
  * Added comprehensive test validation for all critical functionality
- June 22, 2025. Fixed critical AudioContext management preventing transcription crashes
  * Resolved "Cannot close a closed AudioContext" error in transcription stops
  * Added proper AudioContext state checking before operations
  * Implemented graceful cleanup with error handling for all audio resources
  * Added emergency cleanup for page navigation events
  * Enhanced transcription lifecycle management with proper async handling
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```