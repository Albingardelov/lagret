import { describe, it, expect } from 'vitest'
import { suggestCookingUnit } from '../cookingUnitSuggestions'

describe('suggestCookingUnit — stored unit not st', () => {
  it('returns stored unit when it is dl', () =>
    expect(suggestCookingUnit('Vetemjöl', 'dl')).toBe('dl'))
  it('returns stored unit when it is g', () => expect(suggestCookingUnit('Smör', 'g')).toBe('g'))
  it('returns stored unit when it is msk', () =>
    expect(suggestCookingUnit('Olivolja', 'msk')).toBe('msk'))
  it('returns stored unit when it is l', () => expect(suggestCookingUnit('Mjölk', 'l')).toBe('l'))
})

describe('suggestCookingUnit — st items that stay st', () => {
  it('ägg → st', () => expect(suggestCookingUnit('Ägg', 'st')).toBe('st'))
  it('lök → st', () => expect(suggestCookingUnit('Gul lök', 'st')).toBe('st'))
  it('vitlök → st', () => expect(suggestCookingUnit('Vitlök', 'st')).toBe('st'))
  it('potatis → st', () => expect(suggestCookingUnit('Potatis', 'st')).toBe('st'))
  it('morot → st', () => expect(suggestCookingUnit('Morot', 'st')).toBe('st'))
  it('tomat → st', () => expect(suggestCookingUnit('Tomat', 'st')).toBe('st'))
  it('citron → st', () => expect(suggestCookingUnit('Citron', 'st')).toBe('st'))
  it('banan → st', () => expect(suggestCookingUnit('Banan', 'st')).toBe('st'))
  it('äpple → st', () => expect(suggestCookingUnit('Äpple', 'st')).toBe('st'))
  it('burk → st', () => expect(suggestCookingUnit('Burk krossade tomater', 'st')).toBe('st'))
  it('paprika (vegetable) → st', () => expect(suggestCookingUnit('Röd paprika', 'st')).toBe('st'))
  it('zucchini → st', () => expect(suggestCookingUnit('Zucchini', 'st')).toBe('st'))
})

describe('suggestCookingUnit — spices → tsk', () => {
  it('salt → tsk', () => expect(suggestCookingUnit('Salt', 'st')).toBe('tsk'))
  it('peppar → tsk', () => expect(suggestCookingUnit('Svartpeppar', 'st')).toBe('tsk'))
  it('kanel → tsk', () => expect(suggestCookingUnit('Kanel', 'st')).toBe('tsk'))
  it('vaniljsocker → tsk', () => expect(suggestCookingUnit('Vaniljsocker', 'st')).toBe('tsk'))
  it('bakpulver → tsk', () => expect(suggestCookingUnit('Bakpulver', 'st')).toBe('tsk'))
  it('bikarbonat → tsk', () => expect(suggestCookingUnit('Bikarbonat', 'st')).toBe('tsk'))
  it('gurkmeja → tsk', () => expect(suggestCookingUnit('Gurkmeja', 'st')).toBe('tsk'))
  it('paprikapulver → tsk', () => expect(suggestCookingUnit('Paprikapulver', 'st')).toBe('tsk'))
  it('spiskummin → tsk', () => expect(suggestCookingUnit('Spiskummin', 'st')).toBe('tsk'))
  it('oregano → tsk', () => expect(suggestCookingUnit('Oregano', 'st')).toBe('tsk'))
  it('chili → tsk', () => expect(suggestCookingUnit('Chiliflingor', 'st')).toBe('tsk'))
  it('kardemumma → tsk', () => expect(suggestCookingUnit('Kardemumma', 'st')).toBe('tsk'))
})

describe('suggestCookingUnit — oils and pastes → msk', () => {
  it('olivolja → msk', () => expect(suggestCookingUnit('Olivolja', 'st')).toBe('msk'))
  it('rapsolja → msk', () => expect(suggestCookingUnit('Rapsolja', 'st')).toBe('msk'))
  it('honung → msk', () => expect(suggestCookingUnit('Honung', 'st')).toBe('msk'))
  it('sirap → msk', () => expect(suggestCookingUnit('Ljus sirap', 'st')).toBe('msk'))
  it('tomatpuré → msk', () => expect(suggestCookingUnit('Tomatpuré', 'st')).toBe('msk'))
  it('senap → msk', () => expect(suggestCookingUnit('Dijonsenap', 'st')).toBe('msk'))
  it('soja → msk', () => expect(suggestCookingUnit('Sojasås', 'st')).toBe('msk'))
  it('vinäger → msk', () => expect(suggestCookingUnit('Äppelcidervinäger', 'st')).toBe('msk'))
})

describe('suggestCookingUnit — butter, cheese, meat, fish → g', () => {
  it('smör → g', () => expect(suggestCookingUnit('Smör', 'st')).toBe('g'))
  it('ost → g', () => expect(suggestCookingUnit('Riven ost', 'st')).toBe('g'))
  it('köttfärs → g', () => expect(suggestCookingUnit('Nötfärs', 'st')).toBe('g'))
  it('lax → g', () => expect(suggestCookingUnit('Laxfilé', 'st')).toBe('g'))
  it('torsk → g', () => expect(suggestCookingUnit('Torsk', 'st')).toBe('g'))
  it('bacon → g', () => expect(suggestCookingUnit('Bacon', 'st')).toBe('g'))
  it('skinka → g', () => expect(suggestCookingUnit('Rökt skinka', 'st')).toBe('g'))
  it('choklad → g', () => expect(suggestCookingUnit('Mörk choklad', 'st')).toBe('g'))
  it('räkor → g', () => expect(suggestCookingUnit('Räkor', 'st')).toBe('g'))
})

describe('suggestCookingUnit — flour, grains, liquids → dl', () => {
  it('vetemjöl → dl', () => expect(suggestCookingUnit('Vetemjöl', 'st')).toBe('dl'))
  it('socker → dl', () => expect(suggestCookingUnit('Strösocker', 'st')).toBe('dl'))
  it('ris → dl', () => expect(suggestCookingUnit('Basmatiris', 'st')).toBe('dl'))
  it('havregryn → dl', () => expect(suggestCookingUnit('Havregryn', 'st')).toBe('dl'))
  it('mjölk → dl', () => expect(suggestCookingUnit('Mjölk', 'st')).toBe('dl'))
  it('grädde → dl', () => expect(suggestCookingUnit('Vispgrädde', 'st')).toBe('dl'))
  it('filmjölk → dl', () => expect(suggestCookingUnit('Filmjölk', 'st')).toBe('dl'))
  it('buljong → dl', () => expect(suggestCookingUnit('Hönsbuljong', 'st')).toBe('dl'))
  it('linser → dl', () => expect(suggestCookingUnit('Röda linser', 'st')).toBe('dl'))
  it('kikärtor → dl', () => expect(suggestCookingUnit('Kikärtor', 'st')).toBe('dl'))
  it('pasta → dl', () => expect(suggestCookingUnit('Spaghetti', 'st')).toBe('dl'))
  it('bulgur → dl', () => expect(suggestCookingUnit('Bulgur', 'st')).toBe('dl'))
})

describe('suggestCookingUnit — unknown → st', () => {
  it('unknown ingredient stays st', () => expect(suggestCookingUnit('Gizmo 3000', 'st')).toBe('st'))
})
