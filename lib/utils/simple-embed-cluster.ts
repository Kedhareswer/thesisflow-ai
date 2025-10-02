// Simple text embedding + lightweight clustering utilities (no external deps)
// - Hashing-based bag-of-words embeddings
// - Cosine similarity
// - K-Means clustering (kmeans++) simplified
// - Density clustering (graph components by similarity threshold)

export type Vec = Float32Array

const DIM = 256

export function tokenize(text: string): string[] {
  const t = (text || "").toLowerCase()
  return t.split(/[^a-z0-9]+/i).filter((w) => w.length > 2 && w.length < 32)
}

export function embedText(title: string, snippet?: string): Vec {
  const v = new Float32Array(DIM)
  const inc = (tok: string, w: number) => {
    let h = 2166136261 >>> 0  // Ensure 32-bit unsigned integer
    for (let i = 0; i < tok.length; i++) {
      h = ((h ^ tok.charCodeAt(i)) * 16777619) >>> 0  // Keep as 32-bit unsigned integer
    }
    const idx = (h >>> 0) % DIM  // Compute integer index for proper Float32Array indexing
    v[idx] += w
  }
  for (const tok of tokenize(title)) inc(tok, 2)
  for (const tok of tokenize(snippet || "")) inc(tok, 1)
  return l2norm(v)
}

export function l2norm(v: Vec): Vec {
  let s = 0
  for (let i = 0; i < v.length; i++) s += v[i] * v[i]
  const n = Math.sqrt(s) || 1
  const out = new Float32Array(v.length)
  for (let i = 0; i < v.length; i++) out[i] = v[i] / n
  return out
}

export function cosine(a: Vec, b: Vec): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return Math.max(-1, Math.min(1, s))
}

export function kmeans(vectors: Vec[], k: number, maxIter = 30): { labels: number[]; centroids: Vec[] } {
  const n = vectors.length
  if (n === 0 || k <= 1) return { labels: new Array(n).fill(0), centroids: [meanVec(vectors)] }
  k = Math.min(k, n)

  // kmeans++ simplified init
  const centroids: Vec[] = []
  const pick = (v: Vec) => centroids.push(v)
  pick(vectors[Math.floor(Math.random() * n)])
  while (centroids.length < k) {
    const d2 = vectors.map((v) => {
      let best = Infinity
      for (const c of centroids) {
        const sim = cosine(v, c)
        const dist = 1 - sim
        if (dist < best) best = dist
      }
      return best * best
    })
    const sum = d2.reduce((a, b) => a + b, 0) || 1
    let r = Math.random() * sum
    let idx = 0
    for (; idx < d2.length; idx++) {
      r -= d2[idx]
      if (r <= 0) break
    }
    pick(vectors[Math.min(idx, n - 1)])
  }

  let labels = new Array(n).fill(0)
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false
    // Assign
    for (let i = 0; i < n; i++) {
      let best = 0
      let bestSim = -Infinity
      for (let c = 0; c < centroids.length; c++) {
        const sim = cosine(vectors[i], centroids[c])
        if (sim > bestSim) { bestSim = sim; best = c }
      }
      if (labels[i] !== best) { labels[i] = best; changed = true }
    }
    // Update
    const groups: Vec[][] = Array.from({ length: centroids.length }, () => [])
    for (let i = 0; i < n; i++) groups[labels[i]].push(vectors[i])
    for (let c = 0; c < centroids.length; c++) {
      centroids[c] = groups[c].length ? meanVec(groups[c]) : centroids[c]
    }
    if (!changed) break
  }
  return { labels, centroids }
}

export function densityClusters(vectors: Vec[], simThreshold = 0.82, minSize = 2): number[][] {
  const n = vectors.length
  if (n === 0) return []
  const visited = new Array(n).fill(false)
  const clusters: number[][] = []
  const adj: number[][] = Array.from({ length: n }, () => [])
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (cosine(vectors[i], vectors[j]) >= simThreshold) {
        adj[i].push(j)
        adj[j].push(i)
      }
    }
  }
  for (let i = 0; i < n; i++) {
    if (visited[i]) continue
    const comp: number[] = []
    const stack = [i]
    visited[i] = true
    while (stack.length) {
      const v = stack.pop()!
      comp.push(v)
      for (const nb of adj[v]) if (!visited[nb]) { visited[nb] = true; stack.push(nb) }
    }
    if (comp.length >= minSize) clusters.push(comp)
  }
  return clusters
}

function meanVec(vs: Vec[]): Vec {
  if (vs.length === 0) return new Float32Array(DIM)
  const m = new Float32Array(DIM)
  for (const v of vs) for (let i = 0; i < DIM; i++) m[i] += v[i]
  for (let i = 0; i < DIM; i++) m[i] /= vs.length
  return l2norm(m)
}

export function topTokens(texts: string[], topN = 3): string[] {
  const freq = new Map<string, number>()
  for (const t of texts) for (const tok of tokenize(t)) freq.set(tok, (freq.get(tok) || 0) + 1)
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([w]) => w)
}
