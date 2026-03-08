export function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    BRONZE: "bg-amber-700",
    SILVER: "bg-gray-400",
    GOLD: "bg-yellow-500",
    PLATINUM: "bg-cyan-500",
    DIAMOND: "bg-blue-500",
    MASTER: "bg-purple-600",
  }

  return (
    <span className={`px-3 py-1 rounded text-white text-sm ${colors[tier]}`}>
      {tier}
    </span>
  )
}