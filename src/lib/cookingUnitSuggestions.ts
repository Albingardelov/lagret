/**
 * Suggests the most appropriate cooking unit for an ingredient.
 * If the item is already stored in a meaningful unit (not 'st'),
 * that unit is returned unchanged.
 * For items stored as 'st', ingredient name matching determines the unit.
 */
export function suggestCookingUnit(name: string, storedUnit: string): string {
  if (storedUnit !== 'st') return storedUnit

  const n = name.toLowerCase()

  // Whole items — keep as 'st'
  if (
    /ägg|lök(?!\s*pulver)|vitlök|potatis|morot|tomat(?!puré|sås)|citron|lime|banan|äpple|päron|burk|paprika(?!\s*pulver)|zucchini|gurka|squash|avokado|mango/.test(
      n
    )
  ) {
    return 'st'
  }

  // Spices and small dry ingredients → tsk
  if (
    /salt|peppar|kanel|kardemumma|ingefära(?!\s*rot)|vanilj|bakpulver|bikarbonat|gurkmeja|paprikapulver|spiskummin|kummin|chili|oregano|timjan|basilika|rosmarin|cayenne|muskot|nejlika|anis|fänkål|koriander(?!\s*blad)/.test(
      n
    )
  ) {
    return 'tsk'
  }

  // Oils, liquid condiments, pastes → msk
  if (
    /olja|honung|sirap|tomatpuré|senap|soja(?:sås)?|worcestershire|vinäger|balsamico|fisksås|sriracha|tabasco|ketchu|majonnäs|aioli|pesto/.test(
      n
    )
  ) {
    return 'msk'
  }

  // Butter, cheese, meat, fish, chocolate → g
  if (
    /smör|margarin|ost|kött|färs|fisk|lax|torsk|tonfisk|sej|makrill|räkor|bacon|skinka|salami|korv|nöt(?:kött)?|lamm|fläsk|kyckling(?!buljong)|choklad|mandel|valnöt|hasselnöt/.test(
      n
    )
  ) {
    return 'g'
  }

  // Flour, sugar, grains, dried legumes, dairy liquids, stock → dl
  if (
    /mjöl|socker|ris|havre|cornflakes|müsli|flingor|gryn|bulgur|couscous|quinoa|linser|ärtor|kikärtor|bönor|mjölk|grädde|filmjölk|yoghurt|kvarg|fil(?:mjölk)?|buljong(?!tärning)|pasta|spaghetti|penne|makaroner|lasagne|nudlar/.test(
      n
    )
  ) {
    return 'dl'
  }

  return 'st'
}
