"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2 } from "lucide-react";
import Link from "next/link";
import AccountFrame from "@/components/auth/AccountFrame";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, name }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Registration failed"); setLoading(false); return; }
      router.push("/login?registered=true");
    } catch { setError("Something went wrong"); setLoading(false); }
  };

  return (
    <AccountFrame kind="register"><div className="ncg-entry-form">
      <span className="ncg-entry-eyebrow">START FREE / ONE ACCOUNT</span>
      <h1>Make the places<br /><em>you love visible.</em></h1>
      <p>Save a home, farm, business or community location. Choose the view that fits your work once you enter.</p>
      <form onSubmit={handleSubmit} className="ncg-entry-fields">
        {error && <div className="ncg-entry-error" role="alert">{error}</div>}
        <div><label htmlFor="ncg-register-name">Your name</label><input id="ncg-register-name" type="text" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Your name" /></div>
        <div><label htmlFor="ncg-register-email">Email address</label><input id="ncg-register-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required /></div>
        <div><label htmlFor="ncg-register-password">Password</label><input id="ncg-register-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="At least 8 characters" required minLength={8} /></div>
        <div><label htmlFor="ncg-register-confirm">Confirm password</label><input id="ncg-register-confirm" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" placeholder="Repeat your password" required minLength={8} /></div>
        <button type="submit" disabled={loading} className="ncg-entry-submit"><span>{loading ? "Creating account..." : "Create my free account"}</span>{loading ? <Loader2 size={19} className="animate-spin" /> : <ArrowUpRight size={20} />}</button>
      </form>
      <p className="ncg-entry-note">Start with up to 3 saved places. Public warnings and reporting remain free.</p>
      <p className="ncg-entry-alternate">Already have an account? <Link href="/login">Log in</Link></p>
    </div></AccountFrame>
  );
}
