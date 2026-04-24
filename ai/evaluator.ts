/**
 * Multi-candidate evaluation orchestrator.
 *
 * Handles:
 * - Batch evaluation (single Gemini prompt for ≤8 candidates)
 * - Sequential evaluation with rate-limit delay for larger batches
 * - Ranking candidates by final_score
 * - Bias-mode support (strips names from output)
 */

import { callGemini, parseGeminiJSON } from "./gemini.ts";
import { buildBatchScoringPrompt, SCREENING_SYSTEM_INSTRUCTION } from "./prompts.ts";
import { scoreCandidate } from "./scorer.ts";
import type {
  JobContext,
  CandidateInput,
  CandidateAIOutput,
  RankedCandidate,
  EvaluationResult,
} from "./types.ts";

/** Max candidates to send in a single batch prompt */
const BATCH_LIMIT = 8;

/** Delay between sequential calls to avoid rate limiting (ms) */
const SEQUENTIAL_DELAY_MS = 600;

// ─── Batch evaluation ────────────────────────────────────────────────────────

async function evaluateBatch(
  apiKey: string,
  job: JobContext,
  candidates: CandidateInput[]
): Promise<CandidateAIOutput[]> {
  const prompt = buildBatchScoringPrompt(job, candidates);

  let raw: string;
  try {
    raw = await callGemini(apiKey, prompt, {
      systemInstruction: SCREENING_SYSTEM_INSTRUCTION,
      temperature: 0.2,
      maxOutputTokens: 4096,
    });
  } catch (err) {
    console.warn("Batch evaluation failed, falling back to sequential:", err);
    return evaluateSequential(apiKey, job, candidates);
  }

  const parsed = parseGeminiJSON<{ results: Record<string, unknown>[] }>(raw);
  if (!parsed?.results) {
    console.warn("Batch parse failed, falling back to sequential.");
    return evaluateSequential(apiKey, job, candidates);
  }

  // Map results back — Gemini may reorder them
  const resultMap = new Map(parsed.results.map((r) => [r.candidate_id as string, r]));

  return candidates.map((c) => {
    const r = resultMap.get(c.id);
    if (!r) {
      return {
        candidate_id: c.id,
        final_score: 50,
        score_breakdown: { skills: 50, experience: 50, culture: 50 },
        strengths: [],
        gaps: [],
        culture_fit: "Medium" as const,
        skill_tags: [],
        interview_questions: [],
        recommendation: "",
      };
    }
    const bd = (r.score_breakdown as Record<string, unknown>) ?? {};
    const clamp = (n: unknown) => Math.min(100, Math.max(0, typeof n === "number" ? Math.round(n) : 50));
    return {
      candidate_id: c.id,
      final_score: clamp(r.final_score),
      score_breakdown: {
        skills: clamp(bd.skills),
        experience: clamp(bd.experience),
        culture: clamp(bd.culture),
      },
      strengths: Array.isArray(r.strengths) ? r.strengths : [],
      gaps: Array.isArray(r.gaps) ? r.gaps : [],
      culture_fit: (r.culture_fit === "High" || r.culture_fit === "Low" ? r.culture_fit : "Medium") as "High" | "Medium" | "Low",
      skill_tags: Array.isArray(r.skill_tags) ? r.skill_tags : [],
      interview_questions: Array.isArray(r.interview_questions) ? r.interview_questions : [],
      recommendation: typeof r.recommendation === "string" ? r.recommendation : "",
    };
  });
}

// ─── Sequential evaluation ───────────────────────────────────────────────────

async function evaluateSequential(
  apiKey: string,
  job: JobContext,
  candidates: CandidateInput[]
): Promise<CandidateAIOutput[]> {
  const results: CandidateAIOutput[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const result = await scoreCandidate(apiKey, job, candidates[i]);
    results.push(result);

    // Delay between calls except after the last one
    if (i < candidates.length - 1) {
      await new Promise((r) => setTimeout(r, SEQUENTIAL_DELAY_MS));
    }
  }

  return results;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Evaluate and rank all candidates for a job.
 *
 * Automatically chooses batch (≤8) or sequential (>8) mode.
 *
 * @param apiKey     - Gemini API key
 * @param job        - Job context with scoring weights
 * @param candidates - Array of candidates to evaluate
 * @param biasMode   - If true, names are replaced with "Candidate A, B, C..."
 */
export async function evaluateCandidates(
  apiKey: string,
  job: JobContext,
  candidates: CandidateInput[],
  biasMode = false
): Promise<EvaluationResult> {
  if (candidates.length === 0) {
    return { job_title: job.title, evaluated_at: new Date().toISOString(), ranked_candidates: [] };
  }

  // Choose evaluation strategy
  const rawResults =
    candidates.length <= BATCH_LIMIT
      ? await evaluateBatch(apiKey, job, candidates)
      : await evaluateSequential(apiKey, job, candidates);

  // Sort by final_score descending and assign ranks
  const sorted = [...rawResults].sort((a, b) => b.final_score - a.final_score);

  const ranked: RankedCandidate[] = sorted.map((r, i) => {
    const candidate = candidates.find((c) => c.id === r.candidate_id);
    const displayName = biasMode
      ? `Candidate ${String.fromCharCode(65 + i)}` // A, B, C...
      : (candidate?.name ?? "Unknown");

    return { ...r, rank: i + 1, name: displayName };
  });

  return {
    job_title: job.title,
    evaluated_at: new Date().toISOString(),
    ranked_candidates: ranked,
  };
}
