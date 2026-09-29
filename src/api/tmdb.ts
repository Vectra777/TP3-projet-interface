const KEY = import.meta.env.VITE_TMDB_KEY
const BASE = 'https://api.themoviedb.org/3'

export const posterUrl = (path: string | null) => (path ? `https://image.tmdb.org/t/p/w342${path}` : '')

async function get(path: string, params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams({ api_key: KEY, language: 'fr-FR', ...params } as Record<string, string>)
  const res = await fetch(`${BASE}${path}?${qs}`)
  if (!res.ok) throw new Error(`TMDB HTTP ${res.status}`)
  return res.json()
}

export async function searchMovies(query: string, page = 1) {
  const data = await get('/search/movie', { query, page })
  return data.results as { id: number; title: string; release_date: string; poster_path: string | null; overview: string }[]
}

// details + credits in one call; director = crew member with job "Director"
export async function getMovie(id: string) {
  return get(`/movie/${id}`, { append_to_response: 'credits' })
}

// movies similar to the given one, based on TMDB's recommendation engine
export async function getRecommendations(id: string, page = 1) {
  const data = await get(`/movie/${id}/recommendations`, { page })
  return data.results as { id: number; title: string; release_date: string; poster_path: string | null; overview: string }[]
}
