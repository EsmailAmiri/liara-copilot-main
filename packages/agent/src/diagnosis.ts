import type { EvidenceBundle, Hypothesis } from '@copilot/shared';
import { ALL_DETECTORS } from './detectors/index.js';

export function runDiagnosis(bundle: EvidenceBundle): Hypothesis[] {
  const hypotheses: Hypothesis[] = [];

  for (const detector of ALL_DETECTORS) {
    const res = detector.detect(bundle);
    if (res) {
      // Confidence boost if multiple distinct evidence items agree
      let boostedConfidence = res.confidence;
      if (res.evidenceIds.length >= 2) {
        boostedConfidence = Math.min(1.0, boostedConfidence + 0.05);
      }
      hypotheses.push({
        ...res,
        confidence: Number(boostedConfidence.toFixed(2)),
      });
    }
  }

  // Sort descending by confidence
  hypotheses.sort((a, b) => b.confidence - a.confidence);

  // Return top 3 hypotheses
  return hypotheses.slice(0, 3);
}

export function validateCitations(text: string, validEvidenceIds: string[]): string {
  const validSet = new Set(validEvidenceIds);
  // Match citations like [E1], [E2], E3
  return text.replace(/\[?(E\d+)\]?/g, (match, id) => {
    if (validSet.has(id)) {
      return `[${id}]`;
    }
    return ''; // Strip invalid invented evidence IDs
  });
}
