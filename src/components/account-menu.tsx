"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { getBrowserSupabaseClient } from "@/lib/supabase";

export function AccountMenu() {
  const router = useRouter();
  const supabase = getBrowserSupabaseClient();
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? data.user?.id ?? "");
    });
  }, [supabase]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="border-t border-line p-3">
      <div className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <span className="truncate">{email || "Signed in"}</span>
        <button title="Logout" className="rounded p-1 text-slate-500 hover:bg-white hover:text-ink" onClick={logout}>
          <LogOut size={15} />
        </button>
      </div>
    </div>
  );
}
