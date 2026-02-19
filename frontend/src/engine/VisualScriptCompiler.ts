/* ═══════════════════════════════════════════════════════════════
   VisualScriptCompiler — Re-exports from shared/VisualScriptCompiler.
   The canonical implementation lives in shared/ so both frontend
   and backend can import it.
   ═══════════════════════════════════════════════════════════════ */

export {
  VISUAL_ENTITY_TO_STAGE_ELEMENT,
  compileVisualScript,
  compileVisualCommands,
  compilePresentationScene,
  compileStoryboardScene,
} from '@shared/VisualScriptCompiler';
