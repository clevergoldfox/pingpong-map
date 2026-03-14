import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"

export async function GET() {

  const tournaments = await prisma.tournament.findMany({
    orderBy: {
      createdAt: "desc"
    },
    select: {
      id: true,
      name: true,
      location: true,
      status: true,
      startDate: true
    }
  })

  return NextResponse.json(tournaments)
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (user.role !== "ADMIN" && user.role !== "ORGANIZER") {
    return NextResponse.json({ error: "Not allowed to create tournaments" }, { status: 403 })
  }
  const body = await req.json()

  const tournament = await prisma.tournament.create({
    data: {
      name: body.name,
      location: body.location,
      status: "DRAFT",
      startDate: new Date(body.startDate),
    },
  })

  return NextResponse.json(tournament)
}