"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Course = {
  id: string;
  course_id: string;
  title: string;
  teacher_id: string | null;
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadCourses() {
      const supabase = createClient();

      // Get the currently logged-in student
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("You must be logged in to view your courses.");
        setLoading(false);
        return;
      }

      // Get courses through the student's enrollments
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          course_id,
          courses (
            id,
            course_id,
            title,
            teacher_id
          )
        `)
        .eq("student_id", user.id);

      if (error) {
        console.error(error);

        setMessage(
          `Could not load your courses: ${error.message}`
        );

        setLoading(false);
        return;
      }

      // Convert enrollment results into a simple course list
      const enrolledCourses: Course[] = [];

      data?.forEach((enrollment) => {
        const course = enrollment.courses as Course | Course[] | null;

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
      setLoading(false);
    }

    loadCourses();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-6xl">

        {/* Back button */}
        <Link
          href="/dashboard"
          className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
        >
          ← Back to Dashboard
        </Link>

        {/* Page heading */}
        <div className="mb-8 mt-6">
          <p className="text-sm font-medium text-blue-600">
            My Courses
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-800">
            Your enrolled courses
          </h1>

          <p className="mt-2 max-w-2xl text-slate-500">
            These are the courses you are currently enrolled in.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-slate-500">
              Loading your courses...
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

        {/* No enrolled courses */}
        {!loading && !message && courses.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
              <span className="text-3xl">📚</span>
            </div>

            <h2 className="mt-5 text-xl font-semibold text-slate-800">
              You are not enrolled in any courses yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Once you are enrolled in a course, it will appear here.
            </p>

            <Link
              href="/dashboard"
              className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Return to Dashboard
            </Link>
          </div>
        )}

        {/* Enrolled courses */}
        {!loading && !message && courses.length > 0 && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">
                  Your Courses
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {courses.length} enrolled{" "}
                  {courses.length === 1 ? "course" : "courses"}
                </p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"
                >
                  {/* Top section */}
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                      <span className="text-2xl">
                        📘
                      </span>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {course.course_id}
                    </span>
                  </div>

                  {/* Course title */}
                  <h3 className="mt-6 text-xl font-semibold text-slate-800">
                    {course.title}
                  </h3>

                  {/* Description */}
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Continue learning, complete assignments,
                    and track your progress in this course.
                  </p>

                  {/* Course button */}
                  <button
                    type="button"
                    className="mt-6 w-full rounded-xl border border-blue-200 bg-blue-50 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-100"
                  >
                    View Course
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </main>
  );
}