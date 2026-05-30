import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspectSchema() {
  console.log("Inspecting schema...")
  
  // Try inserting a task with 'in_review' status
  console.log("Checking if 'in_review' status is allowed...")
  
  // We just fetch a single task to see its structure
  const { data: taskData, error: taskError } = await supabase.from('tasks').select('*').limit(1)
  console.log("Tasks sample:", taskData, taskError)
  
  const { data: wsData, error: wsError } = await supabase.from('workspaces').select('*').limit(1)
  console.log("Workspaces sample:", wsData, wsError)
}

inspectSchema()
