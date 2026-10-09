
"use client";

import { type FormEvent, useState } from "react";
import {
  BookOpen,
  Check,
  ExternalLink,
  ImagePlus,
  Loader2,
  PlayCircle,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ExplanationResult = {
  explanation: string;
  sourceType: "youtube-captions" | "pasted-transcript";
  videoUrl: string;
  startTime: string;
  endTime: string;
  screenshotProvided: boolean;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function VideoTutorPage() {
  const [videoUrl, setVideoUrl] = useState("");
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("05:00");
  const [question, setQuestion] = useState("");
  const [transcript, setTranscript] = useState("");
  const [screenshot, setScreenshot] = useState("");
  const [screenshotName, setScreenshotName] = useState("");
  const [result, setResult] = useState<ExplanationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [sendingTeacherRequest, setSendingTeacherRequest] = useState(false);

  async function handleScreenshotChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    setError("");

    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Upload a JPG, PNG, or WebP screenshot.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError("The screenshot must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          if (typeof reader.result !== "string") {
            reject(new Error("Could not read the screenshot."));
            return;
          }

          resolve(reader.result);
        };

        reader.onerror = () => reject(new Error("Could not read the screenshot."));
        reader.readAsDataURL(file);
      });

      setScreenshot(dataUrl);
      setScreenshotName(file.name);
      setResult(null);
      setFeedbackMessage("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not read the screenshot."
      );
    }
  }

  function removeScreenshot() {
    setScreenshot("");
    setScreenshotName("");
    setResult(null);
    setFeedbackMessage("");
  }

  async function handleExplain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setFeedbackMessage("");
    setResult(null);
    setLoading(true);

    try {
      const supabase = createClient();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error(
          "Your login session could not be found. Please log in again."
        );
      }

      const response = await fetch("/api/video-tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          videoUrl,
          startTime,
          endTime,
          question,
          transcript,
          screenshot,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Could not explain this video section."
        );
      }

      setResult(data as ExplanationResult);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleHelpfulFeedback() {
    setFeedbackMessage("Great! Glad the explanation helped.");
    setError("");
  }

  async function handleTeacherEscalation() {
    if (!result || sendingTeacherRequest) return;

    setSendingTeacherRequest(true);
    setError("");
    setFeedbackMessage("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please log in again before requesting teacher help.");
      }

      const { data: studentProfile, error: profileError } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !studentProfile) {
        throw new Error(
          "Your student profile could not be verified. Please log in again."
        );
      }

      const teacherMessage = [
        "LearnNova Video Tutor help request",
        "",
        `Video URL: ${result.videoUrl}`,
        `Timestamp: ${result.startTime}–${result.endTime}`,
        "",
        `Student question: ${question.trim()}`,
        "",
        `Screenshot used for AI analysis: ${
          result.screenshotProvided ? `Yes (${screenshotName || "uploaded image"})` : "No"
        }`,
        result.screenshotProvided
          ? "Note: The screenshot was used for the AI explanation but is not attached to this teacher request."
          : "",
        "",
        "LearnNova AI explanation:",
        result.explanation,
        "",
        `Transcript source: ${
          result.sourceType === "youtube-captions"
            ? "YouTube captions"
            : "Transcript provided by the student"
        }`,
      ]
        .filter((line) => line !== undefined)
        .join("\n");

      const { error: insertError } = await supabase
        .from("help_requests")
        .insert({
          student_id: user.id,
          teacher_id: null,
          subject: "External Course Video",
          topic: `${result.startTime}–${result.endTime}`,
          message: teacherMessage,
          status: "pending",
        });

      if (insertError) {
        console.error("Video Tutor teacher request error:", insertError);
        throw new Error(
          "Your teacher request could not be saved. Please try again."
        );
      }

      setFeedbackMessage("Your video question has been sent to a teacher. 👨‍🏫");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not send your question to a teacher."
      );
    } finally {
      setSendingTeacherRequest(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-purple-600/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl space-y-7">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <PlayCircle className="h-6 w-6 text-blue-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-300">
                LEARN FROM ANYWHERE
              </p>
              <h1 className="text-2xl font-bold sm:text-3xl">Video Tutor</h1>
              <p className="mt-1 text-sm text-slate-400">
                Understand the exact part of a lesson that confused you.
              </p>
            </div>
          </div>

          <div className="flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
            <Sparkles className="h-4 w-4 text-blue-300" />
            AI-powered explanations
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-xl sm:p-7">
          <div className="mb-6 flex items-start gap-3">
            <div className="rounded-xl bg-blue-500/10 p-2">
              <BookOpen className="h-5 w-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">What are you learning?</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Add a video, choose its timestamps, ask your question, and
                optionally upload a screenshot so the AI can analyze visible
                content as well as the transcript.
              </p>
            </div>
          </div>

          <form onSubmit={handleExplain} className="space-y-5">
            <div>
              <label htmlFor="videoUrl" className="mb-2 block text-sm font-medium text-slate-200">
                Video URL
              </label>
              <input
                id="videoUrl"
                type="url"
                required
                value={videoUrl}
                onChange={(event) => setVideoUrl(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/10"
              />
              <p className="mt-2 text-xs leading-5 text-slate-500">
                YouTube captions are retrieved automatically when available.
                For other platforms, paste the transcript below.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="startTime" className="mb-2 block text-sm font-medium text-slate-200">
                  Start timestamp
                </label>
                <input
                  id="startTime"
                  required
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  placeholder="04:20"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
              <div>
                <label htmlFor="endTime" className="mb-2 block text-sm font-medium text-slate-200">
                  End timestamp
                </label>
                <input
                  id="endTime"
                  required
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  placeholder="08:45"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
            </div>

            <p className="-mt-2 text-xs text-slate-500">
              Use minutes:seconds, such as 04:20, or hours:minutes:seconds.
              Explain up to 30 minutes per request.
            </p>

            <div>
              <label htmlFor="question" className="mb-2 block text-sm font-medium text-slate-200">
                What do you want explained?
              </label>
              <textarea
                id="question"
                required
                rows={3}
                maxLength={4000}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="For example: I don't understand why the formula changes in this step. Can you explain it from the beginning?"
                className="w-full resize-y rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            <div>
              <label htmlFor="transcript" className="mb-2 block text-sm font-medium text-slate-200">
                Transcript for this section
                <span className="ml-2 font-normal text-slate-500">
                  Optional for YouTube
                </span>
              </label>
              <textarea
                id="transcript"
                rows={4}
                maxLength={50000}
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                placeholder="For other platforms, paste the transcript here. If pasting an SRT/VTT transcript, keep its timestamps."
                className="w-full resize-y rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            <div className="rounded-2xl border border-dashed border-blue-400/30 bg-blue-500/[0.04] p-4">
              <div className="flex items-start gap-3">
                <ImagePlus className="mt-1 h-5 w-5 shrink-0 text-blue-300" />
                <div className="min-w-0 flex-1">
                  <label htmlFor="screenshot" className="block text-sm font-medium text-slate-200">
                    Screenshot from the video
                    <span className="ml-2 font-normal text-slate-500">Optional</span>
                  </label>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Pause the video at the selected timestamp and upload a
                    screenshot of the diagram, slide, formula, or scene you
                    want explained. JPG, PNG, or WebP; up to 5 MB.
                  </p>
                  <input
                    id="screenshot"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleScreenshotChange}
                    className="mt-3 block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-500/15 file:px-3 file:py-2 file:font-medium file:text-blue-200 hover:file:bg-blue-500/25"
                  />

                  {screenshot && (
                    <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/60 p-3">
                      <img
                        src={screenshot}
                        alt="Screenshot uploaded for explanation"
                        className="max-h-72 w-full rounded-lg object-contain"
                      />
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-xs text-slate-400">
                          {screenshotName}
                        </span>
                        <button
                          type="button"
                          onClick={removeScreenshot}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                        >
                          <X className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Understanding your lesson...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Explain this section
                </>
              )}
            </button>
          </form>
        </section>

        {result && (
          <section className="overflow-hidden rounded-3xl border border-blue-400/20 bg-white/[0.04] shadow-2xl">
            <div className="border-b border-white/10 bg-blue-500/5 p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">
                    YOUR EXPLANATION
                  </p>
                  <h2 className="mt-1 text-xl font-bold">Let&apos;s break it down</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Section {result.startTime}–{result.endTime}
                  </p>
                </div>
                <a
                  href={result.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10"
                >
                  Open video <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Source:{" "}
                {result.sourceType === "youtube-captions"
                  ? "YouTube captions"
                  : "Transcript you provided"}
                {result.screenshotProvided ? " + screenshot analysis" : ""}
              </p>
            </div>

            <div className="whitespace-pre-wrap px-5 py-6 text-sm leading-7 text-slate-200 sm:px-6">
              {result.explanation}
            </div>

            <div className="border-t border-white/10 bg-black/10 p-5 sm:p-6">
              <p className="mb-3 text-sm font-medium text-slate-300">
                Was this explanation helpful?
              </p>

              {!feedbackMessage ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleHelpfulFeedback}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    Yes, I understand now
                  </button>

                  <button
                    type="button"
                    onClick={handleTeacherEscalation}
                    disabled={sendingTeacherRequest}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-400/20 bg-orange-500/10 px-4 py-3 text-sm font-medium text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sendingTeacherRequest ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ThumbsDown className="h-4 w-4" />
                    )}
                    I still need teacher help
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-200">
                  <Check className="mt-1 h-4 w-4 shrink-0" />
                  <span>{feedbackMessage}</span>
                </div>
              )}

              {error && (
                <p role="alert" className="mt-3 text-sm text-red-300">
                  {error}
                </p>
              )}

              <p className="mt-4 text-xs leading-5 text-slate-500">
                Teacher requests include the video URL, timestamps, your
                question, the AI explanation, and whether a screenshot was used.
                The screenshot itself is not attached to the teacher request.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
