import { chromium } from 'playwright'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envContent = fs.readFileSync('.env.local', 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) {
    let value = match[2] || ''
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
    env[match[1]] = value.trim()
  }
})

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  console.log('1. Generating authentication session for yesarrahman@gmail.com...')
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'yesarrahman@gmail.com',
  })
  if (linkErr) throw linkErr

  const cookiesSet = []
  const ssrClient = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return [] },
      setAll(cookiesToSet) {
        cookiesSet.push(...cookiesToSet)
      }
    }
  })

  await ssrClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink'
  })

  const authCookie = cookiesSet[0]
  if (!authCookie) throw new Error('Failed to get auth cookie')

  console.log('2. Launching browser with video recording in ./recordings...')
  const recordingsDir = path.resolve('recordings')
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true })
  }

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: false,
    slowMo: 100,
  })

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    recordVideo: {
      dir: recordingsDir,
      size: { width: 1366, height: 768 },
    },
  })

  // Set auth cookie
  await context.addCookies([
    {
      name: authCookie.name,
      value: authCookie.value,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ])

  const page = await context.newPage()

  console.log('3. Navigating to Dashboard...')
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  // Take Dashboard Screenshot
  await page.screenshot({ path: path.join(recordingsDir, '01_dashboard_greeting.png') })
  console.log('Saved 01_dashboard_greeting.png')

  console.log('4. Navigating to Tasks...')
  await page.click('aside a[href="/tasks"]')
  await page.waitForTimeout(2000)

  console.log('5. Navigating to Kanban Board...')
  await page.click('aside a[href="/kanban"]')
  await page.waitForTimeout(2000)

  console.log('6. Navigating to Team...')
  await page.click('aside a[href="/team"]')
  await page.waitForTimeout(2000)

  console.log('7. Navigating to Settings...')
  await page.click('aside a[href="/settings"]')
  await page.waitForTimeout(2500)

  // Take Settings Screenshot before edit
  await page.screenshot({ path: path.join(recordingsDir, '02_settings_profile.png') })
  console.log('Saved 02_settings_profile.png')

  console.log('8. Editing Full Name and saving profile in Settings...')
  const nameInput = page.locator('input#fullName')
  await nameInput.fill('Yesar Rahman')
  await page.waitForTimeout(1000)

  const saveBtn = page.getByRole('button', { name: 'Save Profile' })
  await saveBtn.click()
  await page.waitForTimeout(2500)

  // Take Settings Screenshot after save
  await page.screenshot({ path: path.join(recordingsDir, '03_settings_saved.png') })
  console.log('Saved 03_settings_saved.png')

  // Return to Dashboard to see updated name
  console.log('9. Returning to Dashboard to verify synced name & greeting...')
  await page.click('aside a[href="/dashboard"]')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: path.join(recordingsDir, '04_dashboard_synced.png') })
  console.log('Saved 04_dashboard_synced.png')

  // Close context to finish video
  const video = page.video()
  await context.close()
  await browser.close()

  if (video) {
    const videoPath = await video.path()
    const targetVideo = path.join(recordingsDir, 'SprintDesk_Verification_Clip.webm')
    if (fs.existsSync(targetVideo)) fs.unlinkSync(targetVideo)
    fs.renameSync(videoPath, targetVideo)
    console.log(`Video recorded and saved to: ${targetVideo}`)
  }

  console.log('All tests and recordings completed successfully!')
}

run().catch((err) => {
  console.error('Recording error:', err)
  process.exit(1)
})
