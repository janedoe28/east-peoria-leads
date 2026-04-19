import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://immncwyqgridbtcswxuk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltbW5jd3lxZ3JpZGJ0Y3N3eHVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NjM5NTEsImV4cCI6MjA5MjEzOTk1MX0.XfsmxzdYje1vFWJg83LGtDHTfdm_Ik_eh3p_Sk9zMKQ'
)