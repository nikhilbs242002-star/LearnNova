"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setMessage("Login succeeded, but the user could not be found.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      console.error("Profile lookup error:", profileError);
      setMessage("Login succeeded, but your profile could not be loaded.");
      setLoading(false);
      return;
    }

    setMessage("Login successful! Redirecting...");

    setTimeout(() => {
      if (profile.role === "teacher") {
        router.push("/teacher/dashboard");
      } else if (profile.role === "student") {
        router.push("/dashboard");
      } else if (profile.role === "parent") {
        router.push("/dashboard");
      } else {
        router.push("/dashboard");
      }

      router.refresh();
    }, 500);
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm border border-slate-100">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">
            Welcome back
          </h1>

          <p className="mt-2 text-slate-500">
            Login to continue your learning journey
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        {message && (
          <p className="mt-5 text-center text-sm text-slate-600">
            {message}
          </p>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          Don't have an account?{" "}
          <a
            href="/register"
            className="font-medium text-blue-600 hover:text-blue-700"
          >
            Create one
          </a>
        </p>

      </div>
    </main>
  );
}