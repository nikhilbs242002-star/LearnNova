"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [grade, setGrade] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setMessage("Registration failed. Please try again.");
      setLoading(false);
      return;
    }

    const userId = data.user.id;

    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        name,
        email,
        role: "student",
      });

    if (profileError) {
      setMessage(profileError.message);
      setLoading(false);
      return;
    }

    const { error: studentProfileError } = await supabase
      .from("student_profiles")
      .insert({
        id: userId,
        student_id: userId,
        grade,
      });

    if (studentProfileError) {
      setMessage(studentProfileError.message);
      setLoading(false);
      return;
    }

    setMessage("Registration successful! Redirecting...");

    setTimeout(() => {
      router.push("/dashboard");
    }, 1000);
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">
            Create your account
          </h1>

          <p className="mt-2 text-slate-500">
            Start your personalized learning journey
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Full Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Enter your name"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
            />
          </div>

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
              minLength={6}
              placeholder="At least 6 characters"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Grade / Class
            </label>

            <input
              type="text"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              required
              placeholder="Example: Grade 10"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        {message && (
          <p className="mt-5 text-center text-sm text-slate-600">
            {message}
          </p>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <a
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-700"
          >
            Login
          </a>
        </p>
      </div>
    </main>
  );
}