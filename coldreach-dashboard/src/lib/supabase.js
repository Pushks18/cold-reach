import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('supabase-url') || ''
const key = import.meta.env.VITE_SUPABASE_KEY || localStorage.getItem('supabase-key') || ''

export const supabase = url && key ? createClient(url, key) : null

export function isConfigured() {
  return !!supabase
}

export function configure(newUrl, newKey) {
  localStorage.setItem('supabase-url', newUrl)
  localStorage.setItem('supabase-key', newKey)
  window.location.reload()
}
