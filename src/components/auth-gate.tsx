"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabase";

const allowedUid = process.env.NEXT_PUBLIC_ALLOWED_USER_UID ?? "25f88fac-e5b9-4148-82cd-2762b7b9d607";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const supabase = getBrowserSupabaseClient();

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session || session.user.id !== allowedUid) {
        if (session) await supabase.auth.signOut();
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      if (active) setReady(true);
    }

    checkSession();

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init = {}) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (!url.startsWith("/api")) return originalFetch(input, init);

      const { data } = await supabase.auth.getSession();
      const headers = new Headers(init.headers);
      if (data.session?.access_token) headers.set("Authorization", `Bearer ${data.session.access_token}`);
      return originalFetch(input, { ...init, headers });
    };

    return () => {
      active = false;
      window.fetch = originalFetch;
    };
  }, [pathname, router, supabase]);

  if (!ready) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Checking login...</div>;
  }

  return <>{children}</>;
}
