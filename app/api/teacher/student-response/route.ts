import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server configuration is missing.");
  }

  return createSupabaseAdmin(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function getAuthenticatedUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  // ------------------------------------------------------------
  // 1. Prefer the Supabase access token sent by the browser
  // ------------------------------------------------------------

  if (authorization?.startsWith("Bearer ")) {
    const accessToken = authorization.slice("Bearer ".length).trim();

    if (accessToken) {
      const publicClient = createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

      const {
        data: { user },
        error,
      } = await publicClient.auth.getUser(accessToken);

      if (!error && user) {
        return user;
      }
    }
  }

  // ------------------------------------------------------------
  // 2. Fall back to the normal Supabase cookie session
  // ------------------------------------------------------------

  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!error && user) {
    return user;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    // ----------------------------------------------------------
    // 1. Authenticate student
    // ----------------------------------------------------------

    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          error: "You must be logged in.",
        },
        {
          status: 401,
        }
      );
    }

    // ----------------------------------------------------------
    // 2. Admin client for reading the student's requests
    // ----------------------------------------------------------

    const admin = getAdminClient();

    // ----------------------------------------------------------
    // 3. Verify profile
    // ----------------------------------------------------------

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, name, email, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        "Student profile lookup error:",
        profileError
      );

      return NextResponse.json(
        {
          error: "Student profile was not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (profile.role !== "student") {
      return NextResponse.json(
        {
          error: "Only students can access teacher responses.",
        },
        {
          status: 403,
        }
      );
    }

    // ----------------------------------------------------------
    // 4. Get resolved teacher responses
    // ----------------------------------------------------------

    const { data: requests, error: requestsError } = await admin
      .from("help_requests")
      .select(`
        id,
        student_id,
        teacher_id,
        subject,
        topic,
        message,
        status,
        teacher_response,
        created_at,
        resolved_at
      `)
      .eq("student_id", user.id)
      .eq("status", "resolved")
      .not("teacher_response", "is", null)
      .order("resolved_at", {
        ascending: false,
      });

    if (requestsError) {
      console.error(
        "Student teacher-response query error:",
        requestsError
      );

      return NextResponse.json(
        {
          error: "Could not load teacher responses.",
        },
        {
          status: 500,
        }
      );
    }

    // ----------------------------------------------------------
    // 5. Get teacher names
    // ----------------------------------------------------------

    const teacherIds = [
      ...new Set(
        (requests || [])
          .map((request) => request.teacher_id)
          .filter(
            (id): id is string => Boolean(id)
          )
      ),
    ];

    let teacherMap: Record<string, string> = {};

    if (teacherIds.length > 0) {
      const { data: teachers, error: teachersError } =
        await admin
          .from("profiles")
          .select("id, name")
          .in("id", teacherIds);

      if (teachersError) {
        console.error(
          "Teacher profile lookup error:",
          teachersError
        );
      } else if (teachers) {
        teacherMap = Object.fromEntries(
          teachers.map((teacher) => [
            teacher.id,
            teacher.name,
          ])
        );
      }
    }

    // ----------------------------------------------------------
    // 6. Format response
    // ----------------------------------------------------------

    const formattedRequests = (requests || []).map(
      (request) => ({
        ...request,
        teacher_name: request.teacher_id
          ? teacherMap[request.teacher_id] ||
            "Your teacher"
          : "Your teacher",
      })
    );

    return NextResponse.json({
      requests: formattedRequests,
    });
  } catch (error) {
    console.error(
      "Student teacher-response API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while loading teacher responses.",
      },
      {
        status: 500,
      }
    );
  }
}