/* ═══════════════════════════════════════════════════════════════
   Agentic Presentation System V2 — Shared Type Definitions
   Active Presenter with Personalized Cognitive Scaffolding
   ═══════════════════════════════════════════════════════════════ */

// ── Data Type Classification ─────────────────────────────────
export enum DataType {
  CONCEPT      = 'CONCEPT',
  RELATIONSHIP = 'RELATIONSHIP',
  EXAMPLE      = 'EXAMPLE',
  ANALOGY      = 'ANALOGY',
  DEFINITION   = 'DEFINITION',
  PROCESS      = 'PROCESS',
  RESOURCE     = 'RESOURCE',
  COUNTERPOINT = 'COUNTERPOINT',
}

export enum EdgeType {
  REQUIRES    = 'REQUIRES',
  CONTAINS    = 'CONTAINS',
  RELATES_TO  = 'RELATES_TO',
  EXEMPLIFIES = 'EXEMPLIFIES',
  CONTRADICTS = 'CONTRADICTS',
  LEADS_TO    = 'LEADS_TO',
  DEEPENS     = 'DEEPENS',
}

// ── Visual Specification ─────────────────────────────────────
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

// ── Knowledge Graph Node ─────────────────────────────────────
export interface KGNode {
  id: string;
  label: string;
  type: DataType;
  domain?: AcademicDomain;
  depth: number;
  content: string;
  narration: string;
  visual: VisualSpec;
  rlRelevanceScore: number;
  isExpanded: boolean;
  isPresented: boolean;
  parentId: string | null;
  metadata: Record<string, any>;
  visualHint?: VisualHint;
  createdAt: number;
}

// ── Knowledge Graph Edge ─────────────────────────────────────
export interface KGEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  type: EdgeType;
  weight: number;
  isPresented: boolean;
}

// ── Full Knowledge Graph ─────────────────────────────────────
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

// ── Graph Mutation ───────────────────────────────────────────
export type GraphMutationType = 'add_node' | 'add_edge' | 'update_node' | 'remove_node' | 'remove_edge';

export interface GraphMutation {
  type: GraphMutationType;
  data: KGNode | KGEdge | { id: string; updates: Partial<KGNode> };
  timestamp: number;
}

// ── Session State Machine ────────────────────────────────────
export enum SessionState {
  IDLE           = 'IDLE',
  LISTENING      = 'LISTENING',
  REASONING      = 'REASONING',
  BUILDING_GRAPH = 'BUILDING_GRAPH',
  PRESENTING     = 'PRESENTING',
  INTERRUPTED    = 'INTERRUPTED',
  COMPLETED      = 'COMPLETED',
}

// ── Presentation Bookmark (Interrupt Resume) ─────────────────
export interface PresentationBookmark {
  sceneId: string;
  nodeId: string;
  wordOffset: number;
  audioTimestamp: number;
  elementStates: Record<string, { opacity: number; x: number; y: number; highlighted: boolean }>;
  traversalIndex: number;
  timestamp: number;
}

// ── Presentation Scene ───────────────────────────────────────
export interface PresentationScene {
  id: string;
  nodeIds: string[];
  edgeIds: string[];
  narration: string;
  focusNodeId: string;
  viewport: { x: number; y: number; zoom: number };
  visualCommands: VisualCommand[];
  durationEstimate: number;
  illustrations?: IllustrationSpec[]; // Legacy support
  visualScript?: VisualScript; // New frame-based system
  sceneContract?: SceneContract; // Multi-agent binding contract
}

export interface VisualCommand {
  type: 'reveal' | 'highlight' | 'dim' | 'hide' | 'zoom' | 'pan' | 'connect' | 'annotate';
  targetId: string;
  wordTrigger?: number;
  params?: Record<string, any>;
}

// ── Illustration Specification ──────────────────────────────────
export interface IllustrationSpec {
  id: string;
  type: 'shape' | 'icon' | 'diagram';
  elementType: ElementType;
  position: { x: number; y: number }; // Percentage-based (0-100)
  size: { width: number; height: number };
  style: Style;
  animation: Animation;
  content?: string;
  appearTimingMs: number;
}

// ── Frame-Based Visual Narrative System ─────────────────────────

// Visual entity types (semantic understanding)
export type VisualEntityType =
  // Infrastructure types
  | 'User' | 'Server' | 'Database' | 'Container' | 'Pod'
  | 'Cloud' | 'Network' | 'Device' | 'Arrow' | 'DataFlow'
  | 'Process' | 'Queue' | 'Cache' | 'LoadBalancer' | 'Service'
  // Extended IT infrastructure types
  | 'Firewall' | 'APIGateway' | 'Lambda' | 'Subnet' | 'Volume'
  | 'Registry' | 'Monitor' | 'Pipeline' | 'Decision' | 'Cluster'
  // Universal types (topic-agnostic)
  | 'Concept' | 'Entity' | 'Group' | 'Label'
  | 'Comparison' | 'Timeline' | 'Metric' | 'Cycle'
  | 'Stack' | 'Tree' | 'Badge' | 'Quote'
  // Math & Science types
  | 'Equation' | 'Expression' | 'Matrix'
  | 'Graph2D' | 'NumberLine' | 'CoordinateSystem'
  // Physics types
  | 'FreeBodyDiagram' | 'Circuit' | 'Wave' | 'Vector' | 'Field' | 'Particle'
  // General purpose types
  | 'Table' | 'Histogram' | 'PieChart' | 'FlowDiagram' | 'VennDiagram' | 'Annotation';

// Visual entity instance
export interface VisualEntity {
  id: string;
  type: VisualEntityType;
  position: { x: number; y: number }; // Canvas coordinates (0-100%)
  size: { width: number; height: number };
  label?: string;
  color?: string;
  highlight?: boolean;
  animation?: {
    type: 'fadeIn' | 'slideIn' | 'scaleIn' | 'pulse' | 'flow' | 'dashFlow' | 'none';
    duration: number;
    delay: number;
  };
  // Entity-to-entity connections (for Arrow/DataFlow types)
  sourceEntityId?: string; // label-based ref to source entity
  targetEntityId?: string; // label-based ref to target entity
  // Hierarchical nesting
  parentEntityId?: string; // label-based ref to parent container entity
  // Rich text
  textContent?: string[]; // Multi-line text content
  codeLanguage?: string;  // For code blocks
  metadata?: Record<string, any>;
}

// Entity transition between frames
export interface EntityTransition {
  entityId: string;
  from: Partial<VisualEntity>;
  to: Partial<VisualEntity>;
  duration: number;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

// Single frame in visual narrative
export interface IllustrationFrame {
  id: string;
  startTime: number; // milliseconds
  endTime: number;
  entities: VisualEntity[];
  transitions?: EntityTransition[];
  narrationSegment: string; // What's being said during this frame
  description: string; // Visual description for debugging
}

// Complete visual script for a scene
export interface VisualScript {
  sceneId: string;
  frames: IllustrationFrame[];
  totalDuration: number;
  entities: Record<string, VisualEntity>; // All entities referenced
}

// ── Scene Preparation (Concurrent Pipeline) ─────────────────
export type ScenePreparationStatus = 'pending' | 'preparing' | 'ready' | 'failed';

export interface PreparedScene {
  scene: PresentationScene;
  audioData?: Uint8Array;
  wordTimestamps?: WordTimestamp[];
  audioDurationMs?: number;
  status: ScenePreparationStatus;
}

// ── Traversal Path ───────────────────────────────────────────
export interface TraversalPath {
  sceneSequence: PresentationScene[];
  estimatedDuration: number;
  branchPoints: { sceneIndex: number; possibleBranches: string[] }[];
}

// ── Voice Events ─────────────────────────────────────────────
export enum VoiceIntent {
  QUESTION       = 'QUESTION',
  ACKNOWLEDGMENT = 'ACKNOWLEDGMENT',
  CONFUSION      = 'CONFUSION',
  COMMAND        = 'COMMAND',
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

// ── RL Learner State ─────────────────────────────────────────
export interface LearnerState {
  // Real-time session signals
  avgTimePerNode: number;
  interruptRate: number;
  confusionRate: number;
  acknowledgmentRate: number;
  silenceDuration: number;
  revisitCount: number;
  currentDepth: number;
  nodesPresented: number;

  // Persistent cross-session profile
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

// ── User Preferences ─────────────────────────────────────────
export interface UserPreferences {
  userId: string;
  displayName: string;
  language: string;
  voiceId?: string;
  learnerProfile: LearnerState;
  rlPolicy: RLPolicy;
  sessionHistory: { sessionId: string; topic: string; timestamp: number; nodesExplored: number }[];
  createdAt: number;
  updatedAt: number;
}

// ── Agent Reasoning Output ───────────────────────────────────
export type AcademicDomain = 'mathematics' | 'physics' | 'chemistry' | 'biology' | 'computer-science' | 'engineering' | 'general';

export interface ReasoningOutput {
  topic: string;
  conceptualPrimitives: { label: string; type: DataType; content: string; narration: string; visualHint?: VisualHint; domain?: AcademicDomain; sceneContract?: SceneContract }[];
  relationships: { from: string; to: string; type: EdgeType; label: string }[];
  prerequisiteDependencies: string[];
  complexityGradient: string[];
  anticipatedFollowUps: string[];
}

// ── Visual Hint (Agent → Visual Script Pipeline) ────────────
export type LayoutPattern =
  | 'flow-lr' | 'flow-tb' | 'hierarchical' | 'circular'
  | 'comparison' | 'layered' | 'central-radial' | 'timeline'
  | 'equation-flow' | 'coordinate' | 'force-diagram' | 'proof-steps';

export interface VisualHintEntity {
  type: string;
  label: string;
  role: 'primary' | 'secondary' | 'connector' | 'decoration';
}

export interface VisualHint {
  suggestedEntities: VisualHintEntity[];
  layoutPattern: LayoutPattern;
  visualMetaphor?: string;
  colorScheme?: 'cool' | 'warm' | 'neutral' | 'contrasting';
}

// ── Multi-Agent System Types (Phase 2.5) ─────────────────────

/** Binding specification from the Director Agent */
export interface SceneContract {
  requiredEntities: {
    type: VisualEntityType;
    label: string;
    role: string;
    mandatory: boolean;
  }[];
  spatialConstraints: {
    type: 'above' | 'below' | 'left-of' | 'right-of' | 'near' | 'aligned';
    entityA: string;
    entityB: string;
  }[];
  pedagogicalGoal: string;
  domain: AcademicDomain;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
}

/** Output from the Domain Expert Agent */
export interface DomainGuidance {
  domain: AcademicDomain;
  entityMetadata: Record<string, Record<string, any>>;
  animationChoreography: {
    entityLabel: string;
    animationType: string;
    delay: number;
    notes: string;
  }[];
  domainRules: string[];
}

/** Output from the Quality Critic Agent */
export interface CriticReview {
  approved: boolean;
  qualityScore: number;
  revisions?: {
    issue: string;
    fix: string;
    priority: 'high' | 'medium' | 'low';
  }[];
}

/** Shared agent communication context (blackboard pattern) */
export interface SceneBlackboard {
  sceneId: string;
  contract: SceneContract;
  domainGuidance?: DomainGuidance;
  visualScript?: VisualScript;
  criticReview?: CriticReview;
  revisionCount: number;
  finalScript?: VisualScript;
}

export interface ClassifiedChunk {
  id: string;
  label: string;
  type: DataType;
  content: string;
  narration: string;
  parentRef?: string;
  relatedRefs?: string[];
  resources?: { url: string; title: string }[];
  depth: number;
}

// ── WebSocket Event Types ────────────────────────────────────
export type WSClientEvent =
  | { type: 'audio_chunk'; data: ArrayBuffer }
  | { type: 'user_command'; command: 'pause' | 'resume' | 'skip' | 'go_back' | 'show_graph' | 'toggle_voice' }
  | { type: 'start_session'; topic: string }
  | { type: 'ping' };

export type WSServerEvent =
  | { type: 'agent_audio'; data: ArrayBuffer }
  | { type: 'visual_command'; command: VisualCommand }
  | { type: 'graph_update'; mutation: GraphMutation }
  | { type: 'state_change'; from: SessionState; to: SessionState; metadata?: Record<string, any> }
  | { type: 'bookmark_created'; bookmark: PresentationBookmark }
  | { type: 'bookmark_resumed'; bookmark: PresentationBookmark }
  | { type: 'scene_change'; scene: PresentationScene }
  | { type: 'narration_text'; text: string; sceneId: string }
  | { type: 'agent_audio_meta'; durationMs: number; sceneId: string; wordTimestamps?: WordTimestamp[]; visualScript?: VisualScript; illustrations?: IllustrationSpec[] }
  | { type: 'rl_update'; policy: RLPolicy; learnerState: Partial<LearnerState> }
  | { type: 'scene_prepare_status'; sceneIndex: number; status: ScenePreparationStatus; totalScenes: number }
  | { type: 'error'; message: string; code: string }
  | { type: 'pong' };

// ── Data-Type → Visual Mapping Config ────────────────────────
export const DATA_TYPE_VISUALS: Record<DataType, { color: string; elementType: ElementType; icon: string }> = {
  [DataType.CONCEPT]:      { color: '#00e5ff', elementType: 'box',           icon: '💡' },
  [DataType.RELATIONSHIP]: { color: '#ff2d7b', elementType: 'arrow',         icon: '🔗' },
  [DataType.EXAMPLE]:      { color: '#00e676', elementType: 'code',          icon: '📋' },
  [DataType.ANALOGY]:      { color: '#ffab00', elementType: 'split_panel',   icon: '🔄' },
  [DataType.DEFINITION]:   { color: '#b388ff', elementType: 'text',          icon: '📖' },
  [DataType.PROCESS]:      { color: '#00bcd4', elementType: 'flow_sequence', icon: '⚡' },
  [DataType.RESOURCE]:     { color: '#4caf50', elementType: 'callout',       icon: '🔗' },
  [DataType.COUNTERPOINT]: { color: '#ff6b9d', elementType: 'callout',       icon: '⚠️' },
};

// ── Constants ────────────────────────────────────────────────
export const KG_NODE_LIMIT = 50;
export const KG_MAX_DEPTH = 4;
export const INTERRUPT_DETECTION_MS = 300;
export const BOOKMARK_RESUME_MS = 500;
export const RL_UPDATE_INTERVAL_MS = 50;
export const VOICE_SAMPLE_RATE = 16000;
export const VOICE_CHUNK_SIZE = 4096;
export const CONCURRENCY_POOL_CLAUDE_MAX = 5;
export const CONCURRENCY_POOL_TTS_MAX = 2;
export const CONCURRENCY_POOL_TOTAL_MAX = 6;

// ── Canvas & Visual Constants ────────────────────────────
export const CANVAS_WIDTH = 1600;
export const CANVAS_HEIGHT = 900;

// ── Visual Timing Floors ────────────────────────────────
export const ANIMATION_DELAY_MIN_MS = 150;
export const FRAME_DURATION_MIN_MS = 1500;
export const ILLUSTRATION_APPEAR_MIN_MS = 200;
export const INTER_ENTITY_STAGGER_MIN_MS = 100;

/** Extra pixels below entity body reserved for the text label */
export const ENTITY_LABEL_PADDING_PX = 22;

/**
 * Clamp an entity's center position so the entity (including its label)
 * stays fully within the canvas.
 * Positions are in 0-100 percentage space; sizes are in pixels.
 */
export function clampEntityPosition(
  position: { x: number; y: number },
  entityWidthPx: number,
  entityHeightPx: number,
  canvasWidth = CANVAS_WIDTH,
  canvasHeight = CANVAS_HEIGHT,
): { x: number; y: number } {
  // Guard against NaN — default to canvas center
  const px = isNaN(position.x) ? 50 : position.x;
  const py = isNaN(position.y) ? 50 : position.y;
  const halfWPct = (entityWidthPx / 2) / canvasWidth * 100;
  const halfHPct = (entityHeightPx / 2) / canvasHeight * 100;
  // Labels extend below the entity body — reserve space for them
  const labelPadPct = ENTITY_LABEL_PADDING_PX / canvasHeight * 100;
  const pad = 1; // 1% padding from edge
  return {
    x: Math.max(halfWPct + pad, Math.min(100 - halfWPct - pad, px)),
    y: Math.max(halfHPct + pad, Math.min(100 - halfHPct - labelPadPct - pad, py)),
  };
}

// ══════════════════════════════════════════════════════════════════
// ADVANCED FEATURES — Types for Enhanced Capabilities
// ══════════════════════════════════════════════════════════════════

// ── Code Execution & Visualization ───────────────────────────────
export enum CodeLanguage {
  JAVASCRIPT = 'javascript',
  PYTHON = 'python',
  GO = 'go',
  RUST = 'rust',
  JAVA = 'java',
  TYPESCRIPT = 'typescript',
  CPP = 'cpp',
  BASH = 'bash',
}

export interface CodeExecutionRequest {
  code: string;
  language: CodeLanguage;
  stdin?: string;
  timeout?: number; // milliseconds
  memoryLimit?: number; // MB
}

export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number; // ms
  memoryUsed: number; // bytes
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
    time: string; // e.g., "O(n²)"
    space: string; // e.g., "O(n)"
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
  highlights?: number[]; // indices to highlight
  label?: string;
  position: { x: number; y: number };
}

export interface MemoryViz {
  stack: StackFrame[];
  heap: HeapObject[];
  totalSize: number;
}

export interface StackFrame {
  function: string;
  variables: Record<string, { value: any; type: string; address: string }>;
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

// ── Data Visualization ───────────────────────────────────────────
export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  SCATTER = 'scatter',
  PIE = 'pie',
  HEATMAP = 'heatmap',
  TREEMAP = 'treemap',
  SUNBURST = 'sunburst',
  NETWORK = 'network',
  SANKEY = 'sankey',
  TIMESERIES = 'timeseries',
  CANDLESTICK = 'candlestick',
  BOX = 'box',
  VIOLIN = 'violin',
}

export interface DataVisualization {
  id: string;
  type: ChartType;
  data: any; // Chart-specific data format
  config: ChartConfig;
  title?: string;
  description?: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
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

// ── AI-Generated Illustrations ───────────────────────────────────
export interface AIIllustrationRequest {
  prompt: string;
  style?: 'technical' | 'artistic' | 'minimal' | 'realistic' | 'cartoon';
  aspectRatio?: '1:1' | '16:9' | '4:3';
  colorPalette?: string[];
  referenceImages?: string[]; // URLs or base64
}

export interface AIIllustrationResult {
  id: string;
  imageUrl: string;
  imageData?: string; // base64
  svgData?: string; // converted SVG if possible
  prompt: string;
  style: string;
  metadata: {
    generatedAt: number;
    model: string;
    revisedPrompt?: string;
  };
}

// ── 3D Visualizations ────────────────────────────────────────────
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
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  material: MaterialConfig;
  label?: string;
  metadata?: Record<string, any>;
}

export interface CameraConfig {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov: number;
  animatePath?: { x: number; y: number; z: number }[];
}

export interface LightConfig {
  type: 'ambient' | 'directional' | 'point' | 'spot';
  position?: { x: number; y: number; z: number };
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

// ── Mathematical Visualization ───────────────────────────────────
export interface MathVisualization {
  id: string;
  type: 'equation' | 'function' | 'geometric' | 'calculus' | 'linear_algebra' | 'parametric' | 'implicit';
  latex?: string;
  components: MathComponent[];
  interactive?: boolean;
}

export interface MathComponent {
  type: 'equation' | 'graph' | 'shape' | 'vector' | 'matrix' | 'integral' | 'parametric_curve' | 'implicit_curve';
  data: any;
  position: { x: number; y: number };
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
  points?: { x: number; y: number }[];
  derivative?: boolean;
  integral?: {
    from: number;
    to: number;
    showArea: boolean;
  };
}

// ── Live System Integration ──────────────────────────────────────
export interface LiveSystemConnection {
  id: string;
  type: 'kubernetes' | 'aws' | 'azure' | 'gcp' | 'prometheus' | 'database' | 'api';
  credentials: {
    type: 'oauth' | 'token' | 'basic' | 'certificate';
    data: Record<string, string>; // Encrypted
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
  refreshInterval: number; // ms
  autoRefresh: boolean;
}

// ── Advanced Animation System ─────────────────────────────────────
export type AnimationType = 'fadeIn' | 'scaleIn' | 'slideIn' | 'pulse' | 'dashFlow' | 'none'
  | 'morph' | 'particle' | 'spring' | 'cinematic';

export interface AdvancedAnimation {
  type: AnimationType;
  duration: number;
  delay: number;
  easing?: string;
  morphTarget?: any; // Target shape for morph
  particleConfig?: ParticleConfig;
  springConfig?: SpringConfig;
  cinematicPath?: CinematicPath;
}

export interface ParticleConfig {
  count: number;
  lifetime: number;
  speed: { min: number; max: number };
  size: { min: number; max: number };
  color: string[];
  emitter: { x: number; y: number };
  gravity?: { x: number; y: number };
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
  position: { x: number; y: number };
  zoom: number;
  rotation?: number;
  focusTarget?: string; // entity ID
}

// ── Intelligent Visual Adaptation ─────────────────────────────────
export interface VisualComplexity {
  level: 'minimal' | 'simple' | 'moderate' | 'detailed' | 'complex';
  entityCount: number;
  animationIntensity: 'low' | 'medium' | 'high';
  labelDensity: 'sparse' | 'moderate' | 'dense';
  colorComplexity: 'monochrome' | 'limited' | 'full';
}

export interface LearningStyle {
  type: 'visual' | 'textual' | 'kinesthetic' | 'balanced';
  confidence: number; // 0-1
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

// ── Multimodal Input ──────────────────────────────────────────────
export interface ImageAnalysisRequest {
  image: string; // base64 or URL
  prompt: string;
  analysisType: 'diagram' | 'screenshot' | 'sketch' | 'whiteboard';
}

export interface ImageAnalysisResult {
  description: string;
  entities: DetectedEntity[];
  relationships: DetectedRelationship[];
  suggestedNodes: Partial<KGNode>[];
  enhancedImage?: string; // cleaned/annotated
}

export interface DetectedEntity {
  type: string;
  label: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  confidence: number;
}

export interface DetectedRelationship {
  from: string;
  to: string;
  type: string;
  confidence: number;
}

// ── Scene Composition ─────────────────────────────────────────────
export interface SceneLayout {
  type: 'force-directed' | 'hierarchical' | 'circular' | 'grid' | 'flow';
  entities: LayoutEntity[];
  constraints?: LayoutConstraint[];
  aestheticScore?: number;
}

export interface LayoutEntity {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  fixed?: boolean;
  weight?: number; // importance
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
  evaluate: (scene: any) => number; // 0-1 score
}

// ── Collaborative Features ────────────────────────────────────────
export interface CollaborativeSession {
  sessionId: string;
  participants: Participant[];
  presenter: string; // userId
  sharedState: any;
  annotations: Annotation[];
  recording?: RecordingState;
}

export interface Participant {
  userId: string;
  name: string;
  role: 'presenter' | 'co-presenter' | 'viewer';
  status: 'active' | 'idle' | 'disconnected';
  cursor?: { x: number; y: number };
}

export interface Annotation {
  id: string;
  userId: string;
  type: 'arrow' | 'circle' | 'highlight' | 'text' | 'laser';
  position: { x: number; y: number };
  data: any;
  timestamp: number;
  persist: boolean;
  fadeAfter?: number; // ms
}

export interface RecordingState {
  isRecording: boolean;
  startTime: number;
  frames: RecordedFrame[];
  audioTrack?: any; // MediaStreamTrack (browser API)
}

export interface RecordedFrame {
  timestamp: number;
  sceneSnapshot: PresentationScene;
  annotations: Annotation[];
  audioOffset: number;
}

// ── Context-Aware Assets ──────────────────────────────────────────
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

// ── Advanced Audio ────────────────────────────────────────────────
export interface SpatialAudioConfig {
  enabled: boolean;
  mode: '2d' | '3d';
  listenerPosition: { x: number; y: number; z: number };
  distanceModel: 'linear' | 'inverse' | 'exponential';
  rolloffFactor: number;
  maxDistance: number;
  refDistance: number;
  entitySounds?: Map<string, EntitySound>;
}

export interface EntitySound {
  entityId: string;
  position: { x: number; y: number; z: number };
  audioBuffer: any; // AudioBuffer (Web Audio API)
  volume: number;
  loop: boolean;
}

export interface BackgroundMusic {
  id: string;
  url: string;
  mood?: 'calm' | 'upbeat' | 'tense' | 'triumphant' | 'neutral';
  volume: number;
  fadeIn?: number;
  fadeOut?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  loop?: boolean;
}

export interface VoiceConfig {
  voice: string;
  pitch: number;
  rate: number;
  volume: number;
  emotion?: 'neutral' | 'excited' | 'serious' | 'friendly';
}

export interface VoiceModulation {
  pitch: number;
  rate: number;
  emphasis: 'light' | 'moderate' | 'strong';
  tone:
    | 'explanatory'
    | 'authoritative'
    | 'demonstrative'
    | 'conversational'
    | 'instructional'
    | 'analytical'
    | 'informative'
    | 'cautionary';
}

export interface AmbientSoundscape {
  id: string;
  type: string;
  layers: Array<{
    url: string;
    volume: number;
    loop: boolean;
  }>;
  spatialPositioning: boolean;
}

export interface AudioEffect {
  type: 'reverb' | 'echo' | 'compression' | 'filter';
  intensity: number;
  decay?: number;
  predelay?: number;
  delay?: number;
  feedback?: number;
  threshold?: number;
  ratio?: number;
  attack?: number;
  release?: number;
  filterType?: 'lowpass' | 'highpass' | 'bandpass';
  frequency?: number;
}

export interface AudioContext {
  backgroundMusic: BackgroundMusic;
  ambientSoundscape: AmbientSoundscape | null;
  voiceModulation: VoiceModulation;
  audioEffects: AudioEffect[];
  spatialAudio: SpatialAudioConfig;
}

// ── Interactive 3D Visualizations ─────────────────────────────────
export interface Scene3D {
  id: string;
  entities: Entity3D[];
  connections: Array<{
    id: string;
    sourceId: string;
    targetId: string;
    type: 'straight' | 'curved' | 'tube';
    color: string;
    thickness: number;
    animated: boolean;
  }>;
  cameraPath: CameraPath3D;
  layers: LayerConfig3D[];
  interactionMode: InteractionMode;
  lighting: {
    ambient: { color: string; intensity: number };
    directional: Array<{
      color: string;
      intensity: number;
      position: { x: number; y: number; z: number };
    }>;
    point: Array<{
      color: string;
      intensity: number;
      position: { x: number; y: number; z: number };
      distance: number;
    }>;
  };
  environment: {
    background: 'gradient' | 'skybox' | 'solid';
    backgroundColor: string;
    fog: { enabled: boolean; color: string; near: number; far: number };
    grid: { enabled: boolean; size: number; divisions: number };
  };
}

export interface Entity3D {
  id: string;
  type: DataType;
  label: string;
  position: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  color: string;
  geometry: 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus';
  opacity: number;
  metadata?: any;
}

export interface CameraPath3D {
  keyframes: CameraKeyframe3D[];
  duration: number;
  easing: string;
  loop: boolean;
}

export interface CameraKeyframe3D {
  time: number;
  position: { x: number; y: number; z: number };
  lookAt: { x: number; y: number; z: number };
  fov: number;
}

export interface LayerConfig3D {
  name: string;
  zRange: [number, number];
  opacity: number;
  visible: boolean;
  color?: string;
}

export interface InteractionMode {
  orbit: boolean;
  pan: boolean;
  zoom: boolean;
  rotate: boolean;
  select: boolean;
  flyThrough: boolean;
}

export interface VRConfig {
  enabled: boolean;
  mode: 'vr' | 'ar';
  controllers: {
    left: { enabled: boolean; raycast: boolean; teleport?: boolean };
    right: { enabled: boolean; raycast: boolean; select?: boolean };
  };
  locomotion: 'teleport' | 'smooth' | 'none';
  scale: number;
  playerHeight: number;
}

// ── Multimodal Input ──────────────────────────────────────────────
export interface MultimodalInput {
  id: string;
  type: 'image' | 'sketch' | 'pdf' | 'screenshot';
  data: string;
  mimeType: string;
  context?: string;
}

export interface ImageAnalysis {
  id: string;
  topic: string;
  concepts: Array<{ label: string; description: string }>;
  relationships: Array<{ from: string; to: string; type: string }>;
  visualElements: string[];
  technicalDetails: string[];
  isDiagram: boolean;
  diagramType?: string;
  confidence: number;
  extractedText: string;
  suggestedKnowledgeGraph: KnowledgeGraph;
}

export interface SketchInterpretation {
  id: string;
  diagramType: string;
  elements: Array<{
    id: string;
    type: string;
    label: string;
    position: { x: number; y: number };
  }>;
  connections: Array<{ from: string; to: string; label: string }>;
  interpretation: string;
  cleanedDiagram: string;
  confidence: number;
  suggestedVisualSpec: any;
}

export interface PDFProcessing {
  id: string;
  pageCount: number;
  processedPages: number;
  overallSummary: string;
  pageSummaries: Array<{
    pageNumber: number;
    summary: string;
    keyPoints: string[];
  }>;
  extractedConcepts: string[];
  suggestedPresentation: string[];
}

export interface DiagramExtraction {
  id: string;
  type: string;
  nodes: Array<{ id: string; label: string; type: string }>;
  edges: Array<{ source: string; target: string; label: string }>;
  layers: Array<{ name: string; nodeIds: string[] }>;
  dataFlow: string;
  reconstructedKnowledgeGraph: KnowledgeGraph;
}

// ── Live System Integration ───────────────────────────────────────
export interface SystemConnection {
  id: string;
  type: 'kubernetes' | 'aws' | 'azure' | 'gcp' | 'prometheus' | 'grafana' | 'datadog';
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  metadata: Record<string, any>;
  connectedAt: number;
  lastActivity: number;
}

export interface LiveMetrics {
  id: string;
  query: string;
  metric: string;
  values: Array<{ timestamp: number; value: number }>;
  aggregation: 'avg' | 'sum' | 'min' | 'max';
  unit: string;
}

export interface LogStream {
  id: string;
  resource: string;
  lines: Array<{
    timestamp: number;
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
    message: string;
  }>;
  isLive: boolean;
}

export interface TraceData {
  id: string;
  serviceName: string;
  spans: Array<{
    id: string;
    name: string;
    serviceName: string;
    startTime: number;
    duration: number;
    tags: Record<string, string>;
    parentId?: string;
  }>;
  totalDuration: number;
  status: 'success' | 'error';
}

export interface ClusterInfo {
  name: string;
  version: string;
  nodes: Array<{
    name: string;
    status: string;
    cpu: string;
    memory: string;
    pods: number;
  }>;
  namespaces: string[];
  totalPods: number;
  totalServices: number;
  totalDeployments: number;
}

export interface CloudResource {
  id: string;
  name: string;
  type: string;
  status: string;
  region: string;
  details: Record<string, any>;
}

// ── Live Web Content Integration ──────────────────────────────────
export interface WebEmbedding {
  id: string;
  type: 'documentation' | 'api' | 'repository';
  url: string;
  title: string;
  iframeable: boolean;
  annotations: Array<{
    type: 'highlight' | 'arrow' | 'circle';
    selector: string;
    color: string;
    label: string;
  }>;
  scrollTo?: string;
  interactive: boolean;
}

export interface GitHubRepo {
  id: string;
  owner: string;
  repo: string;
  branch: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  topics: string[];
  fileTree: Array<{ path: string; type: 'file' | 'directory'; size?: number }>;
  readme: string;
  recentCommits: Array<{
    sha: string;
    message: string;
    author: string;
    date: number;
  }>;
}

export interface APIPlayground {
  id: string;
  url: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers: Record<string, string>;
  body?: any;
  responseTime: number;
  apiResponse: any;
  status: 'idle' | 'loading' | 'success' | 'error';
  curlCommand: string;
}

export interface WebScrapeResult {
  id: string;
  url: string;
  title: string;
  summary: string;
  keyPoints: string[];
  links: Array<{ text: string; url: string }>;
  images: Array<{ url: string; alt: string }>;
  scrapedAt: number;
}

export interface DocumentationSection {
  id: string;
  title: string;
  level: number;
  content: string;
  url: string;
}

// ── Collaborative & Recording (Extended) ──────────────────────────
export interface RecordingSession {
  id: string;
  sessionId: string;
  startTime: number;
  endTime: number | null;
  duration: number;
  frames: Array<{
    timestamp: number;
    sceneId: string;
    visualState: any;
  }>;
  audioTrack: any;
  annotations: Annotation[];
  bookmarks: BookmarkPoint[];
  status: 'recording' | 'paused' | 'completed';
}

export type ExportFormat = 'video' | 'pdf' | 'html' | 'markdown' | 'gif';

export interface BookmarkPoint {
  id: string;
  label: string;
  timestamp: number;
  sceneId: string | null;
}

// ── Memory & Knowledge Graph ──────────────────────────────────────
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

// ── Web Content Integration ───────────────────────────────────────
export interface WebContentEmbed {
  type: 'iframe' | 'api' | 'screenshot';
  url: string;
  config: {
    highlightSelector?: string;
    scrollTo?: string;
    annotations?: Annotation[];
  };
  position: { x: number; y: number };
  size: { width: number; height: number };
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

// ── Extended WebSocket Events ─────────────────────────────────────
export type ExtendedWSServerEvent = WSServerEvent
  | { type: 'code_execution_result'; result: CodeExecutionResult }
  | { type: 'code_visualization'; visualization: CodeVisualization }
  | { type: 'data_visualization'; visualization: DataVisualization }
  | { type: 'ai_illustration_generated'; result: AIIllustrationResult }
  | { type: '3d_visualization'; visualization: ThreeDVisualization }
  | { type: 'math_visualization'; visualization: MathVisualization }
  | { type: 'live_metrics_update'; metrics: LiveMetric[] }
  | { type: 'participant_joined'; participant: Participant }
  | { type: 'participant_left'; userId: string }
  | { type: 'annotation_added'; annotation: Annotation }
  | { type: 'visual_adaptation'; complexity: VisualComplexity; reason: string }
  | { type: 'expertise_detected'; expertise: ExpertiseLevel }
  | { type: 'learning_style_detected'; style: LearningStyle };

export type ExtendedWSClientEvent = WSClientEvent
  | { type: 'execute_code'; request: CodeExecutionRequest }
  | { type: 'generate_ai_illustration'; request: AIIllustrationRequest }
  | { type: 'analyze_image'; request: ImageAnalysisRequest }
  | { type: 'connect_live_system'; connection: Partial<LiveSystemConnection> }
  | { type: 'add_annotation'; annotation: Omit<Annotation, 'id' | 'timestamp'> }
  | { type: 'start_recording' }
  | { type: 'stop_recording' }
  | { type: 'export_session'; format: 'mp4' | 'gif' | 'pdf' | 'html' | 'markdown' };
