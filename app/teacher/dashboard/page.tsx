"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Student = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type HelpRequest = {
  id: string;
  student_id: string;
  teacher_id: string | null;
  subject: string | null;
  topic: string | null;
  message: string;
  status: "pending" | "accepted" | "resolved";
  teacher_response: string | null;
  created_at: string;
  resolved_at: string | null;
  student: Student | null;
};

type Teacher = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function TeacherDashboardPage() {
  const supabase = createClient();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRequest, setSelectedRequest] =
    useState<HelpRequest | null>(null);
  const [responseText, setResponseText] = useState("");
  const [updating, setUpdating] = useState(false);

  async function getAccessToken() {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Supabase session error:", sessionError);
    }

    if (session?.access_token) {
      return session.access_token;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("Supabase user error:", userError);
    }

    if (!user) {
      return null;
    }

    const {
      data: { session: refreshedSession },
      error: refreshedSessionError,
    } = await supabase.auth.getSession();

    if (refreshedSessionError) {
      console.error(
        "Supabase refreshed session error:",
        refreshedSessionError
      );
    }

    return refreshedSession?.access_token || null;
  }

  async function loadRequests() {
    try {
      setLoading(true);
      setError("");

      let accessToken = await getAccessToken();

      if (!accessToken) {
        const {
          data: refreshed,
          error: refreshError,
        } = await supabase.auth.refreshSession();

        if (refreshError) {
          console.error("Session refresh error:", refreshError);
        }

        accessToken = refreshed.session?.access_token || null;
      }

      if (!accessToken) {
        throw new Error(
          "Your teacher session is not available. Please log in again."
        );
      }

      const response = await fetch("/api/teacher/requests", {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not load teacher requests."
        );
      }

      setTeacher(data.teacher || null);
      setRequests(
        Array.isArray(data.requests) ? data.requests : []
      );
    } catch (err) {
      console.error("Teacher dashboard error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not load teacher dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const pendingRequests = useMemo(
    () =>
      requests.filter(
        (request) => request.status === "pending"
      ),
    [requests]
  );

  const acceptedRequests = useMemo(
    () =>
      requests.filter(
        (request) => request.status === "accepted"
      ),
    [requests]
  );

  const resolvedRequests = useMemo(
    () =>
      requests.filter(
        (request) => request.status === "resolved"
      ),
    [requests]
  );

  async function updateRequest(
    requestId: string,
    status: "pending" | "accepted" | "resolved",
    teacherResponse?: string
  ) {
    try {
      setUpdating(true);
      setError("");

      const accessToken = await getAccessToken();

      if (!accessToken) {
        throw new Error(
          "Your teacher session has expired. Please log in again."
        );
      }

      const response = await fetch("/api/teacher/requests", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          requestId,
          status,
          teacherResponse,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not update request."
        );
      }

      setRequests((current) =>
        current.map((item) =>
          item.id === requestId
            ? {
                ...item,
                ...data.request,
              }
            : item
        )
      );

      if (selectedRequest?.id === requestId) {
        setSelectedRequest({
          ...selectedRequest,
          ...data.request,
        });
      }

      if (status === "resolved") {
        setResponseText("");
      }
    } catch (err) {
      console.error("Request update error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not update the request."
      );
    } finally {
      setUpdating(false);
    }
  }

  function openRequest(request: HelpRequest) {
    setSelectedRequest(request);
    setResponseText(request.teacher_response || "");
    setError("");
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      {/* Background atmosphere */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute right-[-10rem] top-[20%] h-[30rem] w-[30rem] rounded-full bg-purple-600/10 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-[25%] h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Header */}
        <header className="mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/20 backdrop-blur-2xl">
          <div className="relative p-6 sm:p-8">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
                  <GraduationCap className="h-7 w-7" />
                </div>

                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <p className="text-sm font-semibold text-blue-300">
                      LearnNova
                    </p>

                    <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-300">
                      Teacher
                    </span>
                  </div>

                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Teacher Dashboard
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                    Help students move forward by answering the questions
                    they need a human teacher to solve.
                  </p>
                </div>
              </div>

              {teacher && (
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                    <Users className="h-5 w-5 text-blue-300" />
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      Signed in as
                    </p>

                    <p className="font-semibold text-white">
                      {teacher.name}
                    </p>

                    <p className="text-xs text-slate-500">
                      {teacher.email}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-200 shadow-lg shadow-red-950/10">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Something went wrong
              </p>

              <p className="mt-1 text-sm text-red-300">
                {error}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[500px] items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-slate-400">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
              </div>

              <p className="text-sm">
                Loading teacher dashboard...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<MessageCircle className="h-5 w-5" />}
                label="Total Requests"
                value={requests.length}
                description="All student questions"
              />

              <StatCard
                icon={<Clock3 className="h-5 w-5" />}
                label="Pending"
                value={pendingRequests.length}
                description="Waiting for attention"
                highlight={pendingRequests.length > 0}
              />

              <StatCard
                icon={<Users className="h-5 w-5" />}
                label="In Progress"
                value={acceptedRequests.length}
                description="Currently being handled"
              />

              <StatCard
                icon={<CheckCircle2 className="h-5 w-5" />}
                label="Resolved"
                value={resolvedRequests.length}
                description="Successfully answered"
              />
            </section>

            {/* Main workspace */}
            <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_430px]">
              {/* Requests */}
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/10 backdrop-blur-2xl sm:p-6">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">
                        Student Help Requests
                      </h2>

                      {pendingRequests.length > 0 && (
                        <span className="rounded-full bg-blue-500/15 px-2 py-1 text-xs font-semibold text-blue-300">
                          {pendingRequests.length} new
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      Questions escalated from the LearnNova AI tutor.
                    </p>
                  </div>

                  <button
                    onClick={loadRequests}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.09] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>

                {requests.length === 0 ? (
                  <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10 px-6 text-center">
                    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10">
                      <MessageCircle className="h-7 w-7 text-blue-300" />
                    </div>

                    <h3 className="font-semibold text-slate-200">
                      No help requests yet
                    </h3>

                    <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                      When a student asks the AI tutor for teacher help,
                      their question will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.map((request) => (
                      <button
                        key={request.id}
                        onClick={() => openRequest(request)}
                        className={`group w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
                          selectedRequest?.id === request.id
                            ? "border-blue-400/40 bg-blue-500/[0.10] shadow-lg shadow-blue-950/20"
                            : "border-white/10 bg-white/[0.025] hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.055]"
                        }`}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="mb-3 flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 ring-1 ring-white/5">
                                <GraduationCap className="h-4 w-4 text-blue-300" />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-semibold text-white">
                                  {request.student?.name ||
                                    "Unknown student"}
                                </p>

                                <p className="truncate text-xs text-slate-500">
                                  {request.student?.email ||
                                    "No email available"}
                                </p>
                              </div>
                            </div>

                            <p className="line-clamp-2 text-sm leading-6 text-slate-300">
                              {request.message}
                            </p>

                            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                              <Clock3 className="h-3.5 w-3.5" />
                              {formatDate(request.created_at)}
                            </div>
                          </div>

                          <StatusBadge status={request.status} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Detail panel */}
              <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/10 backdrop-blur-2xl sm:p-6">
                {selectedRequest ? (
                  <>
                    <div className="mb-6 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-purple-300" />

                          <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">
                            Student request
                          </p>
                        </div>

                        <h2 className="truncate text-xl font-bold">
                          {selectedRequest.student?.name ||
                            "Unknown student"}
                        </h2>

                        <p className="mt-1 truncate text-xs text-slate-500">
                          {selectedRequest.student?.email}
                        </p>
                      </div>

                      <button
                        onClick={() => setSelectedRequest(null)}
                        className="rounded-xl p-2 text-slate-500 transition hover:bg-white/10 hover:text-white"
                        aria-label="Close request"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Question */}
                    <div className="mb-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Student question
                        </span>

                        <StatusBadge
                          status={selectedRequest.status}
                        />
                      </div>

                      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">
                        {selectedRequest.message}
                      </p>
                    </div>

                    {/* Pending */}
                    {selectedRequest.status === "pending" && (
                      <div>
                        <div className="mb-4 rounded-2xl border border-amber-400/10 bg-amber-500/[0.06] p-4">
                          <div className="flex gap-3">
                            <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />

                            <div>
                              <p className="text-sm font-semibold text-amber-200">
                                Waiting for teacher attention
                              </p>

                              <p className="mt-1 text-xs leading-5 text-amber-200/60">
                                Accept this request when you are ready
                                to review the student&apos;s question.
                              </p>
                            </div>
                          </div>
                        </div>

                        <button
                          disabled={updating}
                          onClick={() =>
                            updateRequest(
                              selectedRequest.id,
                              "accepted"
                            )
                          }
                          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 font-semibold shadow-lg shadow-blue-950/20 transition hover:-translate-y-0.5 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {updating ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <MessageCircle className="h-5 w-5" />
                          )}

                          Accept Request
                        </button>
                      </div>
                    )}

                    {/* Accepted */}
                    {selectedRequest.status === "accepted" && (
                      <>
                        <div className="mb-4 rounded-2xl border border-blue-400/10 bg-blue-500/[0.06] p-4">
                          <div className="flex gap-3">
                            <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />

                            <div>
                              <p className="text-sm font-semibold text-blue-200">
                                You are helping this student
                              </p>

                              <p className="mt-1 text-xs leading-5 text-blue-200/60">
                                Write a thoughtful response. It will be
                                shown directly to the student.
                              </p>
                            </div>
                          </div>
                        </div>

                        <label className="mb-2 block text-sm font-semibold text-slate-200">
                          Teacher response
                        </label>

                        <textarea
                          value={responseText}
                          onChange={(event) =>
                            setResponseText(event.target.value)
                          }
                          placeholder="Write a helpful response for the student..."
                          rows={8}
                          className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white outline-none placeholder:text-slate-600 transition focus:border-blue-400/40 focus:ring-2 focus:ring-blue-500/10"
                        />

                        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                          <span>
                            {responseText.length} characters
                          </span>

                          <span>
                            The student will see this response.
                          </span>
                        </div>

                        <button
                          disabled={
                            updating ||
                            responseText.trim().length === 0
                          }
                          onClick={() =>
                            updateRequest(
                              selectedRequest.id,
                              "resolved",
                              responseText
                            )
                          }
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3.5 font-semibold shadow-lg shadow-purple-950/20 transition hover:-translate-y-0.5 hover:from-blue-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {updating ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Send className="h-5 w-5" />
                          )}

                          Send Response & Resolve
                        </button>
                      </>
                    )}

                    {/* Resolved */}
                    {selectedRequest.status === "resolved" && (
                      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.08] p-5">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                            <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                          </div>

                          <div>
                            <p className="font-semibold text-emerald-200">
                              Request resolved
                            </p>

                            <p className="text-xs text-emerald-200/50">
                              The student can now see your response.
                            </p>
                          </div>
                        </div>

                        <div className="rounded-xl border border-emerald-400/10 bg-black/10 p-4">
                          <p className="whitespace-pre-wrap text-sm leading-6 text-emerald-100/90">
                            {selectedRequest.teacher_response ||
                              "No teacher response was recorded."}
                          </p>
                        </div>

                        {selectedRequest.resolved_at && (
                          <p className="mt-3 text-xs text-emerald-200/40">
                            Resolved{" "}
                            {formatDate(
                              selectedRequest.resolved_at
                            )}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex min-h-[500px] flex-col items-center justify-center text-center">
                    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 ring-1 ring-white/5">
                      <MessageCircle className="h-7 w-7 text-blue-300" />
                    </div>

                    <h2 className="text-lg font-bold">
                      Select a request
                    </h2>

                    <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                      Choose a student request from the list to review
                      their question and provide help.
                    </p>

                    <div className="mt-6 flex items-center gap-2 text-xs text-slate-600">
                      <Sparkles className="h-3.5 w-3.5" />
                      Your guidance can make a difference.
                    </div>
                  </div>
                )}
              </aside>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  description,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`group rounded-3xl border p-5 shadow-xl shadow-black/10 backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 ${
        highlight
          ? "border-amber-400/20 bg-amber-500/[0.06]"
          : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            highlight
              ? "bg-amber-500/10 text-amber-300"
              : "bg-blue-500/10 text-blue-300"
          }`}
        >
          {icon}
        </div>

        {highlight && (
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
        )}
      </div>

      <p className="mt-5 text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-3xl font-bold tracking-tight text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-600">
        {description}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: HelpRequest["status"];
}) {
  if (status === "pending") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300">
        <Clock3 className="h-3.5 w-3.5" />
        Pending
      </span>
    );
  }

  if (status === "accepted") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-300">
        <MessageCircle className="h-3.5 w-3.5" />
        In progress
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Resolved
    </span>
  );
}