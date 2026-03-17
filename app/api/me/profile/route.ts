import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"
import { PlayStyle } from "@prisma/client"

function asTrimmedString(v: unknown): string | null {
  if (typeof v !== "string") return null
  const s = v.trim()
  return s.length ? s : ""
}

function isValidAvatarUrl(url: string): boolean {
  // Allow empty string to clear.
  if (url === "") return true
  try {
    const u = new URL(url)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      rating: true,
      seasonRating: true,
      tier: true,
      avatarUrl: true,
      playStyle: true,
      affiliation: true,
    },
  })

  return NextResponse.json(row)
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))

  const name = asTrimmedString(body?.name)
  const avatarUrl = asTrimmedString(body?.avatarUrl)
  const affiliation = asTrimmedString(body?.affiliation)
  const playStyleRaw = body?.playStyle

  const data: {
    name?: string
    avatarUrl?: string | null
    affiliation?: string | null
    playStyle?: PlayStyle | null
  } = {}

  if (name !== null) {
    if (name.length < 1 || name.length > 50) {
      return NextResponse.json({ error: "名前は1〜50文字で入力してください" }, { status: 400 })
    }
    data.name = name
  }

  if (avatarUrl !== null) {
    if (!isValidAvatarUrl(avatarUrl)) {
      return NextResponse.json({ error: "アイコン画像URLが不正です" }, { status: 400 })
    }
    data.avatarUrl = avatarUrl === "" ? null : avatarUrl
  }

  if (affiliation !== null) {
    if (affiliation.length > 80) {
      return NextResponse.json({ error: "所属は80文字以内で入力してください" }, { status: 400 })
    }
    data.affiliation = affiliation === "" ? null : affiliation
  }

  if (playStyleRaw !== undefined) {
    if (playStyleRaw === null || playStyleRaw === "") {
      data.playStyle = null
    } else if (typeof playStyleRaw === "string" && playStyleRaw in PlayStyle) {
      data.playStyle = playStyleRaw as PlayStyle
    } else {
      return NextResponse.json({ error: "戦型の値が不正です" }, { status: 400 })
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      rating: true,
      seasonRating: true,
      tier: true,
      avatarUrl: true,
      playStyle: true,
      affiliation: true,
    },
  })

  return NextResponse.json(updated)
}

