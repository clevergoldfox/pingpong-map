"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getBaseUrl } from "@/lib/base-url"

function LoginForm() {
  const router = useRouter()
  const search = useSearchParams()
  const redirect = search.get("redirect") || "/tournaments"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      setError(null)
      const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error ?? "ログインに失敗しました")
      }
      router.push(redirect)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "ログインに失敗しました")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold mb-2">ログイン</h1>
      <p className="text-sm text-gray-400">
        登録済みのメールアドレスとパスワードでログインします。
      </p>
      <form onSubmit={handleSubmit} className="space-y-3 text-sm">
        <div>
          <label className="block mb-1">メールアドレス</label>
          <input
            type="email"
            className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block mb-1">パスワード</label>
          <input
            type="password"
            className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className="text-red-400 text-sm">{error}</div>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full border border-gray-700 px-4 py-2 rounded hover:bg-gray-900 disabled:opacity-50"
        >
          {submitting ? "ログイン中..." : "ログイン"}
        </button>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto p-6 text-gray-400">読み込み中...</div>}>
      <LoginForm />
    </Suspense>
  )
}
