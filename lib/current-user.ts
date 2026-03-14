import { cookies } from "next/headers"
import { prisma } from "./prisma"
import { verifyUserToken } from "./auth"

export async function getCurrentUser() {
  // Next.js 16 の cookies() は Promise を返すため await が必要
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value
  if (!token) return null

  try {
    const payload = verifyUserToken(token)
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, name: true, email: true, role: true },
    })
    return user
  } catch {
    return null
  }
}


