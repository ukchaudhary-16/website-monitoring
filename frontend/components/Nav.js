"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken, setToken } from "@/lib/api";

export default function Nav() {
  const [authed, setAuthed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const sync = () => setAuthed(!!getToken());
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  function logout() {
    setToken(null);
    window.dispatchEvent(new Event("storage"));
    router.push("/");
  }

  const link = (href, label) => (
    <Link href={href} className={pathname === href ? "active" : ""}>
      {label}
    </Link>
  );

  return (
    <nav className="nav">
      <Link href="/" className="brand">
        <span className="mark" />
        DePIN Monitor
      </Link>
      <div className="links">
        {link("/", "Network")}
        {link("/nodes", "Run a node")}
        {authed ? (
          <>
            {link("/dashboard", "Dashboard")}
            <button className="ghost sm" onClick={logout}>Log out</button>
          </>
        ) : (
          <>
            {link("/login", "Log in")}
            <Link href="/register" className="btn sm" style={{ marginLeft: 6 }}>Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
