/* ═══════════════════════════════════════════════════════════════
   Memory & Knowledge Graph Service

   Maintains cross-session knowledge graphs, tracks concept mastery,
   and implements spaced repetition for learning optimization.
   ═══════════════════════════════════════════════════════════════ */

import { v4 as uuid } from 'uuid';
import {
  type CrossSessionKnowledgeGraph,
  type SessionSummary,
  type MasteryLevel,
  type LearningPathNode,
  type KnowledgeGraph,
  type KGNode,
  DataType,
} from '../../shared/types';

/**
 * Spaced repetition intervals (milliseconds)
 */
const REPETITION_INTERVALS = {
  introduced: 1 * 24 * 60 * 60 * 1000, // 1 day
  familiar: 3 * 24 * 60 * 60 * 1000, // 3 days
  practiced: 7 * 24 * 60 * 60 * 1000, // 7 days
  mastered: 30 * 24 * 60 * 60 * 1000, // 30 days
};

export class MemoryKnowledgeGraphService {
  private userGraphs: Map<string, CrossSessionKnowledgeGraph> = new Map();

  /**
   * Get or create user's knowledge graph
   */
  getOrCreateUserGraph(userId: string): CrossSessionKnowledgeGraph {
    if (!this.userGraphs.has(userId)) {
      this.userGraphs.set(userId, {
        userId,
        globalGraph: {
          sessionId: `global-${userId}`,
          rootNodeId: '',
          nodes: {},
          edges: {},
          maxDepth: 0,
          nodeLimit: 100,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        sessions: [],
        conceptMastery: new Map(),
        learningPath: [],
      });
    }

    return this.userGraphs.get(userId)!;
  }

  /**
   * Add session to user's knowledge graph
   */
  addSession(
    userId: string,
    sessionGraph: KnowledgeGraph,
    topic: string,
    duration: number,
    comprehensionScore: number,
  ): SessionSummary {
    const userGraph = this.getOrCreateUserGraph(userId);

    const nodesLearned = Object.keys(sessionGraph.nodes);

    const sessionSummary: SessionSummary = {
      sessionId: uuid(),
      date: Date.now(),
      topic,
      nodesLearned,
      duration,
      comprehensionScore,
    };

    userGraph.sessions.push(sessionSummary);

    // Merge session graph
    this.mergeGraphs(userGraph.globalGraph, sessionGraph);

    // Update mastery
    this.updateConceptMastery(userGraph, sessionGraph, comprehensionScore);

    // Update learning path
    this.updateLearningPath(userGraph);

    return sessionSummary;
  }

  /**
   * Merge graphs
   */
  private mergeGraphs(
    globalGraph: KnowledgeGraph,
    sessionGraph: KnowledgeGraph,
  ): void {
    // Merge nodes
    Object.assign(globalGraph.nodes, sessionGraph.nodes);

    // Merge edges
    Object.assign(globalGraph.edges, sessionGraph.edges);

    // Update maxDepth
    globalGraph.maxDepth = Math.max(globalGraph.maxDepth, sessionGraph.maxDepth);
  }

  /**
   * Update concept mastery
   */
  private updateConceptMastery(
    userGraph: CrossSessionKnowledgeGraph,
    sessionGraph: KnowledgeGraph,
    comprehensionScore: number,
  ): void {
    Object.keys(sessionGraph.nodes).forEach((nodeId) => {
      const existing = userGraph.conceptMastery.get(nodeId);

      if (!existing) {
        userGraph.conceptMastery.set(nodeId, {
          conceptId: nodeId,
          level: 'introduced',
          lastReviewed: Date.now(),
          nextReview: Date.now() + REPETITION_INTERVALS.introduced,
          reviewCount: 1,
        });
      } else {
        const newLevel = this.progressMasteryLevel(
          existing.level,
          comprehensionScore,
          existing.reviewCount,
        );

        userGraph.conceptMastery.set(nodeId, {
          conceptId: nodeId,
          level: newLevel,
          lastReviewed: Date.now(),
          nextReview: Date.now() + REPETITION_INTERVALS[newLevel],
          reviewCount: existing.reviewCount + 1,
        });
      }
    });
  }

  /**
   * Progress mastery level
   */
  private progressMasteryLevel(
    currentLevel: 'introduced' | 'familiar' | 'practiced' | 'mastered',
    comprehensionScore: number,
    reviewCount: number,
  ): 'introduced' | 'familiar' | 'practiced' | 'mastered' {
    if (comprehensionScore >= 0.8 && reviewCount >= 3) {
      if (currentLevel === 'introduced') return 'familiar';
      if (currentLevel === 'familiar') return 'practiced';
      if (currentLevel === 'practiced') return 'mastered';
    } else if (comprehensionScore >= 0.6 && reviewCount >= 2) {
      if (currentLevel === 'introduced') return 'familiar';
      if (currentLevel === 'familiar') return 'practiced';
    }

    return currentLevel;
  }

  /**
   * Update learning path
   */
  private updateLearningPath(userGraph: CrossSessionKnowledgeGraph): void {
    const globalGraph = userGraph.globalGraph;
    const learningPath: LearningPathNode[] = [];

    Object.entries(globalGraph.nodes).forEach(([nodeId, node]) => {
      const masteryLevel = userGraph.conceptMastery.get(nodeId);

      let status: 'locked' | 'available' | 'in-progress' | 'completed';

      if (!masteryLevel) {
        status = 'available';
      } else if (
        masteryLevel.level === 'mastered' ||
        masteryLevel.level === 'practiced'
      ) {
        status = 'completed';
      } else {
        status = 'in-progress';
      }

      learningPath.push({
        conceptId: nodeId,
        prerequisites: [],
        status,
        suggestedNext: [],
      });
    });

    userGraph.learningPath = learningPath;
  }

  /**
   * Get concepts due for review
   */
  getConceptsDueForReview(userId: string): KGNode[] {
    const userGraph = this.getOrCreateUserGraph(userId);
    const now = Date.now();

    const dueNodes: KGNode[] = [];

    userGraph.conceptMastery.forEach((mastery) => {
      if (mastery.nextReview <= now) {
        const node = userGraph.globalGraph.nodes[mastery.conceptId];
        if (node) dueNodes.push(node);
      }
    });

    return dueNodes;
  }

  /**
   * Generate review session
   */
  generateReviewSession(userId: string): KnowledgeGraph | null {
    const dueNodes = this.getConceptsDueForReview(userId);

    if (dueNodes.length === 0) {
      return null;
    }

    const reviewGraph: KnowledgeGraph = {
      sessionId: `review-${uuid()}`,
      rootNodeId: dueNodes[0]?.id || '',
      nodes: {},
      edges: {},
      maxDepth: 0,
      nodeLimit: 50,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    dueNodes.forEach((node) => {
      reviewGraph.nodes[node.id] = node;
    });

    return reviewGraph;
  }

  /**
   * Get learning statistics
   */
  getLearningStatistics(userId: string): {
    totalConcepts: number;
    masteredConcepts: number;
    inProgressConcepts: number;
    totalSessions: number;
    totalTime: number;
    avgComprehension: number;
  } {
    const userGraph = this.getOrCreateUserGraph(userId);

    const stats = {
      totalConcepts: Object.keys(userGraph.globalGraph.nodes).length,
      masteredConcepts: 0,
      inProgressConcepts: 0,
      totalSessions: userGraph.sessions.length,
      totalTime: 0,
      avgComprehension: 0,
    };

    // Count mastery
    userGraph.conceptMastery.forEach((mastery) => {
      if (mastery.level === 'mastered') stats.masteredConcepts++;
      else if (mastery.level === 'practiced' || mastery.level === 'familiar')
        stats.inProgressConcepts++;
    });

    // Calculate session stats
    let totalComprehension = 0;
    userGraph.sessions.forEach((session) => {
      stats.totalTime += session.duration;
      totalComprehension += session.comprehensionScore;
    });

    if (userGraph.sessions.length > 0) {
      stats.avgComprehension = totalComprehension / userGraph.sessions.length;
    }

    return stats;
  }

  /**
   * Export user graph
   */
  exportUserGraph(userId: string): CrossSessionKnowledgeGraph {
    return this.getOrCreateUserGraph(userId);
  }

  /**
   * Import user graph
   */
  importUserGraph(graph: CrossSessionKnowledgeGraph): void {
    this.userGraphs.set(graph.userId, graph);
  }

  /**
   * Clear user graph
   */
  clearUserGraph(userId: string): void {
    this.userGraphs.delete(userId);
  }
}
