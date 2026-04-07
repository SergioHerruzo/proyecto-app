export interface Game {
  id: number
  title: string
  description?: string
  price?: number
  oldPrice?: number
  genres: string[]
  image: string
  developer?: string
  releaseDate?: string
  tags?: string[]
  screenshots?: string[]
}

export interface Collection {
  id: number
  name: string
  games: Game[]
}