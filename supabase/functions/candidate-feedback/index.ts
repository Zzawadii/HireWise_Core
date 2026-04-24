import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { generateCandidateFeedback } from "../../ai-part/scorer.ts";
import type { JobContext, CandidateInput } from "../../ai-part/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { application_id, job_id, user_id } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch application and job data
    const [appRes, jobRes] = await Promise.all([
      supabase.from("applications").select("*").eq("id", application_id).single(),
      supabase.from("jobs").select("*").eq("id", job_id).single(),
    ]);

    if (appRes.error || !appRes.data) throw new Error("Application not found");
    if (jobRes.error || !jobRes.data) throw new Error("Job not found");

    const app = appRes.data;
    const jobData = jobRes.data;

    // Build typed inputs for ai-part
    const job: JobContext = {
      title: jobData.title,
      description: jobData.description,
      required_skills: jobData.required_skills ?? [],
      experience_level: jobData.experience_level ?? "",
      top_performer_profile: jobData.top_performer_profile ?? "",
      weight_skills: jobData.weight_skills ?? 40,
      weight_experience: jobData.weight_experience ?? 30,
      weight_culture: jobData.weight_culture ?? 30,
    };

    const candidate: CandidateInput = {
      id: application_id,
      name: user_id, // name not stored on application — use user_id as identifier
      resume_text: app.resume_text ?? "",
      skills: app.skills ?? [],
    };

    // Generate feedback via ai-part/scorer
    const feedback = await generateCandidateFeedback(GEMINI_API_KEY, job, candidate);

    // Save feedback to database
    const { error: insertError } = await supabase.from("candidate_feedback").insert({
      application_id,
      user_id,
      job_id,
      final_score: feedback.final_score,
      strengths: feedback.strengths,
      gaps: feedback.gaps,
      culture_fit: feedback.culture_fit,
      improvement_tips: feedback.improvement_tips,
      status_reason: feedback.status_reason,
    });

    if (insertError) throw insertError;

    // Mark application as reviewed
    await supabase.from("applications").update({ status: "reviewed" }).eq("id", application_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("candidate-feedback error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
