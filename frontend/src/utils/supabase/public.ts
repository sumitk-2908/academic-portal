import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/lib/database.types'

/**
 * A standard, non-SSR Supabase client.
 * This should ONLY be used inside Next.js data cache wrappers (like `unstable_cache`) 
 * where accessing cookies/headers is prohibited.
 */
export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
