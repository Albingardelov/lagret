export const UNITS = [
  { group: 'Vikt', items: ['g', 'hg', 'kg'] },
  { group: 'Volym', items: ['ml', 'dl', 'l', 'msk', 'tsk', 'krm'] },
  {
    group: 'Styck',
    items: ['st', 'förp', 'burk', 'flaska', 'knippe', 'klyfta', 'skiva', 'nypa', 'näve'],
  },
]

export const UNITS_FLAT = UNITS.map((g) => ({
  group: g.group,
  items: g.items.map((item) => ({ value: item, label: item })),
}))

/** Returns the i18n translation key for a unit group label */
export function unitGroupKey(group: string): string {
  return `unitGroups.${group}`
}
