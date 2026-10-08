"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Assignment = {
  id: string;
  assign_id: string;
  title: string;
  max_points: number;
  due_date: string | null;
  course_id: string;
  course_title: string;
  submission_score: number | null;
};

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadAssignments() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("You must be logged in to view your assignments.");
        setLoading(false);
        return;
      }

      // Get the student's enrolled courses
      const { data: enrollments, error: enrollmentError } =
        await supabase
          .from("enrollments")
          .select(`
            course_id,
            courses (
              id,
              title
            )
          `)
          .eq("student_id", user.id);

      if (enrollmentError) {
        console.error(enrollmentError);
        setMessage(
          `Could not load your courses: ${enrollmentError.message}`
        );
        setLoading(false);
        return;
      }

      const courseIds: string[] = [];

      enrollments?.forEach((enrollment) => {
        const course = enrollment.courses as
          | { id: string; title: string }
          | { id: string; title: string }[]
          | null;

        if (Array.isArray(course)) {
          course.forEach((item) => {
            if (item?.id) {
              courseIds.push(item.id);
            }
          });
        } else if (course?.id) {
          courseIds.push(course.id);
        }
      });

      if (courseIds.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      // Get assignments belonging to the student's courses
      const { data: assignmentData, error: assignmentError } =
        await supabase
          .from("assignments")
          .select(`
            id,
            assign_id,
            title,
            max_points,
            due_date,
            course_id,
            courses (
              title
            )
          `)
          .in("course_id", courseIds)
          .order("due_date", { ascending: true });

      if (assignmentError) {
        console.error(assignmentError);
        setMessage(
          `Could not load assignments: ${assignmentError.message}`
        );
        setLoading(false);
        return;
      }

      const assignmentIds =
        assignmentData?.map((assignment) => assignment.id) || [];

      // Get Reggie's submissions
      const { data: submissionData, error: submissionError } =
        await supabase
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

      // Combine assignments with their submissions
      const formattedAssignments: Assignment[] =
        (assignmentData || []).map((assignment) => {
          const submission = submissionData?.find(
            (item) => item.assignment_id === assignment.id
          );

          const course = assignment.courses as
            | { title: string }
            | { title: string }[]
            | null;

          let courseTitle = "Unknown Course";

          if (Array.isArray(course)) {
            courseTitle = course[0]?.title || "Unknown Course";
          } else {
            courseTitle = course?.title || "Unknown Course";
          }

          return {
            id: assignment.id,
            assign_id: assignment.assign_id,
            title: assignment.title,
            max_points: Number(assignment.max_points),
            due_date: assignment.due_date,
            course_id: assignment.course_id,
            course_title: courseTitle,
            submission_score:
              submission?.score !== undefined
                ? Number(submission.score)
                : null,
          };
        });

      setAssignments(formattedAssignments);
      setLoading(false);
    }

    loadAssignments();
  }, []);

  const completedCount = assignments.filter(
    (assignment) => assignment.submission_score !== null
  ).length;

  const pendingCount = assignments.length - completedCount;

  function formatDueDate(date: string | null) {
    if (!date) {
      return "No due date";
    }

    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-6xl">

        {/* Back to dashboard */}
        <Link
          href="/dashboard"
          className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
        >
          ← Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8 mt-6">
          <p className="text-sm font-medium text-blue-600">
            Assignments
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-800">
            Your assignments
          </h1>

          <p className="mt-2 max-w-2xl text-slate-500">
            Track your coursework, submission status, scores,
            and upcoming deadlines.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-slate-500">
              Loading your assignments...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && message && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-600">
              {message}
            </p>
          </div>
        )}

        {/* Assignment content */}
        {!loading && !message && (
          <>
            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-3">

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">
                  Total Assignments
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-800">
                  {assignments.length}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">
                  Completed
                </p>

                <p className="mt-2 text-3xl font-bold text-green-600">
                  {completedCount}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">
                  Pending
                </p>

                <p className="mt-2 text-3xl font-bold text-orange-500">
                  {pendingCount}
                </p>
              </div>

            </div>

            {/* No assignments */}
            {assignments.length === 0 && (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                  <span className="text-3xl">
                    📝
                  </span>
                </div>

                <h2 className="mt-5 text-xl font-semibold text-slate-800">
                  No assignments yet
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                  Assignments for your enrolled courses will
                  appear here.
                </p>
              </div>
            )}

            {/* Assignment list */}
            {assignments.length > 0 && (
              <div className="mt-8 space-y-5">

                {assignments.map((assignment) => {
                  const completed =
                    assignment.submission_score !== null;

                  return (
                    <div
                      key={assignment.id}
                      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                    >
                      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                        {/* Assignment information */}
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                              {assignment.course_title}
                            </span>

                            <span className="text-xs text-slate-400">
                              {assignment.assign_id}
                            </span>
                          </div>

                          <h2 className="mt-3 text-xl font-semibold text-slate-800">
                            {assignment.title}
                          </h2>

                          <p className="mt-2 text-sm text-slate-500">
                            Due:{" "}
                            {formatDueDate(
                              assignment.due_date
                            )}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Maximum points:{" "}
                            {assignment.max_points}
                          </p>
                        </div>

                        {/* Status */}
                        <div className="text-left md:text-right">

                          {completed ? (
                            <>
                              <span className="inline-flex rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-600">
                                ✓ Completed
                              </span>

                              <p className="mt-3 text-lg font-bold text-slate-800">
                                {assignment.submission_score}{" "}
                                /{" "}
                                {assignment.max_points}
                              </p>

                              <p className="text-sm text-slate-500">
                                Score
                              </p>
                            </>
                          ) : (
                            <>
                              <span className="inline-flex rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600">
                                ⏳ Pending
                              </span>

                              <p className="mt-3 text-sm text-slate-500">
                                Not submitted yet
                              </p>
                            </>
                          )}

                        </div>

                      </div>
                    </div>
                  );
                })}

              </div>
            )}
          </>
        )}

      </div>
    </main>
  );
}