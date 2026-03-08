"use client"

import { useState } from "react"
import { getBaseUrl } from "@/lib/base-url"

export default function MatchPage(
  { params }:{params:{id:string}}
){

  const [score,setScore] = useState("")

  const submit = async()=>{

    await fetch( `${getBaseUrl()}/api/matches/${params.id}/submit-score`,{
      method:"POST",
      body:JSON.stringify({
        userId:"USER_ID",
        clientRequestId:crypto.randomUUID(),
        scores:[
          {p1:11,p2:8},
          {p1:11,p2:7}
        ]
      })
    })

    alert("Submitted")
  }

  return(

    <div>

      <h1 className="text-2xl mb-6">
        Submit Match Result
      </h1>

      <button onClick={submit} className="border p-3">
        Submit Result
      </button>

    </div>
  )
}