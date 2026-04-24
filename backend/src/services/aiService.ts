import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobContext {
  title: string;
  description: string;
  requirements?: string[];
  skills?: string[];
  experience?: string;
  education?: string;
}

export interface ApplicantContext {
  _id: string | object;
  name: string;
  skills?: string[];
  experience?: string;
  education?: string;
}

export interface ScreeningResult {
  id: string;
  name: string;
  rank: number;
  score: number;
  skillScore: number;
  experienceScore: number;
  educationScore: number;
  relevanceScore: number;
  cultureFitScore: number;
  strengths: string[];
  gaps: string[];
  skillHighlights: string[];
  recommendation: string;
  interviewQuestions: string[];
}

// ─── Prompt Builders ──────────────────────────────────────────────────────────

/**
 * PROMPT: Multi-candidate evaluation with weighted scoring.
 *
 * Scoring weights:
 *   - Skills match:       35%
 *   - Experience:         30%
 *   - Education:          15%
 *   - Role relevance:     15%
 *   - Culture fit signal:  5%
 *
 * Outputs structured JSON for each candidate covering score breakdown,
 * strengths, gaps, skill highlights, recommendation, and interview questions.
 */
function buildScreeningPrompt(job: JobContext, applicants: ApplicantContext[]): string {
  return `
You are a senior technical recruiter AI. Your task is to evaluate and rank candidates for a job opening.

## JOB DETAILS
Title: ${job.title}
Description: ${job.description}
Required Skills: ${job.skills?.join(', ') || 'Not specified'}
Requirements: ${job.requirements?.join('; ') || 'Not specified'}
Experience Required: ${job.experience || 'Not specified'}
Education Required: ${job.education || 'Not specified'}

## CANDIDATES
${applicants.map((a, i) => `
Candidate ${i + 1}:
  ID: ${a._id}
  Name: ${a.name}
  Skills: ${a.skills?.join(', ') || 'Not listed'}
  Experience: ${a.experience || 'Not listed'}
  Education: ${a.education || 'Not listed'}
`).join('')}

## SCORING INSTRUCTIONS
Score each candidate using these weighted dimensions (total = 0–100):
- skillScore      (0–100): How well their skills match the required skills. Weight: 35%
- experienceScore (0–100): Relevance and depth of their experience. Weight: 30%
- educationScore  (0–100): Education alignment with the role. Weight: 15%
- relevanceScore  (0–100): Overall role relevance and domain fit. Weight: 15%
- cultureFitScore (0–100): Inferred culture fit based on background signals. Weight: 5%

Final score = (skillScore×0.35) + (experienceScore×0.30) + (educationScore×0.15) + (relevanceScore×0.15) + (cultureFitScore×0.05)

## OUTPUT FORMAT
Return ONLY a valid JSON array. No markdown, no explanation outside the JSON.

[
  {
    "id": "<candidate _id>",
    "name": "<full name>",
    "rank": <1 = best fit>,
    "score": <weighted total 0–100>,
    "skillScore": <0–100>,
    "experienceScore": <0–100>,
    "educationScore": <0–100>,
    "relevanceScore": <0–100>,
    "cultureFitScore": <0–100>,
    "strengths": ["<specific strength>", "..."],
    "gaps": ["<specific gap or risk>", "..."],
    "skillHighlights": ["<matched skill tag>", "..."],
    "recommendation": "<2–3 sentence recruiter-friendly summary explaining fit and recommendation>",
    "interviewQuestions": ["<targeted question 1>", "<targeted question 2>", "<targeted question 3>"]
  }
]

Rank candidates from best (rank 1) to worst. Be objective, specific, and bias-aware.
`.trim();
}

// ─── Core AI Functions ────────────────────────────────────────────────────────

/**
 * Screens and ranks all applicants for a job using Gemini.
 * Returns structured results with scores, strengths, gaps, and interview questions.
 */
export const screenApplicants = async (
  job: JobContext,
  applicants: ApplicantContext[]
): Promise<ScreeningResult[]> => {
  const prompt = buildScreeningPrompt(job, applicants);

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Strip any accidental markdown fences
  const clean = text.replace(/```json|```/g, '').trim();

  let parsed: ScreeningResult[];
  try {
    parsed = JSON.parse(clean);
  } catch {
    throw new Error(`Gemini returned non-JSON response: ${clean.slice(0, 200)}`);
  }

  return parsed;
};
