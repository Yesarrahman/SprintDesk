import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function testInsert() {
  const { data: wsData } = await supabase.from('workspaces').select('id, owner_id').limit(1)
  if (!wsData || wsData.length === 0) return console.log("No workspace found")
  
  const ws = wsData[0]
  
  const { error } = await supabase.from('tasks').insert({
    workspace_id: ws.id,
    title: 'Test In Review',
    status: 'in_review',
    created_by: ws.owner_id
  })
  
  console.log("Insert result error:", error)
}

testInsert()
