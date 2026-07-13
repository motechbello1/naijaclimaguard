"use client";

import ProtectedPage from "@/components/shared/ProtectedPage";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { User, Mail, Lock, Save, Loader2, CheckCircle, Crown } from "lucide-react";

const PLAN_COLORS: Record<string, string> = {
  FREE: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
  PROFESSIONAL: "bg-radar/10 text-radar",
  ENTERPRISE: "bg-amber/10 text-amber",
};

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [plan, setPlan] = useState("FREE");

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then((data) => {
      if (data.user) {
        setName(data.user.name || "");
        setEmail(data.user.email || "");
        setPlan(data.user.plan || "FREE");
      }
    });
  }, []);

  const handleSaveProfile = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      setSuccess("Profile updated successfully");
      // Update the session with new data
      await update({ name, email });
    } catch { setError("Failed to update profile"); }
    setLoading(false);
  };

  const handleChangePassword = async () => {
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) { setError("New passwords do not match"); return; }
    if (newPassword.length < 8) { setError("New password must be at least 8 characters"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      setSuccess("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch { setError("Failed to change password"); }
    setLoading(false);
  };

  return (
    <ProtectedPage>
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold">Profile Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your account details</p>
        </div>

        {error && <div className="rounded-lg bg-crimson/10 border border-crimson/20 px-4 py-3 text-sm text-crimson">{error}</div>}
        {success && (
          <div className="rounded-lg bg-radar/10 border border-radar/20 px-4 py-3 text-sm text-radar flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />{success}
          </div>
        )}

        {/* Plan info */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 text-radar" />
              <div>
                <h2 className="text-sm font-bold">Current Plan</h2>
                <p className="text-xs text-slate-400 mt-0.5">Your subscription level</p>
              </div>
            </div>
            <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${PLAN_COLORS[plan]}`}>{plan}</span>
          </div>
        </div>

        {/* Profile info */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-sm font-bold mb-4 flex items-center gap-2"><User className="h-4 w-4 text-radar" /> Personal Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight px-4 py-3 text-sm focus:border-radar focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight px-4 py-3 text-sm focus:border-radar focus:outline-none transition-colors" />
              <p className="text-xs text-slate-400 mt-1">Email can be changed if the new email is not already registered</p>
            </div>
            <button onClick={handleSaveProfile} disabled={loading} className="flex items-center gap-2 rounded-lg bg-radar px-5 py-2.5 text-sm font-semibold text-white hover:bg-radar/90 shadow-lg shadow-radar/20 transition-all">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        </div>

        {/* Change password */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-sm font-bold mb-4 flex items-center gap-2"><Lock className="h-4 w-4 text-radar" /> Change Password</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight px-4 py-3 text-sm focus:border-radar focus:outline-none transition-colors" placeholder="Enter current password" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight px-4 py-3 text-sm focus:border-radar focus:outline-none transition-colors" placeholder="Minimum 8 characters" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight px-4 py-3 text-sm focus:border-radar focus:outline-none transition-colors" placeholder="Repeat new password" />
            </div>
            <button onClick={handleChangePassword} disabled={loading || !currentPassword || !newPassword} className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-midnight-border px-5 py-2.5 text-sm font-semibold hover:border-radar/40 transition-all disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Change Password
            </button>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
