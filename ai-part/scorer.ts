/**
 * Candidate scorer — connects candidate data + base scores → Gemini API.
 *
 * Responsibilities:
 * - Single candidate scoring (0–100) with weighted breakdown
 * - Culture fit prediction (High / Medium / Low)
 * - Strengths & gaps extraction
 * - Skill highlight tag generation
 * - Interview question generation
 * - Fallback scores when AI fails
 */

import { callGemini, parseGeminiJSON } from "./gemini.ts";
import {
  buildScoringPrompt,
  buildFeedbackPrompt,
  SCREENING_SYSTEM_INSTRUCTION,
  FEEDBACK_SYSTEM_INSTRUCTION,
} from "./prompts.ts";
import type {
  JobContext,
  CandidateInput,
  CandidateAIOutput,
  CandidateFeedback,
} from "./types.ts";

// ─── Fallback values when AI parsing fails ──────────────────────────────────

function scoringFallback(candidateId: string): CandidateAIOutput {
  return {
    candidate_id: candidateId,
    final_score: 50,
    score_breakdown: { skills: 50, experience: 50, culture: 50 },
    strengths: ["Could not fully evaluate — please retry"],
    gaps: ["AI evaluation incomplete"],
    culture_fit: "Medium",
    skill_tags: [],
    interview_questions: ["Tell me about your most impactful project."],
    recommendation: "Evaluation could not be completed. Please re-run screening.",
  };
}

function feedbackFallback(): CandidateFeedback {
  return {
    final_score: 50,
    strengths: ["Could not fully evaluate — please retry"],
    gaps: ["AI evaluation incomplete"],
    culture_fit: "Medium",
    improvement_tips: ["Try applying again with a more detailed resume"],
    status_reason: "We couldn't complete a full evaluation at this time. Please try again.",
  };
}

// ─── Validation helpers ──────────────────────────────────────────────────────

/** Clamp a number to 0–100 */
const clamp = (n: unknown): number =>
  Math.min(100, Math.max(0, typeof n === "number" ? Math.round(n) : 50));

/** Validate culture_fit value */
const validCultureFit = (v: unknown): "High" | "Medium" | "Low" =>
  v === "High" || v === "Low" ? v : "Medium";

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Score a single candidate against a job using Gemini.
 *
 * @param apiKey  - Gemini API key
 * @param job     - Job context with weights
 * @param candidate - Candidate resume + skills
 */
export async function scoreCandidate(
  apiKey: string,
  job: JobContext,
  candidate: CandidateInput
): Promise<CandidateAIOutput> {
  const prompt = buildScoringPrompt(job, candidate);

  let raw: string;
  try {
    raw = await callGemini(apiKey, prompt, {
      systemInstruction: SCREENING_SYSTEM_INSTRUCTION,
      temperature: 0.2,
    });
  } catch (err) {
    console.error(`Gemini call failed for candidate ${candidate.id}:`, err);
    return scoringFallback(candidate.id);
  }

  const parsed = parseGeminiJSON<Record<string, unknown>>(raw);
  if (!parsed) return scoringFallback(candidate.id);

  const breakdown = (parsed.score_breakdown as Record<string, unknown>) ?? {};

  return {
    candidate_id: candidate.id,
    final_score: clamp(parsed.final_score),
    score_breakdown: {
      skills: clamp(breakdown.skills),
      experience: clamp(breakdown.experience),
      culture: clamp(breakdown.culture),
    },
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
    culture_fit: validCultureFit(parsed.culture_fit),
    skill_tags: Array.isArray(parsed.skill_tags) ? parsed.skill_tags : [],
    interview_questions: Array.isArray(parsed.interview_questions)
      ? parsed.interview_questions
      : [],
    recommendation: typeof parsed.recommendation === "string" ? parsed.recommendation : "",
  };
}

/**
 * Generate candidate-facing feedback using Gemini.
 *
 * @param apiKey    - Gemini API key
 * @param job       - Job context
 * @param candidate - Candidate resume + skills
 */
export async function generateCandidateFeedback(
  apiKey: string,
  job: JobContext,
  candidate: CandidateInput
): Promise<CandidateFeedback> {
  const prompt = buildFeedbackPrompt(job, candidate);

  let raw: string;
  try {
    raw = await callGemini(apiKey, prompt, {
      systemInstruction: FEEDBACK_SYSTEM_INSTRUCTION,
      temperature: 0.3, // slightly more expressive for coaching tone
    });
  } catch (err) {
    console.error(`Gemini feedback call failed for candidate ${candidate.id}:`, err);
    return feedbackFallback();
  }

  const parsed = parseGeminiJSON<Record<string, unknown>>(raw);
  if (!parsed) return feedbackFallback();

  return {
    final_score: clamp(parsed.final_score),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
    culture_fit: validCultureFit(parsed.culture_fit),
    improvement_tips: Array.isArray(parsed.improvement_tips) ? parsed.improvement_tips : [],
    status_reason: typeof parsed.status_reason === "string" ? parsed.status_reason : "",
  };
}
