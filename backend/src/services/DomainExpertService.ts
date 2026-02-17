/* ═══════════════════════════════════════════════════════════════
   Domain Expert Service — Phase 2.5 Multi-Agent Intelligence

   Provides domain-specific visual guidance by dispatching to
   specialized prompts for Math, Physics, CS, and General domains.
   Outputs DomainGuidance with entity metadata and animation
   choreography that the Visual Architect uses as binding input.
   ═══════════════════════════════════════════════════════════════ */

import Anthropic from '@anthropic-ai/sdk';
import {
  type AcademicDomain,
  type SceneContract,
  type DomainGuidance,
} from '../../shared/types';

const DOMAIN_PROMPTS: Record<string, string> = {
  mathematics: `You are a mathematics visualization expert. Given a narration and a list of required visual entities, provide precise metadata for each entity.

For each entity label, output metadata fields appropriate to its type:
- Equation/Expression: provide "latex" with properly escaped LaTeX (e.g., "\\\\frac{d}{dx}f(x)")
- Graph2D: provide "expression" (JavaScript Math syntax), "domain" [min, max], "range" [min, max]
  - For parametric curves: "parametric": true, "xExpression", "yExpression", "tRange"
  - For implicit curves: "implicit": true, "implicitExpression", "domain", "range"
- Matrix: provide "latex" with \\\\begin{bmatrix}... notation
- NumberLine: provide "min", "max", "ticks", "highlights" (array of {value, label})
- CoordinateSystem: provide "points" [{x,y,label}], "vectors" [{dx,dy,label}]
- Vector: provide "magnitude", "angle" (degrees)

For animation choreography, specify the ideal reveal order:
- Equations before their graphs (so the formula appears, then its plot)
- Step-by-step transformations should stagger with 300-500ms delays
- Primary entities first (delay: 0), annotations after (delay: 400-800)

Domain rules for mathematics:
- All LaTeX must have balanced braces and valid syntax
- Coordinate ranges should be pedagogically appropriate (not too wide/narrow)
- Use standard notation conventions (e.g., f(x), not F(x) for functions)`,

  physics: `You are a physics visualization expert. Given a narration and required visual entities, provide precise metadata.

For each entity label, output metadata appropriate to its type:
- FreeBodyDiagram: provide "forces" array [{label, magnitude, angle}] where angle is in degrees (0=right, 90=up)
- Vector: provide "magnitude" (in pixels, 40-200), "angle" (degrees), "label"
- Wave: provide "amplitude" (20-80), "frequency" (0.5-4), "wavelength"
- Circuit: provide "components" [{type: "resistor"|"capacitor"|"battery"|"switch"|"inductor", label}]
- Field: provide "gridSize" (3-8), "fieldType" ("electric"|"magnetic"|"gravitational")
- Particle: provide "trajectory" [{x,y}] array of points (0-100 percentage space)
- Equation: provide "latex" for physics formulas (F=ma, E=mc², etc.)

For animation choreography:
- Force diagrams: show the object first, then forces one by one (stagger 400ms each)
- Waves: use "flow" animation type for continuous motion
- Circuits: reveal components left-to-right following current flow
- Equations: appear after their visual representation

Domain rules for physics:
- Force angles must be 0-360 degrees
- Vector magnitudes should be proportional to actual values when possible
- Use SI unit conventions in labels`,

  'computer-science': `You are a computer science visualization expert. Given a narration and required visual entities, provide precise metadata.

For each entity label, output metadata appropriate to its type:
- FlowDiagram: provide "steps" [{label, type: "process"|"decision"|"io"|"start"|"end"}]
- Table: provide "headers" [string], "rows" [[string]] for data structures/comparisons
- Server/Database/Container: provide "status" ("active"|"idle"|"error"), "details" (string)
- Process: provide "steps" for algorithm step sequences
- Tree: provide "children" [{label, children}] for data structure trees
- Stack: provide "items" [string] for stack visualization
- Queue: provide "items" [string] for queue visualization

For animation choreography:
- Algorithm steps: reveal sequentially with 500ms stagger to show execution flow
- Data structures: build from the base up (bottom-to-top for stacks, left-to-right for queues)
- Network diagrams: reveal nodes first, then connections
- Comparisons: show side-by-side simultaneously

Domain rules for computer science:
- Use standard algorithm/DS notation
- Complexity annotations should use Big-O notation
- Code snippets should be syntactically correct`,

  general: `You are a general-purpose visualization expert. Given a narration and required visual entities, provide appropriate metadata.

For each entity label, output metadata appropriate to its type:
- Timeline: provide "events" [{time, label, description}]
- Comparison: provide "leftLabel", "rightLabel", "aspects" [{label, left, right}]
- Concept: provide "description" (string), "subConcepts" [string]
- Entity: provide "description", "properties" [{key, value}]
- Cycle: provide "stages" [string] for cyclical processes
- VennDiagram: provide "sets" [{label, color}], "intersection" (string)
- PieChart: provide "segments" [{label, value, color}]
- Histogram: provide "bins" [{label, value}]
- Quote: provide "text" (the quote text), "attribution" (optional author)

For animation choreography:
- Timelines: reveal events left-to-right chronologically
- Comparisons: reveal sides simultaneously, then aspects one by one
- Cycles: reveal stages clockwise with rotation animation
- Hierarchies: top-down reveal

Domain rules:
- Use clear, concise labels
- Color choices should convey meaning (green=positive, red=negative, blue=neutral)
- Maintain visual balance between elements`,
};

export class DomainExpertService {
  private client: Anthropic;
  private fastModel: string;

  constructor() {
    this.client = new Anthropic();
    this.fastModel = process.env.AGENT_MODEL_FAST || 'claude-sonnet-4-5-20250929';
  }

  async generateGuidance(
    narration: string,
    contract: SceneContract,
    domain: AcademicDomain,
  ): Promise<DomainGuidance> {
    const domainPrompt = DOMAIN_PROMPTS[domain] || DOMAIN_PROMPTS.general;

    const entitiesList = contract.requiredEntities
      .map(e => `- "${e.label}" (type: ${e.type}, role: ${e.role}, mandatory: ${e.mandatory})`)
      .join('\n');

    const constraintsList = contract.spatialConstraints.length > 0
      ? contract.spatialConstraints
          .map(c => `- ${c.entityA} should be ${c.type} ${c.entityB}`)
          .join('\n')
      : 'None specified';

    const prompt = `${domainPrompt}

## Input

**Narration**: "${narration}"

**Pedagogical Goal**: ${contract.pedagogicalGoal}

**Difficulty Level**: ${contract.difficultyLevel}

**Required Entities**:
${entitiesList}

**Spatial Constraints**:
${constraintsList}

## Output Format

Return ONLY valid JSON (no markdown, no explanation):
{
  "domain": "${domain}",
  "entityMetadata": {
    "entity label": { ... metadata fields for this entity ... }
  },
  "animationChoreography": [
    { "entityLabel": "string", "animationType": "fadeIn|scaleIn|slideIn|pulse|flow", "delay": 0, "notes": "string" }
  ],
  "domainRules": ["string — domain-specific rendering rules to follow"]
}

Generate domain guidance now:`;

    try {
      const response = await this.client.messages.create({
        model: this.fastModel,
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('');

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('[DomainExpert] No valid JSON in response, using fallback');
        return this.fallbackGuidance(domain, contract);
      }

      const parsed = JSON.parse(jsonMatch[0]) as DomainGuidance;
      parsed.domain = domain;
      return parsed;
    } catch (err: any) {
      console.error('[DomainExpert] Error:', err.message);
      return this.fallbackGuidance(domain, contract);
    }
  }

  private fallbackGuidance(domain: AcademicDomain, contract: SceneContract): DomainGuidance {
    const entityMetadata: Record<string, Record<string, any>> = {};
    const animationChoreography: DomainGuidance['animationChoreography'] = [];

    contract.requiredEntities.forEach((entity, i) => {
      entityMetadata[entity.label] = {};
      animationChoreography.push({
        entityLabel: entity.label,
        animationType: i === 0 ? 'scaleIn' : 'fadeIn',
        delay: i * 300,
        notes: `${entity.role} entity`,
      });
    });

    return {
      domain,
      entityMetadata,
      animationChoreography,
      domainRules: [],
    };
  }
}
