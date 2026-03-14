"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getBaseUrl } from "@/lib/base-url"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<"PLAYER" | "ORGANIZER">("PLAYER")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== passwordConfirm) {
      setError("パスワードが一致しません")
      return
    }
    try {
      setSubmitting(true)
      setError(null)
      const res = await fetch(`${getBaseUrl()}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password, role }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error ?? "登録に失敗しました")
      }
      router.push("/tournaments")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "登録に失敗しました")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold mb-2">新規登録</h1>
      <p className="text-sm text-gray-400">
        大会運営者またはプレイヤーとしてアカウントを作成します。
      </p>
      <form onSubmit={handleSubmit} className="space-y-3 text-sm">
        <div>
          <label className="block mb-1">ユーザー名</label>
          <input
            className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
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
          <label className="block mb-1">電話番号</label>
          <input
            className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block mb-1">権限</label>
          <select
            className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
            value={role}
            onChange={(e) => setRole(e.target.value as "PLAYER" | "ORGANIZER")}
          >
            <option value="PLAYER">プレイヤー</option>
            <option value="ORGANIZER">主催者</option>
          </select>
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
        <div>
          <label className="block mb-1">パスワード（確認）</label>
          <input
            type="password"
            className="w-full border border-gray-700 bg-black px-3 py-2 rounded"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
          />
        </div>
        {error && <div className="text-red-400 text-sm">{error}</div>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full border border-gray-700 px-4 py-2 rounded hover:bg-gray-900 disabled:opacity-50"
        >
          {submitting ? "登録中..." : "登録する"}
        </button>
      </form>
    </div>
  )
}

