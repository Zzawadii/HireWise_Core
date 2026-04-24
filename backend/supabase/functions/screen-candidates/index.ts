import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { evaluateCandidates } from "../../ai-part/evaluator.ts";
import type { JobContext, CandidateInput } from "../../ai-part/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      job_id,
      job_description,
      required_skills,
      experience_level,
      top_performer_profile,
      weight_skills,
      weight_experience,
      weight_culture,
      candidates,
    } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    // Build job context for ai-part
    const job: JobContext = {
      title: job_id ?? "Job",
      description: job_description ?? "",
      required_skills: required_skills ?? [],
      experience_level: experience_level ?? "",
      top_performer_profile: top_performer_profile ?? "",
      weight_skills: weight_skills ?? 40,
      weight_experience: weight_experience ?? 30,
      weight_culture: weight_culture ?? 30,
    };

    // Map incoming candidates to CandidateInput
    const candidateInputs: CandidateInput[] = (candidates ?? []).map((c: any) => ({
      id: c.id,
      name: c.name ?? "",
      resume_text: c.resume_text ?? "",
      skills: c.skills ?? [],
    }));

    // Run evaluation via ai-part/evaluator
    const evaluation = await evaluateCandidates(GEMINI_API_KEY, job, candidateInputs);

    // Map ranked results back to the shape the frontend expects
    const results = evaluation.ranked_candidates.map((r) => ({
      candidate_id: r.candidate_id,
      final_score: r.final_score,
      score_breakdown: r.score_breakdown,
      strengths: r.strengths,
      gaps: r.gaps,
      culture_fit: r.culture_fit,
      skill_tags: r.skill_tags,
      interview_questions: r.interview_questions,
      recommendation: r.recommendation,
    }));

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("screen-candidates error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
