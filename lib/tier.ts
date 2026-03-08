export function calculateTier(rating: number) {
  if (rating >= 2000) return "MASTER"
  if (rating >= 1700) return "DIAMOND"
  if (rating >= 1400) return "PLATINUM"
  if (rating >= 1100) return "GOLD"
  if (rating >= 800) return "SILVER"
  return "BRONZE"
}