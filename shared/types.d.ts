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
export type ElementType = 'box' | 'circle' | 'arrow' | 'text' | 'code' | 'split_panel' | 'flow_sequence' | 'callout' | 'icon';
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
    illustrations?: IllustrationSpec[];
    visualScript?: VisualScript;
}
export interface VisualCommand {
    type: 'reveal' | 'highlight' | 'dim' | 'hide' | 'zoom' | 'pan' | 'connect' | 'annotate';
    targetId: string;
    wordTrigger?: number;
    params?: Record<string, any>;
}
export interface IllustrationSpec {
    id: string;
    type: 'shape' | 'icon' | 'diagram';
    elementType: ElementType;
    position: {
        x: number;
        y: number;
    };
    size: {
        width: number;
        height: number;
    };
    style: Style;
    animation: Animation;
    content?: string;
    appearTimingMs: number;
}
export type VisualEntityType = 'User' | 'Server' | 'Database' | 'Container' | 'Pod' | 'Cloud' | 'Network' | 'Device' | 'Arrow' | 'DataFlow' | 'Process' | 'Queue' | 'Cache' | 'LoadBalancer' | 'Service';
export interface VisualEntity {
    id: string;
    type: VisualEntityType;
    position: {
        x: number;
        y: number;
    };
    size: {
        width: number;
        height: number;
    };
    label?: string;
    color?: string;
    highlight?: boolean;
    animation?: {
        type: 'fadeIn' | 'slideIn' | 'scaleIn' | 'pulse' | 'flow' | 'none';
        duration: number;
        delay: number;
    };
    metadata?: Record<string, any>;
}
export interface EntityTransition {
    entityId: string;
    from: Partial<VisualEntity>;
    to: Partial<VisualEntity>;
    duration: number;
    easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}
export interface IllustrationFrame {
    id: string;
    startTime: number;
    endTime: number;
    entities: VisualEntity[];
    transitions?: EntityTransition[];
    narrationSegment: string;
    description: string;
}
export interface VisualScript {
    sceneId: string;
    frames: IllustrationFrame[];
    totalDuration: number;
    entities: Record<string, VisualEntity>;
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
    type: 'agent_audio_meta';
    durationMs: number;
    sceneId: string;
    wordTimestamps?: WordTimestamp[];
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
export declare enum CodeLanguage {
    JAVASCRIPT = "javascript",
    PYTHON = "python",
    GO = "go",
    RUST = "rust",
    JAVA = "java",
    TYPESCRIPT = "typescript",
    CPP = "cpp",
    BASH = "bash"
}
export interface CodeExecutionRequest {
    code: string;
    language: CodeLanguage;
    stdin?: string;
    timeout?: number;
    memoryLimit?: number;
}
export interface CodeExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    executionTime: number;
    memoryUsed: number;
    error?: string;
}
export interface DebugStep {
    line: number;
    variables: Record<string, any>;
    stack: string[];
    heap: Record<string, any>;
    timestamp: number;
}
export interface CodeVisualization {
    sceneId: string;
    code: string;
    language: CodeLanguage;
    steps: DebugStep[];
    output: CodeExecutionResult;
    complexity: {
        time: string;
        space: string;
    };
    visualizations: {
        dataStructures: DataStructureViz[];
        memoryLayout?: MemoryViz;
        executionFlow?: ExecutionFlowViz;
    };
}
export interface DataStructureViz {
    type: 'array' | 'tree' | 'graph' | 'stack' | 'queue' | 'heap' | 'linkedlist';
    data: any;
    highlights?: number[];
    label?: string;
    position: {
        x: number;
        y: number;
    };
}
export interface MemoryViz {
    stack: StackFrame[];
    heap: HeapObject[];
    totalSize: number;
}
export interface StackFrame {
    function: string;
    variables: Record<string, {
        value: any;
        type: string;
        address: string;
    }>;
    line: number;
}
export interface HeapObject {
    address: string;
    type: string;
    value: any;
    size: number;
    reachable: boolean;
}
export interface ExecutionFlowViz {
    nodes: FlowNode[];
    edges: FlowEdge[];
    currentNode?: string;
}
export interface FlowNode {
    id: string;
    label: string;
    type: 'start' | 'end' | 'process' | 'decision' | 'loop';
    line: number;
}
export interface FlowEdge {
    from: string;
    to: string;
    label?: string;
    executed: boolean;
}
export declare enum ChartType {
    LINE = "line",
    BAR = "bar",
    SCATTER = "scatter",
    PIE = "pie",
    HEATMAP = "heatmap",
    TREEMAP = "treemap",
    SUNBURST = "sunburst",
    NETWORK = "network",
    SANKEY = "sankey",
    TIMESERIES = "timeseries",
    CANDLESTICK = "candlestick",
    BOX = "box",
    VIOLIN = "violin"
}
export interface DataVisualization {
    id: string;
    type: ChartType;
    data: any;
    config: ChartConfig;
    title?: string;
    description?: string;
    position: {
        x: number;
        y: number;
    };
    size: {
        width: number;
        height: number;
    };
    animation?: Animation;
}
export interface ChartConfig {
    xAxis?: AxisConfig;
    yAxis?: AxisConfig;
    legend?: LegendConfig;
    colors?: string[];
    interactive?: boolean;
    zoomable?: boolean;
    tooltips?: boolean;
}
export interface AxisConfig {
    label?: string;
    scale?: 'linear' | 'log' | 'time' | 'category';
    domain?: [number, number];
    ticks?: number;
}
export interface LegendConfig {
    show: boolean;
    position: 'top' | 'bottom' | 'left' | 'right';
}
export interface AIIllustrationRequest {
    prompt: string;
    style?: 'technical' | 'artistic' | 'minimal' | 'realistic' | 'cartoon';
    aspectRatio?: '1:1' | '16:9' | '4:3';
    colorPalette?: string[];
    referenceImages?: string[];
}
export interface AIIllustrationResult {
    id: string;
    imageUrl: string;
    imageData?: string;
    svgData?: string;
    prompt: string;
    style: string;
    metadata: {
        generatedAt: number;
        model: string;
        revisedPrompt?: string;
    };
}
export interface ThreeDVisualization {
    id: string;
    type: '3d_network' | '3d_architecture' | '3d_model' | '3d_flow';
    objects: ThreeDObject[];
    camera: CameraConfig;
    lighting: LightConfig[];
    animations?: ThreeDAnimation[];
}
export interface ThreeDObject {
    id: string;
    type: 'box' | 'sphere' | 'cylinder' | 'custom';
    position: {
        x: number;
        y: number;
        z: number;
    };
    rotation: {
        x: number;
        y: number;
        z: number;
    };
    scale: {
        x: number;
        y: number;
        z: number;
    };
    material: MaterialConfig;
    label?: string;
    metadata?: Record<string, any>;
}
export interface CameraConfig {
    position: {
        x: number;
        y: number;
        z: number;
    };
    target: {
        x: number;
        y: number;
        z: number;
    };
    fov: number;
    animatePath?: {
        x: number;
        y: number;
        z: number;
    }[];
}
export interface LightConfig {
    type: 'ambient' | 'directional' | 'point' | 'spot';
    position?: {
        x: number;
        y: number;
        z: number;
    };
    intensity: number;
    color: string;
}
export interface MaterialConfig {
    color: string;
    opacity: number;
    metalness?: number;
    roughness?: number;
    emissive?: string;
}
export interface ThreeDAnimation {
    objectId: string;
    property: 'position' | 'rotation' | 'scale' | 'opacity';
    from: any;
    to: any;
    duration: number;
    easing?: string;
}
export interface MathVisualization {
    id: string;
    type: 'equation' | 'function' | 'geometric' | 'calculus' | 'linear_algebra';
    latex?: string;
    components: MathComponent[];
    interactive?: boolean;
}
export interface MathComponent {
    type: 'equation' | 'graph' | 'shape' | 'vector' | 'matrix' | 'integral';
    data: any;
    position: {
        x: number;
        y: number;
    };
    animation?: MathAnimation;
}
export interface MathAnimation {
    type: 'transform' | 'highlight' | 'draw' | 'solve_step';
    steps: any[];
    duration: number;
}
export interface FunctionPlot {
    expression: string;
    domain: [number, number];
    range?: [number, number];
    points?: {
        x: number;
        y: number;
    }[];
    derivative?: boolean;
    integral?: {
        from: number;
        to: number;
        showArea: boolean;
    };
}
export interface LiveSystemConnection {
    id: string;
    type: 'kubernetes' | 'aws' | 'azure' | 'gcp' | 'prometheus' | 'database' | 'api';
    credentials: {
        type: 'oauth' | 'token' | 'basic' | 'certificate';
        data: Record<string, string>;
    };
    status: 'connected' | 'disconnected' | 'error';
    lastSync: number;
}
export interface LiveMetric {
    name: string;
    value: number;
    unit: string;
    timestamp: number;
    source: string;
    labels?: Record<string, string>;
}
export interface LiveSystemVisualization {
    connectionId: string;
    metrics: LiveMetric[];
    visualization: DataVisualization;
    refreshInterval: number;
    autoRefresh: boolean;
}
export type AnimationType = 'fadeIn' | 'scaleIn' | 'slideIn' | 'pulse' | 'dashFlow' | 'none' | 'morph' | 'particle' | 'spring' | 'cinematic';
export interface AdvancedAnimation {
    type: AnimationType;
    duration: number;
    delay: number;
    easing?: string;
    morphTarget?: any;
    particleConfig?: ParticleConfig;
    springConfig?: SpringConfig;
    cinematicPath?: CinematicPath;
}
export interface ParticleConfig {
    count: number;
    lifetime: number;
    speed: {
        min: number;
        max: number;
    };
    size: {
        min: number;
        max: number;
    };
    color: string[];
    emitter: {
        x: number;
        y: number;
    };
    gravity?: {
        x: number;
        y: number;
    };
}
export interface SpringConfig {
    stiffness: number;
    damping: number;
    mass: number;
    velocity: number;
}
export interface CinematicPath {
    keyframes: CameraKeyframe[];
    easing: string;
    totalDuration: number;
}
export interface CameraKeyframe {
    time: number;
    position: {
        x: number;
        y: number;
    };
    zoom: number;
    rotation?: number;
    focusTarget?: string;
}
export interface VisualComplexity {
    level: 'minimal' | 'simple' | 'moderate' | 'detailed' | 'complex';
    entityCount: number;
    animationIntensity: 'low' | 'medium' | 'high';
    labelDensity: 'sparse' | 'moderate' | 'dense';
    colorComplexity: 'monochrome' | 'limited' | 'full';
}
export interface LearningStyle {
    type: 'visual' | 'textual' | 'kinesthetic' | 'balanced';
    confidence: number;
    indicators: string[];
}
export interface ExpertiseLevel {
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    domain: string;
    confidence: number;
    inferredFrom: string[];
}
export interface AdaptationMetrics {
    confusionRate: number;
    interruptFrequency: number;
    questionComplexity: number;
    acknowledgmentRate: number;
    pauseDuration: number;
    revisitPatterns: string[];
}
export interface ImageAnalysisRequest {
    image: string;
    prompt: string;
    analysisType: 'diagram' | 'screenshot' | 'sketch' | 'whiteboard';
}
export interface ImageAnalysisResult {
    description: string;
    entities: DetectedEntity[];
    relationships: DetectedRelationship[];
    suggestedNodes: Partial<KGNode>[];
    enhancedImage?: string;
}
export interface DetectedEntity {
    type: string;
    label: string;
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    confidence: number;
}
export interface DetectedRelationship {
    from: string;
    to: string;
    type: string;
    confidence: number;
}
export interface SceneLayout {
    type: 'force-directed' | 'hierarchical' | 'circular' | 'grid' | 'flow';
    entities: LayoutEntity[];
    constraints?: LayoutConstraint[];
    aestheticScore?: number;
}
export interface LayoutEntity {
    id: string;
    position: {
        x: number;
        y: number;
    };
    size: {
        width: number;
        height: number;
    };
    fixed?: boolean;
    weight?: number;
}
export interface LayoutConstraint {
    type: 'alignment' | 'spacing' | 'proximity' | 'ordering';
    entities: string[];
    value?: number;
}
export interface CompositionRule {
    name: string;
    enabled: boolean;
    weight: number;
    evaluate: (scene: any) => number;
}
export interface CollaborativeSession {
    sessionId: string;
    participants: Participant[];
    presenter: string;
    sharedState: any;
    annotations: Annotation[];
    recording?: RecordingState;
}
export interface Participant {
    userId: string;
    name: string;
    role: 'presenter' | 'co-presenter' | 'viewer';
    status: 'active' | 'idle' | 'disconnected';
    cursor?: {
        x: number;
        y: number;
    };
}
export interface Annotation {
    id: string;
    userId: string;
    type: 'arrow' | 'circle' | 'highlight' | 'text' | 'laser';
    position: {
        x: number;
        y: number;
    };
    data: any;
    timestamp: number;
    persist: boolean;
    fadeAfter?: number;
}
export interface RecordingState {
    isRecording: boolean;
    startTime: number;
    frames: RecordedFrame[];
    audioTrack?: any;
}
export interface RecordedFrame {
    timestamp: number;
    sceneSnapshot: PresentationScene;
    annotations: Annotation[];
    audioOffset: number;
}
export interface AssetLibrary {
    logos: LogoAsset[];
    icons: IconAsset[];
    illustrations: IllustrationAsset[];
    cached: Map<string, CachedAsset>;
}
export interface LogoAsset {
    name: string;
    keywords: string[];
    url: string;
    svg?: string;
    color?: string;
    category: string;
}
export interface IconAsset {
    name: string;
    category: string;
    svg: string;
    keywords: string[];
}
export interface IllustrationAsset {
    id: string;
    url: string;
    keywords: string[];
    style: string;
    category: string;
}
export interface CachedAsset {
    url: string;
    data: string;
    contentType: string;
    cachedAt: number;
    expiresAt: number;
}
export interface SpatialAudioConfig {
    enabled: boolean;
    listenerPosition: {
        x: number;
        y: number;
        z: number;
    };
    entitySounds: Map<string, EntitySound>;
}
export interface EntitySound {
    entityId: string;
    position: {
        x: number;
        y: number;
        z: number;
    };
    audioBuffer: any;
    volume: number;
    loop: boolean;
}
export interface BackgroundMusic {
    id: string;
    url: string;
    mood: 'calm' | 'upbeat' | 'tense' | 'triumphant';
    volume: number;
    fadeInDuration: number;
    fadeOutDuration: number;
}
export interface VoiceConfig {
    voice: string;
    pitch: number;
    rate: number;
    volume: number;
    emotion?: 'neutral' | 'excited' | 'serious' | 'friendly';
}
export interface CrossSessionKnowledgeGraph {
    userId: string;
    globalGraph: KnowledgeGraph;
    sessions: SessionSummary[];
    conceptMastery: Map<string, MasteryLevel>;
    learningPath: LearningPathNode[];
}
export interface SessionSummary {
    sessionId: string;
    date: number;
    topic: string;
    nodesLearned: string[];
    duration: number;
    comprehensionScore: number;
}
export interface MasteryLevel {
    conceptId: string;
    level: 'introduced' | 'familiar' | 'practiced' | 'mastered';
    lastReviewed: number;
    nextReview: number;
    reviewCount: number;
}
export interface LearningPathNode {
    conceptId: string;
    prerequisites: string[];
    status: 'locked' | 'available' | 'in-progress' | 'completed';
    suggestedNext: string[];
}
export interface WebContentEmbed {
    type: 'iframe' | 'api' | 'screenshot';
    url: string;
    config: {
        highlightSelector?: string;
        scrollTo?: string;
        annotations?: Annotation[];
    };
    position: {
        x: number;
        y: number;
    };
    size: {
        width: number;
        height: number;
    };
}
export interface APIPlayground {
    id: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;
    headers: Record<string, string>;
    body?: any;
    response?: {
        status: number;
        headers: Record<string, string>;
        body: any;
        time: number;
    };
}
export type ExtendedWSServerEvent = WSServerEvent | {
    type: 'code_execution_result';
    result: CodeExecutionResult;
} | {
    type: 'code_visualization';
    visualization: CodeVisualization;
} | {
    type: 'data_visualization';
    visualization: DataVisualization;
} | {
    type: 'ai_illustration_generated';
    result: AIIllustrationResult;
} | {
    type: '3d_visualization';
    visualization: ThreeDVisualization;
} | {
    type: 'math_visualization';
    visualization: MathVisualization;
} | {
    type: 'live_metrics_update';
    metrics: LiveMetric[];
} | {
    type: 'participant_joined';
    participant: Participant;
} | {
    type: 'participant_left';
    userId: string;
} | {
    type: 'annotation_added';
    annotation: Annotation;
} | {
    type: 'visual_adaptation';
    complexity: VisualComplexity;
    reason: string;
} | {
    type: 'expertise_detected';
    expertise: ExpertiseLevel;
} | {
    type: 'learning_style_detected';
    style: LearningStyle;
};
export type ExtendedWSClientEvent = WSClientEvent | {
    type: 'execute_code';
    request: CodeExecutionRequest;
} | {
    type: 'generate_ai_illustration';
    request: AIIllustrationRequest;
} | {
    type: 'analyze_image';
    request: ImageAnalysisRequest;
} | {
    type: 'connect_live_system';
    connection: Partial<LiveSystemConnection>;
} | {
    type: 'add_annotation';
    annotation: Omit<Annotation, 'id' | 'timestamp'>;
} | {
    type: 'start_recording';
} | {
    type: 'stop_recording';
} | {
    type: 'export_session';
    format: 'mp4' | 'gif' | 'pdf' | 'html' | 'markdown';
};
