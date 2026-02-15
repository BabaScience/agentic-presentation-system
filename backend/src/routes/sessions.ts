/* ═══════════════════════════════════════════════════════════════
   REST Routes — Session Management & User Profiles
   ═══════════════════════════════════════════════════════════════ */

import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { SessionState } from '../../shared/types';
import type { KnowledgeGraph, UserPreferences, RLPolicy } from '../../shared/types';

const router = Router();

// ── In-Memory Stores (replace with PostgreSQL + Neo4j) ───────
const sessions = new Map<string, {
  id: string;
  state: SessionState;
  topic: string;
  graph: KnowledgeGraph | null;
  userId: string;
  createdAt: number;
}>();

const users = new Map<string, UserPreferences>();

// ── Default RL Policy ────────────────────────────────────────
const defaultRLPolicy: RLPolicy = {
  explanationStrategy: 'analogy_first',
  pace: 150,
  visualDensity: 'moderate',
  expansionPriority: [],
  comprehensionCheckFrequency: 3,
};

// ── Sessions ─────────────────────────────────────────────────

// POST /api/sessions — Create new teaching session
router.post('/sessions', (req: Request, res: Response) => {
  const { topic, userId } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });

  const sessionId = uuid();
  const session = {
    id: sessionId,
    state: SessionState.IDLE,
    topic,
    graph: null,
    userId: userId || 'anonymous',
    createdAt: Date.now(),
  };

  sessions.set(sessionId, session);

  res.status(201).json({
    sessionId,
    state: session.state,
    wsUrl: `/ws?sessionId=${sessionId}`,
  });
});

// GET /api/sessions/:id — Get session state
router.get('/sessions/:id', (req: Request, res: Response) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  res.json({
    id: session.id,
    state: session.state,
    topic: session.topic,
    hasGraph: !!session.graph,
    nodeCount: session.graph ? Object.keys(session.graph.nodes).length : 0,
    createdAt: session.createdAt,
  });
});

// GET /api/sessions/:id/graph — Get full knowledge graph
router.get('/sessions/:id/graph', (req: Request, res: Response) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (!session.graph) return res.status(404).json({ error: 'No graph built yet' });

  res.json(session.graph);
});

// ── User Profiles ────────────────────────────────────────────

// GET /api/users/:id/profile — Get RL learner profile
router.get('/users/:id/profile', (req: Request, res: Response) => {
  const user = users.get(req.params.id);
  if (!user) {
    // Return default profile for new users
    return res.json({
      userId: req.params.id,
      displayName: 'Learner',
      language: 'en',
      learnerProfile: {
        avgTimePerNode: 0,
        interruptRate: 0,
        confusionRate: 0,
        acknowledgmentRate: 0,
        silenceDuration: 0,
        revisitCount: 0,
        currentDepth: 0,
        nodesPresented: 0,
        expertiseLevel: 0.5,
        preferredModality: 'visual',
        vocabularyComplexity: 0.5,
        optimalPace: 150,
        analogyEffectiveness: 0.5,
        exampleEffectiveness: 0.5,
        processEffectiveness: 0.5,
      },
      rlPolicy: defaultRLPolicy,
      sessionHistory: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  res.json(user);
});

// PUT /api/users/:id/preferences — Update user preferences
router.put('/users/:id/preferences', (req: Request, res: Response) => {
  const existing = users.get(req.params.id);
  const updated: UserPreferences = {
    ...(existing || {
      userId: req.params.id,
      displayName: 'Learner',
      language: 'en',
      learnerProfile: {} as any,
      rlPolicy: defaultRLPolicy,
      sessionHistory: [],
      createdAt: Date.now(),
    }),
    ...req.body,
    updatedAt: Date.now(),
  } as UserPreferences;

  users.set(req.params.id, updated);
  res.json(updated);
});

// GET /api/users/:id/sessions — List past sessions
router.get('/users/:id/sessions', (req: Request, res: Response) => {
  const userSessions = Array.from(sessions.values())
    .filter(s => s.userId === req.params.id)
    .map(s => ({
      id: s.id,
      topic: s.topic,
      state: s.state,
      nodeCount: s.graph ? Object.keys(s.graph.nodes).length : 0,
      createdAt: s.createdAt,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);

  res.json(userSessions);
});

export { router as sessionRouter, sessions, users };
