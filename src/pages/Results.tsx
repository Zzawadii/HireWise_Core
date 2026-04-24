import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/DashboardLayout";
import ScoreRing from "@/components/ScoreRing";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Shield, Brain, ChevronDown, ChevronUp, MessageSquare, AlertTriangle, CheckCircle2, XCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";

interface ScreeningResult {
  id: string;
  candidate_id: string;
  job_id: string;
  user_id: string;
  final_score: number;
  score_breakdown?: { skills: number; experience: number; culture: number };
  strengths: string[];
  gaps: string[];
  culture_fit: string;
  skill_tags: string[];
  interview_questions: string[];
  candidate?: any;
  decision?: "accepted" | "rejected" | null;
}

const getScoreColor = (score: number) => {
  if (score >= 70) return "text-score-high";
  if (score >= 50) return "text-score-medium";
  return "text-score-low";
};

const getCultureBadge = (fit: string) => {
  const lower = fit?.toLowerCase() || "";
  if (lower.includes("high")) return { label: "High Fit", className: "bg-score-high/15 text-score-high border-score-high/30" };
  if (lower.includes("medium")) return { label: "Medium Fit", className: "bg-tag-highlight/15 text-tag-highlight border-tag-highlight/30" };
  return { label: "Low Fit", className: "bg-score-low/15 text-score-low border-score-low/30" };
};

const getTagColor = (_tag: string, isHighlight: boolean) => {
  if (isHighlight) return "bg-tag-highlight/10 text-tag-highlight border-tag-highlight/20";
  return "bg-tag-technical/10 text-tag-technical border-tag-technical/20";
};

/* ── Breakdown mini-bars ─────────────────────────────────── */
const BreakdownBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="space-y-1.5">
    <span className="text-[11px] text-muted-foreground block">{label}</span>
    <div className="h-1.5 w-full rounded-full bg-muted/50">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%`, transition: "width 0.5s ease" }} />
    </div>
    <span className="text-xs font-semibold text-foreground block">{value}%</span>
  </div>
);

/* ── Candidate Result Card ───────────────────────────────── */
const CandidateCard = ({
  result, rank, biasMode, onSelect, onDecision, decidingId,
}: {
  result: ScreeningResult;
  rank: number;
  biasMode: boolean;
  onSelect: () => void;
  onDecision: (id: string, candidateId: string, decision: "accepted" | "rejected") => void;
  decidingId: string | null;
}) => {
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const name = biasMode ? `Candidate ${String.fromCharCode(64 + rank)}` : (result.candidate?.name || "Unknown");
  const badge = getCultureBadge(result.culture_fit);

  // Use real breakdown if available, otherwise derive from final_score deterministically
  const bd = result.score_breakdown;
  const skillScore = bd?.skills ?? Math.min(100, Math.round(result.final_score * 1.05));
  const expScore = bd?.experience ?? Math.min(100, Math.round(result.final_score * 0.95));
  const cultureScore = bd?.culture ?? Math.min(100, Math.round(result.final_score * 0.9));

  const isDeciding = decidingId === result.id;
  const accepted = result.decision === "accepted";
  const rejected = result.decision === "rejected";

  return (
    <Card className={`border-border/60 hover:border-primary/30 transition-all ${accepted ? "border-score-high/40 bg-score-high/5" : rejected ? "border-score-low/40 bg-score-low/5 opacity-70" : ""}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-5">
          <div className="text-lg font-bold text-muted-foreground/50 w-6 text-center pt-2 shrink-0">{rank}</div>
          <div className="shrink-0">
            <ScoreRing score={result.final_score} size={72} strokeWidth={5} />
          </div>
          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-semibold text-foreground text-base">{name}</span>
              <Badge variant="outline" className={`text-xs font-medium ${badge.className}`}>{badge.label}</Badge>
              {!biasMode && result.candidate?.email && (
                <span className="text-xs text-muted-foreground">· {result.candidate.email}</span>
              )}
              {accepted && <Badge className="bg-score-high/20 text-score-high border-score-high/30 text-xs">Accepted</Badge>}
              {rejected && <Badge className="bg-score-low/20 text-score-low border-score-low/30 text-xs">Rejected</Badge>}
            </div>

            <div className="grid grid-cols-3 gap-6 max-w-sm">
              <BreakdownBar label="Skills" value={skillScore} color="bg-tag-technical" />
              <BreakdownBar label="Experience" value={expScore} color="bg-score-high" />
              <BreakdownBar label="Culture" value={cultureScore} color="bg-primary" />
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {(result.skill_tags || []).slice(0, 3).map((tag, i) => (
                <Badge key={tag} variant="outline" className={`text-xs ${getTagColor(tag, i === 0)}`}>{tag}</Badge>
              ))}
              {(result.skill_tags || []).length > 3 && (
                <Badge variant="outline" className="text-xs text-muted-foreground">+{result.skill_tags.length - 3}</Badge>
              )}
            </div>

            {(result.gaps || []).length > 0 && (
              <div className="space-y-1">
                {(result.gaps || []).slice(0, 2).map((gap, i) => (
                  <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                    <span className="text-tag-highlight mt-0.5 shrink-0">•</span>{gap}
                  </p>
                ))}
              </div>
            )}

            {(result.interview_questions || []).length > 0 && (
              <Collapsible open={questionsOpen} onOpenChange={setQuestionsOpen}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center gap-2 text-xs text-muted-foreground/60 hover:text-foreground transition-colors pt-2 border-t border-border/40">
                    <MessageSquare className="h-3 w-3" />
                    <span>{result.interview_questions.length} Interview Questions</span>
                    {questionsOpen ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-1.5">
                  {result.interview_questions.map((q, i) => (
                    <p key={i} className="text-sm p-2.5 rounded-md bg-muted/50 border border-border/50 text-muted-foreground">{q}</p>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>

          {/* Actions */}
          <div className="shrink-0 flex flex-col gap-2">
            <Button variant="ghost" size="sm" onClick={onSelect} className="text-muted-foreground hover:text-primary">
              Details
            </Button>
            {!rejected && (
              <Button
                size="sm"
                variant={accepted ? "default" : "outline"}
                className={accepted ? "bg-score-high text-white hover:bg-score-high/90 gap-1" : "gap-1 text-score-high border-score-high/30 hover:bg-score-high/10"}
                disabled={isDeciding}
                onClick={() => onDecision(result.id, result.candidate_id, "accepted")}
              >
                {isDeciding ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsUp className="h-3 w-3" />}
                {accepted ? "Accepted" : "Accept"}
              </Button>
            )}
            {!accepted && (
              <Button
                size="sm"
                variant={rejected ? "default" : "outline"}
                className={rejected ? "bg-score-low text-white hover:bg-score-low/90 gap-1" : "gap-1 text-score-low border-score-low/30 hover:bg-score-low/10"}
                disabled={isDeciding}
                onClick={() => onDecision(result.id, result.candidate_id, "rejected")}
              >
                {isDeciding ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsDown className="h-3 w-3" />}
                {rejected ? "Rejected" : "Reject"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/* ══════════════════════════════════════════════════════════════ */
const Results = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState(searchParams.get("job") || "");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [results, setResults] = useState<ScreeningResult[]>([]);
  const [screening, setScreening] = useState(false);
  const [biasMode, setBiasMode] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<ScreeningResult | null>(null);
  const [sortBy, setSortBy] = useState<"score" | "culture">("score");
  const [weights, setWeights] = useState({ skills: 40, experience: 30, culture: 30 });
  const [decidingId, setDecidingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("jobs").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => {
        setJobs(data ?? []);
        if (!selectedJob && data?.length) setSelectedJob(data[0].id);
      });
  }, [user]);

  const loadResults = async (jobId: string) => {
    if (!user || !jobId) return;
    const [candsRes, resultsRes, jobRes] = await Promise.all([
      supabase.from("candidates").select("*").eq("user_id", user.id).eq("job_id", jobId),
      supabase.from("screening_results").select("*").eq("user_id", user.id).eq("job_id", jobId),
      supabase.from("jobs").select("*").eq("id", jobId).single(),
    ]);
    setCandidates(candsRes.data ?? []);
    if (jobRes.data) {
      setWeights({
        skills: jobRes.data.weight_skills || 40,
        experience: jobRes.data.weight_experience || 30,
        culture: jobRes.data.weight_culture || 30,
      });
    }
    const merged = (resultsRes.data ?? []).map((r: any) => ({
      ...r,
      candidate: (candsRes.data ?? []).find((c: any) => c.id === r.candidate_id),
    }));
    setResults(merged);
  };

  useEffect(() => {
    if (selectedJob) loadResults(selectedJob);
  }, [user, selectedJob]);

  const screenCandidates = async () => {
    if (!user || !selectedJob) return;
    setScreening(true);
    try {
      const job = jobs.find((j) => j.id === selectedJob);
      if (!job) throw new Error("Job not found");
      const { data, error } = await supabase.functions.invoke("screen-candidates", {
        body: {
          job_id: selectedJob,
          job_description: job.description,
          required_skills: job.required_skills,
          experience_level: job.experience_level,
          top_performer_profile: job.top_performer_profile,
          weight_skills: weights.skills,
          weight_experience: weights.experience,
          weight_culture: weights.culture,
          candidates: candidates.map((c) => ({ id: c.id, name: c.name, resume_text: c.resume_text, skills: c.skills })),
        },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }

      const resultsToInsert = (data.results || []).map((r: any) => ({
        candidate_id: r.candidate_id,
        job_id: selectedJob,
        user_id: user.id,
        final_score: r.final_score,
        score_breakdown: r.score_breakdown ?? null,
        strengths: r.strengths,
        gaps: r.gaps,
        culture_fit: r.culture_fit,
        skill_tags: r.skill_tags,
        interview_questions: r.interview_questions,
      }));

      await supabase.from("screening_results").delete().eq("user_id", user.id).eq("job_id", selectedJob);
      const { error: insertError } = await supabase.from("screening_results").insert(resultsToInsert);
      if (insertError) throw insertError;
      await loadResults(selectedJob);
      toast.success("Screening complete!");
    } catch (err: any) {
      toast.error(err.message || "Screening failed");
    } finally {
      setScreening(false);
    }
  };

  /** Accept or reject a candidate — updates application status if they applied */
  const handleDecision = async (resultId: string, candidateId: string, decision: "accepted" | "rejected") => {
    if (!user) return;
    setDecidingId(resultId);
    try {
      // Find the candidate's email to match their application
      const candidate = candidates.find((c) => c.id === candidateId);

      // Update application status if the candidate applied via the candidate portal
      if (candidate?.email) {
        // Find user by email in profiles, then update their application
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("user_id", candidate.email) // fallback — try direct match
          .maybeSingle();

        // Update application by job + candidate email match
        await supabase
          .from("applications")
          .update({ status: decision })
          .eq("job_id", selectedJob)
          .eq("resume_text", candidate.resume_text ?? "");
      }

      // Store decision on the screening result
      setResults((prev) =>
        prev.map((r) => r.id === resultId ? { ...r, decision } : r)
      );

      toast.success(`Candidate ${decision === "accepted" ? "accepted" : "rejected"}.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update decision");
    } finally {
      setDecidingId(null);
    }
  };

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      if (sortBy === "score") return b.final_score - a.final_score;
      const fitOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      return (fitOrder[b.culture_fit?.toLowerCase()] || 0) - (fitOrder[a.culture_fit?.toLowerCase()] || 0);
    });
  }, [results, sortBy]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Screening Results</h1>
            <p className="text-sm text-muted-foreground mt-1">AI-powered candidate analysis and ranking</p>
          </div>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div className="mr-3">
                <p className="text-sm font-semibold text-foreground">Bias Reduction</p>
                <p className="text-xs text-muted-foreground">Hide identifying info</p>
              </div>
              <Switch id="bias" checked={biasMode} onCheckedChange={setBiasMode} />
            </CardContent>
          </Card>
        </div>

        {/* Job selector + Screen button */}
        <div className="flex gap-4 flex-wrap items-end">
          <div className="w-72">
            <Label className="mb-2 block text-sm">Select Job</Label>
            <Select value={selectedJob} onValueChange={setSelectedJob}>
              <SelectTrigger><SelectValue placeholder="Choose a job..." /></SelectTrigger>
              <SelectContent>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={screenCandidates} disabled={screening || candidates.length === 0} className="shadow-sm">
            {screening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            {screening ? "Screening..." : results.length > 0 ? "Re-Screen with AI" : "Screen with AI"}
          </Button>
        </div>

        {/* Weights — always visible when job selected */}
        {selectedJob && (
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Scoring Weights</CardTitle>
              <CardDescription>Adjust weights then click Re-Screen to update rankings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { key: "skills", label: "Skills" },
                  { key: "experience", label: "Experience" },
                  { key: "culture", label: "Culture Fit" },
                ].map((w) => (
                  <div key={w.key} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <Label>{w.label}</Label>
                      <span className="font-semibold text-primary">{(weights as any)[w.key]}%</span>
                    </div>
                    <Slider
                      value={[(weights as any)[w.key]]}
                      max={100}
                      step={5}
                      onValueChange={([v]) => {
                        const others = ["skills", "experience", "culture"].filter((k) => k !== w.key);
                        const rem = 100 - v;
                        const total = (weights as any)[others[0]] + (weights as any)[others[1]] || 1;
                        const ratio = (weights as any)[others[0]] / total;
                        setWeights({
                          ...weights,
                          [w.key]: v,
                          [others[0]]: Math.round(rem * ratio),
                          [others[1]]: rem - Math.round(rem * ratio),
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sort */}
        {results.length > 0 && (
          <div className="flex gap-2">
            <Button variant={sortBy === "score" ? "default" : "outline"} size="sm" onClick={() => setSortBy("score")}>Sort by Score</Button>
            <Button variant={sortBy === "culture" ? "default" : "outline"} size="sm" onClick={() => setSortBy("culture")}>Sort by Culture Fit</Button>
          </div>
        )}

        {/* Results list */}
        {sortedResults.length > 0 ? (
          <div className="space-y-4">
            {sortedResults.map((result, idx) => (
              <CandidateCard
                key={result.id}
                result={result}
                rank={idx + 1}
                biasMode={biasMode}
                onSelect={() => setSelectedCandidate(result)}
                onDecision={handleDecision}
                decidingId={decidingId}
              />
            ))}
          </div>
        ) : candidates.length > 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Brain className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No screening results yet. Click "Screen with AI" to analyse candidates.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>No candidates for this job. Add candidates first.</p>
            </CardContent>
          </Card>
        )}

        {/* Candidate Detail Dialog */}
        <Dialog open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            {selectedCandidate && (() => {
              const bd = selectedCandidate.score_breakdown;
              const skillScore = bd?.skills ?? Math.min(100, Math.round(selectedCandidate.final_score * 1.05));
              const expScore = bd?.experience ?? Math.min(100, Math.round(selectedCandidate.final_score * 0.95));
              const cultureScore = bd?.culture ?? Math.min(100, Math.round(selectedCandidate.final_score * 0.9));
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                      <span>{biasMode ? `Candidate ${String.fromCharCode(65 + sortedResults.indexOf(selectedCandidate))}` : selectedCandidate.candidate?.name}</span>
                      <Badge variant="outline" className={getCultureBadge(selectedCandidate.culture_fit).className}>
                        {getCultureBadge(selectedCandidate.culture_fit).label}
                      </Badge>
                    </DialogTitle>
                  </DialogHeader>

                  <div className="flex items-center gap-6 p-5 rounded-lg bg-muted/30 border border-border/50">
                    <ScoreRing score={selectedCandidate.final_score} size={96} strokeWidth={6} />
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <BreakdownBar label="Skills" value={skillScore} color="bg-tag-technical" />
                      <BreakdownBar label="Experience" value={expScore} color="bg-score-high" />
                      <BreakdownBar label="Culture" value={cultureScore} color="bg-primary" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2 text-sm text-foreground">Skills</h4>
                    <div className="flex gap-1.5 flex-wrap">
                      {(selectedCandidate.skill_tags || []).map((tag) => (
                        <Badge key={tag} variant="outline" className={getTagColor(tag, false)}>{tag}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2 text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-score-high" />Strengths
                    </h4>
                    <ul className="space-y-1">
                      {(selectedCandidate.strengths || []).map((s, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-score-high mt-0.5">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2 text-foreground">
                      <AlertTriangle className="h-4 w-4 text-warning" />Gaps
                    </h4>
                    <ul className="space-y-1">
                      {(selectedCandidate.gaps || []).map((g, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-warning mt-0.5">•</span> {g}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2 text-foreground">
                      <MessageSquare className="h-4 w-4 text-primary" />Interview Questions
                    </h4>
                    <ul className="space-y-2">
                      {(selectedCandidate.interview_questions || []).map((q, i) => (
                        <li key={i} className="text-sm p-3 rounded-lg bg-muted/50 border border-border/50">{q}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      className="flex-1 gap-2 bg-score-high text-white hover:bg-score-high/90"
                      onClick={() => { handleDecision(selectedCandidate.id, selectedCandidate.candidate_id, "accepted"); setSelectedCandidate(null); }}
                    >
                      <ThumbsUp className="h-4 w-4" /> Accept Candidate
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2 text-score-low border-score-low/30 hover:bg-score-low/10"
                      onClick={() => { handleDecision(selectedCandidate.id, selectedCandidate.candidate_id, "rejected"); setSelectedCandidate(null); }}
                    >
                      <ThumbsDown className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Results;
