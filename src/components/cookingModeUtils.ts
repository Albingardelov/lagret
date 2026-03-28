export function getSmallStep(unit: string): number {
  switch (unit) {
    case 'dl':
      return 0.5
    case 'l':
      return 0.5
    case 'ml':
      return 10
    case 'g':
      return 50
    case 'kg':
      return 0.1
    case 'hg':
      return 0.5
    case 'msk':
      return 1
    case 'tsk':
      return 1
    case 'krm':
      return 1
    case 'st':
      return 1
    default:
      return 1
  }
}

export function getLargeStep(unit: string): number {
  switch (unit) {
    case 'dl':
      return 1
    case 'l':
      return 1
    case 'ml':
      return 50
    case 'g':
      return 100
    case 'kg':
      return 0.25
    case 'hg':
      return 1
    case 'msk':
      return 2
    case 'tsk':
      return 2
    case 'krm':
      return 2
    case 'st':
      return 2
    default:
      return 2
  }
}

export function formatQty(qty: number): string {
  if (!isFinite(qty)) return '0'
  if (Number.isInteger(qty)) return qty.toString()
  return parseFloat(qty.toFixed(2)).toString()
}

export function loadCustomSteps(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem('cookingMode_steps') ?? '{}')
  } catch {
    return {}
  }
}

export function saveCustomSteps(steps: Record<string, number>) {
  localStorage.setItem('cookingMode_steps', JSON.stringify(steps))
}

export function loadCookingUnits(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem('cookingMode_units') ?? '{}')
  } catch {
    return {}
  }
}

export function saveCookingUnits(units: Record<string, string>) {
  localStorage.setItem('cookingMode_units', JSON.stringify(units))
}
