/**
 * Shared types for the HireWise AI layer.
 * All AI inputs and outputs are strictly typed here.
 */

export interface JobContext {
  title: string;
  description: string;
  required_skills: string[];
  experience_level: string;
  top_performer_profile?: string;
  /** Scoring weights — must sum to 100 */
  weight_skills: number;
  weight_experience: number;
  weight_culture: number;
}

export interface CandidateInput {
  id: string;
  name: string;
  resume_text: string;
  skills: string[];
}

/** Raw AI output per candidate from Gemini */
export interface CandidateAIOutput {
  candidate_id: string;
  /** Overall match score 0–100, weighted by job context */
  final_score: number;
  /** Breakdown scores per dimension (0–100 each) */
  score_breakdown: {
    skills: number;
    experience: number;
    culture: number;
  };
  /** 3–5 specific strengths */
  strengths: string[];
  /** 3–5 gaps or risks */
  gaps: string[];
  /** High | Medium | Low */
  culture_fit: "High" | "Medium" | "Low";
  /** Highlighted skill tags extracted from resume */
  skill_tags: string[];
  /** 2–3 targeted interview questions */
  interview_questions: string[];
  /** Natural-language recruiter-friendly recommendation */
  recommendation: string;
}

/** Ranked result after evaluation */
export interface RankedCandidate extends CandidateAIOutput {
  rank: number;
  name: string;
}

/** Candidate feedback for the candidate-facing view */
export interface CandidateFeedback {
  final_score: number;
  strengths: string[];
  gaps: string[];
  culture_fit: "High" | "Medium" | "Low";
  improvement_tips: string[];
  status_reason: string;
}

/** Full multi-candidate evaluation response */
export interface EvaluationResult {
  job_title: string;
  evaluated_at: string;
  ranked_candidates: RankedCandidate[];
}
