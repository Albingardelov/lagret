import { BottomSheet } from './BottomSheet'
import type { MealPlan, Recipe } from '../types'

interface IngredientReviewModalProps {
  opened: boolean
  onClose: () => void
  mealPlans: MealPlan[]
  recipes: Record<string, Recipe>
}

export function IngredientReviewModal({ opened, onClose }: IngredientReviewModalProps) {
  return (
    <BottomSheet opened={opened} onClose={onClose} title="Inköpslista">
      <div>Placeholder</div>
    </BottomSheet>
  )
}
