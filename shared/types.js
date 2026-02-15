"use strict";
/* ═══════════════════════════════════════════════════════════════
   Agentic Presentation System V2 — Shared Type Definitions
   Active Presenter with Personalized Cognitive Scaffolding
   ═══════════════════════════════════════════════════════════════ */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VOICE_CHUNK_SIZE = exports.VOICE_SAMPLE_RATE = exports.RL_UPDATE_INTERVAL_MS = exports.BOOKMARK_RESUME_MS = exports.INTERRUPT_DETECTION_MS = exports.KG_MAX_DEPTH = exports.KG_NODE_LIMIT = exports.DATA_TYPE_VISUALS = exports.VoiceIntent = exports.SessionState = exports.EdgeType = exports.DataType = void 0;
// ── Data Type Classification ─────────────────────────────────
var DataType;
(function (DataType) {
    DataType["CONCEPT"] = "CONCEPT";
    DataType["RELATIONSHIP"] = "RELATIONSHIP";
    DataType["EXAMPLE"] = "EXAMPLE";
    DataType["ANALOGY"] = "ANALOGY";
    DataType["DEFINITION"] = "DEFINITION";
    DataType["PROCESS"] = "PROCESS";
    DataType["RESOURCE"] = "RESOURCE";
    DataType["COUNTERPOINT"] = "COUNTERPOINT";
})(DataType || (exports.DataType = DataType = {}));
var EdgeType;
(function (EdgeType) {
    EdgeType["REQUIRES"] = "REQUIRES";
    EdgeType["CONTAINS"] = "CONTAINS";
    EdgeType["RELATES_TO"] = "RELATES_TO";
    EdgeType["EXEMPLIFIES"] = "EXEMPLIFIES";
    EdgeType["CONTRADICTS"] = "CONTRADICTS";
    EdgeType["LEADS_TO"] = "LEADS_TO";
    EdgeType["DEEPENS"] = "DEEPENS";
})(EdgeType || (exports.EdgeType = EdgeType = {}));
// ── Session State Machine ────────────────────────────────────
var SessionState;
(function (SessionState) {
    SessionState["IDLE"] = "IDLE";
    SessionState["LISTENING"] = "LISTENING";
    SessionState["REASONING"] = "REASONING";
    SessionState["BUILDING_GRAPH"] = "BUILDING_GRAPH";
    SessionState["PRESENTING"] = "PRESENTING";
    SessionState["INTERRUPTED"] = "INTERRUPTED";
    SessionState["COMPLETED"] = "COMPLETED";
})(SessionState || (exports.SessionState = SessionState = {}));
// ── Voice Events ─────────────────────────────────────────────
var VoiceIntent;
(function (VoiceIntent) {
    VoiceIntent["QUESTION"] = "QUESTION";
    VoiceIntent["ACKNOWLEDGMENT"] = "ACKNOWLEDGMENT";
    VoiceIntent["CONFUSION"] = "CONFUSION";
    VoiceIntent["COMMAND"] = "COMMAND";
})(VoiceIntent || (exports.VoiceIntent = VoiceIntent = {}));
// ── Data-Type → Visual Mapping Config ────────────────────────
exports.DATA_TYPE_VISUALS = {
    [DataType.CONCEPT]: { color: '#00e5ff', elementType: 'box', icon: '💡' },
    [DataType.RELATIONSHIP]: { color: '#ff2d7b', elementType: 'arrow', icon: '🔗' },
    [DataType.EXAMPLE]: { color: '#00e676', elementType: 'code', icon: '📋' },
    [DataType.ANALOGY]: { color: '#ffab00', elementType: 'split_panel', icon: '🔄' },
    [DataType.DEFINITION]: { color: '#b388ff', elementType: 'text', icon: '📖' },
    [DataType.PROCESS]: { color: '#00bcd4', elementType: 'flow_sequence', icon: '⚡' },
    [DataType.RESOURCE]: { color: '#4caf50', elementType: 'callout', icon: '🔗' },
    [DataType.COUNTERPOINT]: { color: '#ff6b9d', elementType: 'callout', icon: '⚠️' },
};
// ── Constants ────────────────────────────────────────────────
exports.KG_NODE_LIMIT = 50;
exports.KG_MAX_DEPTH = 4;
exports.INTERRUPT_DETECTION_MS = 300;
exports.BOOKMARK_RESUME_MS = 500;
exports.RL_UPDATE_INTERVAL_MS = 50;
exports.VOICE_SAMPLE_RATE = 16000;
exports.VOICE_CHUNK_SIZE = 4096;
