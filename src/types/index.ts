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
  createdAt: string
  updatedAt: string
}

export interface Recipe {
  idMeal: string
  strMeal: string
  strMealThumb: string
  strCategory: string
  strArea: string
  strInstructions: string
  strYoutube?: string
  ingredients: { name: string; measure: string }[]
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
  isBought: boolean
  createdAt: string
}

export interface MealDBResponse {
  meals: MealDBMeal[] | null
}

export interface MealDBMeal {
  idMeal: string
  strMeal: string
  strMealThumb: string
  strCategory: string
  strArea: string
  strInstructions: string
  strYoutube: string
  [key: string]: string
}
