export const UNITS = [
  { group: 'Vikt', items: ['g', 'hg', 'kg'] },
  { group: 'Volym', items: ['ml', 'dl', 'l', 'msk', 'tsk', 'krm'] },
  {
    group: 'Styck',
    items: ['st', 'förp', 'burk', 'flaska', 'knippe', 'klyfta', 'skiva', 'nypa', 'näve'],
  },
]

export const UNITS_FLAT = UNITS.flatMap((g) =>
  g.items.map((item) => ({ value: item, label: item, group: g.group }))
)
