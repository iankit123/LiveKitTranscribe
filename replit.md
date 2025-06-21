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
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```