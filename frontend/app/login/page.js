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
    <div className="container" style={{ maxWidth: 420 }}>
      <h1>Log in</h1>
      <form onSubmit={submit} className="card">
        <label>Email</label>
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <label>Password</label>
        <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        {err && <p className="error">{err}</p>}
        <button style={{ marginTop: 16 }} disabled={busy}>{busy ? "..." : "Log in"}</button>
      </form>
      <p className="muted" style={{ marginTop: 12 }}>
        No account? <Link href="/register">Sign up</Link>
      </p>
    </div>
  );
}
