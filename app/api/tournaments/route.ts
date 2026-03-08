import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

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