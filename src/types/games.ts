export interface Game {
  id: string
  title: string
  description?: string
  price?: number
  discount?: number
  oldPrice?: number
  genres: string[]
  image: string
  icon?: string
  mainImage?: string
  headerImage?: string
  developer?: string
  releaseDate?: string
  tags?: string[]
  screenshots?: string[]
}

export interface Collection {
  id: string
  name: string
  games: Game[]
  previewUrls?: string[]
}
