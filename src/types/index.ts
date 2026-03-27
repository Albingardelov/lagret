export type LocationIcon = 'pantry' | 'fridge' | 'freezer'

export interface StorageLocation {
  id: string
  householdId: string
  name: string
  icon: LocationIcon
  sortOrder: number
  createdAt: string
}

export interface InventoryItem {
  id: string
  name: string
  barcode?: string
  quantity: number
  unit: string
  location: string // UUID referencing storage_locations.id
  expiryDate?: string // ISO date string
  imageUrl?: string
  category?: string
  minQuantity?: number
  createdAt: string
  updatedAt: string
}

export interface Recipe {
  id: number
  url: string
  slug: string | null
  name: string | null
  description: string | null
  ingredients: string[]
  instructions: string[]
  imageUrls: string[]
  cookTime: string | null
  prepTime: string | null
  totalTime: string | null
  servings: string | null
}

export interface Household {
  id: string
  name: string
  inviteCode: string
  createdAt: string
}

export interface ShoppingItem {
  id: string
  householdId: string
  name: string
  note?: string
  category?: string
  isBought: boolean
  createdAt: string
}
