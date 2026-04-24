import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Upload, Users } from "lucide-react";
import { toast } from "sonner";

const Candidates = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState(searchParams.get("job") || "");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", resume_text: "", skills: "" });

  useEffect(() => {
    if (!user) return;
    supabase.from("jobs").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => {
        setJobs(data ?? []);
        if (!selectedJob && data && data.length > 0) setSelectedJob(data[0].id);
      });
  }, [user]);

  useEffect(() => {
    if (!user || !selectedJob) return;
    supabase.from("candidates").select("*").eq("user_id", user.id).eq("job_id", selectedJob).order("created_at", { ascending: false })
      .then(({ data }) => setCandidates(data ?? []));
  }, [user, selectedJob]);

  const addCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedJob) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("candidates").insert({
        user_id: user.id,
        job_id: selectedJob,
        name: form.name,
        email: form.email,
        resume_text: form.resume_text,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      });
      if (error) throw error;
      toast.success("Candidate added!");
      setForm({ name: "", email: "", resume_text: "", skills: "" });
      setShowForm(false);
      // Reload candidates
      const { data } = await supabase.from("candidates").select("*").eq("user_id", user.id).eq("job_id", selectedJob).order("created_at", { ascending: false });
      setCandidates(data ?? []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedJob) return;

    const text = await file.text();
    const lines = text.split("\n").filter(Boolean);

    if (!lines[0].toLowerCase().includes("name")) {
      toast.error("CSV must have a 'name' column");
      return;
    }

    /** Parse a single CSV line respecting quoted fields */
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
          else inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
    const nameIdx = headers.indexOf("name");
    const emailIdx = headers.indexOf("email");
    const skillsIdx = headers.indexOf("skills");
    const resumeIdx = headers.indexOf("resume_text");

    const rows = lines.slice(1).map((line) => {
      const cols = parseCSVLine(line);
      return {
        user_id: user.id,
        job_id: selectedJob,
        name: cols[nameIdx] || "",
        email: emailIdx >= 0 ? cols[emailIdx] : "",
        skills: skillsIdx >= 0 ? cols[skillsIdx]?.split(";").map((s) => s.trim()).filter(Boolean) : [],
        resume_text: resumeIdx >= 0 ? cols[resumeIdx] : "",
      };
    }).filter((r) => r.name);

    try {
      const { error } = await supabase.from("candidates").insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} candidates uploaded!`);
      const { data } = await supabase.from("candidates").select("*").eq("user_id", user.id).eq("job_id", selectedJob).order("created_at", { ascending: false });
      setCandidates(data ?? []);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Candidates</h1>
          <div className="flex gap-2">
            <div className="relative">
              <input type="file" accept=".csv" onChange={handleCSVUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              <Button variant="outline">
                <Upload className="h-4 w-4" />
                Upload CSV
              </Button>
            </div>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4" />
              Add Manually
            </Button>
          </div>
        </div>

        {/* Job selector */}
        <div className="w-full max-w-sm">
          <Label className="mb-2 block">Select Job</Label>
          <Select value={selectedJob} onValueChange={setSelectedJob}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a job..." />
            </SelectTrigger>
            <SelectContent>
              {jobs.map((job) => (
                <SelectItem key={job.id} value={job.id}>{job.title} — {job.department}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Add candidate form */}
        {showForm && selectedJob && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Add Candidate</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={addCandidate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Resume / Experience Summary</Label>
                  <Textarea value={form.resume_text} onChange={(e) => setForm({ ...form, resume_text: e.target.value })} rows={4} placeholder="Paste resume text or experience summary..." required />
                </div>
                <div className="space-y-2">
                  <Label>Skills (comma-separated)</Label>
                  <Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="React, TypeScript, Node.js" />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Add Candidate
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Candidates list */}
        <Card>
          <CardContent className="p-0">
            {candidates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No candidates yet. Add them manually or upload a CSV.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {candidates.map((c) => (
                  <div key={c.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      {/* Avatar initials */}
                      <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {(c.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{c.name}</p>
                        <p className="text-sm text-muted-foreground">{c.email}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {(c.skills || []).slice(0, 5).map((skill: string) => (
                            <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                          ))}
                          {(c.skills || []).length > 5 && (
                            <Badge variant="outline" className="text-xs">+{c.skills.length - 5}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedJob && candidates.length > 0 && (
          <Button asChild className="w-full" size="lg">
            <Link to={`/results?job=${selectedJob}`}>
              Screen Candidates with AI →
            </Link>
          </Button>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Candidates;
