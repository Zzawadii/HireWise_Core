/**
 * Gemini API client for HireWise AI.
 *
 * Uses the Google Gemini API directly (gemini-1.5-flash).
 * Set GEMINI_API_KEY in your environment.
 *
 * Handles:
 * - Auth via API key
 * - JSON-only response enforcement
 * - Rate limit (429) and quota (402/429) retries with exponential backoff
 * - Markdown fence stripping from responses
 */

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = "gemini-1.5-flash";

export interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export interface GeminiRequestOptions {
  /** System instruction injected as a leading model turn */
  systemInstruction?: string;
  /** Max output tokens (default: 2048) */
  maxOutputTokens?: number;
  /** Temperature 0–1 (default: 0.2 for deterministic scoring) */
  temperature?: number;
}

/**
 * Call Gemini and return the raw text response.
 * Retries up to 3 times on 429 with exponential backoff.
 */
export async function callGemini(
  apiKey: string,
  userPrompt: string,
  options: GeminiRequestOptions = {}
): Promise<string> {
  const { systemInstruction, maxOutputTokens = 2048, temperature = 0.2 } = options;

  const contents: GeminiMessage[] = [];

  // Gemini doesn't have a system role — inject as first model turn
  if (systemInstruction) {
    contents.push({ role: "model", parts: [{ text: systemInstruction }] });
  }
  contents.push({ role: "user", parts: [{ text: userPrompt }] });

  const body = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens,
      responseMimeType: "application/json", // enforce JSON output
    },
  };

  const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  let attempt = 0;
  while (attempt < 3) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.status === 429) {
      const wait = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      console.warn(`Gemini rate limited. Retrying in ${wait}ms...`);
      await new Promise((r) => setTimeout(r, wait));
      attempt++;
      continue;
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    let text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Strip markdown fences if model ignores responseMimeType
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    return text;
  }

  throw new Error("Gemini API rate limit exceeded after 3 retries.");
}

/**
 * Parse Gemini JSON response safely.
 * Returns null if parsing fails.
 */
export function parseGeminiJSON<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.error("Failed to parse Gemini JSON response:", raw.slice(0, 200));
    return null;
  }
}
