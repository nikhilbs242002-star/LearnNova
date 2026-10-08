"use client";

import { useEffect, useState } from "react";

type LearnNovaIntroProps = {
  onComplete: () => void;
};

export default function LearnNovaIntro({
  onComplete,
}: LearnNovaIntroProps) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const closeTimer = setTimeout(() => {
      setClosing(true);
    }, 2600);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3400);

    return () => {
      clearTimeout(closeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-slate-950 transition-opacity duration-700 ${
        closing ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Background glow */}
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20 blur-[100px]" />

        <div className="absolute left-[20%] top-[20%] h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="absolute bottom-[15%] right-[15%] h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center">

        {/* Book */}
        <div className="book-scene">

          <div className="book">

            {/* Left page */}
            <div className="book-page book-left">
              <div className="page-content">
                <div className="page-line w-20" />
                <div className="page-line w-28" />
                <div className="page-line w-24" />
              </div>
            </div>

            {/* Right page */}
            <div className="book-page book-right">
              <div className="page-content">
                <div className="page-line w-24" />
                <div className="page-line w-28" />
                <div className="page-line w-20" />
              </div>
            </div>

            {/* Center spine */}
            <div className="book-spine" />

          </div>
        </div>

        {/* Brand */}
        <div className="mt-12 text-center">

          <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">
              LearnNova
            </span>
          </h1>

          <p className="mt-4 text-sm font-medium tracking-[0.3em] text-slate-400 uppercase">
            Learn smarter. Grow further.
          </p>

        </div>

        {/* Loading indicator */}
        <div className="mt-8 flex items-center gap-2">

          <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-cyan-400"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-purple-400"
            style={{ animationDelay: "300ms" }}
          />

        </div>

      </div>

      <style jsx>{`
        .book-scene {
          perspective: 1200px;
          width: 260px;
          height: 170px;
        }

        .book {
          position: relative;
          width: 260px;
          height: 170px;
          transform-style: preserve-3d;
          animation: bookFloat 2.6s ease-in-out forwards;
        }

        .book-page {
          position: absolute;
          top: 0;
          width: 130px;
          height: 170px;
          background: linear-gradient(
            135deg,
            #ffffff 0%,
            #f8fafc 70%,
            #e2e8f0 100%
          );
          box-shadow:
            0 15px 30px rgba(0, 0, 0, 0.25),
            inset 0 0 20px rgba(148, 163, 184, 0.12);
        }

        .book-left {
          left: 0;
          border-radius: 10px 2px 2px 10px;
          transform-origin: right center;
          animation: openLeft 2.1s cubic-bezier(0.22, 1, 0.36, 1)
            forwards;
        }

        .book-right {
          right: 0;
          border-radius: 2px 10px 10px 2px;
          transform-origin: left center;
          animation: openRight 2.1s cubic-bezier(0.22, 1, 0.36, 1)
            forwards;
        }

        .book-spine {
          position: absolute;
          left: 50%;
          top: 0;
          width: 4px;
          height: 170px;
          transform: translateX(-50%);
          background: linear-gradient(
            to bottom,
            #cbd5e1,
            #94a3b8,
            #cbd5e1
          );
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
          z-index: 5;
        }

        .page-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 35px 20px;
          opacity: 0;
          animation: contentAppear 1s ease 1.2s forwards;
        }

        .page-line {
          height: 5px;
          border-radius: 999px;
          background: #cbd5e1;
        }

        @keyframes openLeft {
          0% {
            transform: rotateY(0deg);
          }

          100% {
            transform: rotateY(-155deg);
          }
        }

        @keyframes openRight {
          0% {
            transform: rotateY(0deg);
          }

          100% {
            transform: rotateY(155deg);
          }
        }

        @keyframes bookFloat {
          0% {
            transform: translateY(20px) scale(0.85);
          }

          35% {
            transform: translateY(0) scale(1);
          }

          75% {
            transform: translateY(-5px) scale(1);
          }

          100% {
            transform: translateY(-5px) scale(1);
          }
        }

        @keyframes contentAppear {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}