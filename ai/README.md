# HireWise AI — AI Layer

Standalone Gemini AI module for candidate screening and feedback generation.

## Stack
- TypeScript (Deno-compatible)
- Google Gemini API (gemini-1.5-flash)
- No external dependencies

## Setup

Set your Gemini API key:
```bash
GEMINI_API_KEY=your_key_here
```

## Files

| File | Purpose |
|------|---------|
| `types.ts` | All shared TypeScript types |
| `gemini.ts` | Gemini API client with retries |
| `prompts.ts` | All prompt templates, documented |
| `scorer.ts` | Single candidate scoring + feedback |
| `evaluator.ts` | Multi-candidate batch evaluation + ranking |

## Usage

```typescript
import { evaluateCandidates } from "./evaluator.ts";
import { generateCandidateFeedback } from "./scorer.ts";

// Rank all candidates for a job
const result = await evaluateCandidates(GEMINI_API_KEY, job, candidates);

// Generate feedback for a candidate
const feedback = await generateCandidateFeedback(GEMINI_API_KEY, job, candidate);
```

## Capabilities

- Candidate scoring 0–100 with weighted breakdown (skills / experience / culture)
- Culture fit prediction (High / Medium / Low)
- Strengths & gaps extraction
- Skill highlight tags
- Interview question generation
- Natural-language recruiter recommendation
- Batch evaluation (≤8 candidates in one prompt)
- Bias mode (anonymizes candidate names)
- Rate limit retries with exponential backoff
- Safe fallbacks on parse failure
