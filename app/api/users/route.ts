import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { hashPassword } from "@/lib/auth"

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { name, phone, email, password } = body

  if (!name || !phone || !email || !password) {
    return NextResponse.json(
      { error: "name, phone, email, and password are required" },
      { status: 400 }
    )
  }

  const passwordHash = await hashPassword(String(password))

  const user = await prisma.user.create({
    data: {
      name: String(name),
      phone: String(phone),
      email: String(email),
      passwordHash,
    },
  })

  return NextResponse.json(user)
}
