"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase";

const allowedUids = (
  process.env.NEXT_PUBLIC_ALLOWED_USER_UIDS ??
  "25f88fac-e5b9-4148-82cd-2762b7b9d607,4d31c57b-4750-4077-8cf4-ed6b159b8f94"
)
  .split(",")
  .map((uid) => uid.trim());

const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = hasSupabaseConfig ? getBrowserSupabaseClient() : null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError("");

    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError || !data.user) {
      setError(loginError?.message ?? "Unable to login.");
      setLoading(false);
      return;
    }

    if (!allowedUids.includes(data.user.id)) {
      await supabase.auth.signOut();
      setError("This user is not allowed to access the monitoring system.");
      setLoading(false);
      return;
    }

    router.replace(params.get("next") || "/");
  }

  if (!hasSupabaseConfig) {
    return (
      <main className="grid min-h-screen place-items-center bg-ink bg-cover bg-center bg-no-repeat p-4" style={{ backgroundImage: "linear-gradient(rgba(8, 13, 22, 0.45), rgba(8, 13, 22, 0.78)), url('/dreambike-hero-clean.png')" }}>
        <section className="w-full max-w-md border border-yellow-400/50 bg-slate-950/90 p-8 text-center text-white shadow-soft backdrop-blur">
          <p className="text-xs font-bold tracking-[0.24em] text-yellow-300">DREAMBIKEPH</p>
          <h1 className="mt-4 text-3xl font-black uppercase">Admin Access</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">This secure login is ready for the deployed Dreambike system. Local preview does not have its secured connection configured.</p>
          <Link className="mt-6 inline-flex border border-yellow-400 px-4 py-2 text-xs font-bold uppercase tracking-wider text-yellow-300" href="/home">Back to homepage</Link>
        </section>
      </main>
    );
  }

  return (
    <main
      className="grid min-h-screen place-items-center bg-ink bg-cover bg-center bg-no-repeat p-4"
      style={{
        backgroundImage: "linear-gradient(rgba(8, 13, 22, 0.28), rgba(8, 13, 22, 0.58)), url('/coverphoto.jpg')",
      }}
    >
      <form className="w-full max-w-md rounded-lg border border-white/20 bg-white/95 p-6 shadow-soft backdrop-blur" onSubmit={login}>
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
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-ink text-sm text-white">Loading login...</main>}>
      <LoginForm />
    </Suspense>
  );
}
