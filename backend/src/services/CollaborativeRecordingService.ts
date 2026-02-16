/* ═══════════════════════════════════════════════════════════════
   Collaborative & Recording Service

   Manages multi-user sessions, live annotations, recording,
   playback, and export to various formats (video, PDF, HTML).
   ═══════════════════════════════════════════════════════════════ */

import { v4 as uuid } from 'uuid';
import {
  type CollaborativeSession,
  type Participant,
  type Annotation,
  type RecordingSession,
  type ExportFormat,
  type BookmarkPoint,
} from '../../shared/types';

export class CollaborativeRecordingService {
  private sessions: Map<string, CollaborativeSession> = new Map();
  private recordings: Map<string, RecordingSession> = new Map();
  private annotations: Map<string, Annotation[]> = new Map();

  /**
   * Create collaborative session
   */
  createSession(
    hostId: string,
    sessionName: string,
    options?: {
      maxParticipants?: number;
      allowAnnotations?: boolean;
      recordAutomatically?: boolean;
    },
  ): CollaborativeSession {
    const sessionId = uuid();

    const session: CollaborativeSession = {
      sessionId,
      participants: [{
        userId: hostId,
        name: 'Host',
        role: 'presenter',
        status: 'active',
        cursor: undefined,
      }],
      presenter: hostId,
      sharedState: {},
      annotations: [],
      recording: options?.recordAutomatically ? {
        isRecording: true,
        startTime: Date.now(),
        frames: [],
        audioTrack: undefined,
      } : undefined,
    };

    this.sessions.set(sessionId, session);

    if (session.recording?.isRecording) {
      this.startRecording(sessionId);
    }

    return session;
  }

  /**
   * Join collaborative session
   */
  joinSession(
    sessionId: string,
    userId: string,
    userName: string,
    role: 'presenter' | 'viewer' | 'co-presenter' = 'viewer',
  ): Participant {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.participants.length >= 10) {
      throw new Error('Session is full');
    }

    const participant: Participant = {
      userId,
      name: userName,
      role,
      status: 'active',
      cursor: undefined,
    };

    session.participants.push(participant);

    return participant;
  }

  /**
   * Leave session
   */
  leaveSession(sessionId: string, userId: string): void {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return;
    }

    const participantIndex = session.participants.findIndex(p => p.userId === userId);
    if (participantIndex !== -1) {
      session.participants[participantIndex].status = 'disconnected';
      session.participants.splice(participantIndex, 1);
    }

    // End session if presenter leaves
    if (userId === session.presenter && session.recording) {
      this.stopRecording(sessionId);
    }
  }

  /**
   * Add live annotation
   */
  addAnnotation(
    sessionId: string,
    userId: string,
    annotation: Omit<Annotation, 'id' | 'userId'>,
  ): Annotation {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    const fullAnnotation: Annotation = {
      id: uuid(),
      userId,
      ...annotation,
    };

    session.annotations.push(fullAnnotation);

    if (!this.annotations.has(sessionId)) {
      this.annotations.set(sessionId, []);
    }
    this.annotations.get(sessionId)!.push(fullAnnotation);

    return fullAnnotation;
  }

  /**
   * Clear annotations
   */
  clearAnnotations(sessionId: string, userId?: string): void {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return;
    }

    if (userId) {
      // Clear only user's annotations
      session.annotations = session.annotations.filter((a) => a.userId !== userId);
    } else {
      // Clear all annotations
      session.annotations = [];
    }

    this.annotations.set(sessionId, session.annotations);
  }

  /**
   * Update cursor position
   */
  updateCursorPosition(
    sessionId: string,
    userId: string,
    position: { x: number; y: number } | undefined,
  ): void {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return;
    }

    const participant = session.participants.find(p => p.userId === userId);
    if (participant) {
      participant.cursor = position;
    }
  }

  /**
   * Start recording session
   */
  startRecording(sessionId: string): RecordingSession {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    const recording: RecordingSession = {
      id: uuid(),
      sessionId,
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      frames: [],
      audioTrack: null,
      annotations: [],
      bookmarks: [],
      status: 'recording',
    };

    this.recordings.set(recording.id, recording);
    if (!session.recording) {
      session.recording = { isRecording: true, startTime: Date.now(), frames: [] };
    } else {
      session.recording.isRecording = true;
    }

    return recording;
  }

  /**
   * Stop recording
   */
  stopRecording(sessionId: string): RecordingSession | null {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Find active recording for this session
    const recording = Array.from(this.recordings.values()).find(
      (r) => r.sessionId === sessionId && r.status === 'recording',
    );

    if (!recording) {
      return null;
    }

    recording.endTime = Date.now();
    recording.duration = recording.endTime - recording.startTime;
    recording.status = 'completed';
    if (session.recording) {
      session.recording.isRecording = false;
    }

    return recording;
  }

  /**
   * Add bookmark to recording
   */
  addBookmark(
    recordingId: string,
    label: string,
    timestamp: number,
  ): BookmarkPoint {
    const recording = this.recordings.get(recordingId);

    if (!recording) {
      throw new Error('Recording not found');
    }

    const bookmark: BookmarkPoint = {
      id: uuid(),
      label,
      timestamp,
      sceneId: null,
    };

    recording.bookmarks.push(bookmark);

    return bookmark;
  }

  /**
   * Export recording to various formats
   */
  async exportRecording(
    recordingId: string,
    format: ExportFormat,
    options?: any,
  ): Promise<{
    format: ExportFormat;
    data: string | Buffer;
    filename: string;
    size: number;
  }> {
    const recording = this.recordings.get(recordingId);

    if (!recording) {
      throw new Error('Recording not found');
    }

    switch (format) {
      case 'video':
        return this.exportAsVideo(recording, options);

      case 'pdf':
        return this.exportAsPDF(recording, options);

      case 'html':
        return this.exportAsHTML(recording, options);

      case 'markdown':
        return this.exportAsMarkdown(recording, options);

      case 'gif':
        return this.exportAsGIF(recording, options);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export as video (MP4)
   */
  private async exportAsVideo(
    recording: RecordingSession,
    options?: any,
  ): Promise<{
    format: ExportFormat;
    data: string;
    filename: string;
    size: number;
  }> {
    // Simulated video export - real implementation would use FFmpeg
    const data = `[Video export placeholder for recording ${recording.id}]`;

    return {
      format: 'video',
      data,
      filename: `recording-${recording.id}.mp4`,
      size: data.length,
    };
  }

  /**
   * Export as PDF
   */
  private async exportAsPDF(
    recording: RecordingSession,
    options?: any,
  ): Promise<{
    format: ExportFormat;
    data: string;
    filename: string;
    size: number;
  }> {
    // Simulated PDF export - real implementation would use PDFKit or similar
    const data = `[PDF export placeholder for recording ${recording.id}]`;

    return {
      format: 'pdf',
      data,
      filename: `presentation-${recording.id}.pdf`,
      size: data.length,
    };
  }

  /**
   * Export as HTML
   */
  private async exportAsHTML(
    recording: RecordingSession,
    options?: any,
  ): Promise<{
    format: ExportFormat;
    data: string;
    filename: string;
    size: number;
  }> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recorded Presentation - ${recording.id}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #05060a;
      color: #f8f9fa;
    }
    .frame {
      margin-bottom: 40px;
      border: 1px solid #00e5ff;
      border-radius: 8px;
      padding: 20px;
    }
    .bookmark {
      background: #1a1d29;
      padding: 10px;
      margin: 10px 0;
      border-left: 3px solid #00e5ff;
    }
  </style>
</head>
<body>
  <h1>Recorded Presentation</h1>
  <p>Duration: ${(recording.duration / 1000).toFixed(1)}s</p>
  <p>Bookmarks: ${recording.bookmarks.length}</p>

  <h2>Bookmarks</h2>
  ${recording.bookmarks.map((b) => `
    <div class="bookmark">
      <strong>${b.label}</strong> - ${(b.timestamp / 1000).toFixed(1)}s
    </div>
  `).join('')}

  <h2>Content</h2>
  <p>Recording frames and content would be rendered here.</p>
</body>
</html>`;

    return {
      format: 'html',
      data: html,
      filename: `presentation-${recording.id}.html`,
      size: html.length,
    };
  }

  /**
   * Export as Markdown
   */
  private async exportAsMarkdown(
    recording: RecordingSession,
    options?: any,
  ): Promise<{
    format: ExportFormat;
    data: string;
    filename: string;
    size: number;
  }> {
    const markdown = `# Recorded Presentation

**Recording ID:** ${recording.id}
**Duration:** ${(recording.duration / 1000).toFixed(1)}s
**Bookmarks:** ${recording.bookmarks.length}

## Bookmarks

${recording.bookmarks.map((b) => `- **${b.label}** (${(b.timestamp / 1000).toFixed(1)}s)`).join('\n')}

## Content

Recording content and narration would be included here.
`;

    return {
      format: 'markdown',
      data: markdown,
      filename: `presentation-${recording.id}.md`,
      size: markdown.length,
    };
  }

  /**
   * Export as GIF
   */
  private async exportAsGIF(
    recording: RecordingSession,
    options?: any,
  ): Promise<{
    format: ExportFormat;
    data: string;
    filename: string;
    size: number;
  }> {
    // Simulated GIF export
    const data = `[GIF export placeholder for recording ${recording.id}]`;

    return {
      format: 'gif',
      data,
      filename: `animation-${recording.id}.gif`,
      size: data.length,
    };
  }

  /**
   * Get session participants
   */
  getParticipants(sessionId: string): Participant[] {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return [];
    }

    return session.participants;
  }

  /**
   * Get session annotations
   */
  getAnnotations(sessionId: string): Annotation[] {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return [];
    }

    return session.annotations;
  }

  /**
   * Get all recordings for a session
   */
  getRecordings(sessionId: string): RecordingSession[] {
    return Array.from(this.recordings.values()).filter(
      (r) => r.sessionId === sessionId,
    );
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): CollaborativeSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clean up ended sessions
   */
  cleanupEndedSessions(): void {
    // Cleanup logic for old sessions
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    this.sessions.forEach((session, sessionId) => {
      const hasActiveParticipants = session.participants.some(p => p.status === 'active');
      if (!hasActiveParticipants) {
        this.sessions.delete(sessionId);
      }
    });
  }
}
