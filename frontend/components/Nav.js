"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, setToken } from "@/lib/api";

export default function Nav() {
  const [authed, setAuthed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setAuthed(!!getToken());
    const h = () => setAuthed(!!getToken());
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, []);

  function logout() {
    setToken(null);
    setAuthed(false);
    router.push("/");
  }

  return (
    <div className="nav">
      <Link href="/" className="brand">◉ DePIN Monitor</Link>
      <div>
        <Link href="/">Network</Link>
        <Link href="/nodes">Run a node</Link>
        {authed ? (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <a onClick={logout} style={{ cursor: "pointer" }}>Log out</a>
          </>
        ) : (
          <>
            <Link href="/login">Log in</Link>
            <Link href="/register">Sign up</Link>
          </>
        )}
      </div>
    </div>
  );
}
