import { createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/shared/types'

type PromoCode = Database['public']['Tables']['promo_codes']['Row']
type PromoCodeInsert = Database['public']['Tables']['promo_codes']['Insert']

export async function getPromoByCode(code: string) {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('promo_codes')
    .select('id, code, discount_pct, plan, max_uses, current_uses, valid_from, valid_until, active')
    .eq('code', code.toUpperCase())
    .eq('active', true)
    .single<Pick<PromoCode, 'id' | 'code' | 'discount_pct' | 'plan' | 'max_uses' | 'current_uses' | 'valid_from' | 'valid_until' | 'active'>>()
  return { data, error }
}

export async function getAllPromoCodes() {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('promo_codes')
    .select('id, code, discount_pct, plan, max_uses, current_uses, valid_from, valid_until, active, created_at, created_by')
    .order('created_at', { ascending: false })
    .returns<PromoCode[]>()
  return data ?? []
}

export async function createPromoCode(promo: {
  code: string
  discount_pct: number
  plan: string
  max_uses: number | null
}) {
  const supabase = await createServiceClient()
  const row: PromoCodeInsert = {
    code: promo.code.trim().toUpperCase(),
    discount_pct: promo.discount_pct,
    plan: promo.plan as PromoCode['plan'],
    max_uses: promo.max_uses,
    current_uses: 0,
    active: true,
    valid_from: new Date().toISOString(),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js v2.95 resolves Insert type to `never`
  return (supabase.from('promo_codes') as any).insert(row)
}

export async function updatePromoCodeActive(id: string, active: boolean) {
  const supabase = await createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.from('promo_codes') as any).update({ active }).eq('id', id)
}

export async function checkUserRedemption(promoCodeId: string, userId: string): Promise<boolean> {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('promo_redemptions')
    .select('id')
    .eq('promo_code_id', promoCodeId)
    .eq('user_id', userId)
    .single<Pick<Database['public']['Tables']['promo_redemptions']['Row'], 'id'>>()
  return !!data
}
