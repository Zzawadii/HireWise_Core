import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  role: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  role: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

/** Fetch role from profiles, creating the profile row if it doesn't exist yet */
async function fetchOrCreateRole(user: User): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (data?.role) return data.role;

  // Profile doesn't exist yet — create it using metadata set during signup
  const metaRole = user.user_metadata?.role || "recruiter";
  const metaName = user.user_metadata?.name || "";

  await supabase.from("profiles").insert({
    user_id: user.id,
    name: metaName,
    role: metaRole,
  });

  return metaRole;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    // Initial session load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const r = await fetchOrCreateRole(session.user);
        setRole(r);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const r = await fetchOrCreateRole(session.user);
        setRole(r);
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, role, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
