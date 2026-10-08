"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const questions = [
  {
    question: "What is 12 × 8?",
    options: ["86", "96", "108", "112"],
    answer: "96",
    topic: "Arithmetic",
  },
  {
    question: "What is 45 ÷ 5?",
    options: ["7", "8", "9", "10"],
    answer: "9",
    topic: "Division",
  },
  {
    question: "If x + 7 = 15, what is x?",
    options: ["6", "7", "8", "9"],
    answer: "8",
    topic: "Algebra",
  },
  {
    question: "What is 25% of 200?",
    options: ["25", "40", "50", "75"],
    answer: "50",
    topic: "Percentages",
  },
  {
    question: "Which number is a prime number?",
    options: ["12", "15", "17", "21"],
    answer: "17",
    topic: "Number System",
  },
];

export default function DiagnosticPage() {
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, string>
  >({});

  const [score, setScore] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    setSaving(true);
    setMessage("");

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You must be logged in to submit the test.");
      setSaving(false);
      return;
    }

    let correctAnswers = 0;

    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.answer) {
        correctAnswers++;
      }
    });

    const finalScore = Math.round(
      (correctAnswers / questions.length) * 100
    );

    setScore(finalScore);

    // 1. Save the diagnostic test
    const { data: diagnosticTest, error: testError } = await supabase
      .from("diagnostic_tests")
      .insert({
        student_id: user.id,
        subject: "Mathematics",
        score: finalScore,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (testError) {
      console.error(testError);
      setMessage(
        `Could not save diagnostic test: ${testError.message}`
      );
      setSaving(false);
      return;
    }

    // 2. Prepare topic results
    const diagnosticResults = questions.map((question, index) => {
      const isCorrect =
        selectedAnswers[index] === question.answer;

      const topicScore = isCorrect ? 100 : 0;

      let gapLevel: "low" | "medium" | "high";

      if (topicScore >= 80) {
        gapLevel = "low";
      } else if (topicScore >= 50) {
        gapLevel = "medium";
      } else {
        gapLevel = "high";
      }

      return {
        diagnostic_test_id: diagnosticTest.id,
        topic: question.topic,
        score: topicScore,
        gap_level: gapLevel,
      };
    });

    // 3. Save diagnostic results
    const { error: resultsError } = await supabase
      .from("diagnostic_results")
      .insert(diagnosticResults);

    if (resultsError) {
      console.error(resultsError);
      setMessage(
        `Test saved, but topic results could not be saved: ${resultsError.message}`
      );
      setSaving(false);
      return;
    }

    // 4. Prepare learning gaps
    const learningGaps = diagnosticResults.map((result) => {
      let recommendation = "";

      if (result.gap_level === "high") {
        recommendation = `You need more practice with ${result.topic}. Start with basic concepts and solve simple problems first.`;
      } else if (result.gap_level === "medium") {
        recommendation = `You have some understanding of ${result.topic}, but more practice will help improve your confidence.`;
      } else {
        recommendation = `You are doing well in ${result.topic}. Keep practicing to maintain your understanding.`;
      }

      return {
        student_id: user.id,
        subject: "Mathematics",
        topic: result.topic,
        gap_level: result.gap_level,
        recommendation,
      };
    });

    // 5. Save learning gaps
    const { error: gapsError } = await supabase
      .from("learning_gaps")
      .insert(learningGaps);

    if (gapsError) {
      console.error(gapsError);
      setMessage(
        `Diagnostic saved, but learning gaps could not be saved: ${gapsError.message}`
      );
      setSaving(false);
      return;
    }

    setMessage("Diagnostic results and learning gaps saved successfully!");
    setSaving(false);
  }

  function handleAnswer(questionIndex: number, answer: string) {
    setSelectedAnswers((previous) => ({
      ...previous,
      [questionIndex]: answer,
    }));
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">

        <div className="mb-8">
          <p className="text-sm font-medium text-blue-600">
            AI Gap Diagnosis
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-800">
            Let's find your learning gaps
          </h1>

          <p className="mt-2 text-slate-500">
            Answer the questions below. Your results will help us
            understand which topics you may need more practice with.
          </p>
        </div>

        <div className="space-y-6">
          {questions.map((question, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <p className="font-semibold text-slate-800">
                {index + 1}. {question.question}
              </p>

              <div className="mt-4 space-y-3">
                {question.options.map((option) => (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50"
                  >
                    <input
                      type="radio"
                      name={`question-${index}`}
                      value={option}
                      checked={selectedAnswers[index] === option}
                      onChange={() =>
                        handleAnswer(index, option)
                      }
                      className="h-4 w-4"
                    />

                    <span className="text-slate-700">
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="mt-8 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving results..." : "Submit Diagnostic Test"}
        </button>

        {message && (
          <div className="mt-6 rounded-xl bg-white p-4 text-center shadow-sm">
            <p className="text-sm text-slate-600">
              {message}
            </p>
          </div>
        )}

        {score !== null && (
          <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-6 text-center">
            <p className="text-sm font-medium text-blue-600">
              Your Diagnostic Score
            </p>

            <p className="mt-2 text-5xl font-bold text-slate-800">
              {score}%
            </p>

            <p className="mt-3 text-slate-600">
              Your answers have been evaluated successfully.
            </p>
          </div>
        )}

      </div>
    </main>
  );
}