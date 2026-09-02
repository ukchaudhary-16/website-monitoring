"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setToken } from "@/lib/api";

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", walletAddress: "" });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const body = { ...form };
      if (!body.walletAddress) delete body.walletAddress;
      const { token } = await api("/api/auth/register", { method: "POST", body, auth: false });
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
      <h1>Create account</h1>
      <form onSubmit={submit} className="card">
        <label>Email</label>
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <label>Password</label>
        <input type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <label>Wallet address (optional)</label>
        <input value={form.walletAddress} onChange={(e) => setForm({ ...form, walletAddress: e.target.value })} placeholder="0x..." />
        {err && <p className="error">{err}</p>}
        <button style={{ marginTop: 16 }} disabled={busy}>{busy ? "..." : "Sign up (free plan)"}</button>
      </form>
      <p className="muted" style={{ marginTop: 12 }}>
        Have an account? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
