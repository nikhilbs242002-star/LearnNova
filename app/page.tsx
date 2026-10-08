import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-800">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-10">
        {/* Header */}
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-slate-900"
          >
            Learn<span className="text-blue-600">Nova</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white hover:shadow-sm"
            >
              Log in
            </Link>

            <Link
              href="/register"
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Get started
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="flex flex-1 items-center py-16 lg:py-20">
          <div className="grid w-full items-center gap-14 lg:grid-cols-2">
            {/* Left */}
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                AI-powered learning
              </div>

              <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight text-slate-900 sm:text-6xl">
                Learn smarter.
                <span className="block text-blue-600">
                  Grow further.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                LearnNova is your personalized learning companion. Understand
                difficult concepts, track your progress, discover learning
                gaps, and get help when you need it.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/register"
                  className="rounded-2xl bg-blue-600 px-6 py-3.5 font-semibold text-white shadow-xl shadow-blue-600/20 transition hover:-translate-y-1 hover:bg-blue-700"
                >
                  Start learning
                </Link>

                <Link
                  href="/login"
                  className="rounded-2xl border border-slate-200 bg-white px-6 py-3.5 font-semibold text-slate-700 shadow-sm transition hover:-translate-y-1 hover:border-slate-300"
                >
                  I already have an account
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-6 text-sm text-slate-500">
                <span>✓ Personalized learning</span>
                <span>✓ AI Tutor</span>
                <span>✓ Progress tracking</span>
              </div>
            </div>

            {/* Right */}
            <div className="relative">
              <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-blue-200/40 blur-3xl" />
              <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-indigo-200/50 blur-3xl" />

              <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/80 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Student Dashboard
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                      Welcome back 👋
                    </h2>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 font-bold text-blue-700">
                    L
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                  <p className="text-sm text-blue-100">
                    Overall progress
                  </p>

                  <div className="mt-2 flex items-end justify-between">
                    <span className="text-4xl font-bold">88%</span>
                    <span className="text-sm text-blue-100">
                      Excellent progress
                    </span>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
                    <div className="h-full w-[88%] rounded-full bg-white" />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">Courses</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      3
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Currently enrolled
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">Assignments</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      5
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Waiting for you
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                  <p className="text-sm font-semibold text-blue-900">
                    ✨ Personalized learning
                  </p>
                  <p className="mt-1 text-sm leading-6 text-blue-700">
                    Get recommendations based on your progress and learning
                    needs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="grid gap-4 border-t border-slate-200/70 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white/70 p-5 shadow-sm">
            <div className="text-2xl">🤖</div>
            <h3 className="mt-3 font-semibold text-slate-900">AI Tutor</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Ask questions and get personalized explanations.
            </p>
          </div>

          <div className="rounded-2xl bg-white/70 p-5 shadow-sm">
            <div className="text-2xl">📊</div>
            <h3 className="mt-3 font-semibold text-slate-900">Analytics</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Understand your academic performance at a glance.
            </p>
          </div>

          <div className="rounded-2xl bg-white/70 p-5 shadow-sm">
            <div className="text-2xl">🎯</div>
            <h3 className="mt-3 font-semibold text-slate-900">
              Gap Diagnosis
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Identify topics that need more practice.
            </p>
          </div>

          <div className="rounded-2xl bg-white/70 p-5 shadow-sm">
            <div className="text-2xl">👨‍🏫</div>
            <h3 className="mt-3 font-semibold text-slate-900">
              Teacher Support
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Escalate questions when you need human help.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-200/70 py-6 text-center text-sm text-slate-500">
          LearnNova — Learn smarter. Grow further.
        </footer>
      </div>
    </main>
  );
}