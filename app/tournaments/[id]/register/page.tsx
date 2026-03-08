"use client"

import { useState } from "react"
import { getBaseUrl } from "@/lib/base-url"

export default function RegisterPlayerPage(
  { params }: { params: { id: string } }
) {

  const [userId,setUserId] = useState("")

  const register = async () => {

    await fetch( `${getBaseUrl()}/api/tournaments/${params.id}/join`,{
      method:"POST",
      body: JSON.stringify({userId})
    })

    alert("Registered")
  }

  return(

    <div>

      <h1 className="text-2xl mb-4">
        Register Player
      </h1>

      <input
        placeholder="User ID"
        value={userId}
        onChange={e=>setUserId(e.target.value)}
        className="border p-2"
      />

      <button
        onClick={register}
        className="border p-2 ml-2"
      >
        Register
      </button>

    </div>
  )
}