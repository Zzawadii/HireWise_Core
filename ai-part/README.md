# HireWise AI Layer

This folder contains the complete AI layer for HireWise AI, built on the **Gemini API** (gemini-1.5-flash).

---

## File Structure

| File | Responsibility |
|------|---------------|
| `types.ts` | All shared TypeScript types for AI inputs/outputs |
| `gemini.ts` | Gemini API client — auth, retries, JSON parsing |
| `prompts.ts` | All prompt templates, documented and versioned |
| `scorer.ts` | Single-candidate scoring + candidate feedback |
| `evaluator.ts` | Multi-candidate orchestration, ranking, bias mode |

---

## Setup

Set your Gemini API key as an environment variable:

```bash
GEMINI_API_KEY=your_key_here
```

---

## Capabilities

### 1. Candidate Scoring (0–100)
Each candidate receives a weighted composite score:

```
final_score = (skills_score × weight_skills)
            + (experience_score × weight_experience)
            + (culture_score × weight_culture)
```

Weights are set per job by the recruiter and must sum to 100%.

### 2. Score Breakdown
Gemini returns individual dimension scores:
- `score_breakdown.skills` — technical skill match
- `score_breakdown.experience` — background and seniority fit
- `score_breakdown.culture` — alignment with top performer profile

### 3. Culture Fit Prediction
Returns `High`, `Medium`, or `Low` based on the job's `top_performer_profile`.

### 4. Strengths & Gaps
3–5 specific, evidence-based items each — Gemini is instructed to cite resume content.

### 5. Skill Highlight Tags
5–8 short skill labels extracted from the resume for quick visual scanning.

### 6. Interview Question Generation
2–3 targeted questions that probe identified gaps or risks.

### 7. Natural-Language Recommendation
A 2–3 sentence recruiter-friendly summary per candidate.

### 8. Multi-Candidate Batch Evaluation
For ≤8 candidates, all are sent in a single prompt so Gemini can rank them relative to each other (more consistent scoring). For >8, sequential mode is used automatically.

### 9. Candidate Feedback (Candidate-Facing)
Separate prompt with a coaching tone — includes `improvement_tips` and an empathetic `status_reason`.

### 10. Bias Mode
Pass `biasMode: true` to `evaluateCandidates()` — names are replaced with `Candidate A, B, C...` in the output.

---

## Prompt Design Principles

1. **Explicit JSON schema in every prompt** — reduces hallucination and parsing failures
2. **Weights injected explicitly** — Gemini reasons about them, not just uses them as labels
3. **Bias-aware language** — prompts focus on skills/experience/role fit only
4. **System instruction separation** — recruiter evaluator vs. candidate coach have different personas
5. **Temperature 0.2 for scoring** — deterministic, consistent results
6. **Temperature 0.3 for feedback** — slightly more expressive for coaching tone

---

## Example Output

```json
{
  "job_title": "Senior Frontend Engineer",
  "evaluated_at": "2026-04-21T19:00:00.000Z",
  "ranked_candidates": [
    {
      "rank": 1,
      "name": "Candidate A",
      "final_score": 87,
      "score_breakdown": { "skills": 92, "experience": 85, "culture": 80 },
      "strengths": [
        "5+ years React experience with TypeScript matches required stack",
        "Led migration from Redux to Zustand — directly relevant to role",
        "Open source contributions demonstrate initiative"
      ],
      "gaps": [
        "No GraphQL experience listed — role requires it",
        "Limited backend exposure for full-stack tasks"
      ],
      "culture_fit": "High",
      "skill_tags": ["React", "TypeScript", "Vite", "Tailwind", "CI/CD", "Jest"],
      "interview_questions": [
        "You haven't listed GraphQL — how quickly could you get up to speed, and what's your approach to learning new query languages?",
        "Describe a time you had to balance technical debt with feature delivery."
      ],
      "recommendation": "Strong match on core frontend skills with proven leadership experience. The GraphQL gap is bridgeable — recommend a technical screen to assess learning velocity."
    }
  ]
}
```

---

## Usage

```typescript
import { evaluateCandidates } from "./evaluator.ts";
import { generateCandidateFeedback } from "./scorer.ts";

// Recruiter: rank all candidates for a job
const result = await evaluateCandidates(GEMINI_API_KEY, job, candidates, biasMode);

// Candidate: get personal feedback
const feedback = await generateCandidateFeedback(GEMINI_API_KEY, job, candidate);
```

---

## Error Handling

- Gemini 429 (rate limit): auto-retries 3× with exponential backoff (1s, 2s, 4s)
- JSON parse failure: returns safe fallback values, never crashes
- Batch failure: automatically falls back to sequential evaluation
