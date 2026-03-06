export interface TechWatchItem {
  readonly id: number
  readonly title: string
  readonly description: string | null
  readonly url: string
  readonly imageUrl: string | null
  readonly publishedAt: string | null
  readonly fetchedAt: string
  readonly sourceName: string
}

export interface TechWatchItemsResponse {
  readonly items: TechWatchItem[]
  readonly totalItems: number
  readonly page: number
  readonly limit: number
}
