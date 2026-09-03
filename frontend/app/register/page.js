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
    <div className="container narrow stack fade-in">
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "1.6rem" }}>Create your account</h1>
        <p className="muted tiny">Starts on the free plan — 1 site, 1 region. Upgrade anytime.</p>
      </div>
      <form onSubmit={submit} className="card">
        <label>Email</label>
        <input type="email" autoComplete="email" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <label>Password</label>
        <input type="password" autoComplete="new-password" minLength={6} value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <label>Wallet address <span className="faint">(optional)</span></label>
        <input value={form.walletAddress} className="mono"
          onChange={(e) => setForm({ ...form, walletAddress: e.target.value })} placeholder="0x…" />
        {err && <p className="error">{err}</p>}
        <button style={{ marginTop: 18, width: "100%" }} disabled={busy}>
          {busy ? "Creating…" : "Sign up — free plan"}
        </button>
      </form>
      <p className="muted tiny" style={{ textAlign: "center" }}>
        Already have an account? <Link href="/login" style={{ color: "var(--accent)" }}>Log in</Link>
      </p>
    </div>
  );
}
