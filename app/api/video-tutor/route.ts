import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { Agent, fetch as undiciFetch } from "undici";
import { fetchTranscript } from "youtube-transcript";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

const TIMEOUT = 60_000;
const MAX_TRANSCRIPT_LENGTH = 16_000;
const MAX_IMAGE_DATA_LENGTH = 7 * 1024 * 1024;

const openaiFetch: typeof globalThis.fetch = (input, init) =>
  undiciFetch(
    input as Parameters<typeof undiciFetch>[0],
    init as Parameters<typeof undiciFetch>[1]
  ) as unknown as Promise<Response>;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: TIMEOUT,
  maxRetries: 0,
  fetch: openaiFetch,
  fetchOptions: {
    dispatcher: new Agent({
      headersTimeout: TIMEOUT,
      bodyTimeout: TIMEOUT,
    }),
  },
});

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseTimestamp(value: string): number | null {
  const parts = value.trim().replace(/[.,]\d+$/, "").split(":");

  if (
    (parts.length !== 2 && parts.length !== 3) ||
    parts.some((part) => !/^\d+$/.test(part))
  ) {
    return null;
  }

  const numbers = parts.map(Number);

  if (numbers.some((number) => !Number.isFinite(number))) {
    return null;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = numbers;

    if (seconds >= 60) return null;

    return minutes * 60 + seconds;
  }

  const [hours, minutes, seconds] = numbers;

  if (minutes >= 60 || seconds >= 60) return null;

  return hours * 3600 + minutes * 60 + seconds;
}

function formatTimestamp(seconds: number): string {
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;

  if (hours > 0) {
    return [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(remainingSeconds).padStart(2, "0"),
    ].join(":");
  }

  return [
    String(minutes).padStart(2, "0"),
    String(remainingSeconds).padStart(2, "0"),
  ].join(":");
}

function getYoutubeVideoId(url: URL): string | null {
  const hostname = url.hostname.toLowerCase();

  if (
    hostname !== "youtube.com" &&
    !hostname.endsWith(".youtube.com") &&
    hostname !== "youtu.be"
  ) {
    return null;
  }

  let id = "";

  if (hostname === "youtu.be") {
    id = url.pathname.split("/").filter(Boolean)[0] || "";
  } else {
    id = url.searchParams.get("v") || "";

    if (!id) {
      const segments = url.pathname.split("/").filter(Boolean);

      if (["shorts", "embed", "live", "v"].includes(segments[0])) {
        id = segments[1] || "";
      }
    }
  }

  return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
}

function extractPastedTranscriptRange(
  transcript: string,
  startSeconds: number,
  endSeconds: number
): string {
  const lines = transcript.split(/\r?\n/);

  const cuePattern =
    /^\s*((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?)\s*-->\s*((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?)/;

  const cues: Array<{
    lineIndex: number;
    start: number;
    end: number;
  }> = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(cuePattern);

    if (!match) continue;

    const start = parseTimestamp(match[1]);
    const end = parseTimestamp(match[2]);

    if (start !== null && end !== null && end > start) {
      cues.push({ lineIndex: i, start, end });
    }
  }

  if (cues.length > 0) {
    const selected: string[] = [];

    for (let i = 0; i < cues.length; i++) {
      const cue = cues[i];

      if (cue.start >= endSeconds || cue.end <= startSeconds) {
        continue;
      }

      const nextCueLine = cues[i + 1]?.lineIndex ?? lines.length;

      const text = lines
        .slice(cue.lineIndex + 1, nextCueLine)
        .filter(
          (line) => line.trim() && !/^\s*\d+\s*$/.test(line)
        )
        .join(" ")
        .trim();

      if (text) {
        selected.push(`[${formatTimestamp(cue.start)}] ${text}`);
      }
    }

    return selected.join("\n");
  }

  const timestampedLines: string[] = [];
  let foundInlineTimestamps = false;

  for (const line of lines) {
    const match = line.match(
      /^\s*\[?((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?)\]?\s+(.+)$/
    );

    if (!match) continue;

    const timestamp = parseTimestamp(match[1]);

    if (timestamp === null) continue;

    foundInlineTimestamps = true;

    if (timestamp >= startSeconds && timestamp < endSeconds) {
      timestampedLines.push(line.trim());
    }
  }

  return foundInlineTimestamps
    ? timestampedLines.join("\n")
    : transcript.trim();
}

function isValidImageDataUrl(value: string): boolean {
  return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
    value
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const videoUrl = cleanText(body?.videoUrl);
    const startTime = cleanText(body?.startTime);
    const endTime = cleanText(body?.endTime);
    const question = cleanText(body?.question);
    const pastedTranscript = cleanText(body?.transcript);
    const screenshot = cleanText(body?.screenshot);

    if (!videoUrl || !startTime || !endTime || !question) {
      return NextResponse.json(
        {
          error:
            "Enter the video URL, start time, end time, and your question.",
        },
        { status: 400 }
      );
    }

    if (videoUrl.length > 2048 || question.length > 4000) {
      return NextResponse.json(
        { error: "The video URL or question is too long." },
        { status: 400 }
      );
    }

    if (pastedTranscript.length > 50_000) {
      return NextResponse.json(
        { error: "Paste only the relevant transcript section." },
        { status: 400 }
      );
    }

    if (screenshot && screenshot.length > MAX_IMAGE_DATA_LENGTH) {
      return NextResponse.json(
        {
          error:
            "The screenshot is too large. Please upload an image under 5 MB.",
        },
        { status: 413 }
      );
    }

    if (screenshot && !isValidImageDataUrl(screenshot)) {
      return NextResponse.json(
        {
          error:
            "The screenshot format is invalid. Upload a JPG, PNG, or WebP image.",
        },
        { status: 400 }
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(videoUrl);

      if (
        !["https:", "http:"].includes(parsedUrl.protocol) ||
        parsedUrl.username ||
        parsedUrl.password
      ) {
        throw new Error("Invalid URL");
      }
    } catch {
      return NextResponse.json(
        { error: "Enter a valid video URL." },
        { status: 400 }
      );
    }

    const startSeconds = parseTimestamp(startTime);
    const endSeconds = parseTimestamp(endTime);

    if (
      startSeconds === null ||
      endSeconds === null ||
      endSeconds <= startSeconds
    ) {
      return NextResponse.json(
        {
          error:
            "Use valid timestamps such as 04:20 and 08:45. The end time must be after the start time.",
        },
        { status: 400 }
      );
    }

    if (endSeconds - startSeconds > 30 * 60) {
      return NextResponse.json(
        {
          error:
            "Please explain a section of 30 minutes or less at a time.",
        },
        { status: 400 }
      );
    }

    if (
      !process.env.OPENAI_API_KEY ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ) {
      return NextResponse.json(
        { error: "The AI or database service is not configured." },
        { status: 500 }
      );
    }

    const authorization = request.headers.get("authorization");
    const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Your login session is missing. Please log in again.",
        },
        { status: 401 }
      );
    }

    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        {
          error:
            "Your login session is invalid or expired. Please log in again.",
        },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Video Tutor profile lookup error:", profileError);

      return NextResponse.json(
        { error: "Could not verify your student profile." },
        { status: 500 }
      );
    }

    if (!profile || profile.role !== "student") {
      return NextResponse.json(
        { error: "Video Tutor is available to student accounts." },
        { status: 403 }
      );
    }

    const { data: studentProfile } = await supabase
      .from("student_profiles")
      .select("grade")
      .eq("id", user.id)
      .maybeSingle();

    let transcriptText = "";
    let sourceType: "youtube-captions" | "pasted-transcript";

    if (pastedTranscript) {
      transcriptText = extractPastedTranscriptRange(
        pastedTranscript,
        startSeconds,
        endSeconds
      );

      sourceType = "pasted-transcript";
    } else {
      const youtubeVideoId = getYoutubeVideoId(parsedUrl);

      if (!youtubeVideoId) {
        return NextResponse.json(
          {
            error:
              "Automatic transcript retrieval is supported for YouTube. For other platforms, paste the transcript for your selected section.",
          },
          { status: 422 }
        );
      }

      try {
        const segments = await fetchTranscript(videoUrl);

        transcriptText = segments
          .filter((segment) => {
            const segmentStart = Number(segment.offset);
            const segmentEnd =
              segmentStart + Number(segment.duration);

            return (
              segmentStart < endSeconds &&
              segmentEnd > startSeconds
            );
          })
          .map(
            (segment) =>
              `[${formatTimestamp(Number(segment.offset))}] ${segment.text}`
          )
          .join("\n");

        sourceType = "youtube-captions";
      } catch (error) {
        console.error("YouTube transcript retrieval failed:", error);

        if (!screenshot) {
          return NextResponse.json(
            {
              error:
                "LearnNova couldn't retrieve captions. Try another video or upload a screenshot and paste any available transcript.",
            },
            { status: 422 }
          );
        }

        transcriptText = "No transcript was available for this section.";
        sourceType = "pasted-transcript";
      }
    }

    transcriptText = transcriptText
      .trim()
      .slice(0, MAX_TRANSCRIPT_LENGTH);

    if (!transcriptText && !screenshot) {
      return NextResponse.json(
        {
          error:
            "No transcript text was found for that timestamp range. Check your timestamps, paste the relevant transcript, or upload a screenshot.",
        },
        { status: 422 }
      );
    }

    const instructions = `
You are LearnNova Video Tutor, a patient educational tutor.

Student: ${profile.name || "Student"}
Grade/class: ${studentProfile?.grade || "not specified"}
Video URL: ${videoUrl}
Selected section: ${startTime} to ${endTime}

Student's question:
${question}

Transcript for the selected section:
${transcriptText || "No transcript was provided."}

A screenshot ${
      screenshot
        ? "has been supplied with this request."
        : "has not been supplied."
    }

Teaching rules:
1. Answer the student's question about the selected video section.
2. Use the transcript and screenshot together when both are available.
3. Describe only visual details actually visible in the supplied screenshot. Do not claim to have watched or processed the entire video.
4. If a screenshot is present, describe relevant visible diagrams, text, objects, formulas, or actions before explaining them.
5. If the transcript contains only a music title or unrelated text, say that it does not explain the visual content.
6. If the available evidence is insufficient, state what is missing instead of inventing details.
7. Explain difficult concepts step by step at the student's grade level.
8. Give an example when useful and define important terms.
9. Do not invent quotations or claim the instructor said something absent from the transcript.
10. Finish with a short check-your-understanding question when appropriate.
`;

    try {
      const content: Array<
        | { type: "input_text"; text: string }
        | {
            type: "input_image";
            image_url: string;
            detail: "auto";
          }
      > = [
        {
          type: "input_text",
          text: `Please explain this video section and answer my question: ${question}`,
        },
      ];

      if (screenshot) {
        content.push({
          type: "input_image",
          image_url: screenshot,
          detail: "auto",
        });
      }

      const response = await openai.responses.create({
        model: "gpt-6-luna",
        instructions,
        input: [
          {
            role: "user",
            content,
          },
        ],
      });

      const explanation =
        typeof response.output_text === "string"
          ? response.output_text.trim()
          : "";

      if (!explanation) {
        return NextResponse.json(
          {
            error:
              "The AI returned an empty explanation. Please try again.",
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        explanation,
        sourceType,
        videoUrl,
        startTime,
        endTime,
        screenshotProvided: Boolean(screenshot),
      });
    } catch (error) {
      console.error("Video Tutor OpenAI error:", error);

      if (error instanceof OpenAI.APIError && error.status === 429) {
        return NextResponse.json(
          {
            error:
              "The AI service is temporarily rate-limited. Please try again later.",
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error:
            "LearnNova couldn't generate the explanation. Check whether your configured AI model supports image input, then try again.",
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Video Tutor route error:", error);

    return NextResponse.json(
      { error: "Something went wrong in Video Tutor." },
      { status: 500 }
    );
  }
}