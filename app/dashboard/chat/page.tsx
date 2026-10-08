"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Bot,
  Check,
  Clock3,
  GraduationCap,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  User,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  sender: "student" | "ai";
  message: string;
  created_at: string;
};

type TeacherResponse = {
  id: string;
  student_id: string;
  teacher_id: string | null;
  subject: string | null;
  topic: string | null;
  message: string;
  status: "resolved";
  teacher_response: string;
  created_at: string;
  resolved_at: string | null;
  teacher_name: string;
};

function cleanMessageText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  let text = value.trim();

  if (
    text.startsWith("```") &&
    text.endsWith("```")
  ) {
    text = text
      .replace(/^```(?:json|text|txt)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }

  try {
    const parsed = JSON.parse(text);

    if (
      parsed &&
      typeof parsed === "object"
    ) {
      if (
        typeof parsed.answer === "string"
      ) {
        return parsed.answer.trim();
      }

      if (
        typeof parsed.message === "string"
      ) {
        return parsed.message.trim();
      }

      if (
        typeof parsed.content === "string"
      ) {
        return parsed.content.trim();
      }
    }
  } catch {
    // Not JSON.
  }

  text = text
    .replace(
      /^["']answer["']\s*[:=]\s*/i,
      ""
    )
    .replace(
      /^answer\s*[:=]\s*/i,
      ""
    )
    .trim();

  text = text
    .replace(
      /^`answer["']?\s*/i,
      ""
    )
    .trim();

  return text;
}

function normalizeMessage(row: any): Message {
  return {
    id: String(
      row?.id ??
        crypto.randomUUID()
    ),

    sender:
      row?.sender === "student"
        ? "student"
        : "ai",

    message: cleanMessageText(
      row?.message
    ),

    created_at:
      row?.created_at ||
      new Date().toISOString(),
  };
}

function cleanMessageList(
  rows: any[]
): Message[] {
  const normalized = rows
    .map(normalizeMessage)
    .filter(
      (message) =>
        message.message.trim()
          .length > 0
    );

  const result: Message[] = [];

  for (const message of normalized) {
    const previous =
      result[result.length - 1];

    if (
      previous &&
      previous.sender ===
        message.sender &&
      previous.message.trim() ===
        message.message.trim()
    ) {
      continue;
    }

    result.push(message);
  }

  return result;
}

function extractAiMessage(
  data: any
): string {
  if (
    typeof data?.message === "string"
  ) {
    return cleanMessageText(
      data.message
    );
  }

  if (
    data?.message &&
    typeof data.message ===
      "object"
  ) {
    if (
      typeof data.message.message ===
      "string"
    ) {
      return cleanMessageText(
        data.message.message
      );
    }

    if (
      typeof data.message.content ===
      "string"
    ) {
      return cleanMessageText(
        data.message.content
      );
    }

    if (
      typeof data.message.answer ===
      "string"
    ) {
      return cleanMessageText(
        data.message.answer
      );
    }
  }

  if (
    typeof data?.savedMessage
      ?.message === "string"
  ) {
    return cleanMessageText(
      data.savedMessage.message
    );
  }

  return "";
}

function extractTeacherResponse(
  row: any
): TeacherResponse | null {
  if (
    !row ||
    typeof row !== "object"
  ) {
    return null;
  }

  if (
    typeof row.teacher_response !==
      "string" ||
    !row.teacher_response.trim()
  ) {
    return null;
  }

  return {
    id: String(row.id),
    student_id: String(
      row.student_id
    ),
    teacher_id:
      row.teacher_id || null,
    subject:
      row.subject || null,
    topic:
      row.topic || null,
    message:
      typeof row.message ===
      "string"
        ? row.message
        : "",
    status: "resolved",
    teacher_response:
      row.teacher_response.trim(),
    created_at:
      row.created_at ||
      new Date().toISOString(),
    resolved_at:
      row.resolved_at || null,
    teacher_name:
      row.teacher_name ||
      "Your teacher",
  };
}

export default function ChatPage() {
  const supabase = createClient();

  const messagesEndRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const [sessionId, setSessionId] =
    useState<string | null>(null);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [input, setInput] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [pageLoading, setPageLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [feedback, setFeedback] =
    useState<
      "helpful" | "not-helpful" | null
    >(null);

  const [feedbackMessage, setFeedbackMessage] =
    useState<string | null>(null);

  const [sendingTeacherRequest, setSendingTeacherRequest] =
    useState(false);

  const [teacherResponses, setTeacherResponses] =
    useState<TeacherResponse[]>([]);

  const [loadingTeacherResponses, setLoadingTeacherResponses] =
    useState(false);

  const [teacherResponsesError, setTeacherResponsesError] =
    useState<string | null>(null);

  async function loadTeacherResponses() {
    try {
      setLoadingTeacherResponses(true);
      setTeacherResponsesError(null);

      /*
       * Get the current Supabase session.
       * The access token is sent to the API so the server
       * can reliably identify the logged-in student.
       */
      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(
          "Could not verify your login session."
        );
      }

      const accessToken =
        sessionData.session
          ?.access_token;

      if (!accessToken) {
        throw new Error(
          "You are not logged in. Please log in again."
        );
      }

      const response = await fetch(
        "/api/teacher/student-response",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      let data: any = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not load teacher responses."
        );
      }

      const responses: TeacherResponse[] =
        Array.isArray(data.requests)
          ? data.requests
              .map((item: unknown) =>
                extractTeacherResponse(item)
              )
              .filter(
                (
                  response: TeacherResponse | null
                ): response is TeacherResponse =>
                  response !== null
              )
          : [];

      setTeacherResponses(
        responses
      );
    } catch (err) {
      console.error(
        "Load teacher responses error:",
        err
      );

      setTeacherResponsesError(
        err instanceof Error
          ? err.message
          : "Could not load teacher responses."
      );
    } finally {
      setLoadingTeacherResponses(
        false
      );
    }
  }

  useEffect(() => {
    loadChat();
    loadTeacherResponses();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  async function loadChat() {
    try {
      setPageLoading(true);
      setError(null);
      setFeedback(null);
      setFeedbackMessage(null);

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "You are not logged in. Please log in again."
        );
      }

      const {
        data: existingSession,
        error: sessionError,
      } =
        await supabase
          .from("chat_sessions")
          .select(
            "id, student_id, title, created_at, updated_at"
          )
          .eq("student_id", user.id)
          .order("updated_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

      if (sessionError) {
        throw new Error(
          `Could not load chat session: ${sessionError.message}`
        );
      }

      let activeSessionId =
        existingSession?.id || null;

      if (!activeSessionId) {
        const {
          data: newSession,
          error:
            createSessionError,
        } =
          await supabase
            .from("chat_sessions")
            .insert({
              student_id: user.id,
              title: "LearnNova AI Chat",
            })
            .select(
              "id, student_id, title, created_at, updated_at"
            )
            .single();

        if (createSessionError) {
          throw new Error(
            `Could not create chat session: ${createSessionError.message}`
          );
        }

        activeSessionId =
          newSession.id;
      }

      setSessionId(
        activeSessionId
      );

      const {
        data: previousMessages,
        error: messagesError,
      } =
        await supabase
          .from("chat_messages")
          .select(
            "id, sender, message, created_at"
          )
          .eq(
            "session_id",
            activeSessionId
          )
          .order("created_at", {
            ascending: true,
          });

      if (messagesError) {
        throw new Error(
          `Could not load chat messages: ${messagesError.message}`
        );
      }

      const cleanedMessages =
        cleanMessageList(
          previousMessages || []
        );

      setMessages(
        cleanedMessages
      );
    } catch (err) {
      console.error(
        "Load chat error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not load the chat."
      );
    } finally {
      setPageLoading(false);
    }
  }

  async function sendMessage() {
    const trimmedMessage =
      input.trim();

    if (
      !trimmedMessage ||
      loading ||
      !sessionId
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    /*
     * Reset feedback for the new AI answer.
     */
    setFeedback(null);
    setFeedbackMessage(null);

    try {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "Your login session has expired. Please log in again."
        );
      }

      /*
       * SAVE STUDENT MESSAGE
       */
      const {
        data: savedStudentMessage,
        error:
          studentMessageError,
      } =
        await supabase
          .from("chat_messages")
          .insert({
            session_id: sessionId,
            sender: "student",
            message: trimmedMessage,
          })
          .select(
            "id, sender, message, created_at"
          )
          .single();

      if (studentMessageError) {
        throw new Error(
          `Could not save your message: ${studentMessageError.message}`
        );
      }

      const normalizedStudentMessage =
        normalizeMessage(
          savedStudentMessage
        );

      setMessages(
        (current) => {
          const duplicate =
            current.some(
              (item) =>
                item.sender ===
                  "student" &&
                item.message.trim() ===
                  trimmedMessage
            );

          if (duplicate) {
            return current;
          }

          return [
            ...current,
            normalizedStudentMessage,
          ];
        }
      );

      setInput("");

      /*
       * GET ACCESS TOKEN
       */
      const {
        data: sessionData,
      } =
        await supabase.auth.getSession();

      const accessToken =
        sessionData.session
          ?.access_token;

      /*
       * CALL LEARNNOVA AI
       */
      const response =
        await fetch(
          "/api/chat",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              message:
                trimmedMessage,
              sessionId,
              accessToken,
            }),
          }
        );

      let data: any = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.details ||
            `AI request failed with HTTP ${response.status}.`
        );
      }

      const aiText =
        extractAiMessage(data);

      if (!aiText) {
        throw new Error(
          "LearnNova AI returned an empty response."
        );
      }

      /*
       * SAVE AI MESSAGE
       */
      const {
        data: savedAiMessage,
        error:
          aiMessageSaveError,
      } =
        await supabase
          .from("chat_messages")
          .insert({
            session_id: sessionId,
            sender: "ai",
            message: aiText,
          })
          .select(
            "id, sender, message, created_at"
          )
          .single();

      if (aiMessageSaveError) {
        console.error(
          "AI message browser save error:",
          aiMessageSaveError
        );

        throw new Error(
          `The AI answered, but the response could not be saved: ${aiMessageSaveError.message}`
        );
      }

      const normalizedAiMessage =
        normalizeMessage(
          savedAiMessage
        );

      setMessages(
        (current) => {
          const duplicate =
            current.some(
              (item) =>
                item.sender ===
                  "ai" &&
                item.message.trim() ===
                  normalizedAiMessage.message.trim()
            );

          if (duplicate) {
            return current;
          }

          return [
            ...current,
            normalizedAiMessage,
          ];
        }
      );

      /*
       * UPDATE SESSION TIMESTAMP
       */
      const {
        error:
          updateSessionError,
      } =
        await supabase
          .from("chat_sessions")
          .update({
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            sessionId
          )
          .eq(
            "student_id",
            user.id
          );

      if (updateSessionError) {
        console.warn(
          "Could not update chat session timestamp:",
          updateSessionError
        );
      }
    } catch (err) {
      console.error(
        "Send message error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while sending your message."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  }

  /*
   * ---------------------------------------------------------
   * FEEDBACK
   * ---------------------------------------------------------
   */

  async function handleFeedback(
    type:
      | "helpful"
      | "not-helpful"
  ) {
    if (
      feedback ||
      sendingTeacherRequest
    ) {
      return;
    }

    setError(null);

    /*
     * YES
     */
    if (type === "helpful") {
      setFeedback("helpful");

      setFeedbackMessage(
        "Great! Glad LearnNova could help. 👍"
      );

      return;
    }

    /*
     * NO → TEACHER HELP
     */
    setSendingTeacherRequest(true);

    try {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "You are not logged in."
        );
      }

      /*
       * Find the latest student question.
       */
      const studentMessages =
        messages.filter(
          (item) =>
            item.sender ===
            "student"
        );

      /*
       * Find the latest AI answer.
       */
      const aiMessages =
        messages.filter(
          (item) =>
            item.sender === "ai"
        );

      const latestStudentMessage =
        studentMessages[
          studentMessages.length - 1
        ];

      const latestAiMessage =
        aiMessages[
          aiMessages.length - 1
        ];

      if (!latestStudentMessage) {
        throw new Error(
          "We could not find your question."
        );
      }

      if (!latestAiMessage) {
        throw new Error(
          "We could not find the AI response."
        );
      }

      /*
       * Create teacher help request.
       */
      const { error } =
        await supabase
          .from("help_requests")
          .insert({
            student_id: user.id,
            teacher_id: null,
            subject: null,
            topic: null,
            message: `Student question: ${latestStudentMessage.message}

LearnNova AI response: ${latestAiMessage.message}`,
            status: "pending",
          });

      if (error) {
        console.error(
          "Help request error:",
          error
        );

        throw new Error(
          `Could not send teacher help request: ${error.message}`
        );
      }

      /*
       * Only mark the button as completed
       * after the database insert succeeds.
       */
      setFeedback(
        "not-helpful"
      );

      setFeedbackMessage(
        "Your question has been sent to a teacher. 👨‍🏫"
      );

      /*
       * Refresh teacher responses.
       */
      await loadTeacherResponses();
    } catch (err) {
      console.error(
        "Feedback error:",
        err
      );

      setFeedback(null);

      setError(
        err instanceof Error
          ? err.message
          : "Could not send teacher help request."
      );
    } finally {
      setSendingTeacherRequest(
        false
      );
    }
  }

  function formatTeacherDate(
    value: string | null
  ) {
    if (!value) {
      return "";
    }

    try {
      return new Date(
        value
      ).toLocaleString(
        undefined,
        {
          dateStyle: "medium",
          timeStyle: "short",
        }
      );
    } catch {
      return "";
    }
  }

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-white">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Bot className="w-6 h-6" />
          </div>

          <div className="flex items-center gap-2 text-slate-300">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading LearnNova AI...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />

        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />

        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-6 lg:px-8">
        <div className="flex flex-col min-h-[calc(100vh-3rem)]">

          {/* HEADER */}

          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Sparkles className="w-6 h-6 text-white" />
              </div>

              <div>
                <h1 className="text-xl font-bold">
                  LearnNova AI
                </h1>

                <p className="text-sm text-slate-400">
                  Your personalized learning assistant
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              AI Online
            </div>
          </div>

          {/* TEACHER RESPONSES */}

          {teacherResponses.length > 0 && (
            <div className="mb-5 rounded-3xl border border-blue-400/20 bg-gradient-to-br from-blue-500/[0.08] to-purple-500/[0.08] backdrop-blur-xl shadow-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>

                  <div>
                    <h2 className="font-semibold text-white">
                      Teacher Responses
                    </h2>

                    <p className="text-xs text-slate-400">
                      Your teacher has responded to your questions.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    loadTeacherResponses
                  }
                  disabled={
                    loadingTeacherResponses
                  }
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10 transition disabled:opacity-50"
                >
                  {loadingTeacherResponses ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Clock3 className="w-3.5 h-3.5" />
                  )}

                  Refresh
                </button>
              </div>

              <div className="p-4 space-y-3">
                {teacherResponses.map(
                  (teacherResponse) => (
                    <div
                      key={
                        teacherResponse.id
                      }
                      className="rounded-2xl bg-white/[0.05] border border-white/10 p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">
                              {
                                teacherResponse.teacher_name
                              }
                            </span>

                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-[10px] text-emerald-300">
                              <Check className="w-3 h-3" />
                              Resolved
                            </span>
                          </div>

                          {(teacherResponse.subject ||
                            teacherResponse.topic) && (
                            <p className="text-xs text-slate-500 mt-1">
                              {[
                                teacherResponse.subject,
                                teacherResponse.topic,
                              ]
                                .filter(Boolean)
                                .join(" • ")}
                            </p>
                          )}
                        </div>

                        {teacherResponse.resolved_at && (
                          <span className="text-[11px] text-slate-500">
                            {formatTeacherDate(
                              teacherResponse.resolved_at
                            )}
                          </span>
                        )}
                      </div>

                      <div className="mb-3">
                        <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">
                          Your question
                        </p>

                        <div className="rounded-xl bg-black/20 border border-white/5 px-3 py-2 text-sm text-slate-300 whitespace-pre-wrap">
                          {
                            teacherResponse.message
                          }
                        </div>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-blue-300 mb-1">
                          Teacher's response
                        </p>

                        <div className="rounded-xl bg-blue-500/10 border border-blue-400/20 px-4 py-3 text-sm text-slate-100 leading-7 whitespace-pre-wrap">
                          {
                            teacherResponse.teacher_response
                          }
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {teacherResponsesError && (
            <div className="mb-5 rounded-xl border border-orange-400/20 bg-orange-400/10 px-4 py-3 text-sm text-orange-200">
              {teacherResponsesError}
            </div>
          )}

          {/* CHAT CONTAINER */}

          <div className="flex-1 min-h-0 rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col">

            {/* MESSAGES */}

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 min-h-[400px]">

              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <div className="max-w-xl text-center">
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mb-5">
                      <MessageCircle className="w-9 h-9 text-blue-300" />
                    </div>

                    <h2 className="text-2xl font-bold mb-2">
                      Ask LearnNova anything
                    </h2>

                    <p className="text-slate-400">
                      Your AI tutor understands your
                      learning profile and can help you
                      learn step-by-step.
                    </p>
                  </div>
                </div>
              )}

              {messages.map(
                (item) => (
                  <div
                    key={item.id}
                    className={`flex gap-3 ${
                      item.sender ===
                      "student"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    {item.sender ===
                      "ai" && (
                      <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Bot className="w-5 h-5" />
                      </div>
                    )}

                    <div
                      className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                        item.sender ===
                        "student"
                          ? "bg-blue-600 text-white rounded-br-md"
                          : "bg-white/[0.07] border border-white/10 text-slate-100 rounded-bl-md"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {item.sender ===
                        "student" ? (
                          <>
                            <User className="w-3.5 h-3.5 opacity-70" />

                            <span className="text-xs opacity-70">
                              You
                            </span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-blue-300" />

                            <span className="text-xs text-blue-300">
                              LearnNova AI
                            </span>
                          </>
                        )}
                      </div>

                      <div className="whitespace-pre-wrap text-sm leading-7">
                        {item.message}
                      </div>
                    </div>
                  </div>
                )
              )}

              {loading && (
                <div className="flex gap-3">
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>

                  <div className="rounded-2xl rounded-bl-md bg-white/[0.07] border border-white/10 px-4 py-3">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      LearnNova is thinking...
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ERROR */}

            {error && (
              <div className="mx-4 mb-3 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {/* FEEDBACK */}

            {messages.some(
              (item) =>
                item.sender === "ai"
            ) &&
              !loading && (
                <div className="px-4 pb-3 flex flex-col items-center justify-center gap-2">

                  {!feedbackMessage && (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xs text-slate-500">
                        Was this helpful?
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          handleFeedback(
                            "helpful"
                          )
                        }
                        disabled={
                          !!feedback ||
                          sendingTeacherRequest
                        }
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition ${
                          feedback ===
                          "helpful"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/20"
                            : "bg-white/5 text-slate-400 hover:bg-white/10"
                        }`}
                      >
                        {feedback ===
                        "helpful" ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <ThumbsUp className="w-3.5 h-3.5" />
                        )}

                        Yes
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleFeedback(
                            "not-helpful"
                          )
                        }
                        disabled={
                          !!feedback ||
                          sendingTeacherRequest
                        }
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition ${
                          feedback ===
                          "not-helpful"
                            ? "bg-orange-500/20 text-orange-300 border border-orange-400/20"
                            : "bg-white/5 text-slate-400 hover:bg-white/10"
                        }`}
                      >
                        {sendingTeacherRequest ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ThumbsDown className="w-3.5 h-3.5" />
                        )}

                        No, I need teacher help
                      </button>
                    </div>
                  )}

                  {feedbackMessage && (
                    <div
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs border ${
                        feedback ===
                        "helpful"
                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-400/20"
                          : "bg-blue-500/10 text-blue-300 border-blue-400/20"
                      }`}
                    >
                      <Check className="w-4 h-4" />

                      {feedbackMessage}
                    </div>
                  )}
                </div>
              )}

            {/* INPUT */}

            <div className="p-4 border-t border-white/10 bg-black/10">
              <div className="flex gap-3 items-end">
                <textarea
                  value={input}
                  onChange={(event) =>
                    setInput(
                      event.target.value
                    )
                  }
                  onKeyDown={
                    handleKeyDown
                  }
                  placeholder="Ask LearnNova something..."
                  rows={1}
                  disabled={loading}
                  className="flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-400/40 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={
                    sendMessage
                  }
                  disabled={
                    loading ||
                    !input.trim() ||
                    !sessionId
                  }
                  className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 transition hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>

              <p className="text-center text-[11px] text-slate-600 mt-2">
                LearnNova AI can make mistakes. Use it
                as a learning assistant.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}