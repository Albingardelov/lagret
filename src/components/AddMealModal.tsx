import { BottomSheet } from './BottomSheet'

interface AddMealModalProps {
  opened: boolean
  onClose: () => void
  date: string | null
}

export function AddMealModal({ opened, onClose }: AddMealModalProps) {
  return (
    <BottomSheet opened={opened} onClose={onClose} title="Lägg till måltid">
      <div>Placeholder</div>
    </BottomSheet>
  )
}
