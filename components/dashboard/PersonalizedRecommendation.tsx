"use client";

import Link from "next/link";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock3,
  Sparkles,
  Target,
} from "lucide-react";

type LearningGap = {
  id: string;
  subject: string;
  topic: string;
  gap_level: "low" | "medium" | "high";
  recommendation: string | null;
};

type PersonalizedRecommendationProps = {
  learningGaps: LearningGap[];
  pendingAssignments: number;
};

export default function PersonalizedRecommendation({
  learningGaps,
  pendingAssignments,
}: PersonalizedRecommendationProps) {
  const priorityOrder = {
    high: 3,
    medium: 2,
    low: 1,
  };

  const sortedGaps = [...learningGaps].sort(
    (a, b) => priorityOrder[b.gap_level] - priorityOrder[a.gap_level]
  );

  const priorityGap = sortedGaps.find(
    (gap) => gap.gap_level === "high"
  );

  const mediumGap = sortedGaps.find(
    (gap) => gap.gap_level === "medium"
  );

  const lowGap = sortedGaps.find(
    (gap) => gap.gap_level === "low"
  );

  let title = "Build your learning momentum";

  let description =
    "Your overall learning is looking healthy. Keep practicing consistently and stay ahead of your upcoming work.";

  let reason =
    "LearnNova could not find a major learning gap, so consistency is your best next step.";

  let buttonText = "Continue learning";

  let buttonHref = "/dashboard/courses";

  let status = "On track";

  let icon = <Sparkles className="h-6 w-6" />;

  if (priorityGap) {
    title = priorityGap.topic;

    description =
      priorityGap.recommendation ||
      `LearnNova recommends focusing on ${priorityGap.topic} in ${priorityGap.subject}.`;

    reason =
      "This topic has been identified as a high-priority learning gap.";

    buttonText = "Work on this topic";

    buttonHref = "/dashboard/diagnostic";

    status = "High priority";

    icon = <Target className="h-6 w-6" />;
  } else if (mediumGap) {
    title = mediumGap.topic;

    description =
      mediumGap.recommendation ||
      `A little more practice in ${mediumGap.topic} could strengthen your understanding.`;

    reason =
      "Your learning data suggests this topic would benefit from additional practice.";

    buttonText = "Practice this topic";

    buttonHref = "/dashboard/diagnostic";

    status = "Recommended";

    icon = <Brain className="h-6 w-6" />;
  } else if (lowGap && pendingAssignments > 0) {
    title = "Stay ahead of your assignments";

    description =
      `Your diagnostic results look strong. You currently have ${pendingAssignments} pending ${
        pendingAssignments === 1 ? "assignment" : "assignments"
      }, so completing those is the most useful next step.`;

    reason =
      "Your learning gaps are currently low, so LearnNova is prioritizing your unfinished work.";

    buttonText = "View assignments";

    buttonHref = "/dashboard/assignments";

    status = "Smart next step";

    icon = <Clock3 className="h-6 w-6" />;
  } else if (lowGap) {
    title = "Keep strengthening your skills";

    description =
      "Your diagnostic results show strong understanding across the topics you've tested. Keep practicing to maintain your progress.";

    reason =
      "No major learning gaps were detected in your latest learning data.";

    buttonText = "Explore courses";

    buttonHref = "/dashboard/courses";

    status = "Excellent progress";

    icon = <CheckCircle2 className="h-6 w-6" />;
  } else if (pendingAssignments > 0) {
    title = "Complete your pending work";

    description =
      `You have ${pendingAssignments} pending ${
        pendingAssignments === 1 ? "assignment" : "assignments"
      }. Completing them will help LearnNova understand your progress even better.`;

    reason =
      "LearnNova does not have enough diagnostic gap data yet, so your pending work is the best next action.";

    buttonText = "View assignments";

    buttonHref = "/dashboard/assignments";

    status = "Next step";

    icon = <Clock3 className="h-6 w-6" />;
  }

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-xl shadow-slate-200/40">
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-100/60 blur-3xl" />

      <div className="absolute -bottom-24 left-20 h-56 w-56 rounded-full bg-purple-100/50 blur-3xl" />

      <div className="relative p-7 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-200">
              {icon}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
                  Personalized learning
                </p>

                <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                  AI powered
                </span>
              </div>

              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Your Next Learning Step
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                LearnNova looks at your learning data and suggests what
                deserves your attention next.
              </p>
            </div>
          </div>

          <span
            className={`inline-flex w-fit items-center rounded-full px-3 py-1.5 text-xs font-bold ${
              status === "High priority"
                ? "bg-red-50 text-red-600"
                : status === "Recommended"
                  ? "bg-amber-50 text-amber-600"
                  : status === "Smart next step"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-green-50 text-green-600"
            }`}
          >
            {status}
          </span>
        </div>

        <div className="relative mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6">
          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-blue-100/40 blur-2xl" />

          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Focus on
            </p>

            <h3 className="mt-2 text-2xl font-black text-slate-900">
              {title}
            </h3>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              {description}
            </p>

            <div className="mt-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

              <div>
                <p className="text-sm font-bold text-blue-800">
                  Why this?
                </p>

                <p className="mt-1 text-sm leading-6 text-blue-700">
                  {reason}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href={buttonHref}
                className="group inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-blue-200"
              >
                {buttonText}

                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-400">
          <span className="rounded-full bg-slate-100 px-3 py-1.5">
            Diagnostic results
          </span>

          <span>→</span>

          <span className="rounded-full bg-slate-100 px-3 py-1.5">
            Learning gaps
          </span>

          <span>→</span>

          <span className="rounded-full bg-slate-100 px-3 py-1.5">
            Your next step
          </span>
        </div>
      </div>
    </section>
  );
}