export const normalize = (s: string) => s.toLowerCase().replace(/\.(ico|icns|png|jpg|jpeg)$/g, '').replace(/[_\-\s]+/g, ' ').trim()

export const tokenize = (s: string) => {
  const n = normalize(s)
  return n.split(/[^a-z0-9\u4e00-\u9fa5]+/).filter(Boolean)
}

export const levenshtein = (a: string, b: string) => {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array(m + 1)
  for (let i = 0; i <= m; i++) { dp[i] = Array(n + 1).fill(0); dp[i][0] = i }
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

export const scoreIcon = (folderName: string, iconName: string) => {
  const a = normalize(folderName)
  const b = normalize(iconName)
  if (!a || !b) return 0
  if (a === b) return 1
  const contain = b.includes(a) || a.includes(b) ? 1 : 0
  const lev = levenshtein(a, b)
  const sim = 1 - lev / Math.max(a.length, b.length)
  const t1 = tokenize(a)
  const t2 = tokenize(b)
  const s1 = new Set(t1)
  const s2 = new Set(t2)
  let inter = 0
  for (const t of s1) if (s2.has(t)) inter++
  const union = s1.size + s2.size - inter
  const jaccard = union ? inter / union : 0
  return Math.max(0, sim * 0.7 + jaccard * 0.2 + contain * 0.1)
}

export const matchBestIcon = (name: string, libraryIcons: Array<{ name: string; path: string }>) => {
  if (!libraryIcons.length) return null
  let best: { name: string; path: string } | null = null
  let bestScore = -1
  for (const it of libraryIcons) {
    const s = scoreIcon(name, it.name)
    if (s > bestScore) { bestScore = s; best = it }
  }
  return best
}