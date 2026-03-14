import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.AUTH_SECRET

if (!JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.warn(
    "AUTH_SECRET is not set. Authentication tokens will not be secure. Set AUTH_SECRET in .env."
  )
}

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export type AuthTokenPayload = {
  id: string
  role: string
}

export function signUserToken(payload: AuthTokenPayload) {
  if (!JWT_SECRET) {
    throw new Error("AUTH_SECRET is not configured")
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" })
}

export function verifyUserToken(token: string): AuthTokenPayload {
  if (!JWT_SECRET) {
    throw new Error("AUTH_SECRET is not configured")
  }
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload
}

