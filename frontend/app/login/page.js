"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setToken } from "@/lib/api";

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const { token } = await api("/api/auth/login", { method: "POST", body: form, auth: false });
      setToken(token);
      window.dispatchEvent(new Event("storage"));
      router.push("/dashboard");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container narrow stack fade-in">
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "1.6rem" }}>Welcome back</h1>
        <p className="muted tiny">Log in to your monitoring dashboard.</p>
      </div>
      <form onSubmit={submit} className="card">
        <label>Email</label>
        <input type="email" autoComplete="email" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <label>Password</label>
        <input type="password" autoComplete="current-password" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        {err && <p className="error">{err}</p>}
        <button style={{ marginTop: 18, width: "100%" }} disabled={busy}>
          {busy ? "Signing in…" : "Log in"}
        </button>
        <p className="notice" style={{ marginTop: 14 }}>
          Demo account: <code>demo@example.com</code> / <code>password123</code>
        </p>
      </form>
      <p className="muted tiny" style={{ textAlign: "center" }}>
        No account? <Link href="/register" style={{ color: "var(--accent)" }}>Sign up</Link>
      </p>
    </div>
  );
}
