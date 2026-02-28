import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()

  const user = await prisma.user.create({
    data: {
      name: body.name,
      phone: body.phone,
    },
  })

  return NextResponse.json(user)
}