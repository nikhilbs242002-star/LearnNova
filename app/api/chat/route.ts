import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { Agent, fetch as undiciFetch } from "undici";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const OPENAI_TIMEOUT = 60_000;
const MAX_HISTORY_MESSAGES = 10;
const MAX_LEARNING_GAPS = 5;
const MAX_PENDING_ASSIGNMENTS = 8;

/*
 * ------------------------------------------------------------
 * OPENAI FETCH TRANSPORT
 * ------------------------------------------------------------
 *
 * Undici 8 has its own Request/Response types, while the
 * OpenAI SDK expects the standard Fetch API types.
 *
 * The unknown cast intentionally bridges those compatible
 * runtime implementations without changing the actual
 * network transport.
 *
 * ------------------------------------------------------------
 */

const openaiFetch: typeof globalThis.fetch = (
  input,
  init
) => {
  return undiciFetch(
    input as Parameters<typeof undiciFetch>[0],
    init as Parameters<typeof undiciFetch>[1]
  ) as unknown as Promise<Response>;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: OPENAI_TIMEOUT,
  maxRetries: 0,
  fetch: openaiFetch,
  fetchOptions: {
    dispatcher: new Agent({
      headersTimeout: OPENAI_TIMEOUT,
      bodyTimeout: OPENAI_TIMEOUT,
    }),
  },
});

/*
 * ------------------------------------------------------------
 * HELPERS
 * ------------------------------------------------------------
 */

function cleanMessage(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function extractMessage(response: unknown): string {
  if (!response || typeof response !== "object") {
    return "";
  }

  const data = response as {
    output_text?: unknown;
    output?: unknown;
  };

  if (typeof data.output_text === "string") {
    return data.output_text.trim();
  }

  if (Array.isArray(data.output)) {
    const parts: string[] = [];

    for (const item of data.output) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const itemObject = item as {
        content?: unknown;
      };

      if (!Array.isArray(itemObject.content)) {
        continue;
      }

      for (const content of itemObject.content) {
        if (!content || typeof content !== "object") {
          continue;
        }

        const contentObject = content as {
          text?: unknown;
        };

        if (typeof contentObject.text === "string") {
          parts.push(contentObject.text);
        }
      }
    }

    return parts.join("\n").trim();
  }

  return "";
}

/*
 * ------------------------------------------------------------
 * POST /api/chat
 * ------------------------------------------------------------
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const message = cleanMessage(body?.message);
    const sessionId = cleanMessage(body?.sessionId);

    /*
     * ----------------------------------------------------------
     * VALIDATION
     * ----------------------------------------------------------
     */

    if (!message) {
      return NextResponse.json(
        {
          error: "Message is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        {
          error: "Session ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: "OpenAI API key is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * ----------------------------------------------------------
     * SUPABASE AUTH
     * ----------------------------------------------------------
     */

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "You must be logged in.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * ----------------------------------------------------------
     * VERIFY CHAT SESSION
     * ----------------------------------------------------------
     */

    const {
      data: session,
      error: sessionError,
    } = await supabase
      .from("chat_sessions")
      .select("id, student_id")
      .eq("id", sessionId)
      .eq("student_id", user.id)
      .maybeSingle();

    if (sessionError) {
      console.error(
        "Chat session lookup error:",
        sessionError
      );

      return NextResponse.json(
        {
          error: "Unable to verify chat session.",
        },
        {
          status: 500,
        }
      );
    }

    if (!session) {
      return NextResponse.json(
        {
          error: "Chat session not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ----------------------------------------------------------
     * STUDENT PROFILE
     * ----------------------------------------------------------
     */

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("id, name, email, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Profile lookup error:",
        profileError
      );
    }

    const {
      data: studentProfile,
      error: studentProfileError,
    } = await supabase
      .from("student_profiles")
      .select(
        "id, student_id, grade, goals, learning_preferences"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (studentProfileError) {
      console.error(
        "Student profile lookup error:",
        studentProfileError
      );
    }

    const studentName = profile?.name || "Student";

    /*
     * ----------------------------------------------------------
     * LEARNING GAPS
     * ----------------------------------------------------------
     */

    const {
      data: learningGaps,
      error: learningGapsError,
    } = await supabase
      .from("learning_gaps")
      .select(
        "id, subject, topic, gap_level, recommendation, created_at"
      )
      .eq("student_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(20);

    if (learningGapsError) {
      console.error(
        "Learning gaps lookup error:",
        learningGapsError
      );
    }

    /*
     * ----------------------------------------------------------
     * DIAGNOSTIC TESTS
     * ----------------------------------------------------------
     */

    const {
      data: diagnosticTests,
      error: diagnosticTestsError,
    } = await supabase
      .from("diagnostic_tests")
      .select(
        "id, subject, score, completed_at, created_at"
      )
      .eq("student_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(5);

    if (diagnosticTestsError) {
      console.error(
        "Diagnostic tests lookup error:",
        diagnosticTestsError
      );
    }

    let diagnosticResults: Array<{
      id: string;
      diagnostic_test_id: string;
      topic: string;
      score: number;
      gap_level: string;
      created_at: string;
    }> = [];

    if (
      diagnosticTests &&
      diagnosticTests.length > 0
    ) {
      const diagnosticTestIds =
        diagnosticTests.map(
          (test) => test.id
        );

      const {
        data: results,
        error: diagnosticResultsError,
      } = await supabase
        .from("diagnostic_results")
        .select(
          "id, diagnostic_test_id, topic, score, gap_level, created_at"
        )
        .in(
          "diagnostic_test_id",
          diagnosticTestIds
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(25);

      if (diagnosticResultsError) {
        console.error(
          "Diagnostic results lookup error:",
          diagnosticResultsError
        );
      } else {
        diagnosticResults = results || [];
      }
    }

    /*
     * ----------------------------------------------------------
     * COURSES
     * ----------------------------------------------------------
     */

    const {
      data: enrollments,
      error: enrollmentsError,
    } = await supabase
      .from("enrollments")
      .select(
        `
          id,
          enroll_id,
          course_id,
          enrolled_at,
          courses (
            id,
            course_id,
            title
          )
        `
      )
      .eq("student_id", user.id);

    if (enrollmentsError) {
      console.error(
        "Enrollments lookup error:",
        enrollmentsError
      );
    }

    const courseIds =
      enrollments
        ?.map(
          (enrollment) =>
            enrollment.course_id
        )
        .filter(Boolean) || [];

    const courseInformation =
      enrollments?.map((enrollment) => {
        const course = Array.isArray(
          enrollment.courses
        )
          ? enrollment.courses[0]
          : enrollment.courses;

        return {
          courseId:
            course?.course_id || "",
          title:
            course?.title ||
            "Unknown Course",
        };
      }) || [];

    /*
     * ----------------------------------------------------------
     * ASSIGNMENTS
     * ----------------------------------------------------------
     */

    let assignments: Array<{
      id: string;
      assign_id: string;
      course_id: string;
      title: string;
      max_points: number;
      due_date: string | null;
    }> = [];

    if (courseIds.length > 0) {
      const {
        data: assignmentData,
        error: assignmentsError,
      } = await supabase
        .from("assignments")
        .select(
          "id, assign_id, course_id, title, max_points, due_date"
        )
        .in(
          "course_id",
          courseIds
        )
        .order("due_date", {
          ascending: true,
        });

      if (assignmentsError) {
        console.error(
          "Assignments lookup error:",
          assignmentsError
        );
      } else {
        assignments =
          assignmentData || [];
      }
    }

    /*
     * ----------------------------------------------------------
     * SUBMISSIONS
     * ----------------------------------------------------------
     */

    const {
      data: submissions,
      error: submissionsError,
    } = await supabase
      .from("submissions")
      .select(
        "id, assignment_id, student_id, score, submitted_at"
      )
      .eq("student_id", user.id);

    if (submissionsError) {
      console.error(
        "Submissions lookup error:",
        submissionsError
      );
    }

    /*
     * ----------------------------------------------------------
     * RECENT CHAT HISTORY
     * ----------------------------------------------------------
     */

    const {
      data: chatMessages,
      error: chatMessagesError,
    } = await supabase
      .from("chat_messages")
      .select(
        "id, sender, message, created_at"
      )
      .eq("session_id", sessionId)
      .order("created_at", {
        ascending: false,
      })
      .limit(MAX_HISTORY_MESSAGES);

    if (chatMessagesError) {
      console.error(
        "Chat history lookup error:",
        chatMessagesError
      );
    }

    const recentMessages =
      [...(chatMessages || [])].reverse();

    /*
     * ----------------------------------------------------------
     * ASSIGNMENT INFORMATION
     * ----------------------------------------------------------
     */

    const assignmentInformation =
      assignments.map((assignment) => {
        const submission =
          submissions?.find(
            (item) =>
              item.assignment_id ===
              assignment.id
          );

        const percentage =
          submission &&
          assignment.max_points > 0
            ? Math.round(
                (Number(
                  submission.score
                ) /
                  Number(
                    assignment.max_points
                  )) *
                  100
              )
            : null;

        return {
          assignmentId:
            assignment.assign_id,
          title: assignment.title,
          courseId:
            assignment.course_id,
          maxPoints: Number(
            assignment.max_points
          ),
          score: submission
            ? Number(
                submission.score
              )
            : null,
          percentage,
          completed:
            Boolean(submission),
          dueDate:
            assignment.due_date,
        };
      });

    const completedAssignments =
      assignmentInformation.filter(
        (assignment) =>
          assignment.completed
      );

    const pendingAssignments =
      assignmentInformation.filter(
        (assignment) =>
          !assignment.completed
      );

    /*
     * ----------------------------------------------------------
     * OVERALL PERFORMANCE
     * ----------------------------------------------------------
     */

    let totalEarnedPoints = 0;
    let totalPossiblePoints = 0;

    for (const assignment of completedAssignments) {
      totalEarnedPoints += Number(
        assignment.score || 0
      );

      totalPossiblePoints += Number(
        assignment.maxPoints || 0
      );
    }

    const overallAssignmentPerformance =
      totalPossiblePoints > 0
        ? Math.round(
            (totalEarnedPoints /
              totalPossiblePoints) *
              100
          )
        : null;

    /*
     * ----------------------------------------------------------
     * COURSE PERFORMANCE
     * ----------------------------------------------------------
     */

    const coursePerformance =
      courseInformation.map(
        (course) => {
          const courseAssignments =
            assignmentInformation.filter(
              (assignment) =>
                assignment.courseId ===
                course.courseId
            );

          const completedCourseAssignments =
            courseAssignments.filter(
              (assignment) =>
                assignment.completed
            );

          let earned = 0;
          let possible = 0;

          for (const assignment of completedCourseAssignments) {
            earned += Number(
              assignment.score || 0
            );

            possible += Number(
              assignment.maxPoints || 0
            );
          }

          const average =
            possible > 0
              ? Math.round(
                  (earned /
                    possible) *
                    100
                )
              : null;

          return {
            courseId:
              course.courseId,
            title:
              course.title,
            completed:
              completedCourseAssignments.length,
            total:
              courseAssignments.length,
            average,
          };
        }
      );

    /*
     * ----------------------------------------------------------
     * GAP PRIORITIES
     * ----------------------------------------------------------
     */

    const highPriorityGaps =
      learningGaps?.filter(
        (gap) =>
          gap.gap_level === "high"
      ) || [];

    const mediumPriorityGaps =
      learningGaps?.filter(
        (gap) =>
          gap.gap_level === "medium"
      ) || [];

    const lowPriorityGaps =
      learningGaps?.filter(
        (gap) =>
          gap.gap_level === "low"
      ) || [];

    const selectedLearningGaps = [
      ...highPriorityGaps,
      ...mediumPriorityGaps,
      ...lowPriorityGaps,
    ]
      .slice(0, MAX_LEARNING_GAPS)
      .map((gap) => ({
        subject: gap.subject,
        topic: gap.topic,
        gapLevel:
          gap.gap_level,
        recommendation:
          gap.recommendation ||
          null,
      }));

    /*
     * ----------------------------------------------------------
     * LATEST DIAGNOSTIC
     * ----------------------------------------------------------
     */

    const latestDiagnostic =
      diagnosticTests &&
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

    /*
     * ----------------------------------------------------------
     * COMPACT DATA FOR AI
     * ----------------------------------------------------------
     */

    const compactCoursePerformance =
      coursePerformance.map(
        (course) => ({
          course:
            course.title,
          completed:
            `${course.completed}/${course.total}`,
          performance:
            course.average !==
            null
              ? `${course.average}%`
              : "No scored work",
        })
      );

    const compactPendingAssignments =
      pendingAssignments
        .slice(
          0,
          MAX_PENDING_ASSIGNMENTS
        )
        .map(
          (assignment) => ({
            title:
              assignment.title,
            course:
              courseInformation.find(
                (course) =>
                  course.courseId ===
                  assignment.courseId
              )?.title ||
              "Unknown course",
            dueDate:
              assignment.dueDate,
          })
        );

    const compactLatestDiagnostic =
      latestDiagnostic
        ? {
            subject:
              latestDiagnostic.subject,
            score: Number(
              latestDiagnostic.score
            ),
            topics:
              latestDiagnosticResults.map(
                (result) => ({
                  topic:
                    result.topic,
                  score: Number(
                    result.score
                  ),
                  gapLevel:
                    result.gap_level,
                })
              ),
          }
        : null;

    const databaseContext = `
STUDENT
Name: ${studentName}
Grade: ${
      studentProfile?.grade ||
      "Not available"
    }
Goals: ${
      studentProfile?.goals ||
      "Not available"
    }
Learning preferences: ${
      studentProfile?.learning_preferences ||
      "Not available"
    }

ACADEMIC SUMMARY
Overall assignment performance: ${
      overallAssignmentPerformance !==
      null
        ? `${overallAssignmentPerformance}%`
        : "Not available"
    }
Completed assignments: ${
      completedAssignments.length
    }
Pending assignments: ${
      pendingAssignments.length
    }

COURSES
${JSON.stringify(courseInformation)}

COURSE PERFORMANCE
${JSON.stringify(
      compactCoursePerformance
    )}

PENDING ASSIGNMENTS
${JSON.stringify(
      compactPendingAssignments
    )}

LATEST DIAGNOSTIC
${JSON.stringify(
      compactLatestDiagnostic
    )}

RELEVANT LEARNING GAPS
${JSON.stringify(
      selectedLearningGaps
    )}

GAP COUNTS
High: ${highPriorityGaps.length}
Medium: ${mediumPriorityGaps.length}
Low: ${lowPriorityGaps.length}
`;

    /*
     * ----------------------------------------------------------
     * CONVERSATION CONTEXT
     * ----------------------------------------------------------
     */

    const conversationContext =
      recentMessages
        .map((item) => {
          const sender =
            item.sender ===
            "student"
              ? "STUDENT"
              : "AI";

          return `${sender}: ${item.message}`;
        })
        .join("\n");

    /*
     * ----------------------------------------------------------
     * AI INSTRUCTIONS
     * ----------------------------------------------------------
     */

    const instructions = `
You are LearnNova AI, a personalized AI tutor and learning assistant.

You are helping a student named ${studentName}.

Your job is to help this student understand concepts,
make academic progress, and decide what to learn next.

============================================================
CORE PERSONALIZATION RULES
============================================================

Use the student's academic information when it is relevant.

The supplied student data is the source of truth for:

- grade
- courses
- assignments
- assignment completion
- assignment scores
- pending assignments
- diagnostic results
- learning gaps
- goals
- learning preferences
- course performance

NEVER invent student-specific information.

NEVER guess a score, assignment status, course,
diagnostic result, or learning gap.

If information is unavailable, say that it is not currently
available rather than guessing.

Do not mention databases, SQL, Supabase, APIs, or internal
implementation details to the student.

============================================================
RECOMMENDATION PRIORITY
============================================================

When the student asks what they should study or focus on,
consider these priorities:

1. High-priority learning gaps
2. Medium-priority learning gaps
3. Weak diagnostic topics
4. Weak course performance
5. Pending assignments
6. Student goals
7. General practice

Use judgment.

If there are no significant high or medium learning gaps,
do NOT invent a weakness.

If the student is performing strongly, acknowledge that.

If pending assignments are the clearest next step,
recommend them.

============================================================
PERFORMANCE QUESTIONS
============================================================

When the student asks how they are doing:

Use the actual stored performance.

For example:

- overall assignment performance
- completed versus pending work
- course performance
- diagnostic performance

Do not claim that the student has an overall course grade
unless that information is actually available.

============================================================
TEACHING STYLE
============================================================

Teach at the student's grade level.

Be clear, encouraging, and practical.

For academic questions:

1. Explain the idea.
2. Show the reasoning.
3. Give an example when useful.
4. Let the student try when appropriate.

For mathematics and science, show important steps.

For programming, explain concepts in beginner-friendly language.

If the student asks for a direct answer, provide it while
still explaining the reasoning when educationally useful.

============================================================
CONVERSATION CONTINUITY
============================================================

Use the recent conversation history below when it is relevant.

Only treat information as previously stated by the student
when it actually appears in the supplied conversation.

Do not invent previous statements.

Do not assume information from another conversation,
application, or interaction is available.

============================================================
RELEVANCE AND ACCURACY
============================================================

Never fabricate information.

Never claim the student completed an assignment unless a
submission exists.

Never claim the student has a learning gap unless the
provided academic data or current conversation supports it.

Only make personal observations when supported by the
provided academic data or conversation.

Do not invent emotions, feelings, symptoms, personal
experiences, struggles, fears, or life circumstances.

Do not introduce mental-health, emotional, grounding,
wellbeing, or personal-life advice unless the student
explicitly asks about that subject.

Keep the response focused on the student's current question.

Do not add unrelated warnings or advice.

============================================================
PERSONALIZATION STYLE
============================================================

Personalization should feel useful and natural.

For example:

"Your Mathematics diagnostic was strong, so..."

"You currently have five pending assignments, so..."

"Your Physics performance is..."

Only use such statements when supported by the supplied data.

Do not repeatedly mention student data when it is irrelevant.

============================================================
CURRENT STUDENT DATA
============================================================

${databaseContext}

============================================================
RECENT CONVERSATION
============================================================

${
  conversationContext ||
  "No previous messages are available."
}

============================================================
CURRENT QUESTION
============================================================

${message}

============================================================
FINAL RESPONSE STYLE
============================================================

Respond naturally as LearnNova AI.

Do not begin every response with the student's name.

Do not dump the student's entire academic profile.

Use only information relevant to the current question.

Be concise for simple questions.

Be detailed when teaching requires it.

Always aim to help the student make academic progress.
`;

    console.log(
      "LearnNova personalized AI request:",
      {
        student: studentName,
        sessionId,
        messageLength:
          message.length,
        historyMessages:
          recentMessages.length,
        courses:
          courseInformation.length,
        assignments:
          assignmentInformation.length,
        completedAssignments:
          completedAssignments.length,
        pendingAssignments:
          pendingAssignments.length,
        learningGaps:
          learningGaps?.length ||
          0,
        selectedLearningGaps:
          selectedLearningGaps.length,
        highPriorityGaps:
          highPriorityGaps.length,
        mediumPriorityGaps:
          mediumPriorityGaps.length,
        latestDiagnostic:
          latestDiagnostic?.subject ||
          null,
      }
    );

    /*
     * ----------------------------------------------------------
     * OPENAI REQUEST
     * ----------------------------------------------------------
     */

    let response;

    try {
      response =
        await openai.responses.create({
          model: "gpt-6-luna",
          instructions,
          input: message,
        });
    } catch (error) {
      console.error(
        "OpenAI API error:",
        error
      );

      if (
        error instanceof
        OpenAI.APIError
      ) {
        if (
          error.status === 429
        ) {
          return NextResponse.json(
            {
              error:
                "The AI service is temporarily rate-limited. Please wait a little while and try again.",
              details:
                error.message,
            },
            {
              status: 429,
            }
          );
        }

        return NextResponse.json(
          {
            error:
              "OpenAI request failed.",
            details:
              error.message,
          },
          {
            status: 502,
          }
        );
      }

      return NextResponse.json(
        {
          error:
            "Unable to connect to the AI service. Please try again.",
        },
        {
          status: 502,
        }
      );
    }

    /*
     * ----------------------------------------------------------
     * EXTRACT AI RESPONSE
     * ----------------------------------------------------------
     */

    const aiText =
      extractMessage(response);

    if (!aiText) {
      console.error(
        "OpenAI returned no usable text:",
        response
      );

      return NextResponse.json(
        {
          error:
            "The AI returned an empty response.",
        },
        {
          status: 502,
        }
      );
    }

    /*
     * ----------------------------------------------------------
     * RETURN RESPONSE
     * ----------------------------------------------------------
     */

    return NextResponse.json({
      message: aiText,
      sessionId,
      studentName,
    });
  } catch (error) {
    console.error(
      "Chat route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while processing your message.",
      },
      {
        status: 500,
      }
    );
  }
}