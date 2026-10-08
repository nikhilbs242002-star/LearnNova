"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import LearnNovaIntro from "@/components/dashboard/LearnNovaIntro";
import PersonalizedRecommendation from "@/components/dashboard/PersonalizedRecommendation";

type Profile = {
  name: string;
  email: string;
};

type StudentProfile = {
  grade: string;
};

type Course = {
  id: string;
  course_id: string;
  title: string;
};

type Assignment = {
  id: string;
  max_points: number;
};

type Submission = {
  assignment_id: string;
  score: number;
};

type LearningGap = {
  id: string;
  subject: string;
  topic: string;
  gap_level: "low" | "medium" | "high";
  recommendation: string | null;
};

export default function DashboardPage() {
  const [showIntro, setShowIntro] = useState(true);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [studentProfile, setStudentProfile] =
    useState<StudentProfile | null>(null);

  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [learningGaps, setLearningGaps] = useState<LearningGap[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("You must be logged in to view the dashboard.");
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select("name, email")
          .eq("id", user.id)
          .single();

      if (profileError) {
        console.error(profileError);
      } else {
        setProfile(profileData);
      }

      const {
        data: studentProfileData,
        error: studentProfileError,
      } = await supabase
        .from("student_profiles")
        .select("grade")
        .eq("id", user.id)
        .single();

      if (studentProfileError) {
        console.error(studentProfileError);
      } else {
        setStudentProfile(studentProfileData);
      }

      const { data: enrollmentData, error: enrollmentError } =
        await supabase
          .from("enrollments")
          .select(`
            course_id,
            courses (
              id,
              course_id,
              title
            )
          `)
          .eq("student_id", user.id);

      if (enrollmentError) {
        console.error(enrollmentError);
      }

      const enrolledCourses: Course[] = [];

      enrollmentData?.forEach((enrollment) => {
        const course = enrollment.courses as
          | Course
          | Course[]
          | null;

        if (Array.isArray(course)) {
          course.forEach((item) => {
            if (item) {
              enrolledCourses.push(item);
            }
          });
        } else if (course) {
          enrolledCourses.push(course);
        }
      });

      setCourses(enrolledCourses);

      const courseIds = enrolledCourses.map(
        (course) => course.id
      );

      let assignmentList: Assignment[] = [];

      if (courseIds.length > 0) {
        const {
          data: assignmentData,
          error: assignmentError,
        } = await supabase
          .from("assignments")
          .select("id, max_points")
          .in("course_id", courseIds);

        if (assignmentError) {
          console.error(assignmentError);
        } else {
          assignmentList = (assignmentData || []).map(
            (assignment) => ({
              id: assignment.id,
              max_points: Number(assignment.max_points),
            })
          );
        }
      }

      setAssignments(assignmentList);

      let submissionList: Submission[] = [];

      if (assignmentList.length > 0) {
        const assignmentIds = assignmentList.map(
          (assignment) => assignment.id
        );

        const {
          data: submissionData,
          error: submissionError,
        } = await supabase
          .from("submissions")
          .select("assignment_id, score")
          .eq("student_id", user.id)
          .in("assignment_id", assignmentIds);

        if (submissionError) {
          console.error(submissionError);
        } else {
          submissionList = (submissionData || []).map(
            (submission) => ({
              assignment_id: submission.assignment_id,
              score: Number(submission.score),
            })
          );
        }
      }

      setSubmissions(submissionList);

      const {
        data: learningGapData,
        error: learningGapError,
      } = await supabase
        .from("learning_gaps")
        .select(
          "id, subject, topic, gap_level, recommendation"
        )
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      if (learningGapError) {
        console.error(learningGapError);
      } else {
        setLearningGaps(learningGapData || []);
      }

      setLoading(false);
    }

    loadDashboard();
  }, []);

  const totalAssignments = assignments.length;

  const completedAssignments = submissions.length;

  const pendingAssignments =
    totalAssignments - completedAssignments;

  let totalEarnedPoints = 0;
  let totalPossiblePoints = 0;

  submissions.forEach((submission) => {
    const assignment = assignments.find(
      (item) => item.id === submission.assignment_id
    );

    if (assignment) {
      totalEarnedPoints += submission.score;
      totalPossiblePoints += assignment.max_points;
    }
  });

  const overallProgress =
    totalPossiblePoints > 0
      ? Math.round(
          (totalEarnedPoints / totalPossiblePoints) * 100
        )
      : 0;

  const nonLowGaps = learningGaps.filter(
    (gap) => gap.gap_level !== "low"
  );

  return (
    <>
      {showIntro && (
        <LearnNovaIntro
          onComplete={() => setShowIntro(false)}
        />
      )}

      <main className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl" />

          <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-purple-200/25 blur-3xl" />

          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-200/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          {/* Loading */}
          {loading && (
            <div className="flex min-h-[70vh] items-center justify-center">
              <div className="animate-pulse rounded-3xl border border-slate-200 bg-white px-10 py-8 text-center shadow-xl shadow-slate-200/40">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-blue-100" />

                <div className="mx-auto mt-5 h-4 w-40 rounded-full bg-slate-100" />

                <p className="mt-4 text-sm text-slate-400">
                  Preparing your learning space...
                </p>
              </div>
            </div>
          )}

          {/* Login error */}
          {!loading && message && (
            <div className="flex min-h-[70vh] items-center justify-center">
              <div className="rounded-3xl border border-red-100 bg-white px-10 py-8 text-center shadow-xl shadow-red-100/30">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl">
                  !
                </div>

                <p className="mt-5 font-medium text-red-600">
                  {message}
                </p>

                <Link
                  href="/login"
                  className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200"
                >
                  Go to Login
                </Link>
              </div>
            </div>
          )}

          {!loading && !message && (
            <>
              {/* Hero */}
              <section className="animate-[fadeIn_0.7s_ease-out]">
                <div className="mb-8 overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl sm:p-8 lg:p-10">
                  <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-3xl">
                      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />

                        LearnNova Student Dashboard
                      </div>

                      <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                        Welcome back{" "}
                        <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                          {profile?.name || "Student"}
                        </span>

                        <span className="ml-2 inline-block animate-bounce">
                          👋
                        </span>
                      </h1>

                      <p className="mt-5 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg">
                        Your personalized learning space is ready.
                        Track your progress, discover learning gaps,
                        and get intelligent guidance from LearnNova.
                      </p>

                      {studentProfile?.grade && (
                        <div className="mt-5 inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
                          🎓 {studentProfile.grade}
                        </div>
                      )}
                    </div>

                    {/* Learning status */}
                    <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-6 text-white shadow-xl shadow-blue-200/50 lg:min-w-[250px]">
                      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10" />

                      <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-white/10" />

                      <div className="relative">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">
                          Learning Status
                        </p>

                        <p className="mt-3 text-2xl font-bold">
                          {overallProgress >= 80
                            ? "Excellent progress"
                            : overallProgress >= 60
                            ? "Good progress"
                            : "Keep practicing"}
                        </p>

                        <div className="mt-5 flex items-center gap-3">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/20">
                            <div
                              className="h-full rounded-full bg-white transition-all duration-1000"
                              style={{
                                width: `${overallProgress}%`,
                              }}
                            />
                          </div>

                          <span className="text-sm font-bold">
                            {overallProgress}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Stats */}
              <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {/* Progress */}
                <div className="group rounded-3xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-200/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-100/50">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-xl transition-transform duration-300 group-hover:scale-110">
                      📈
                    </div>

                    <span className="text-xs font-semibold text-slate-400">
                      PERFORMANCE
                    </span>
                  </div>

                  <p className="mt-6 text-sm font-medium text-slate-500">
                    Overall Progress
                  </p>

                  <p className="mt-1 text-4xl font-black tracking-tight text-slate-900">
                    {overallProgress}%
                  </p>

                  <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000"
                      style={{
                        width: `${overallProgress}%`,
                      }}
                    />
                  </div>

                  <p className="mt-3 text-xs text-slate-400">
                    Based on submitted assignments
                  </p>
                </div>

                {/* Courses */}
                <div className="group rounded-3xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-200/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-100/50">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-xl transition-transform duration-300 group-hover:scale-110">
                      📚
                    </div>

                    <span className="text-xs font-semibold text-slate-400">
                      LEARNING
                    </span>
                  </div>

                  <p className="mt-6 text-sm font-medium text-slate-500">
                    Courses
                  </p>

                  <p className="mt-1 text-4xl font-black tracking-tight text-slate-900">
                    {courses.length}
                  </p>

                  <p className="mt-3 text-sm text-slate-500">
                    Currently enrolled
                  </p>

                  <Link
                    href="/dashboard/courses"
                    className="mt-5 inline-flex text-sm font-bold text-indigo-600 transition hover:translate-x-1 hover:text-indigo-700"
                  >
                    View courses →
                  </Link>
                </div>

                {/* Assignments */}
                <div className="group rounded-3xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-200/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-100/50">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-xl transition-transform duration-300 group-hover:scale-110">
                      📝
                    </div>

                    <span className="text-xs font-semibold text-slate-400">
                      TASKS
                    </span>
                  </div>

                  <p className="mt-6 text-sm font-medium text-slate-500">
                    Assignments
                  </p>

                  <p className="mt-1 text-4xl font-black tracking-tight text-slate-900">
                    {totalAssignments}
                  </p>

                  <p className="mt-3 text-sm text-slate-500">
                    <span className="font-semibold text-orange-600">
                      {pendingAssignments}
                    </span>{" "}
                    pending
                  </p>

                  <Link
                    href="/dashboard/assignments"
                    className="mt-5 inline-flex text-sm font-bold text-orange-600 transition hover:translate-x-1 hover:text-orange-700"
                  >
                    View assignments →
                  </Link>
                </div>

                {/* Gaps */}
                <div className="group rounded-3xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-200/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-100/50">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-xl transition-transform duration-300 group-hover:scale-110">
                      🎯
                    </div>

                    <span className="text-xs font-semibold text-slate-400">
                      AI INSIGHT
                    </span>
                  </div>

                  <p className="mt-6 text-sm font-medium text-slate-500">
                    Learning Gaps
                  </p>

                  <p className="mt-1 text-4xl font-black tracking-tight text-slate-900">
                    {nonLowGaps.length}
                  </p>

                  <p className="mt-3 text-sm text-slate-500">
                    {nonLowGaps.length === 0
                      ? "All topics looking good"
                      : "Topics need more practice"}
                  </p>

                  <Link
                    href="/dashboard/diagnostic"
                    className="mt-5 inline-flex text-sm font-bold text-purple-600 transition hover:translate-x-1 hover:text-purple-700"
                  >
                    Check diagnosis →
                  </Link>
                </div>
              </section>

              {/* Personalized Learning Recommendation */}
              <section className="mt-8">
                <PersonalizedRecommendation
                  learningGaps={learningGaps}
                  pendingAssignments={pendingAssignments}
                />
              </section>

              {/* AI Features */}
              <section className="mt-8 grid gap-6 lg:grid-cols-2">
                {/* Diagnosis */}
                <Link
                  href="/dashboard/diagnostic"
                  className="group relative overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-8 text-white shadow-xl shadow-blue-200/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-300/50"
                >
                  <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 transition-transform duration-700 group-hover:scale-125" />

                  <div className="absolute bottom-0 right-20 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />

                  <div className="relative">
                    <div className="flex items-start justify-between">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-2xl backdrop-blur">
                        🎯
                      </div>

                      <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                        AI Powered
                      </span>
                    </div>

                    <h2 className="mt-7 text-3xl font-black">
                      AI Gap Diagnosis
                    </h2>

                    <p className="mt-3 max-w-xl leading-7 text-blue-100">
                      Discover the topics where you may need more
                      practice. LearnNova analyzes your performance
                      and helps identify where to focus next.
                    </p>

                    <div className="mt-7 inline-flex items-center rounded-xl bg-white px-5 py-3 font-bold text-blue-700 shadow-lg transition-all duration-300 group-hover:translate-x-1">
                      Start diagnosis
                      <span className="ml-2">→</span>
                    </div>
                  </div>
                </Link>

                {/* AI Tutor */}
                <Link
                  href="/dashboard/chat"
                  className="group relative overflow-hidden rounded-[2rem] border border-purple-100 bg-gradient-to-br from-purple-600 via-violet-600 to-fuchsia-600 p-8 text-white shadow-xl shadow-purple-200/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-300/50"
                >
                  <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 transition-transform duration-700 group-hover:scale-125" />

                  <div className="absolute bottom-0 left-20 h-32 w-32 rounded-full bg-pink-300/10 blur-2xl" />

                  <div className="relative">
                    <div className="flex items-start justify-between">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-2xl backdrop-blur">
                        🤖
                      </div>

                      <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                        AI Tutor
                      </span>
                    </div>

                    <h2 className="mt-7 text-3xl font-black">
                      Learn with AI
                    </h2>

                    <p className="mt-3 max-w-xl leading-7 text-purple-100">
                      Ask questions, understand difficult concepts,
                      and receive personalized guidance based on
                      your learning progress.
                    </p>

                    <div className="mt-7 inline-flex items-center rounded-xl bg-white px-5 py-3 font-bold text-purple-700 shadow-lg transition-all duration-300 group-hover:translate-x-1">
                      Start chatting
                      <span className="ml-2">→</span>
                    </div>
                  </div>
                </Link>
              </section>

              {/* Continue learning */}
              <section className="mt-10">
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
                      Your workspace
                    </p>

                    <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
                      Continue learning
                    </h2>
                  </div>

                  <p className="text-sm text-slate-400">
                    Everything you need in one place
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Analytics */}
                  <Link
                    href="/dashboard/analytics"
                    className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/30 transition-all duration-300 hover:-translate-y-1 hover:border-green-200 hover:shadow-xl hover:shadow-green-100/50"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-xl transition-transform duration-300 group-hover:scale-110">
                      📊
                    </div>

                    <h3 className="mt-5 text-lg font-bold text-slate-800">
                      My Analytics
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      See your scores, progress, strengths,
                      and areas that need improvement.
                    </p>

                    <p className="mt-5 text-sm font-bold text-green-600 transition group-hover:translate-x-1">
                      View analytics →
                    </p>
                  </Link>

                  {/* Courses */}
                  <Link
                    href="/dashboard/courses"
                    className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/30 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/50"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl transition-transform duration-300 group-hover:scale-110">
                      📚
                    </div>

                    <h3 className="mt-5 text-lg font-bold text-slate-800">
                      My Courses
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Explore your enrolled courses and
                      continue your learning journey.
                    </p>

                    <p className="mt-5 text-sm font-bold text-blue-600 transition group-hover:translate-x-1">
                      View courses →
                    </p>
                  </Link>

                  {/* Assignments */}
                  <Link
                    href="/dashboard/assignments"
                    className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/30 transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-100/50"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-xl transition-transform duration-300 group-hover:scale-110">
                      📝
                    </div>

                    <h3 className="mt-5 text-lg font-bold text-slate-800">
                      Assignments
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Check upcoming assignments and track
                      your completed work.
                    </p>

                    <p className="mt-5 text-sm font-bold text-orange-600 transition group-hover:translate-x-1">
                      View assignments →
                    </p>
                  </Link>

                  {/* Teacher */}
                  <Link
                    href="/dashboard/help"
                    className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/30 transition-all duration-300 hover:-translate-y-1 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-100/50"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-xl transition-transform duration-300 group-hover:scale-110">
                      👩‍🏫
                    </div>

                    <h3 className="mt-5 text-lg font-bold text-slate-800">
                      Ask a Teacher
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Still stuck? Send a help request to a
                      teacher for human guidance.
                    </p>

                    <p className="mt-5 text-sm font-bold text-purple-600 transition group-hover:translate-x-1">
                      Ask for help →
                    </p>
                  </Link>
                </div>
              </section>

              {/* Learning Areas */}
              <section className="mt-10 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-lg shadow-slate-200/30">
                <div className="border-b border-slate-100 p-7 sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-xl text-white shadow-lg shadow-blue-200">
                          🧠
                        </div>

                        <div>
                          <h2 className="text-2xl font-black text-slate-900">
                            Your learning areas
                          </h2>

                          <p className="mt-1 text-sm text-slate-500">
                            Based on your latest diagnostic results.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Link
                      href="/dashboard/diagnostic"
                      className="inline-flex items-center rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-600 transition hover:bg-blue-100"
                    >
                      Take another diagnosis →
                    </Link>
                  </div>
                </div>

                <div className="p-7 sm:p-8">
                  {nonLowGaps.length === 0 ? (
                    <div className="relative overflow-hidden rounded-2xl border border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 p-6">
                      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-green-200/30 blur-2xl" />

                      <div className="relative">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                          🎉
                        </div>

                        <p className="mt-4 text-lg font-bold text-green-700">
                          All topics are looking good!
                        </p>

                        <p className="mt-1 text-sm leading-6 text-green-600">
                          Keep practicing and continue building
                          your understanding.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {nonLowGaps.slice(0, 6).map((gap) => (
                        <div
                          key={gap.id}
                          className="group rounded-2xl border border-slate-200 bg-slate-50/70 p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lg"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="font-bold text-slate-800">
                              {gap.topic}
                            </h3>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                                gap.gap_level === "high"
                                  ? "bg-red-50 text-red-600"
                                  : "bg-orange-50 text-orange-600"
                              }`}
                            >
                              {gap.gap_level}
                            </span>
                          </div>

                          <p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                            {gap.subject}
                          </p>

                          {gap.recommendation && (
                            <p className="mt-4 text-sm leading-6 text-slate-500">
                              {gap.recommendation}
                            </p>
                          )}

                          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full ${
                                gap.gap_level === "high"
                                  ? "w-5/6 bg-red-400"
                                  : "w-1/2 bg-orange-400"
                              }`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Bottom spacing */}
              <div className="h-8" />
            </>
          )}
        </div>

        {/* Dashboard animation */}
        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(12px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </main>
    </>
  );
}