"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase";

const allowedUid = process.env.NEXT_PUBLIC_ALLOWED_USER_UID ?? "25f88fac-e5b9-4148-82cd-2762b7b9d607";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = getBrowserSupabaseClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError || !data.user) {
      setError(loginError?.message ?? "Unable to login.");
      setLoading(false);
      return;
    }

    if (data.user.id !== allowedUid) {
      await supabase.auth.signOut();
      setError("This user is not allowed to access the monitoring system.");
      setLoading(false);
      return;
    }

    router.replace(params.get("next") || "/");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#edf2f8] p-4">
      <form className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-soft" onSubmit={login}>
        <Image src="/dreambike-logo.png" alt="Dreambike PH" width={260} height={70} className="mx-auto h-14 object-contain" />
        <p className="mt-2 text-center text-xs font-bold tracking-[0.24em] text-slate-600">MONITORING SYSTEM</p>
        <h1 className="mt-6 text-xl font-bold text-ink">Login</h1>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
        </div>
        {error ? <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
        <button className="mt-5 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#edf2f8] text-sm text-slate-500">Loading login...</main>}>
      <LoginForm />
    </Suspense>
  );
}
