import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ping Pong Tournament Platform",
  description: "Competitive tournament and ranking system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        {/* Navigation Bar */}
        <nav className="border-b border-gray-700 px-6 py-4 flex gap-6 items-center">
          <Link href="/" className="font-bold text-lg">
            🏓 PingPong
          </Link>

          <Link href="/tournaments" className="hover:text-blue-400">
            Tournaments
          </Link>

          <Link href="/leaderboard" className="hover:text-blue-400">
            Leaderboard
          </Link>

          <Link href="/players" className="hover:text-blue-400">
            Players
          </Link>
        </nav>

        {/* Page Content */}
        <main className="max-w-6xl mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}