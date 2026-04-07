const BASE_URL = "http://192.168.17.17:5082"

// --- API response types ---

export interface ApiGenre {
  id: number
  name: string
}

export interface ApiUser {
  id: number
  username: string
}

export interface ApiGame {
  id: number
  title: string
  description: string
  releaseDate: string
  genres: ApiGenre[]
  developers: ApiUser[]
}

export interface GamesPage {
  items: ApiGame[]
  nextTitle: string | null
  nextId: number | null
}

export interface GenresPage {
  items: ApiGenre[]
  nextName: string | null
  nextId: number | null
}

// --- Mapper ---

import type { Game } from "../types/games"

export function mapApiGame(apiGame: ApiGame): Game {
  return {
    id: apiGame.id,
    title: apiGame.title,
    description: apiGame.description,
    releaseDate: new Date(apiGame.releaseDate).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    genres: apiGame.genres.map(g => g.name),
    developer: apiGame.developers.map(d => d.username).join(", ") || undefined,
    image: `https://placehold.co/400x220/2a2a2a/555?text=${encodeURIComponent(apiGame.title)}`,
  }
}

// --- API functions ---

export async function searchGamesByName(
  name = "",
  pageSize = 20,
  normalizedName?: string,
  referenceId?: number,
): Promise<GamesPage> {
  const params = new URLSearchParams()
  params.set("Name", name)
  params.set("PageSize", String(pageSize))
  if (normalizedName !== undefined) params.set("NormalizedName", normalizedName)
  if (referenceId !== undefined) params.set("ReferenceId", String(referenceId))

  const res = await fetch(`${BASE_URL}/games/search/by-name?${params}`)
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json()
}

export async function getGameById(id: number): Promise<ApiGame> {
  const res = await fetch(`${BASE_URL}/games/${id}`)
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json()
}

export async function getGamesByGenres(
  genreIds: number[],
  pageSize = 20,
  referenceId?: number,
): Promise<GamesPage> {
  const params = new URLSearchParams()
  genreIds.forEach(id => params.append("GenreIds", String(id)))
  params.set("PageSize", String(pageSize))
  if (referenceId !== undefined) params.set("ReferenceId", String(referenceId))

  const res = await fetch(`${BASE_URL}/games/filter/by-genres?${params}`)
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json()
}

export async function getGenresByName(name: string, pageSize = 20): Promise<GenresPage> {
  const params = new URLSearchParams()
  params.set("Name", name)
  params.set("PageSize", String(pageSize))

  const res = await fetch(`${BASE_URL}/genres/name?${params}`)
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json()
}
