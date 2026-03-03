export function calculateElo(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  k = 32
) {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
  const newRatingA = ratingA + k * (scoreA - expectedA)
  return Math.round(newRatingA)
}