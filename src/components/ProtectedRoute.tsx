import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If provided, redirects users whose role doesn't match */
  role?: "recruiter" | "candidate";
}

const ProtectedRoute = ({ children, role }: ProtectedRouteProps) => {
  const { user, loading, role: userRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in — send to the right auth page
  if (!user) {
    return <Navigate to={role === "candidate" ? "/candidate/auth" : "/auth"} replace />;
  }

  // Logged in but wrong role
  if (role && userRole && userRole !== role) {
    return <Navigate to={userRole === "candidate" ? "/candidate/jobs" : "/dashboard"} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
