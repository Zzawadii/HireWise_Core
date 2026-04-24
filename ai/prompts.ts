/**
 * Prompt engineering for HireWise AI.
 *
 * All prompts are documented here with:
 * - Purpose
 * - Input variables
 * - Expected output schema
 *
 * Design principles:
 * - Explicit JSON schema in every prompt (reduces hallucination)
 * - Scoring weights are injected so Gemini reasons about them explicitly
 * - Bias-aware language: prompts focus on skills/experience, not demographics
 * - Structured output enforced via responseMimeType + schema in prompt
 */

import type { JobContext, CandidateInput } from "./types.ts";

// ─── System Instructions ────────────────────────────────────────────────────

/**
 * System instruction for the recruiter-facing screening evaluator.
 * Injected as a leading model turn in every screening call.
 */
export const SCREENING_SYSTEM_INSTRUCTION = `You are an expert AI recruitment evaluator for HireWise AI.
Your role is to objectively assess candidate fit based on job requirements and scoring weights.
You must:
- Focus only on skills, experience, and role fit — never on demographics or personal characteristics
- Apply the provided scoring weights exactly as specified
- Be specific and evidence-based in strengths and gaps (cite resume content)
- Generate interview questions that probe identified gaps
- Always respond with valid JSON only — no markdown, no explanation outside the JSON`;

/**
 * System instruction for the candidate-facing feedback coach.
 */
export const FEEDBACK_SYSTEM_INSTRUCTION = `You are a constructive AI career coach for HireWise AI.
Your role is to give candidates honest, actionable, and encouraging feedback.
You must:
- Be specific — reference actual resume content and job requirements
- Be constructive — frame gaps as growth opportunities
- Provide concrete improvement tips (courses, certifications, projects)
- Always respond with valid JSON only — no markdown, no explanation outside the JSON`;

// ─── Prompt Builders ────────────────────────────────────────────────────────

/**
 * PROMPT: Single-candidate screening
 *
 * Purpose: Score one candidate against a job with weighted dimensions.
 * Outputs: final_score, score_breakdown, strengths, gaps, culture_fit,
 *          skill_tags, interview_questions, recommendation
 */
export function buildScoringPrompt(job: JobContext, candidate: CandidateInput): string {
  return `## Job Requirements

Title: ${job.title}
Description: ${job.description}
Required Skills: ${job.required_skills.join(", ")}
Experience Level: ${job.experience_level}
Top Performer Profile: ${job.top_performer_profile || "Not specified"}

## Scoring Weights (must sum to 100%)
- Skills Match: ${job.weight_skills}%
- Experience & Background: ${job.weight_experience}%
- Culture Fit: ${job.weight_culture}%

## Candidate Resume
${candidate.resume_text}

## Candidate Listed Skills
${candidate.skills.join(", ")}

## Your Task
Evaluate this candidate for the role above. Apply the scoring weights precisely.

Return ONLY this JSON structure:
{
  "final_score": <integer 0-100, weighted composite>,
  "score_breakdown": {
    "skills": <integer 0-100>,
    "experience": <integer 0-100>,
    "culture": <integer 0-100>
  },
  "strengths": [<3-5 specific strings citing resume evidence>],
  "gaps": [<3-5 specific strings citing missing requirements>],
  "culture_fit": "<High|Medium|Low>",
  "skill_tags": [<5-8 short skill label strings extracted from resume>],
  "interview_questions": [<2-3 targeted questions probing gaps or risks>],
  "recommendation": "<2-3 sentence natural-language recruiter summary>"
}`;
}

/**
 * PROMPT: Multi-candidate batch evaluation in a single prompt
 *
 * Purpose: Evaluate multiple candidates together so Gemini can rank them
 *          relative to each other, not just in isolation.
 * Outputs: Array of candidate results with ranks
 *
 * Note: Best for ≤8 candidates. For larger batches use single-candidate mode.
 */
export function buildBatchScoringPrompt(job: JobContext, candidates: CandidateInput[]): string {
  const candidateBlocks = candidates
    .map(
      (c, i) => `### Candidate ${i + 1} (ID: ${c.id})
Skills: ${c.skills.join(", ")}
Resume:
${c.resume_text}`
    )
    .join("\n\n");

  return `## Job Requirements

Title: ${job.title}
Description: ${job.description}
Required Skills: ${job.required_skills.join(", ")}
Experience Level: ${job.experience_level}
Top Performer Profile: ${job.top_performer_profile || "Not specified"}

## Scoring Weights (must sum to 100%)
- Skills Match: ${job.weight_skills}%
- Experience & Background: ${job.weight_experience}%
- Culture Fit: ${job.weight_culture}%

## Candidates to Evaluate
${candidateBlocks}

## Your Task
Evaluate ALL candidates above for the role. Rank them from best to worst fit.
Apply the scoring weights precisely. Be consistent — scores should reflect relative ranking.

Return ONLY this JSON structure:
{
  "results": [
    {
      "candidate_id": "<ID from above>",
      "rank": <1 = best fit>,
      "final_score": <integer 0-100>,
      "score_breakdown": {
        "skills": <integer 0-100>,
        "experience": <integer 0-100>,
        "culture": <integer 0-100>
      },
      "strengths": [<3-5 strings>],
      "gaps": [<3-5 strings>],
      "culture_fit": "<High|Medium|Low>",
      "skill_tags": [<5-8 strings>],
      "interview_questions": [<2-3 strings>],
      "recommendation": "<2-3 sentence summary>"
    }
  ]
}`;
}

/**
 * PROMPT: Candidate-facing feedback
 *
 * Purpose: Generate constructive, growth-oriented feedback for the candidate.
 * Outputs: final_score, strengths, gaps, culture_fit, improvement_tips, status_reason
 */
export function buildFeedbackPrompt(job: JobContext, candidate: CandidateInput): string {
  return `## Role Applied For

Title: ${job.title}
Description: ${job.description}
Required Skills: ${job.required_skills.join(", ")}
Experience Level: ${job.experience_level}
Top Performer Profile: ${job.top_performer_profile || "Not specified"}

## Candidate's Application

Resume:
${candidate.resume_text}

Listed Skills: ${candidate.skills.join(", ")}

## Your Task
Give this candidate honest, constructive, and encouraging feedback on their application.
Focus on growth. Be specific — reference actual resume content and job requirements.

Return ONLY this JSON structure:
{
  "final_score": <integer 0-100>,
  "strengths": [<3-5 specific strength strings>],
  "gaps": [<3-5 specific gap strings>],
  "culture_fit": "<High|Medium|Low>",
  "improvement_tips": [<3-5 actionable tips: courses, certifications, projects, skills to build>],
  "status_reason": "<2-3 sentence empathetic explanation of fit decision>"
}`;
}
