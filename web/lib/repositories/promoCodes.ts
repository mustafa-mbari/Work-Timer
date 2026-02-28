import { createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/shared/types'

type PromoCode = Database['public']['Tables']['promo_codes']['Row']

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
