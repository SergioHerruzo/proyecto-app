const BASE_URL = "http://localhost:5239"

// --- Auth token ---

let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

export function getAuthToken(): string | null {
  return authToken
}

function authHeaders(): HeadersInit {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {}
}

// --- API response types ---

export interface UserSummary {
  id: string
  username: string
}

export interface GenreSummary {
  id: string
  name: string
}

export interface GameArtworkSummary {
  smallImageUrl: string
  mediumImageUrl: string
  largeImageUrl: string
}

export interface GameStorePictureSummary {
  smallImageUrl: string
  mediumImageUrl: string
  largeImageUrl: string
}

export interface GameListItemResponse {
  id: string
  title: string
  price: number
  discount: number
  artworks: GameArtworkSummary[]
}

export interface GameResponse {
  id: string
  title: string
  description: string
  price: number
  discount: number
  owner: UserSummary
  genres: GenreSummary[]
  artworks: GameArtworkSummary[]
  storePictures: GameStorePictureSummary[]
}

export interface GameSummary {
  id: string
  title: string
  description: string
  genres: GenreSummary[]
  storePictures: GameStorePictureSummary[]
  artworks: GameArtworkSummary[]
}

export interface GenreListItemResponse {
  id: string
  name: string
}

export interface PaginatedResponse<T> {
  items: T[]
  pageNumber: number
  pageSize: number
  pageCount: number
  totalItemCount: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface ApiResult<T> {
  value: T
  isSuccess: boolean
  status: number
  errors?: string[] | null
}

export interface GetUserCartResponse {
  game: GameSummary[]
}

// --- Request types ---

export interface UpdateGameRequest {
  title: string
  description: string
  price: number
  discount: number
  isPublic: boolean
  releaseBuildId: string
}

// --- Mappers ---

import type { Game } from "../types/games"

export function mapApiGameListItem(item: GameListItemResponse): Game {
  const artwork = item.artworks?.[0]
  return {
    id: item.id,
    title: item.title,
    price: item.price,
    discount: item.discount > 0 ? item.discount : undefined,
    oldPrice: item.discount > 0 ? item.price + item.discount : undefined,
    genres: [],
    image: artwork?.mediumImageUrl
      ?? `https://placehold.co/400x220/2a2a2a/555?text=${encodeURIComponent(item.title)}`,
  }
}

export function mapApiGame(game: GameResponse): Game {
  const storePic = game.storePictures?.[0]
  const artworks = game.artworks ?? []

  return {
    id: game.id,
    title: game.title,
    description: game.description,
    price: game.price,
    discount: game.discount > 0 ? game.discount : undefined,
    oldPrice: game.discount > 0 ? game.price + game.discount : undefined,
    genres: game.genres?.map(g => g.name) ?? [],
    developer: game.owner?.username,
    image: storePic?.mediumImageUrl
      ?? `https://placehold.co/400x220/2a2a2a/555?text=${encodeURIComponent(game.title)}`,
    screenshots: artworks.length > 0 ? artworks.map(a => a.largeImageUrl) : undefined,
  }
}

export function mapGameSummary(g: GameSummary): Game {
  const storePic = g.storePictures?.[0]
  const artworks = g.artworks ?? []
  return {
    id: g.id,
    title: g.title,
    description: g.description,
    genres: g.genres?.map(x => x.name) ?? [],
    image: storePic?.mediumImageUrl
      ?? `https://placehold.co/400x220/2a2a2a/555?text=${encodeURIComponent(g.title)}`,
    screenshots: artworks.length > 0 ? artworks.map(a => a.largeImageUrl) : undefined,
  }
}

// --- Games API ---

export async function getGames(
  title = "",
  genres: string[] = [],
  pageNumber = 1,
  pageSize = 20,
): Promise<PaginatedResponse<GameListItemResponse>> {
  const params = new URLSearchParams()
  if (title) params.set("Title", title)
  genres.forEach(id => params.append("Genres", id))
  params.set("PageNumber", String(pageNumber))
  params.set("PageSize", String(pageSize))

  const res = await fetch(`${BASE_URL}/games?${params}`)
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    console.error(`[API] GET /games → ${res.status}`, body)
    throw new Error(`Error ${res.status}`)
  }
  const data = await res.json()
  console.log("[API] GET /games →", data)
  return data
}

export async function getGameById(id: string): Promise<GameResponse> {
  const res = await fetch(`${BASE_URL}/games/${id}`)
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json()
}

export async function deleteGame(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/games/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
}

// --- Genres API ---

export async function getGenres(
  name = "",
  pageNumber = 1,
  pageSize = 50,
): Promise<PaginatedResponse<GenreListItemResponse>> {
  const params = new URLSearchParams()
  if (name) params.set("Name", name)
  params.set("PageNumber", String(pageNumber))
  params.set("PageSize", String(pageSize))

  const res = await fetch(`${BASE_URL}/genres?${params}`)
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json()
}

// --- Cart API ---

export async function getCart(): Promise<GetUserCartResponse> {
  const res = await fetch(`${BASE_URL}/users/me/cart`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json()
}

export async function addToCart(gameId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/me/cart/${gameId}`, {
    method: "POST",
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
}

export async function removeFromCart(gameId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/me/cart/${gameId}`, {
    method: "DELETE",
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
}

// --- User Library API ---

export async function checkoutCart(): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/me/cart/checkout`, {
    method: "POST",
    headers: authHeaders(),
  })
  const body = await res.text().catch(() => "")
  console.log(`[API] POST /users/me/cart/checkout → ${res.status}`, body)
  if (!res.ok) throw new Error(`Error ${res.status}`)
}

export async function getUserLibrary(): Promise<GameSummary[]> {
  const res = await fetch(`${BASE_URL}/users/me/library`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
  const result: { games: GameSummary[] } = await res.json()
  console.log("[API] GET /users/me/library →", result)
  return result.games
}

// --- User Collections API ---

export interface GameCollectionListItemResponse {
  id: string
  name: string
  gamesCount: number
  previewSmallPictureUrls: string[]
  createdAt: string
}

export interface GameCollectionDetailsResponse {
  id: string
  name: string
  games: GameListItemResponse[]
  createdAt: string
  updatedAt: string
}

export interface GameCollectionCreatedResponse {
  id: string
  name: string
}

import type { Collection } from "../types/games"

export function mapCollectionListItem(item: GameCollectionListItemResponse): Collection {
  return {
    id: item.id,
    name: item.name,
    games: [],
    previewUrls: item.previewSmallPictureUrls,
  }
}

export async function getUserCollections(
  pageNumber = 1,
  pageSize = 20,
): Promise<PaginatedResponse<GameCollectionListItemResponse>> {
  const params = new URLSearchParams()
  params.set("PageNumber", String(pageNumber))
  params.set("PageSize", String(pageSize))
  const res = await fetch(`${BASE_URL}/users/me/collections?${params}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json()
}

export async function getCollectionById(collectionId: string): Promise<Collection> {
  const res = await fetch(`${BASE_URL}/users/me/collections/${collectionId}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
  const data: GameCollectionDetailsResponse = await res.json()
  return {
    id: data.id,
    name: data.name,
    games: data.games.map(mapApiGameListItem),
    previewUrls: data.games.slice(0, 4).map(g => g.artworks?.[0]?.smallImageUrl ?? ""),
  }
}

export async function createCollection(name: string): Promise<GameCollectionCreatedResponse> {
  const res = await fetch(`${BASE_URL}/users/me/collections`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json()
}

export async function deleteCollection(collectionId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/me/collections/${collectionId}`, {
    method: "DELETE",
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
}

export async function addGameToCollection(collectionId: string, gameId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/me/collections/${collectionId}/games/${gameId}`, {
    method: "POST",
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
}

export async function removeGameFromCollection(collectionId: string, gameId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/me/collections/${collectionId}/games/${gameId}`, {
    method: "DELETE",
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
}

// --- Achievements API ---

export interface AchievementResponse {
  id: string
  gameId: string
  name: string
  description: string
  isUnlocked: boolean
  createdAt: string
  updatedAt: string
}

export async function getGameAchievements(
  gameId: string,
  pageNumber = 1,
  pageSize = 50,
): Promise<PaginatedResponse<AchievementResponse>> {
  const params = new URLSearchParams()
  params.set("PageNumber", String(pageNumber))
  params.set("PageSize", String(pageSize))
  const res = await fetch(`${BASE_URL}/games/${gameId}/achievements?${params}`)
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json()
}

export async function unlockAchievement(achievementId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/achievements/${achievementId}/unlock`, {
    method: "POST",
    headers: authHeaders(),
  })
  if (!res.ok && res.status !== 409) throw new Error(`Error ${res.status}`)
}
