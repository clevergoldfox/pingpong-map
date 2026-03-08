"use client"

export default function AdminPage(){

  const generateRound = async()=>{

    await fetch("/api/admin/generate-round",{
      method:"POST"
    })

    alert("Round generated")
  }

  const integrityCheck = async()=>{

    await fetch("/api/admin/health")

    alert("Integrity check done")
  }

  return(

    <div className="space-y-4">

      <h1 className="text-3xl">
        Admin Panel
      </h1>

      <button onClick={generateRound} className="border p-3">
        Generate Next Round
      </button>

      <button onClick={integrityCheck} className="border p-3">
        Integrity Check
      </button>

    </div>
  )
}