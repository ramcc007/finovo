'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
});

// Best-effort app-level audit log — Supabase Auth already persists the
// actual session server-side; this just gives us visibility into it.
// Never allowed to block or fail the auth flow.
async function logLoginEvent(userId: string, eventType: 'sign_in' | 'sign_out') {
  try {
    await supabase.from('login_events').insert({
      user_id: userId,
      event_type: eventType,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });
  } catch {
    // ignore — the audit log is not load-bearing
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      prevUserId.current = data.session?.user?.id ?? null;
      setLoading(false);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN' && session?.user && prevUserId.current !== session.user.id) {
        logLoginEvent(session.user.id, 'sign_in');
      } else if (event === 'SIGNED_OUT' && prevUserId.current) {
        logLoginEvent(prevUserId.current, 'sign_out');
      }
      prevUserId.current = session?.user?.id ?? null;
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
