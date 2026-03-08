"use client"
import { getBaseUrl } from "@/lib/base-url"

export default function CheckinPage(
  { params }: { params:{id:string} }
){

  const checkin = async(userId:string)=>{

    await fetch( `${getBaseUrl()}/api/tournaments/${params.id}/checkin`,{
      method:"POST",
      body:JSON.stringify({userId})
    })

    alert("Checked in")
  }

  return(

    <div>

      <h1 className="text-2xl mb-6">
        Player Check-in
      </h1>

      <button
        onClick={()=>checkin("USER_ID")}
        className="border p-2"
      >
        Check-in Player
      </button>

    </div>

  )
}