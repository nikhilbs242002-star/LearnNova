
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
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#101713] transition-opacity duration-700 ${
        closing ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Forest-green background with champagne and sage glows */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[550px] w-[550px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D8B878]/[0.10] blur-[120px]" />

        <div className="absolute left-[15%] top-[15%] h-64 w-64 rounded-full bg-[#B9E4A5]/[0.07] blur-[100px]" />

        <div className="absolute bottom-[10%] right-[12%] h-72 w-72 rounded-full bg-[#D8B878]/[0.07] blur-[110px]" />

        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#080D09]/50" />
      </div>

      {/* Intro content */}
      <div className="relative flex flex-col items-center px-5">
        {/* Opening book */}
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

            {/* Book spine */}
            <div className="book-spine" />
          </div>
        </div>

        {/* Champagne-gold brand */}
        <div className="mt-12 text-center">
          <h1 className="brand-title text-5xl font-black tracking-tight sm:text-6xl md:text-7xl">
            LearnNova
          </h1>

          <p className="mt-4 text-xs font-medium tracking-[0.22em] text-[#C2CBB6] uppercase sm:text-sm sm:tracking-[0.3em]">
            Learn smarter. Grow further.
          </p>
        </div>

        {/* Gold and sage loading dots */}
        <div className="mt-9 flex items-center gap-2.5">
          <span className="loading-dot loading-gold" />
          <span className="loading-dot loading-sage" />
          <span className="loading-dot loading-ivory" />
        </div>
      </div>

      <style jsx>{`
        .book-scene {
          perspective: 1200px;
          width: 264px;
          height: 190px;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 15px 30px rgba(0, 0, 0, 0.25));
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
          overflow: hidden;
          background: linear-gradient(
            135deg,
            #fffdf4 0%,
            #f5ebd1 70%,
            #e8d5a9 100%
          );
          box-shadow:
            0 12px 28px rgba(0, 0, 0, 0.24),
            inset 0 0 18px rgba(216, 184, 120, 0.13);
          backface-visibility: visible;
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
            to right,
            #b38c48,
            #f5dfa6,
            #c19a55
          );
          box-shadow: 0 0 14px rgba(216, 184, 120, 0.35);
          z-index: 5;
        }

        .page-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 35px 14px;
          opacity: 0;
          animation: contentAppear 1s ease 1.2s forwards;
        }

        .page-line {
          height: 5px;
          border-radius: 999px;
          background: linear-gradient(
            90deg,
            #d8c28e,
            #b8c49d
          );
        }

        .brand-title {
          color: #f5e5b8;
          background: linear-gradient(
            105deg,
            #fff3cc 0%,
            #d8b878 35%,
            #f5e4b3 65%,
            #bda064 100%
          );
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 5px 22px rgba(216, 184, 120, 0.13));
        }

        .loading-dot {
          display: block;
          width: 9px;
          height: 9px;
          border-radius: 999px;
          animation: dotPulse 1.05s ease-in-out infinite;
        }

        .loading-gold {
          background: #d8b878;
          box-shadow: 0 0 12px rgba(216, 184, 120, 0.25);
        }

        .loading-sage {
          background: #b9e4a5;
          animation-delay: 150ms;
        }

        .loading-ivory {
          background: #f4e8cc;
          animation-delay: 300ms;
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
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes dotPulse {
          0%,
          100% {
            opacity: 0.45;
            transform: scale(0.85);
          }
          50% {
            opacity: 1;
            transform: scale(1.12);
          }
        }

        @media (max-width: 480px) {
          .book-scene {
            transform: scale(0.86);
            margin-bottom: -10px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .book,
          .book-left,
          .book-right,
          .page-content,
          .loading-dot {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}
