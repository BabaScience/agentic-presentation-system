/* ═══════════════════════════════════════════════════════════════
   Migration Verification — Old frame selector path deleted.
   Fails if findCurrentFrame or IllustrationCanvas is reintroduced.
   Phase 1 of Session 8 Integration Test.
   ═══════════════════════════════════════════════════════════════ */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

describe('Migration verification — old path deleted', () => {
  // Run from frontend/ (cwd=frontend) or repo root (cwd=root)
  const candidates = [
    join(process.cwd(), 'src'),
    join(process.cwd(), 'frontend', 'src'),
  ];
  const FRONTEND_SRC = candidates.find((p) => {
    try {
      return readdirSync(p).length > 0;
    } catch {
      return false;
    }
  }) ?? candidates[0];

  function collectTsFiles(dir: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...collectTsFiles(full));
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        if (!entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx')) {
          files.push(full);
        }
      }
    }
    return files;
  }

  const FORBIDDEN = ['findCurrentFrame', 'IllustrationCanvas'];

  FORBIDDEN.forEach((term) => {
    it(`has zero references to ${term} in production code`, () => {
      const files = collectTsFiles(FRONTEND_SRC);
      const matches: { file: string; line: number }[] = [];
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        content.split('\n').forEach((line, i) => {
          const withoutInlineComment = line.replace(/\/\/.*$/, '').trim();
          if (withoutInlineComment.includes(term)) {
            matches.push({ file, line: i + 1 });
          }
        });
      }
      expect(matches).toEqual([]);
    });
  });
});
