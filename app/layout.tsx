
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LearnNova | Your Learning Space",
  description:
    "Your personalized AI-powered learning platform for smarter learning and academic growth.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
