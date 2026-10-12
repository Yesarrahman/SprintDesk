import { chromium } from 'playwright'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

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

async function setCaption(page, tag, title, description) {
  await page.evaluate(({ tag, title, description }) => {
    let container = document.getElementById('promo-caption-container')
    if (!container) {
      container = document.createElement('div')
      container.id = 'promo-caption-container'
      container.style.position = 'fixed'
      container.style.bottom = '28px'
      container.style.left = '28px'
      container.style.zIndex = '999999'
      container.style.maxWidth = '520px'
      container.style.pointerEvents = 'none'
      container.style.fontFamily = 'system-ui, -apple-system, sans-serif'
      document.body.appendChild(container)
    }

    container.innerHTML = `
      <div style="
        background: rgba(13, 36, 64, 0.88);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(99, 102, 241, 0.35);
        border-radius: 16px;
        padding: 16px 22px;
        box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 25px rgba(99, 102, 241, 0.25);
        color: white;
        animation: promoSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      ">
        <style>
          @keyframes promoSlideUp {
            from { opacity: 0; transform: translateY(16px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        </style>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span style="
            background: linear-gradient(135deg, #6366f1, #a855f7);
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            padding: 3px 8px;
            border-radius: 6px;
            display: inline-block;
          ">${tag}</span>
          <span style="font-size: 14px; font-weight: 700; color: #f8fafc; letter-spacing: -0.01em;">${title}</span>
        </div>
        <p style="margin: 0; font-size: 12.5px; line-height: 1.45; color: #cbd5e1; font-weight: 400;">
          ${description}
        </p>
      </div>
    `
  }, { tag, title, description })
}

async function hideCaption(page) {
  await page.evaluate(() => {
    const el = document.getElementById('promo-caption-container')
    if (el) el.remove()
  })
}

async function run() {
  console.log('1. Setting up authentication session for Yesar...')
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'yesarrahman@gmail.com',
  })
  if (linkErr) throw linkErr

  const cookiesSet = []
  const ssrClient = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return [] },
      setAll(cookiesToSet) { cookiesSet.push(...cookiesToSet) }
    }
  })

  await ssrClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink'
  })

  const authCookie = cookiesSet[0]
  if (!authCookie) throw new Error('Failed to obtain auth cookie')

  const recordingsDir = path.resolve('recordings')
  if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir, { recursive: true })

  console.log('2. Launching 1080p Chromium with video recording...')
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: false,
    slowMo: 80,
  })

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: recordingsDir,
      size: { width: 1920, height: 1080 },
    },
  })

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

  // ──────────────────────────────────────────────
  // SCENE 1: HERO / INTRO
  // ──────────────────────────────────────────────
  console.log('🎬 SCENE 1: Welcome & Productivity Overview...')
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  await setCaption(
    page,
    'SPRINTDESK 2.0',
    'The Modern All-In-One Workspace',
    'Built for high-velocity teams and ambitious solopreneurs. Streamline tasks, sprint workflows, and team collaboration in one unified app.'
  )
  await page.waitForTimeout(4000)

  // ──────────────────────────────────────────────
  // SCENE 2: DYNAMIC COMMAND CENTER
  // ──────────────────────────────────────────────
  console.log('🎬 SCENE 2: Dynamic Greeting & Metrics...')
  await setCaption(
    page,
    'FEATURE 01 · COMMAND CENTER',
    'Intelligent Daily Productivity Overview',
    'Automated device-time greetings, real-time workload analytics, sprint progress tracking, and velocity forecasting.'
  )
  await page.waitForTimeout(4000)

  // Hover over stat cards
  const cards = page.locator('.grid > div')
  const count = await cards.count()
  for (let i = 0; i < Math.min(count, 4); i++) {
    await cards.nth(i).hover()
    await page.waitForTimeout(600)
  }

  // ──────────────────────────────────────────────
  // SCENE 3: MULTI-TENANT WORKSPACE SWITCHING
  // ──────────────────────────────────────────────
  console.log('🎬 SCENE 3: Multi-Tenant Workspace Switching...')
  await setCaption(
    page,
    'FEATURE 02 · MULTI-TENANT SPACES',
    'Personal Space & Team Workspaces',
    'Effortlessly switch between your private solopreneur space and collaborative team spaces with complete data isolation.'
  )
  await page.waitForTimeout(2000)

  // Click on "Social Media" workspace in sidebar
  const socialWs = page.locator('aside').getByText('Social Media', { exact: false })
  if (await socialWs.count() > 0) {
    await socialWs.first().click()
    await page.waitForTimeout(3000)
  }

  // ──────────────────────────────────────────────
  // SCENE 4: CAPTURE INBOX
  // ──────────────────────────────────────────────
  console.log('🎬 SCENE 4: Capture Inbox...')
  await setCaption(
    page,
    'FEATURE 03 · CAPTURE INBOX',
    'Zero-Friction Idea & Task Capture',
    'Dump incoming thoughts, meeting notes, and rapid requests instantly. Convert raw thoughts into organized tasks with one click.'
  )
  await page.click('aside a[href="/inbox"]')
  await page.waitForTimeout(3500)

  // ──────────────────────────────────────────────
  // SCENE 5: KANBAN BOARD
  // ──────────────────────────────────────────────
  console.log('🎬 SCENE 5: Interactive Kanban Board...')
  await setCaption(
    page,
    'FEATURE 04 · AGILE KANBAN',
    'Visual Workflow & Sprint Columns',
    'Drag-and-drop task progression from Backlog to In Progress, Review, and Done. Complete with priorities, subtasks, and deadlines.'
  )
  await page.click('aside a[href="/kanban"]')
  await page.waitForTimeout(4000)

  // Scroll across kanban columns
  await page.evaluate(() => {
    window.scrollBy({ top: 150, behavior: 'smooth' })
  })
  await page.waitForTimeout(1500)
  await page.evaluate(() => {
    window.scrollBy({ top: -150, behavior: 'smooth' })
  })
  await page.waitForTimeout(1000)

  // ──────────────────────────────────────────────
  // SCENE 6: VISUAL SPRINT CALENDAR
  // ──────────────────────────────────────────────
  console.log('🎬 SCENE 6: Sprint Calendar...')
  await setCaption(
    page,
    'FEATURE 05 · SPRINT CALENDAR',
    'Deadline & Timeline Alignment',
    'Never miss a milestone. High-level visual timeline keeping your entire sprint synchronized at a glance.'
  )
  await page.click('aside a[href="/calendar"]')
  await page.waitForTimeout(3500)

  // ──────────────────────────────────────────────
  // SCENE 7: TEAM COLLABORATION & ROLES
  // ──────────────────────────────────────────────
  console.log('🎬 SCENE 7: Team Collaboration...')
  await setCaption(
    page,
    'FEATURE 06 · TEAM COLLABORATION',
    'Role-Based Access & Member Invites',
    'Seamless colleague onboarding, admin permissions, and transparent workload distribution across projects.'
  )
  await page.click('aside a[href="/team"]')
  await page.waitForTimeout(3500)

  // ──────────────────────────────────────────────
  // SCENE 8: AUTOMATION ENGINE
  // ──────────────────────────────────────────────
  console.log('🎬 SCENE 8: Automations Engine...')
  await setCaption(
    page,
    'FEATURE 07 · AUTOMATION ENGINE',
    'Smart Event Triggers & Routine Automation',
    'Eliminate busywork with automated status transitions, auto-assignments, and recurring task schedules.'
  )
  await page.click('aside a[href="/automations"]')
  await page.waitForTimeout(3500)

  // ──────────────────────────────────────────────
  // SCENE 9: EXECUTIVE REPORTS & ANALYTICS
  // ──────────────────────────────────────────────
  console.log('🎬 SCENE 9: Reports & Analytics...')
  await setCaption(
    page,
    'FEATURE 08 · EXECUTIVE REPORTS',
    'Sprint Velocity & PDF Export',
    'Generate polished productivity summaries, completion graphs, and audit-ready reports for clients and stakeholders.'
  )
  await page.click('aside a[href="/reports"]')
  await page.waitForTimeout(3500)

  // ──────────────────────────────────────────────
  // SCENE 10: BILLING & PRICING
  // ──────────────────────────────────────────────
  console.log('🎬 SCENE 10: Subscription & Billing...')
  await setCaption(
    page,
    'FEATURE 09 · SUBSCRIPTION TIERS',
    'Flexible Growth Plans',
    'Scale from Free to Pro or Agency with Stripe integration, unlimited members, and advanced features.'
  )
  await page.click('aside a[href="/billing"]')
  await page.waitForTimeout(3500)

  // ──────────────────────────────────────────────
  // SCENE 11: SETTINGS & APPEARANCE (DARK MODE)
  // ──────────────────────────────────────────────
  console.log('🎬 SCENE 11: Settings & Dark Mode Customization...')
  await setCaption(
    page,
    'FEATURE 10 · CUSTOMIZATION & APPEARANCE',
    'Dark Mode & Glassmorphic UI',
    'Instant theme switching between bright daylight and immersive deep-navy dark mode.'
  )
  await page.click('aside a[href="/settings"]')
  await page.waitForTimeout(2500)

  // Toggle Dark Mode
  console.log('Switching to Dark Mode on camera...')
  const darkBtn = page.getByRole('button', { name: 'Dark' })
  if (await darkBtn.count() > 0) {
    await darkBtn.click()
    await page.waitForTimeout(2500)
  }

  // Toggle back to Light Mode or stay in Dark mode
  await page.waitForTimeout(1500)

  // ──────────────────────────────────────────────
  // SCENE 12: OUTRO / CALL TO ACTION
  // ──────────────────────────────────────────────
  console.log('🎬 SCENE 12: Outro & Call To Action...')
  await page.click('aside a[href="/dashboard"]')
  await page.waitForTimeout(1500)

  await setCaption(
    page,
    'LAUNCH YOUR SPRINT TODAY',
    'SprintDesk — Speed. Focus. Execution.',
    'Experience the next generation of productivity. Start free today at sprintdesk.app.'
  )
  await page.waitForTimeout(4000)

  await hideCaption(page)
  await page.waitForTimeout(1000)

  // Finalize video
  console.log('Finalizing recording...')
  const video = page.video()
  await context.close()
  await browser.close()

  if (video) {
    const rawVideoPath = await video.path()
    const finalWebm = path.join(recordingsDir, 'SprintDesk_Product_Launch_1080p.webm')
    if (fs.existsSync(finalWebm)) fs.unlinkSync(finalWebm)
    fs.renameSync(rawVideoPath, finalWebm)
    console.log(`✅ 1080p WebM Launch Video saved to: ${finalWebm}`)

    // Convert to MP4 using ffmpeg if supported
    const ffmpegPath = 'C:\\Users\\Hi\\AppData\\Local\\ms-playwright\\ffmpeg-1013\\ffmpeg-win64.exe'
    const finalMp4 = path.join(recordingsDir, 'SprintDesk_Product_Launch_1080p.mp4')
    if (fs.existsSync(ffmpegPath)) {
      try {
        console.log('Converting to MP4 format...')
        // Note: the playwright ffmpeg build has VP9 decoder and image muxers, let's test if mp4 container is supported or keep webm
        execSync(`"${ffmpegPath}" -i "${finalWebm}" -c copy "${finalMp4}" -y`, { stdio: 'ignore' })
        console.log(`✅ 1080p MP4 Launch Video saved to: ${finalMp4}`)
      } catch (e) {
        console.log('Note: MP4 container muxing skipped, high quality WebM is ready for all platforms.')
      }
    }
  }

  console.log('🚀 Product Launch Showcase Video successfully produced!')
}

run().catch(err => {
  console.error('Showcase generation error:', err)
  process.exit(1)
})
