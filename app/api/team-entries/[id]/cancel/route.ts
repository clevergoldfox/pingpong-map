import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  const { id } = await params

  const entry = await prisma.teamEntry.findUnique({
    where: { id },
  })
  if (!entry) {
    return NextResponse.json({ error: "TeamEntry not found" }, { status: 404 })
  }
  if (entry.representativeUserId !== user.id) {
    return NextResponse.json({ error: "Only representative can cancel" }, { status: 403 })
  }
  if (entry.status !== "PENDING") {
    return NextResponse.json({ error: "Only pending entries can be canceled" }, { status: 400 })
  }

  const updated = await prisma.teamEntry.update({
    where: { id },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
    },
  })

  return NextResponse.json(updated)
}

