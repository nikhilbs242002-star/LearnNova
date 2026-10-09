"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  UserRound,
  Mail,
  GraduationCap,
  Target,
  BookOpen,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ProfileData = {
  name: string | null;
  email: string | null;
  role: string | null;
};

type StudentProfileData = {
  grade: string | number | null;
  goals: unknown;
  learning_preferences: unknown;
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Not added yet";
  }

  if (Array.isArray(value)) {
    return value.length > 0
      ? value.map(String).join(", ")
      : "Not added yet";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function DetailCard({
  icon: Icon,
  title,
  value,
  description,
}: {
  icon: typeof UserRound;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-blue-400/30 hover:bg-white/[0.06]">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
          <Icon size={21} />
        </div>

        <div>
          <h2 className="font-semibold text-white">{title}</h2>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
      </div>

      <p className="break-words whitespace-pre-wrap text-sm leading-6 text-slate-200">
        {value}
      </p>
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [studentProfile, setStudentProfile] =
    useState<StudentProfileData | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    setNotice("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setErrorMessage(
          "You are not signed in. Please log in to view your profile.",
        );
        return;
      }

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select("name, email, role")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        console.error("Profile loading error:", profileError);
        setErrorMessage(
          "We could not load your account details. Please try again.",
        );
        return;
      }

      setProfile({
        name: profileData?.name ?? user.user_metadata?.name ?? null,
        email: profileData?.email ?? user.email ?? null,
        role: profileData?.role ?? "student",
      });

      const { data: studentData, error: studentError } =
        await supabase
          .from("student_profiles")
          .select("grade, goals, learning_preferences")
          .eq("id", user.id)
          .maybeSingle();

      if (studentError) {
        console.error("Student profile loading error:", studentError);
        setNotice(
          "Your account details loaded, but some student details could not be retrieved.",
        );
        return;
      }

      setStudentProfile(studentData);
    } catch (error) {
      console.error("Unexpected profile error:", error);
      setErrorMessage(
        "Something went wrong while loading your profile. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const displayName = profile?.name?.trim() || "Student";
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "S";

  return (
    <main className="min-h-screen bg-transparent px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="mb-7 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft size={17} />
          Back to Dashboard
        </Link>

        <header className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-300">
            <Sparkles size={17} />
            LearnNova Account
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            My Profile
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            View your account information, learning goals, and personalized
            learning preferences in one place.
          </p>
        </header>

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03]">
            <RefreshCw
              size={30}
              className="animate-spin text-blue-400"
            />
            <p className="mt-4 text-sm text-slate-400">
              Loading your profile...
            </p>
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={22}
                className="mt-0.5 shrink-0 text-red-300"
              />

              <div className="flex-1">
                <h2 className="font-semibold text-red-200">
                  Unable to load profile
                </h2>
                <p className="mt-2 text-sm leading-6 text-red-100/80">
                  {errorMessage}
                </p>

                <button
                  type="button"
                  onClick={() => void loadProfile()}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-500/20 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-500/30"
                >
                  <RefreshCw size={16} />
                  Try Again
                </button>

                <div className="mt-5">
                  <Link
                    href="/login"
                    className="text-sm text-blue-300 hover:text-blue-200"
                  >
                    Go to Login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <section className="relative mb-7 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/20 via-indigo-500/10 to-purple-600/20 p-6 sm:p-8">
              <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-blue-500/20 text-2xl font-bold text-blue-100 shadow-lg shadow-blue-950/30">
                  {initials}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-blue-200">
                    Welcome to your learning space
                  </p>

                  <h2 className="mt-1 break-words text-2xl font-bold sm:text-3xl">
                    {displayName}
                  </h2>

                  <p className="mt-2 break-all text-sm text-slate-300">
                    {profile?.email || "Email not available"}
                  </p>
                </div>

                <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
                  <ShieldCheck size={17} />
                  {profile?.role || "Student"}
                </div>
              </div>
            </section>

            {notice && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                <AlertCircle size={19} className="mt-0.5 shrink-0" />
                <p>{notice}</p>
              </div>
            )}

            <section className="mb-4">
              <h2 className="text-lg font-semibold">Account Information</h2>
              <p className="mt-1 text-sm text-slate-400">
                Information associated with your LearnNova account.
              </p>
            </section>

            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              <DetailCard
                icon={UserRound}
                title="Full Name"
                value={profile?.name || "Not added yet"}
                description="Your account name"
              />

              <DetailCard
                icon={Mail}
                title="Email Address"
                value={profile?.email || "Not available"}
                description="Your registered email"
              />

              <DetailCard
                icon={ShieldCheck}
                title="Account Role"
                value={profile?.role || "Student"}
                description="Your LearnNova account type"
              />

              <DetailCard
                icon={GraduationCap}
                title="Grade / Class"
                value={formatValue(studentProfile?.grade)}
                description="Your current study level"
              />
            </div>

            <section className="mb-4">
              <h2 className="text-lg font-semibold">Learning Information</h2>
              <p className="mt-1 text-sm text-slate-400">
                Your saved goals and preferences help personalize your
                learning experience.
              </p>
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
              <DetailCard
                icon={Target}
                title="Learning Goals"
                value={formatValue(studentProfile?.goals)}
                description="What you want to achieve"
              />

              <DetailCard
                icon={BookOpen}
                title="Learning Preferences"
                value={formatValue(studentProfile?.learning_preferences)}
                description="Your preferred learning approach"
              />
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div>
                <h2 className="font-semibold">Profile information</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Refresh to retrieve your latest saved information.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadProfile()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium transition hover:bg-white/10"
              >
                <RefreshCw size={16} />
                Refresh Profile
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}