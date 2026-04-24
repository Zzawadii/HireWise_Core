import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CreateJob from "./pages/CreateJob";
import Candidates from "./pages/Candidates";
import Results from "./pages/Results";
import NotFound from "./pages/NotFound";
import CandidateLanding from "./pages/candidates/CandidateLanding";
import CandidateAuth from "./pages/candidates/CandidateAuth";
import JobBoard from "./pages/candidates/JobBoard";
import MyApplications from "./pages/candidates/MyApplications";
import CandidateFeedback from "./pages/candidates/CandidateFeedback";
import CandidateProfile from "./pages/candidates/CandidateProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Recruiter */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute role="recruiter"><Dashboard /></ProtectedRoute>} />
            <Route path="/jobs/new" element={<ProtectedRoute role="recruiter"><CreateJob /></ProtectedRoute>} />
            <Route path="/candidates" element={<ProtectedRoute role="recruiter"><Candidates /></ProtectedRoute>} />
            <Route path="/results" element={<ProtectedRoute role="recruiter"><Results /></ProtectedRoute>} />

            {/* Candidate */}
            <Route path="/candidate" element={<CandidateLanding />} />
            <Route path="/candidate/auth" element={<CandidateAuth />} />
            <Route path="/candidate/jobs" element={<ProtectedRoute role="candidate"><JobBoard /></ProtectedRoute>} />
            <Route path="/candidate/applications" element={<ProtectedRoute role="candidate"><MyApplications /></ProtectedRoute>} />
            <Route path="/candidate/feedback" element={<ProtectedRoute role="candidate"><CandidateFeedback /></ProtectedRoute>} />
            <Route path="/candidate/profile" element={<ProtectedRoute role="candidate"><CandidateProfile /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
