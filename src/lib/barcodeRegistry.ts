import { supabase } from './supabase'

export interface BarcodeEntry {
  name: string
  unit: string
  category?: string
}

export async function lookupBarcodeRegistry(barcode: string): Promise<BarcodeEntry | null> {
  const { data } = await supabase
    .from('barcodes')
    .select('name, unit, category')
    .eq('barcode', barcode)
    .maybeSingle()
  return data ?? null
}

export async function saveBarcodeRegistry(barcode: string, entry: BarcodeEntry): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  await supabase
    .from('barcodes')
    .upsert(
      { barcode, ...entry, created_by: user?.id },
      { onConflict: 'barcode', ignoreDuplicates: true }
    )
}
