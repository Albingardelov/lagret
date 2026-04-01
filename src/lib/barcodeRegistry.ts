import { supabase } from './supabase'

export interface BarcodeEntry {
  name: string
  nameEn?: string
  unit: string
  category?: string
}

export async function lookupBarcodeRegistry(barcode: string): Promise<BarcodeEntry | null> {
  const { data } = await supabase
    .from('barcodes')
    .select('name, name_en, unit, category')
    .eq('barcode', barcode)
    .maybeSingle()
  if (!data) return null
  return {
    name: data.name,
    nameEn: data.name_en ?? undefined,
    unit: data.unit,
    category: data.category ?? undefined,
  }
}

export async function saveBarcodeRegistry(barcode: string, entry: BarcodeEntry): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  await supabase.from('barcodes').upsert(
    {
      barcode,
      name: entry.name,
      name_en: entry.nameEn ?? null,
      unit: entry.unit,
      category: entry.category,
      created_by: user?.id,
    },
    { onConflict: 'barcode', ignoreDuplicates: true }
  )
}
