import { meetings, transcriptionSessions, users, type User, type InsertUser, type Meeting, type InsertMeeting, type TranscriptionSession, type InsertTranscriptionSession } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getMeeting(id: number): Promise<Meeting | undefined>;
  getMeetingByRoomName(roomName: string): Promise<Meeting | undefined>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeetingStatus(id: number, isActive: boolean): Promise<Meeting | undefined>;
  
  createTranscriptionSession(session: InsertTranscriptionSession): Promise<TranscriptionSession>;
  endTranscriptionSession(id: number): Promise<TranscriptionSession | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private meetings: Map<number, Meeting>;
  private transcriptionSessions: Map<number, TranscriptionSession>;
  private currentUserId: number;
  private currentMeetingId: number;
  private currentSessionId: number;

  constructor() {
    this.users = new Map();
    this.meetings = new Map();
    this.transcriptionSessions = new Map();
    this.currentUserId = 1;
    this.currentMeetingId = 1;
    this.currentSessionId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getMeeting(id: number): Promise<Meeting | undefined> {
    return this.meetings.get(id);
  }

  async getMeetingByRoomName(roomName: string): Promise<Meeting | undefined> {
    return Array.from(this.meetings.values()).find(
      (meeting) => meeting.roomName === roomName,
    );
  }

  async createMeeting(insertMeeting: InsertMeeting): Promise<Meeting> {
    const id = this.currentMeetingId++;
    const meeting: Meeting = {
      ...insertMeeting,
      id,
      createdAt: new Date(),
      isActive: true,
    };
    this.meetings.set(id, meeting);
    return meeting;
  }

  async updateMeetingStatus(id: number, isActive: boolean): Promise<Meeting | undefined> {
    const meeting = this.meetings.get(id);
    if (meeting) {
      const updatedMeeting = { ...meeting, isActive };
      this.meetings.set(id, updatedMeeting);
      return updatedMeeting;
    }
    return undefined;
  }

  async createTranscriptionSession(insertSession: InsertTranscriptionSession): Promise<TranscriptionSession> {
    const id = this.currentSessionId++;
    const session: TranscriptionSession = {
      ...insertSession,
      id,
      startedAt: new Date(),
      endedAt: null,
    };
    this.transcriptionSessions.set(id, session);
    return session;
  }

  async endTranscriptionSession(id: number): Promise<TranscriptionSession | undefined> {
    const session = this.transcriptionSessions.get(id);
    if (session) {
      const updatedSession = { ...session, endedAt: new Date() };
      this.transcriptionSessions.set(id, updatedSession);
      return updatedSession;
    }
    return undefined;
  }
}

export const storage = new MemStorage();
