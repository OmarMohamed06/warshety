"use client";

/**
 * AuthContext — Provides current session, user profile, and vendor data.
 *
 * Wraps @supabase/ssr browser client. Handles:
 * - Session management + auto-refresh
 * - User profile fetch (users table)
 * - Vendor fetch (vendors table) if role === 'vendor'
 * - Sign-in / sign-up / sign-out helpers
 */

import {
  createContext,
  useCallback,
  useRef,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { DbUser, DbVendor, UserRole, VendorType } from "@/types/database";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthContextValue {
  session: Session | null;
  user: DbUser | null;
  vendor: DbVendor | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  vendorType: VendorType | null;
  /** The branch ID this user is assigned to manage (null if owner or not a manager) */
  managedBranchId: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role?: UserRole,
  ) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

// Fallback value when Supabase env vars are not configured
const NULL_AUTH: AuthContextValue = {
  session: null,
  user: null,
  vendor: null,
  isLoading: false,
  isAuthenticated: false,
  role: null,
  vendorType: null,
  managedBranchId: null,
  signIn: async () => "Authentication not configured — missing env vars.",
  signUp: async () => "Authentication not configured — missing env vars.",
  signInWithGoogle: async () =>
    "Authentication not configured — missing env vars.",
  signOut: async () => {},
  refreshProfile: async () => {},
};

// ── Provider ──────────────────────────────────────────────────────────────────

/** Outer wrapper — renders a no-op shell if Supabase env vars are absent. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!configured) {
    console.error(
      "[AuthProvider] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. " +
        "Add them to your Vercel project environment variables and redeploy.",
    );
    return (
      <AuthContext.Provider value={NULL_AUTH}>{children}</AuthContext.Provider>
    );
  }

  return <AuthProviderInner>{children}</AuthProviderInner>;
}

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  // Stable client — same reference for the lifetime of the provider.
  // createBrowserClient is a singleton per URL+key, but referential stability
  // prevents loadProfile / loadVendors from being recreated on every render.
  const [supabase] = useState(() => createClient());

  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [user, setUser] = useState<DbUser | null>(null);
  const [vendor, setVendor] = useState<DbVendor | null>(null);
  const [managedBranchId, setManagedBranchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Guard against state updates after unmount (React 19 concurrent mode)
  const isMountedRef = useRef(true);
  // Tracks whether a user profile is currently loaded in state.
  // Using a ref (not state) avoids stale-closure bugs inside the
  // onAuthStateChange handler which is set up once and never re-created.
  // Set to true after loadProfile completes; false on sign-out or init.
  const profileLoadedRef = useRef(false);

  // ── Fetch profile & vendor from DB ────────────────────────────────────────
  const loadProfile = useCallback(
    async (uid: string) => {
      try {
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("id", uid)
          .single();

        if (!isMountedRef.current) return;
        if (profile) {
          setUser(profile);
          // Only vendors have a row in the vendors table — skip the extra
          // round-trip for every customer and admin.
          if (profile.role === "vendor") {
            const { data: vendorData } = await supabase
              .from("vendors")
              .select("*")
              .eq("user_id", uid)
              .single();
            if (isMountedRef.current) {
              setVendor(vendorData ?? null);
              setManagedBranchId(null);
            }
          } else if (profile.role === "manager") {
            // Manager: get their branch_id directly (RLS allows user_id = auth.uid())
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: assignment } = await (supabase as any)
              .from("branch_users")
              .select("branch_id")
              .eq("user_id", uid)
              .limit(1)
              .maybeSingle();
            if (isMountedRef.current) {
              setManagedBranchId(assignment?.branch_id ?? null);
              setVendor(null);
            }
          } else {
            // customer / admin — no vendor, no managed branch
            if (isMountedRef.current) {
              setManagedBranchId(null);
              setVendor(null);
            }
          }
        }
      } catch {
        // Network error or auth service unavailable — silently degrade
      }
    },
    [supabase],
  );

  const refreshProfile = useCallback(async () => {
    if (authUser) await loadProfile(authUser.id);
  }, [authUser, loadProfile]);

  // ── Bootstrap session on mount ────────────────────────────────────────────
  // Rely solely on onAuthStateChange — it fires INITIAL_SESSION synchronously
  // on mount before any async getSession() could resolve, so a parallel
  // getSession() call would race against it and double-invoke loadProfile.
  useEffect(() => {
    isMountedRef.current = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      if (!isMountedRef.current) return;
      setSession(s);
      setAuthUser(s?.user ?? null);
      if (s?.user) {
        if (
          event === "INITIAL_SESSION" ||
          event === "SIGNED_IN" ||
          event === "USER_UPDATED"
        ) {
          // Block the UI only when no profile is currently loaded:
          //   • INITIAL_SESSION on page reload → profileLoadedRef = false → block.
          //   • Fresh sign-in → profileLoadedRef = false → block.
          //   • TOKEN_REFRESHED after profile is loaded → profileLoadedRef = true → no block.
          if (!profileLoadedRef.current) {
            setIsLoading(true);
          }
          loadProfile(s.user.id).finally(() => {
            if (isMountedRef.current) {
              profileLoadedRef.current = true;
              setIsLoading(false);
            }
          });
        } else {
          // TOKEN_REFRESHED — profile already loaded; silently refresh in background.
          loadProfile(s.user.id);
        }
      } else {
        // SIGNED_OUT / no session on INITIAL_SESSION.
        profileLoadedRef.current = false;
        setUser(null);
        setVendor(null);
        setManagedBranchId(null);
        if (isMountedRef.current) setIsLoading(false);
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  // ── Auth actions ──────────────────────────────────────────────────────────
  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        if (
          error.message.toLowerCase().includes("email not confirmed") ||
          error.message.toLowerCase().includes("email_not_confirmed")
        ) {
          return "__email_not_confirmed__";
        }
        return error.message;
      }
      return null;
    },
    [supabase],
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      role: UserRole = "customer",
    ): Promise<string | null> => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        },
      });
      if (error) {
        if (
          error.message.toLowerCase().includes("rate limit") ||
          error.message.toLowerCase().includes("email rate")
        ) {
          return "Too many sign-up attempts. Please wait a few minutes and try again, or contact support.";
        }
        if (error.message.toLowerCase().includes("email not authorized")) {
          return "This email address is not authorized for registration. Please use a different email.";
        }
        return error.message;
      }
      return null;
    },
    [supabase],
  );

  const signInWithGoogle = useCallback(async (): Promise<string | null> => {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });
    return error?.message ?? null;
  }, [supabase]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore network errors — always clear local state
    }
    setSession(null);
    setAuthUser(null);
    setUser(null);
    setVendor(null);
  }, [supabase]);

  // ── Value ─────────────────────────────────────────────────────────────────
  const value: AuthContextValue = {
    session,
    user,
    vendor,
    isLoading,
    isAuthenticated: !!session,
    role: user?.role ?? null,
    vendorType: vendor?.vendor_type ?? null,
    managedBranchId,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
