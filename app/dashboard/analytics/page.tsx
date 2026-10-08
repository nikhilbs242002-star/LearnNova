"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Course = {
  id: string;
  course_id: string;
  title: string;
};

type Assignment = {
  id: string;
  title: string;
  max_points: number;
  course_id: string;
  course_title: string;
};

type Submission = {
  assignment_id: string;
  score: number;
};

type DiagnosticTest = {
  id: string;
  subject: string;
  score: number | null;
  completed_at: string | null;
};

type DiagnosticResult = {
  id: string;
  diagnostic_test_id: string;
  topic: string;
  score: number | null;
  gap_level: "low" | "medium" | "high" | null;
};

type LearningGap = {
  id: string;
  subject: string;
  topic: string;
  gap_level: "low" | "medium" | "high";
  recommendation: string | null;
};

type CoursePerformance = {
  courseId: string;
  courseTitle: string;
  earnedPoints: number;
  possiblePoints: number;
  percentage: number;
  completed: number;
  total: number;
};

export default function AnalyticsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [diagnosticTests, setDiagnosticTests] = useState<
    DiagnosticTest[]
  >([]);
  const [diagnosticResults, setDiagnosticResults] = useState<
    DiagnosticResult[]
  >([]);
  const [learningGaps, setLearningGaps] = useState<LearningGap[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadAnalytics() {
      const supabase = createClient();

      // ----------------------------------------
      // 1. Get logged-in user
      // ----------------------------------------

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("You must be logged in to view your analytics.");
        setLoading(false);
        return;
      }

      // ----------------------------------------
      // 2. Get enrolled courses
      // ----------------------------------------

      const {
        data: enrollmentData,
        error: enrollmentError,
      } = await supabase
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
        setMessage(
          `Could not load courses: ${enrollmentError.message}`
        );
        setLoading(false);
        return;
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

      // ----------------------------------------
      // 3. Get assignments
      // ----------------------------------------

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
          .select(`
            id,
            title,
            max_points,
            course_id,
            courses (
              title
            )
          `)
          .in("course_id", courseIds);

        if (assignmentError) {
          console.error(assignmentError);
          setMessage(
            `Could not load assignments: ${assignmentError.message}`
          );
          setLoading(false);
          return;
        }

        assignmentList = (assignmentData || []).map(
          (assignment) => {
            const course = assignment.courses as
              | { title: string }
              | { title: string }[]
              | null;

            let courseTitle = "Unknown Course";

            if (Array.isArray(course)) {
              courseTitle =
                course[0]?.title || "Unknown Course";
            } else {
              courseTitle =
                course?.title || "Unknown Course";
            }

            return {
              id: assignment.id,
              title: assignment.title,
              max_points: Number(assignment.max_points),
              course_id: assignment.course_id,
              course_title: courseTitle,
            };
          }
        );
      }

      setAssignments(assignmentList);

      // ----------------------------------------
      // 4. Get submissions
      // ----------------------------------------

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
          setMessage(
            `Could not load submissions: ${submissionError.message}`
          );
          setLoading(false);
          return;
        }

        submissionList = (submissionData || []).map(
          (submission) => ({
            assignment_id: submission.assignment_id,
            score: Number(submission.score),
          })
        );
      }

      setSubmissions(submissionList);

      // ----------------------------------------
      // 5. Get diagnostic tests
      // ----------------------------------------

      const {
        data: diagnosticTestData,
        error: diagnosticTestError,
      } = await supabase
        .from("diagnostic_tests")
        .select(
          "id, subject, score, completed_at"
        )
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      if (diagnosticTestError) {
        console.error(diagnosticTestError);
      } else {
        setDiagnosticTests(
          (diagnosticTestData || []).map((test) => ({
            id: test.id,
            subject: test.subject,
            score:
              test.score === null
                ? null
                : Number(test.score),
            completed_at: test.completed_at,
          }))
        );
      }

      // ----------------------------------------
      // 6. Get diagnostic results
      // ----------------------------------------

      const diagnosticIds =
        (diagnosticTestData || []).map(
          (test) => test.id
        );

      if (diagnosticIds.length > 0) {
        const {
          data: diagnosticResultData,
          error: diagnosticResultError,
        } = await supabase
          .from("diagnostic_results")
          .select(
            "id, diagnostic_test_id, topic, score, gap_level"
          )
          .in("diagnostic_test_id", diagnosticIds);

        if (diagnosticResultError) {
          console.error(diagnosticResultError);
        } else {
          setDiagnosticResults(
            (diagnosticResultData || []).map((result) => ({
              id: result.id,
              diagnostic_test_id:
                result.diagnostic_test_id,
              topic: result.topic,
              score:
                result.score === null
                  ? null
                  : Number(result.score),
              gap_level: result.gap_level,
            }))
          );
        }
      }

      // ----------------------------------------
      // 7. Get learning gaps
      // ----------------------------------------

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

    loadAnalytics();
  }, []);

  // ----------------------------------------
  // Overall assignment performance
  // ----------------------------------------

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

  const overallAssignmentPercentage =
    totalPossiblePoints > 0
      ? Math.round(
          (totalEarnedPoints / totalPossiblePoints) * 100
        )
      : 0;

  const completedAssignments = submissions.length;

  const pendingAssignments =
    assignments.length - completedAssignments;

  // ----------------------------------------
  // Course performance
  // ----------------------------------------

  const coursePerformance: CoursePerformance[] =
    courses.map((course) => {
      const courseAssignments = assignments.filter(
        (assignment) => assignment.course_id === course.id
      );

      let earnedPoints = 0;
      let possiblePoints = 0;
      let completed = 0;

      courseAssignments.forEach((assignment) => {
        const submission = submissions.find(
          (item) => item.assignment_id === assignment.id
        );

        if (submission) {
          earnedPoints += submission.score;
          possiblePoints += assignment.max_points;
          completed++;
        }
      });

      const percentage =
        possiblePoints > 0
          ? Math.round(
              (earnedPoints / possiblePoints) * 100
            )
          : 0;

      return {
        courseId: course.id,
        courseTitle: course.title,
        earnedPoints,
        possiblePoints,
        percentage,
        completed,
        total: courseAssignments.length,
      };
    });

  // ----------------------------------------
  // Latest diagnostic
  // ----------------------------------------

  const latestDiagnostic =
    diagnosticTests.length > 0
      ? diagnosticTests[0]
      : null;

  const latestDiagnosticResults =
    latestDiagnostic
      ? diagnosticResults.filter(
          (result) =>
            result.diagnostic_test_id ===
            latestDiagnostic.id
        )
      : [];

  const strongTopics = latestDiagnosticResults.filter(
    (result) =>
      result.score !== null && result.score >= 80
  );

  const mediumTopics = latestDiagnosticResults.filter(
    (result) => result.gap_level === "medium"
  );

  const highTopics = latestDiagnosticResults.filter(
    (result) => result.gap_level === "high"
  );

  // ----------------------------------------
  // Unique non-low learning gaps
  // ----------------------------------------

  const importantGaps = learningGaps.filter(
    (gap) => gap.gap_level !== "low"
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-7xl">

        {/* -------------------------------- */}
        {/* Loading */}
        {/* -------------------------------- */}

        {loading && (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="rounded-2xl border border-slate-200 bg-white px-8 py-6 text-center shadow-sm">
              <p className="text-slate-500">
                Loading your analytics...
              </p>
            </div>
          </div>
        )}

        {/* -------------------------------- */}
        {/* Error */}
        {/* -------------------------------- */}

        {!loading && message && (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="rounded-2xl border border-red-100 bg-red-50 px-8 py-6 text-center">
              <p className="text-red-600">
                {message}
              </p>

              <Link
                href="/dashboard"
                className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* -------------------------------- */}
        {/* Analytics */}
        {/* -------------------------------- */}

        {!loading && !message && (
          <>
            {/* Header */}

            <div className="mb-10">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                ← Back to Dashboard
              </Link>

              <p className="mt-6 text-sm font-medium text-blue-600">
                My Analytics
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-800 sm:text-4xl">
                Understand your progress
              </h1>

              <p className="mt-2 max-w-2xl text-slate-500">
                Review your assignment performance, diagnostic
                results, strengths, and areas that need more
                attention.
              </p>
            </div>

            {/* -------------------------------- */}
            {/* Main statistics */}
            {/* -------------------------------- */}

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

              {/* Overall performance */}

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Assignment Performance
                </p>

                <p className="mt-3 text-4xl font-bold text-slate-800">
                  {overallAssignmentPercentage}%
                </p>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{
                      width: `${overallAssignmentPercentage}%`,
                    }}
                  />
                </div>

                <p className="mt-3 text-xs text-slate-400">
                  Based on submitted assignments
                </p>
              </div>

              {/* Completed */}

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Completed
                </p>

                <p className="mt-3 text-4xl font-bold text-green-600">
                  {completedAssignments}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  of {assignments.length} assignments
                </p>
              </div>

              {/* Pending */}

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Pending
                </p>

                <p className="mt-3 text-4xl font-bold text-orange-500">
                  {pendingAssignments}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  assignments remaining
                </p>
              </div>

              {/* Diagnostic */}

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Latest Diagnostic
                </p>

                <p className="mt-3 text-4xl font-bold text-purple-600">
                  {latestDiagnostic?.score ?? 0}%
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  {latestDiagnostic?.subject ||
                    "No diagnostic yet"}
                </p>
              </div>

            </div>

            {/* -------------------------------- */}
            {/* Course Performance */}
            {/* -------------------------------- */}

            <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800">
                  Course Performance
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  See how you are performing in each enrolled
                  course.
                </p>
              </div>

              {coursePerformance.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-6 text-center">
                  <p className="text-sm text-slate-500">
                    No course performance data available yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">

                  {coursePerformance.map((course) => (
                    <div key={course.courseId}>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                        <div>
                          <h3 className="font-semibold text-slate-800">
                            {course.courseTitle}
                          </h3>

                          <p className="text-xs text-slate-400">
                            {course.completed} of{" "}
                            {course.total} assignments
                            completed
                          </p>
                        </div>

                        <p className="font-bold text-slate-800">
                          {course.percentage}%
                        </p>

                      </div>

                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{
                            width: `${course.percentage}%`,
                          }}
                        />
                      </div>

                      <p className="mt-2 text-xs text-slate-400">
                        {course.earnedPoints} earned out of{" "}
                        {course.possiblePoints} possible
                        points
                      </p>

                    </div>
                  ))}

                </div>
              )}

            </section>

            {/* -------------------------------- */}
            {/* Diagnostic Analysis */}
            {/* -------------------------------- */}

            <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800">
                  Diagnostic Analysis
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Your latest diagnostic results by topic.
                </p>
              </div>

              {!latestDiagnostic ? (
                <div className="rounded-xl bg-slate-50 p-6 text-center">
                  <p className="text-sm text-slate-500">
                    You have not completed a diagnostic test
                    yet.
                  </p>

                  <Link
                    href="/dashboard/diagnostic"
                    className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Take Diagnostic Test
                  </Link>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">

                    <div className="rounded-xl bg-green-50 p-5">
                      <p className="text-sm text-green-600">
                        Strong Topics
                      </p>

                      <p className="mt-2 text-3xl font-bold text-green-700">
                        {strongTopics.length}
                      </p>
                    </div>

                    <div className="rounded-xl bg-orange-50 p-5">
                      <p className="text-sm text-orange-600">
                        Medium Gaps
                      </p>

                      <p className="mt-2 text-3xl font-bold text-orange-700">
                        {mediumTopics.length}
                      </p>
                    </div>

                    <div className="rounded-xl bg-red-50 p-5">
                      <p className="text-sm text-red-600">
                        High Gaps
                      </p>

                      <p className="mt-2 text-3xl font-bold text-red-700">
                        {highTopics.length}
                      </p>
                    </div>

                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                    {latestDiagnosticResults.map(
                      (result) => (
                        <div
                          key={result.id}
                          className="rounded-xl border border-slate-200 p-5"
                        >

                          <div className="flex items-start justify-between gap-3">

                            <div>
                              <h3 className="font-semibold text-slate-800">
                                {result.topic}
                              </h3>

                              <p className="mt-1 text-xs text-slate-400">
                                Diagnostic topic
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                result.gap_level === "low"
                                  ? "bg-green-50 text-green-600"
                                  : result.gap_level ===
                                    "medium"
                                  ? "bg-orange-50 text-orange-600"
                                  : "bg-red-50 text-red-600"
                              }`}
                            >
                              {result.gap_level}
                            </span>

                          </div>

                          <p className="mt-5 text-3xl font-bold text-slate-800">
                            {result.score ?? 0}%
                          </p>

                        </div>
                      )
                    )}

                  </div>
                </>
              )}

            </section>

            {/* -------------------------------- */}
            {/* Learning Gaps */}
            {/* -------------------------------- */}

            <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800">
                  Areas to Improve
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Topics identified by your learning-gap
                  analysis.
                </p>
              </div>

              {importantGaps.length === 0 ? (
                <div className="rounded-xl bg-green-50 p-6">
                  <p className="font-semibold text-green-700">
                    🎉 No major learning gaps detected.
                  </p>

                  <p className="mt-1 text-sm text-green-600">
                    Your latest diagnostic results look
                    strong. Keep practicing to maintain your
                    progress.
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

                  {importantGaps
                    .slice(0, 6)
                    .map((gap) => (
                      <div
                        key={gap.id}
                        className="rounded-xl border border-slate-200 p-5"
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div>
                            <h3 className="font-semibold text-slate-800">
                              {gap.topic}
                            </h3>

                            <p className="mt-1 text-xs text-slate-400">
                              {gap.subject}
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              gap.gap_level === "high"
                                ? "bg-red-50 text-red-600"
                                : "bg-orange-50 text-orange-600"
                            }`}
                          >
                            {gap.gap_level}
                          </span>

                        </div>

                        {gap.recommendation && (
                          <p className="mt-4 text-sm leading-6 text-slate-500">
                            {gap.recommendation}
                          </p>
                        )}

                      </div>
                    ))}

                </div>
              )}

            </section>

            {/* -------------------------------- */}
            {/* Bottom navigation */}
            {/* -------------------------------- */}

            <div className="mt-8 flex flex-wrap gap-3">

              <Link
                href="/dashboard"
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                ← Dashboard
              </Link>

              <Link
                href="/dashboard/courses"
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                My Courses
              </Link>

              <Link
                href="/dashboard/assignments"
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Assignments
              </Link>

              <Link
                href="/dashboard/diagnostic"
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Take Diagnostic
              </Link>

            </div>

          </>
        )}

      </div>
    </main>
  );
}