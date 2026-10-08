import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase server configuration is missing."
    );
  }

  return createClient(
    url,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

function getPublicClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const publishableKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase public configuration is missing."
    );
  }

  return createClient(
    url,
    publishableKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

// ============================================================
// GET CURRENT TEACHER
// ============================================================

async function getTeacher(
  request: NextRequest
) {
  try {
    const authorization =
      request.headers.get(
        "authorization"
      );

    // ----------------------------------------------------------
    // 1. Explicit Bearer token
    // ----------------------------------------------------------

    if (
      authorization &&
      authorization.startsWith(
        "Bearer "
      )
    ) {
      const accessToken =
        authorization
          .substring(7)
          .trim();

      if (!accessToken) {
        return {
          user: null,
          profile: null,
          error:
            "The authentication token is empty.",
        };
      }

      const supabase =
        getPublicClient();

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser(
          accessToken
        );

      // IMPORTANT:
      // If a Bearer token was supplied but rejected,
      // do NOT silently fall back to cookies.
      //
      // This makes the real authentication problem visible.
      if (userError || !user) {
        console.error(
          "BEARER TOKEN AUTHENTICATION FAILED:",
          userError
        );

        return {
          user: null,
          profile: null,
          error:
            "Your Supabase session token is invalid or expired. Please log in again.",
        };
      }

      const admin =
        getAdminClient();

      const {
        data: profile,
        error: profileError,
      } =
        await admin
          .from("profiles")
          .select(
            "id, name, email, role"
          )
          .eq(
            "id",
            user.id
          )
          .single();

      if (
        profileError ||
        !profile
      ) {
        console.error(
          "TEACHER PROFILE ERROR:",
          profileError
        );

        return {
          user: null,
          profile: null,
          error:
            "Teacher profile was not found.",
        };
      }

      if (
        profile.role !==
        "teacher"
      ) {
        return {
          user: null,
          profile: null,
          error:
            "Only teachers can access this dashboard.",
        };
      }

      return {
        user,
        profile,
        error: null,
      };
    }

    // ----------------------------------------------------------
    // 2. Cookie fallback
    // ----------------------------------------------------------

    const supabase =
      await createServerClient();

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser();

    if (
      authError ||
      !user
    ) {
      console.error(
        "COOKIE AUTHENTICATION FAILED:",
        authError
      );

      return {
        user: null,
        profile: null,
        error:
          "You must be logged in.",
      };
    }

    const admin =
      getAdminClient();

    const {
      data: profile,
      error: profileError,
    } =
      await admin
        .from("profiles")
        .select(
          "id, name, email, role"
        )
        .eq(
          "id",
          user.id
        )
        .single();

    if (
      profileError ||
      !profile
    ) {
      return {
        user: null,
        profile: null,
        error:
          "Teacher profile was not found.",
      };
    }

    if (
      profile.role !==
      "teacher"
    ) {
      return {
        user: null,
        profile: null,
        error:
          "Only teachers can access this dashboard.",
      };
    }

    return {
      user,
      profile,
      error: null,
    };
  } catch (error) {
    console.error(
      "GET TEACHER ERROR:",
      error
    );

    return {
      user: null,
      profile: null,
      error:
        "Authentication failed.",
    };
  }
}

// ============================================================
// GET TEACHER REQUESTS
// ============================================================

export async function GET(
  request: NextRequest
) {
  try {
    const teacher =
      await getTeacher(
        request
      );

    if (
      !teacher.user ||
      !teacher.profile
    ) {
      return NextResponse.json(
        {
          error:
            teacher.error ||
            "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const admin =
      getAdminClient();

    const {
      data: requests,
      error: requestsError,
    } =
      await admin
        .from("help_requests")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (requestsError) {
      console.error(
        "TEACHER REQUEST FETCH ERROR:",
        requestsError
      );

      return NextResponse.json(
        {
          error:
            "Could not load teacher requests.",
          details:
            requestsError.message,
        },
        {
          status: 500,
        }
      );
    }

    const studentIds = [
      ...new Set(
        (requests || [])
          .map(
            (item) =>
              item.student_id
          )
          .filter(Boolean)
      ),
    ];

    let studentMap: Record<
      string,
      {
        id: string;
        name: string;
        email: string;
        role: string;
      }
    > = {};

    if (
      studentIds.length > 0
    ) {
      const {
        data: students,
        error:
          studentsError,
      } =
        await admin
          .from("profiles")
          .select(
            "id, name, email, role"
          )
          .in(
            "id",
            studentIds
          );

      if (
        studentsError
      ) {
        console.error(
          "STUDENT PROFILE FETCH ERROR:",
          studentsError
        );
      } else {
        studentMap =
          Object.fromEntries(
            (
              students || []
            ).map(
              (
                student
              ) => [
                student.id,
                student,
              ]
            )
          );
      }
    }

    const enrichedRequests =
      (
        requests || []
      ).map(
        (request) => ({
          ...request,
          student:
            studentMap[
              request
                .student_id
            ] || null,
        })
      );

    return NextResponse.json({
      teacher:
        teacher.profile,
      requests:
        enrichedRequests,
    });
  } catch (error) {
    console.error(
      "TEACHER REQUEST GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while loading teacher requests.",
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// UPDATE TEACHER REQUEST
// ============================================================

export async function PATCH(
  request: NextRequest
) {
  try {
    const teacher =
      await getTeacher(
        request
      );

    if (
      !teacher.user ||
      !teacher.profile
    ) {
      return NextResponse.json(
        {
          error:
            teacher.error ||
            "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const requestId =
      body?.requestId;

    const status =
      body?.status;

    const teacherResponse =
      body?.teacherResponse;

    if (!requestId) {
      return NextResponse.json(
        {
          error:
            "Request ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const allowedStatuses =
      [
        "pending",
        "accepted",
        "resolved",
      ];

    if (
      status &&
      !allowedStatuses.includes(
        status
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid request status.",
        },
        {
          status: 400,
        }
      );
    }

    const admin =
      getAdminClient();

    const {
      data: existingRequest,
      error:
        existingRequestError,
    } =
      await admin
        .from("help_requests")
        .select("*")
        .eq(
          "id",
          requestId
        )
        .maybeSingle();

    if (
      existingRequestError
    ) {
      console.error(
        "EXISTING REQUEST ERROR:",
        existingRequestError
      );

      return NextResponse.json(
        {
          error:
            "Could not find the help request.",
        },
        {
          status: 500,
        }
      );
    }

    if (!existingRequest) {
      return NextResponse.json(
        {
          error:
            "Help request not found.",
        },
        {
          status: 404,
        }
      );
    }

    const updateData: Record<
      string,
      unknown
    > = {};

    if (status) {
      updateData.status =
        status;
    }

    if (
      status ===
      "accepted"
    ) {
      updateData.teacher_id =
        teacher.user.id;
    }

    if (
      typeof teacherResponse ===
      "string"
    ) {
      updateData.teacher_response =
        teacherResponse.trim();
    }

    if (
      status ===
      "resolved"
    ) {
      updateData.teacher_id =
        teacher.user.id;

      updateData.resolved_at =
        new Date().toISOString();
    }

    const {
      data: updatedRequest,
      error: updateError,
    } =
      await admin
        .from("help_requests")
        .update(
          updateData
        )
        .eq(
          "id",
          requestId
        )
        .select("*")
        .single();

    if (updateError) {
      console.error(
        "TEACHER REQUEST UPDATE ERROR:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Could not update the teacher request.",
          details:
            updateError.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      request:
        updatedRequest,
    });
  } catch (error) {
    console.error(
      "TEACHER REQUEST PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while updating the request.",
      },
      {
        status: 500,
      }
    );
  }
}