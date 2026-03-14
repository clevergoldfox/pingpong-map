import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { hashPassword } from "@/lib/auth"
import { signUserToken } from "@/lib/auth"

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { name, email, phone, password, role } = body as {
    name?: string
    email?: string
    phone?: string
    password?: string
    role?: "PLAYER" | "ORGANIZER" | "ADMIN"
  }

  if (!name || !email || !phone || !password) {
    return NextResponse.json(
      { error: "name, email, phone, password are required" },
      { status: 400 }
    )
  }

  const normalizedEmail = String(email).toLowerCase()

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: normalizedEmail }, { phone }] },
    select: { id: true, email: true, phone: true },
  })
  if (existing) {
    return NextResponse.json(
      { error: "Email or phone is already registered" },
      { status: 409 }
    )
  }

  const passwordHash = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      phone,
      passwordHash,
      role: role === "ORGANIZER" || role === "ADMIN" ? role : "PLAYER",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  })

  const token = signUserToken({ id: user.id, role: user.role })

  const res = NextResponse.json(user)
  res.cookies.set("auth_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  return res
}

