import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { HeaderUserMenu } from "@/components/HeaderUserMenu";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "卓球大会プラットフォーム",
  description: "競技用の大会運営・ランキングシステム",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        {/* Navigation Bar */}
        <nav className="border-b border-gray-700 px-6 py-4 flex gap-6 items-center">
          <Link href="/" className="font-bold text-lg">
            🏓 卓球大会
          </Link>

          <Link href="/tournaments" className="hover:text-blue-400">
            大会一覧
          </Link>

          <Link href="/leaderboard" className="hover:text-blue-400">
            ランキング
          </Link>

          <Link href="/players" className="hover:text-blue-400">
            プレイヤー一覧
          </Link>

          <HeaderUserMenu />
        </nav>

        {/* Page Content */}
        <main className="max-w-6xl mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}