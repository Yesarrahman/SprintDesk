import test, { describe, before } from 'node:test'
import assert from 'node:assert'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Tenant IDs and accounts
const TENANT_A_EMAIL = 'yesarrahman@gmail.com'
const TENANT_A_WS_ID = 'fa241db3-45ce-4143-8321-b3f4c9ce8c15' // "My Workspace" owned by Yesar
const TENANT_A_TASK_ID = 'e0d3c31c-ee2a-46f6-a011-0d057264566a'

const TENANT_B_EMAIL = 'umaira30t@gmail.com'
const TENANT_B_WS_ID = 'cd54f1fd-861d-4d26-bb79-f44513297e53' // "My Workspace" owned by Umaira

const MEMBER_C_EMAIL = 'york.r.a.tek@gmail.com'
const MEMBER_C_SHARED_WS_ID = '261f46d8-ebfe-43aa-8cea-550c40a65b08' // Content Marketing (Yesar owner, york member)

let adminClient: SupabaseClient
let clientA: SupabaseClient
let clientB: SupabaseClient
let clientC: SupabaseClient
let anonClient: SupabaseClient

let userA: { id: string; email: string }
let userB: { id: string; email: string }
let userC: { id: string; email: string }

async function createAuthenticatedClient(email: string) {
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkErr || !linkData?.properties?.hashed_token) {
    throw new Error(`Failed to generate magic link for ${email}: ${linkErr?.message}`)
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: sessionData, error: sessionErr } = await client.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  })
  if (sessionErr || !sessionData?.session) {
    throw new Error(`Failed to establish session for ${email}: ${sessionErr?.message}`)
  }

  return {
    client,
    user: { id: sessionData.user!.id, email: sessionData.user!.email! },
  }
}

before(async () => {
  assert.ok(SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL must be set')
  assert.ok(SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY must be set')
  assert.ok(SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY must be set')

  adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  const resA = await createAuthenticatedClient(TENANT_A_EMAIL)
  clientA = resA.client
  userA = resA.user

  const resB = await createAuthenticatedClient(TENANT_B_EMAIL)
  clientB = resB.client
  userB = resB.user

  const resC = await createAuthenticatedClient(MEMBER_C_EMAIL)
  clientC = resC.client
  userC = resC.user

  assert.notStrictEqual(userA.id, userB.id, 'Tenant A and Tenant B must be distinct users')
})

describe('SprintDesk Multi-Tenant Isolation & Authorization Suite', () => {

  // ─── 1. Cross-Tenant Task Isolation ───────────────────────────────
  describe('1. Task Isolation (BOLA / IDOR Prevention)', () => {
    test('Tenant B cannot READ Tenant A workspace tasks', async () => {
      const { data, error } = await clientB
        .from('tasks')
        .select('*')
        .eq('workspace_id', TENANT_A_WS_ID)

      const count = data?.length || 0
      assert.strictEqual(
        count,
        0,
        `SECURITY VIOLATION: Tenant B was able to read ${count} tasks from Tenant A workspace`
      )
    })

    test('Tenant B cannot CREATE a task inside Tenant A workspace', async () => {
      const { data, error } = await clientB
        .from('tasks')
        .insert({
          workspace_id: TENANT_A_WS_ID,
          title: 'UNAUTHORIZED_CROSS_TENANT_INJECTION',
          status: 'todo',
          created_by: userB.id,
        })
        .select()

      assert.ok(
        error !== null || !data || data.length === 0,
        'SECURITY VIOLATION: Tenant B was able to insert a task into Tenant A workspace'
      )
    })

    test('Tenant B cannot UPDATE Tenant A task status or details', async () => {
      const { data, error } = await clientB
        .from('tasks')
        .update({ title: 'TAMPERED_BY_TENANT_B', status: 'completed' })
        .eq('id', TENANT_A_TASK_ID)
        .select()

      const modifiedCount = data?.length || 0
      assert.strictEqual(
        modifiedCount,
        0,
        'SECURITY VIOLATION: Tenant B was able to modify a task belonging to Tenant A'
      )
    })

    test('Tenant B cannot DELETE Tenant A task', async () => {
      const { data, error } = await clientB
        .from('tasks')
        .delete()
        .eq('id', TENANT_A_TASK_ID)
        .select()

      const deletedCount = data?.length || 0
      assert.strictEqual(
        deletedCount,
        0,
        'SECURITY VIOLATION: Tenant B was able to delete a task belonging to Tenant A'
      )
    })
  })

  // ─── 2. Cross-Tenant Automations Isolation ────────────────────────
  describe('2. Automations Isolation', () => {
    test('Tenant B cannot READ automations in Tenant A workspace', async () => {
      const { data, error } = await clientB
        .from('automations')
        .select('*')
        .eq('workspace_id', TENANT_A_WS_ID)

      const count = data?.length || 0
      assert.strictEqual(
        count,
        0,
        `SECURITY VIOLATION: Tenant B was able to read ${count} automations belonging to Tenant A`
      )
    })

    test('Tenant B cannot INSERT automations into Tenant A workspace', async () => {
      const { data, error } = await clientB
        .from('automations')
        .insert({
          workspace_id: TENANT_A_WS_ID,
          trigger_type: 'status_changed',
          trigger_value: 'todo',
          action_type: 'set_priority',
          action_value: 'urgent',
        })
        .select()

      assert.ok(
        error !== null || !data || data.length === 0,
        'SECURITY VIOLATION: Tenant B was able to insert an automation into Tenant A workspace'
      )
    })
  })

  // ─── 3. Cross-Tenant Time Tracking Isolation ──────────────────────
  describe('3. Time Tracking & Activity Isolation', () => {
    test('Tenant B cannot READ time logs belonging to Tenant A tasks', async () => {
      const { data, error } = await clientB
        .from('time_logs')
        .select('*')
        .eq('task_id', TENANT_A_TASK_ID)

      const count = data?.length || 0
      assert.strictEqual(
        count,
        0,
        `SECURITY VIOLATION: Tenant B was able to read ${count} time logs belonging to Tenant A`
      )
    })

    test('Tenant B cannot INSERT time logs for Tenant A tasks', async () => {
      const { data, error } = await clientB
        .from('time_logs')
        .insert({
          task_id: TENANT_A_TASK_ID,
          user_id: userB.id,
          start_time: new Date().toISOString(),
        })
        .select()

      assert.ok(
        error !== null || !data || data.length === 0,
        'SECURITY VIOLATION: Tenant B was able to insert a time log on Tenant A task'
      )
    })
  })

  // ─── 4. Cross-Tenant Reports Isolation ────────────────────────────
  describe('4. Submitted Reports Isolation', () => {
    test('Tenant B cannot READ submitted reports of Tenant A workspace', async () => {
      const { data, error } = await clientB
        .from('submitted_reports')
        .select('*')
        .eq('workspace_id', TENANT_A_WS_ID)

      const count = data?.length || 0
      assert.strictEqual(
        count,
        0,
        `SECURITY VIOLATION: Tenant B was able to view submitted reports of Tenant A workspace`
      )
    })
  })

  // ─── 5. Storage Security (Avatars Bucket) ─────────────────────────
  describe('5. Storage Isolation (Avatars Bucket)', () => {
    test('Tenant B cannot OVERWRITE Tenant A avatar', async () => {
      const tenantAPath = `${userA.id}/avatar.png`
      const fakeContent = Buffer.from('FAKE_AVATAR_IMAGE_DATA')

      const { data, error } = await clientB.storage
        .from('avatars')
        .upload(tenantAPath, fakeContent, { upsert: true, contentType: 'image/png' })

      assert.ok(
        error !== null,
        `SECURITY VIOLATION: Tenant B was able to overwrite Tenant A avatar at path ${tenantAPath}`
      )
    })

    test('Tenant B cannot DELETE Tenant A avatar', async () => {
      const tenantAPath = `${userA.id}/avatar.png`

      const { data, error } = await clientB.storage
        .from('avatars')
        .remove([tenantAPath])

      const deletedFiles = (data || []).filter((f: any) => f.name === tenantAPath || f.name?.includes(userA.id))
      assert.strictEqual(
        deletedFiles.length,
        0,
        'SECURITY VIOLATION: Tenant B was able to delete Tenant A avatar file from storage'
      )
    })
  })

  // ─── 6. Public Anon Data Leakage ──────────────────────────────────
  describe('6. Public Unauthenticated Data Leakage', () => {
    test('Unauthenticated user CANNOT read full user profiles or Stripe customer IDs', async () => {
      const { data, error } = await anonClient
        .from('profiles')
        .select('id, stripe_customer_id, stripe_subscription_id')
        .not('stripe_customer_id', 'is', null)

      const leakedCount = (data || []).length
      assert.strictEqual(
        leakedCount,
        0,
        `SECURITY VIOLATION: Unauthenticated public anon client read ${leakedCount} Stripe customer records from profiles`
      )
    })
  })

  // ─── 7. Workspace RBAC Privilege Escalation ───────────────────────
  describe('7. Workspace Member RBAC Limits', () => {
    test('Invited Member C CANNOT delete the workspace owned by Tenant A', async () => {
      const { data, error } = await clientC
        .from('workspaces')
        .delete()
        .eq('id', MEMBER_C_SHARED_WS_ID)
        .select()

      const deletedCount = data?.length || 0
      assert.strictEqual(
        deletedCount,
        0,
        'SECURITY VIOLATION: A workspace member was able to delete the workspace owned by Tenant A'
      )
    })
  })
})
