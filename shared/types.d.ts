export declare enum DataType {
    CONCEPT = "CONCEPT",
    RELATIONSHIP = "RELATIONSHIP",
    EXAMPLE = "EXAMPLE",
    ANALOGY = "ANALOGY",
    DEFINITION = "DEFINITION",
    PROCESS = "PROCESS",
    RESOURCE = "RESOURCE",
    COUNTERPOINT = "COUNTERPOINT"
}
export declare enum EdgeType {
    REQUIRES = "REQUIRES",
    CONTAINS = "CONTAINS",
    RELATES_TO = "RELATES_TO",
    EXEMPLIFIES = "EXEMPLIFIES",
    CONTRADICTS = "CONTRADICTS",
    LEADS_TO = "LEADS_TO",
    DEEPENS = "DEEPENS"
}
export type ElementType = 'box' | 'circle' | 'arrow' | 'text' | 'code' | 'split_panel' | 'flow_sequence' | 'callout';
export interface Style {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    cornerRadius?: number;
    fontSize?: number;
    opacity?: number;
    dashArray?: string;
    fontFamily?: string;
}
export interface Animation {
    type: 'fadeIn' | 'scaleIn' | 'slideIn' | 'pulse' | 'dashFlow' | 'none';
    duration: number;
    delay: number;
    easing?: string;
}
export interface VisualSpec {
    elementType: ElementType;
    x: number;
    y: number;
    width: number;
    height: number;
    style: Style;
    animation: Animation;
    icon?: string;
}
export interface KGNode {
    id: string;
    label: string;
    type: DataType;
    depth: number;
    content: string;
    narration: string;
    visual: VisualSpec;
    rlRelevanceScore: number;
    isExpanded: boolean;
    isPresented: boolean;
    parentId: string | null;
    metadata: Record<string, any>;
    createdAt: number;
}
export interface KGEdge {
    id: string;
    sourceId: string;
    targetId: string;
    label: string;
    type: EdgeType;
    weight: number;
    isPresented: boolean;
}
export interface KnowledgeGraph {
    sessionId: string;
    rootNodeId: string;
    nodes: Record<string, KGNode>;
    edges: Record<string, KGEdge>;
    maxDepth: number;
    nodeLimit: number;
    createdAt: number;
    updatedAt: number;
}
export type GraphMutationType = 'add_node' | 'add_edge' | 'update_node' | 'remove_node' | 'remove_edge';
export interface GraphMutation {
    type: GraphMutationType;
    data: KGNode | KGEdge | {
        id: string;
        updates: Partial<KGNode>;
    };
    timestamp: number;
}
export declare enum SessionState {
    IDLE = "IDLE",
    LISTENING = "LISTENING",
    REASONING = "REASONING",
    BUILDING_GRAPH = "BUILDING_GRAPH",
    PRESENTING = "PRESENTING",
    INTERRUPTED = "INTERRUPTED",
    COMPLETED = "COMPLETED"
}
export interface PresentationBookmark {
    sceneId: string;
    nodeId: string;
    wordOffset: number;
    audioTimestamp: number;
    elementStates: Record<string, {
        opacity: number;
        x: number;
        y: number;
        highlighted: boolean;
    }>;
    traversalIndex: number;
    timestamp: number;
}
export interface PresentationScene {
    id: string;
    nodeIds: string[];
    edgeIds: string[];
    narration: string;
    focusNodeId: string;
    viewport: {
        x: number;
        y: number;
        zoom: number;
    };
    visualCommands: VisualCommand[];
    durationEstimate: number;
}
export interface VisualCommand {
    type: 'reveal' | 'highlight' | 'dim' | 'hide' | 'zoom' | 'pan' | 'connect' | 'annotate';
    targetId: string;
    wordTrigger?: number;
    params?: Record<string, any>;
}
export interface TraversalPath {
    sceneSequence: PresentationScene[];
    estimatedDuration: number;
    branchPoints: {
        sceneIndex: number;
        possibleBranches: string[];
    }[];
}
export declare enum VoiceIntent {
    QUESTION = "QUESTION",
    ACKNOWLEDGMENT = "ACKNOWLEDGMENT",
    CONFUSION = "CONFUSION",
    COMMAND = "COMMAND"
}
export interface VoiceEvent {
    type: 'transcript' | 'interrupt' | 'silence' | 'acknowledgment';
    intent: VoiceIntent;
    text: string;
    confidence: number;
    timestamp: number;
}
export interface WordTimestamp {
    word: string;
    start: number;
    end: number;
}
export interface NarrationSegment {
    text: string;
    audioUrl?: string;
    audioData?: ArrayBuffer;
    wordTimestamps: WordTimestamp[];
    sceneId: string;
}
export interface LearnerState {
    avgTimePerNode: number;
    interruptRate: number;
    confusionRate: number;
    acknowledgmentRate: number;
    silenceDuration: number;
    revisitCount: number;
    currentDepth: number;
    nodesPresented: number;
    expertiseLevel: number;
    preferredModality: 'visual' | 'verbal' | 'example';
    vocabularyComplexity: number;
    optimalPace: number;
    analogyEffectiveness: number;
    exampleEffectiveness: number;
    processEffectiveness: number;
}
export interface RLReward {
    signal: 'acknowledgment' | 'confusion' | 'deep_question' | 'silence' | 'revisit' | 'skip' | 'fast_completion';
    value: number;
    nodeId: string;
    dataType: DataType;
    explanationStrategy: ExplanationStrategy;
    timestamp: number;
}
export type ExplanationStrategy = 'analogy_first' | 'definition_first' | 'example_first' | 'process_first';
export interface RLPolicy {
    explanationStrategy: ExplanationStrategy;
    pace: number;
    visualDensity: 'minimal' | 'moderate' | 'rich';
    expansionPriority: DataType[];
    comprehensionCheckFrequency: number;
}
export interface UserPreferences {
    userId: string;
    displayName: string;
    language: string;
    voiceId?: string;
    learnerProfile: LearnerState;
    rlPolicy: RLPolicy;
    sessionHistory: {
        sessionId: string;
        topic: string;
        timestamp: number;
        nodesExplored: number;
    }[];
    createdAt: number;
    updatedAt: number;
}
export interface ReasoningOutput {
    topic: string;
    conceptualPrimitives: {
        label: string;
        type: DataType;
        content: string;
        narration: string;
    }[];
    relationships: {
        from: string;
        to: string;
        type: EdgeType;
        label: string;
    }[];
    prerequisiteDependencies: string[];
    complexityGradient: string[];
    anticipatedFollowUps: string[];
}
export interface ClassifiedChunk {
    id: string;
    label: string;
    type: DataType;
    content: string;
    narration: string;
    parentRef?: string;
    relatedRefs?: string[];
    resources?: {
        url: string;
        title: string;
    }[];
    depth: number;
}
export type WSClientEvent = {
    type: 'audio_chunk';
    data: ArrayBuffer;
} | {
    type: 'user_command';
    command: 'pause' | 'resume' | 'skip' | 'go_back' | 'show_graph' | 'toggle_voice';
} | {
    type: 'start_session';
    topic: string;
} | {
    type: 'ping';
};
export type WSServerEvent = {
    type: 'agent_audio';
    data: ArrayBuffer;
} | {
    type: 'visual_command';
    command: VisualCommand;
} | {
    type: 'graph_update';
    mutation: GraphMutation;
} | {
    type: 'state_change';
    from: SessionState;
    to: SessionState;
    metadata?: Record<string, any>;
} | {
    type: 'bookmark_created';
    bookmark: PresentationBookmark;
} | {
    type: 'bookmark_resumed';
    bookmark: PresentationBookmark;
} | {
    type: 'scene_change';
    scene: PresentationScene;
} | {
    type: 'narration_text';
    text: string;
    sceneId: string;
} | {
    type: 'rl_update';
    policy: RLPolicy;
    learnerState: Partial<LearnerState>;
} | {
    type: 'error';
    message: string;
    code: string;
} | {
    type: 'pong';
};
export declare const DATA_TYPE_VISUALS: Record<DataType, {
    color: string;
    elementType: ElementType;
    icon: string;
}>;
export declare const KG_NODE_LIMIT = 50;
export declare const KG_MAX_DEPTH = 4;
export declare const INTERRUPT_DETECTION_MS = 300;
export declare const BOOKMARK_RESUME_MS = 500;
export declare const RL_UPDATE_INTERVAL_MS = 50;
export declare const VOICE_SAMPLE_RATE = 16000;
export declare const VOICE_CHUNK_SIZE = 4096;
