"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getToken } from "@/lib/api";

export function useAuth() {
  const router = useRouter();
  const [state, setState] = useState({ loading: true, user: null, plan: null });

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api("/api/auth/me")
      .then((d) => setState({ loading: false, user: d.user, plan: d.plan }))
      .catch(() => router.replace("/login"));
  }, [router]);

  return state;
}
