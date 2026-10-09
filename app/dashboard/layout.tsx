
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MessageCircle,
  Brain,
  BarChart3,
  BookOpen,
  ClipboardList,
  UserRound,
  Video,
  LogOut,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "AI Tutor", href: "/dashboard/chat", icon: MessageCircle },
  { name: "AI Diagnosis", href: "/dashboard/diagnostic", icon: Brain },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Courses", href: "/dashboard/courses", icon: BookOpen },
  { name: "Assignments", href: "/dashboard/assignments", icon: ClipboardList },
  { name: "Video Tutor", href: "/dashboard/video-tutor", icon: Video },
  { name: "Profile", href: "/dashboard/profile", icon: UserRound },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const supabase = createClient();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
      setLoggingOut(false);
    }
  };

  return (
    <div className="ln-shell min-h-screen">
      {/* Desktop sidebar */}
      <aside className="ln-sidebar fixed inset-y-0 left-0 z-40 hidden w-[270px] flex-col border-r lg:flex">
        <Link href="/dashboard" className="ln-brand flex items-center gap-3 px-7 py-7">
          <div className="ln-brand-icon flex h-11 w-11 items-center justify-center rounded-2xl">
            <Sparkles size={22} />
          </div>
          <div>
            <p className="text-xl font-bold tracking-tight">LearnNova</p>
            <p className="ln-muted text-xs tracking-widest uppercase">
              Your learning space
            </p>
          </div>
        </Link>

        <div className="px-6 pb-3 pt-5">
          <p className="ln-muted px-3 text-[10px] font-semibold tracking-[0.22em] uppercase">
            Workspace
          </p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 pb-5">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`ln-nav-item group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                  active ? "ln-nav-active" : ""
                }`}
              >
                <Icon size={19} className="shrink-0" />
                <span>{item.name}</span>
                {active && <span className="ln-active-dot ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 pb-5">
          <div className="ln-sidebar-note mb-3 rounded-2xl p-4">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles size={16} className="ln-gold-text" />
              <span className="text-sm font-semibold">Keep growing</span>
            </div>
            <p className="ln-muted text-xs leading-5">
              Small steps every day lead to remarkable progress.
            </p>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="ln-logout flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium disabled:opacity-50"
          >
            <LogOut size={18} />
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="ln-mobile-header sticky top-0 z-50 flex items-center justify-between border-b px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="ln-brand-icon flex h-9 w-9 items-center justify-center rounded-xl">
            <Sparkles size={19} />
          </div>
          <span className="text-lg font-bold">LearnNova</span>
        </Link>

        <button
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          className="ln-icon-button rounded-xl p-2"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile navigation */}
      {mobileMenuOpen && (
        <div className="ln-mobile-menu fixed inset-x-0 bottom-0 top-[61px] z-40 overflow-y-auto p-4 lg:hidden">
          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`ln-nav-item flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                    active ? "ln-nav-active" : ""
                  }`}
                >
                  <Icon size={19} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="ln-logout mt-5 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium disabled:opacity-50"
          >
            <LogOut size={18} />
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      )}

      {/* Main content */}
      <main className="ln-main min-h-screen lg:ml-[270px]">
        <div className="ln-topbar hidden items-center justify-between border-b px-8 py-4 lg:flex">
          <div>
            <p className="ln-muted text-xs">YOUR PERSONAL LEARNING JOURNEY</p>
            <p className="mt-1 text-sm font-medium">
              Learn something wonderful today.
            </p>
          </div>
          <div className="ln-status flex items-center gap-2 rounded-full px-3 py-2 text-xs">
            <span className="ln-status-dot" />
            Your learning space
          </div>
        </div>

        <div className="ln-page-content mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
