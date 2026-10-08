"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  Brain,
  BarChart3,
  BookOpen,
  ClipboardList,
  User,
  LogOut,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "AI Tutor",
    href: "/dashboard/chat",
    icon: Bot,
  },
  {
    name: "AI Diagnosis",
    href: "/dashboard/diagnostic",
    icon: Brain,
  },
  {
    name: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    name: "Courses",
    href: "/dashboard/courses",
    icon: BookOpen,
  },
  {
    name: "Assignments",
    href: "/dashboard/assignments",
    icon: ClipboardList,
  },
  {
    name: "Profile",
    href: "/dashboard/profile",
    icon: User,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  async function handleLogout() {
    setLoggingOut(true);

    const supabase = createClient();

    await supabase.auth.signOut();

    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-purple-600/10 blur-3xl" />

        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      {/* Mobile top bar */}
      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-slate-950/90 px-4 backdrop-blur-xl lg:hidden">
        <Link
          href="/dashboard"
          className="flex items-center gap-2"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
            <Sparkles size={18} />
          </div>

          <span className="text-lg font-bold">
            LearnNova
          </span>
        </Link>

        <button
          onClick={() =>
            setMobileMenuOpen((value) => !value)
          }
          className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? (
            <X size={24} />
          ) : (
            <Menu size={24} />
          )}
        </button>
      </header>

      {/* Mobile navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/95 pt-16 backdrop-blur-xl lg:hidden">
          <nav className="space-y-2 p-4">
            {navigation.map((item) => {
              const Icon = item.icon;

              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() =>
                    setMobileMenuOpen(false)
                  }
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon size={20} />

                  <span className="font-medium">
                    {item.name}
                  </span>
                </Link>
              );
            })}

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-6 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
            >
              <LogOut size={20} />

              <span className="font-medium">
                {loggingOut
                  ? "Logging out..."
                  : "Logout"}
              </span>
            </button>
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-64 border-r border-white/10 bg-slate-950/80 backdrop-blur-xl lg:flex lg:flex-col">
        {/* Logo */}
        <div className="flex h-20 items-center border-b border-white/10 px-6">
          <Link
            href="/dashboard"
            className="group flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 transition duration-300 group-hover:scale-105 group-hover:shadow-blue-600/40">
              <Sparkles size={20} />
            </div>

            <div>
              <div className="text-lg font-bold tracking-tight">
                LearnNova
              </div>

              <div className="text-xs text-slate-500">
                AI Learning Platform
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
          <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Learning
          </div>

          {navigation
            .slice(0, 5)
            .map((item) => {
              const Icon = item.icon;

              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon
                    size={19}
                    className={
                      isActive
                        ? "text-white"
                        : "text-slate-500 transition group-hover:text-slate-200"
                    }
                  />

                  <span>{item.name}</span>

                  {isActive && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </Link>
              );
            })}

          <div className="mb-3 mt-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Manage
          </div>

          {navigation
            .slice(5)
            .map((item) => {
              const Icon = item.icon;

              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon
                    size={19}
                    className={
                      isActive
                        ? "text-white"
                        : "text-slate-500 transition group-hover:text-slate-200"
                    }
                  />

                  <span>{item.name}</span>
                </Link>
              );
            })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 rounded-xl border border-blue-500/10 bg-blue-500/5 p-3">
            <div className="flex items-center gap-2">
              <Sparkles
                size={16}
                className="text-blue-400"
              />

              <span className="text-xs font-semibold text-blue-300">
                AI Learning
              </span>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Your AI tutor learns from your progress
              and helps you improve.
            </p>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
          >
            <LogOut size={19} />

            <span>
              {loggingOut
                ? "Logging out..."
                : "Logout"}
            </span>
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="relative min-h-screen lg:pl-64">
        {/* Desktop header */}
        <header className="fixed left-64 right-0 top-0 z-30 hidden h-20 items-center justify-between border-b border-white/10 bg-slate-950/70 px-8 backdrop-blur-xl lg:flex">
          <div>
            <p className="text-sm text-slate-500">
              Your learning journey
            </p>

            <h1 className="text-lg font-semibold text-white">
              Keep moving forward.
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400 xl:flex">
              <Sparkles
                size={14}
                className="text-blue-400"
              />

              AI-powered learning
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold">
                R
              </div>

              <div className="hidden xl:block">
                <div className="text-sm font-medium text-white">
                  Reggie
                </div>

                <div className="text-xs text-slate-500">
                  Student
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-screen px-4 pb-8 pt-20 sm:px-6 lg:px-8 lg:pt-24">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}