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
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role?: UserRole,
  ) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [user, setUser] = useState<DbUser | null>(null);
  const [vendor, setVendor] = useState<DbVendor | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Fetch profile & vendor from DB ────────────────────────────────────────
  const loadProfile = useCallback(
    async (uid: string) => {
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", uid)
        .single();

      if (profile) {
        setUser(profile);
        if (profile.role === "vendor") {
          const { data: vendorData } = await supabase
            .from("vendors")
            .select("*")
            .eq("user_id", uid)
            .single();
          setVendor(vendorData ?? null);
        }
      }
    },
    [supabase],
  );

  const refreshProfile = useCallback(async () => {
    if (authUser) await loadProfile(authUser.id);
  }, [authUser, loadProfile]);

  // ── Bootstrap session on mount ────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setAuthUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user.id);
      } else {
        setUser(null);
        setVendor(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, loadProfile]);

  // ── Auth actions ──────────────────────────────────────────────────────────
  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return error?.message ?? null;
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
      return error?.message ?? null;
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
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
    signIn,
    signUp,
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
