"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HeaderUserMenu } from "@/components/HeaderUserMenu"

export function ConditionalNav() {
  const pathname = usePathname()
  if (pathname?.startsWith("/auth")) {
    return null
  }

  return (
    <nav className="border-b border-gray-700 px-6 py-4 flex gap-6 items-center">
      <Link href="/" className="font-bold text-lg">
        🏓 卓球大会
      </Link>
      <Link href="/tournaments" className="hover:text-blue-400">
        大会一覧
      </Link>
      <Link href="/me" className="hover:text-blue-400">
        マイページ
      </Link>
      <Link href="/players" className="hover:text-blue-400">
        プレイヤー一覧
      </Link>
      <HeaderUserMenu />
    </nav>
  )
}
