"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabase";

const allowedUids = (
  process.env.NEXT_PUBLIC_ALLOWED_USER_UIDS ??
  "25f88fac-e5b9-4148-82cd-2762b7b9d607,4d31c57b-4750-4077-8cf4-ed6b159b8f94"
)
  .split(",")
  .map((uid) => uid.trim());

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
if (!session || !allowedUids.includes(session.user.id)) {        if (session) await supabase.auth.signOut();
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
