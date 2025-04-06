import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('supabaseUrl and serviceRoleKey are required.')
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

export default supabase
