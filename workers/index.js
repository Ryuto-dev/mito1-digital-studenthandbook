/**
 * mito1-hundbook Cloudflare Workers (ES Module)
 *
 * wrangler.toml or Cloudflare Dashboard:
 *   "Module Worker" -> "Module: ES Modules"
 *
 * Secrets (Settings > Variables and Secrets):
 *   GEMINI_API_KEY  -- Gemini API key (Secret)
 *   RESEND_API_KEY  -- Resend API key (Secret)
 *   APP_BASE_URL    -- https://ryuto-devs.github.io/mito1-digital-studenthandbook (Plain text)
 *   RESEND_FROM     -- Verified sender (Plain text, e.g. "mito1-handbook <noreply@yourdomain.com>")
 *                      If not set, falls back to "mito1-handbook <onboarding@resend.dev>"
 *                      NOTE: onboarding@resend.dev can ONLY deliver to the Resend account owner's email.
 *                      To send to any recipient, you MUST verify your own domain in the Resend dashboard
 *                      and set this variable to an address on that domain.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS })
    }

    const url = new URL(request.url)

    // GET /approve -> redirect to approve.html
    if (request.method === 'GET' && url.pathname === '/approve') {
      const token  = url.searchParams.get('token')
      const action = url.searchParams.get('action') || 'approve'
      const base   = env.APP_BASE_URL || 'https://ryuto-devs.github.io/mito1-digital-studenthandbook'
      if (!token) return new Response('Token is invalid', { status: 400 })
      return Response.redirect(`${base}/approve.html?token=${encodeURIComponent(token)}&action=${action}`, 302)
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405)
    }

    let body
    try { body = await request.json() }
    catch { return json({ error: 'Invalid JSON' }, 400) }

    if (url.pathname === '/send-approval') return sendApproval(body, env)
    if (url.pathname === '/send-complete')  return sendComplete(body, env)

    // Default -> Gemini proxy
    return gemini(body, env)
  }
}

// -- Gemini proxy -------------------------------------------------------
async function gemini(body, env) {
  // Support both GEMINI_KEY and GEMINI_API_KEY for backwards compatibility
  const apiKey = env.GEMINI_API_KEY || env.GEMINI_KEY
  if (!apiKey) {
    return json({ error: { code: 500, message: 'GEMINI_API_KEY not set in Workers secrets' } }, 500)
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )
  const data = await res.json()
  return json(data, res.status)
}

// -- Approval request email ---------------------------------------------
async function sendApproval(body, env) {
  const {
    studentName, title, dates, reason,
    step, recipientEmail, recipientRole,
    supervisorEmail, approveToken, rejectToken, appBaseUrl,
  } = body

  // Validate required fields
  if (!recipientEmail) {
    return json({ error: 'recipientEmail is required' }, 400)
  }

  const base     = appBaseUrl || env.APP_BASE_URL || 'https://ryuto-devs.github.io/mito1-digital-studenthandbook'
  const datesStr = (dates || []).join(', ')
  const roleName = recipientRole === 'supervisor' ? 'Supervisor' : 'Homeroom Teacher'
  const approveUrl = `${base}/approve.html?caseId=${body.caseId}&token=${approveToken}&action=approve`
  const rejectUrl  = `${base}/approve.html?caseId=${body.caseId}&token=${rejectToken}&action=reject`
  const supNote    = step === 'homeroom'
    ? `<p style="color:#27ae60;background:#eafaf1;padding:10px 14px;border-radius:6px;font-size:13px;margin:12px 0">Supervisor (${supervisorEmail}) has already approved.</p>`
    : ''

  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;background:#f5f5f5;padding:24px;margin:0">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:#1a2744;padding:20px 28px"><div style="color:#fff;font-size:18px;font-weight:700">Mito Daiichi High School</div><div style="color:#a0b0cc;font-size:12px;margin-top:2px">Digital Student Handbook - Absence Application System</div></div>
  <div style="padding:28px">
    <p style="color:#333;font-size:15px;margin:0 0 16px">${roleName}<br><br>Please review the following absence application.</p>
    ${supNote}
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0">
      <tr style="background:#f8f9fa"><td style="padding:10px 14px;border:1px solid #e0e0e0;font-weight:600;width:30%">Applicant</td><td style="padding:10px 14px;border:1px solid #e0e0e0">${studentName}</td></tr>
      <tr><td style="padding:10px 14px;border:1px solid #e0e0e0;font-weight:600">Subject</td><td style="padding:10px 14px;border:1px solid #e0e0e0">${title}</td></tr>
      <tr style="background:#f8f9fa"><td style="padding:10px 14px;border:1px solid #e0e0e0;font-weight:600">Reason</td><td style="padding:10px 14px;border:1px solid #e0e0e0">${reason||'Club activity'}</td></tr>
      <tr><td style="padding:10px 14px;border:1px solid #e0e0e0;font-weight:600">Absence Dates</td><td style="padding:10px 14px;border:1px solid #e0e0e0">${datesStr}</td></tr>
    </table>
    <div style="display:flex;gap:12px;margin-top:24px">
      <a href="${approveUrl}" style="flex:1;display:block;text-align:center;background:#1a2744;color:#fff;padding:14px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700">Approve</a>
      <a href="${rejectUrl}" style="flex:1;display:block;text-align:center;background:#fff;color:#e74c3c;border:1.5px solid #e74c3c;padding:14px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700">Reject</a>
    </div>
    <p style="font-size:11px;color:#999;margin-top:20px">This link is valid for 7 days. You can also manage from the <a href="${base}/teacher.html" style="color:#1a2744">Teacher Dashboard</a>.</p>
  </div>
</div></body></html>`

  const r = await resend(env, { to: recipientEmail, subject: `[Absence Application] ${studentName} - ${title} (${datesStr})`, html })
  if (!r.ok) {
    const detail = await r.text().catch(() => 'Unknown error')
    console.error('[send-approval] Resend API error:', r.status, detail)
    return json({ error: 'Email send failed', detail, status: r.status }, 500)
  }
  return json({ ok: true })
}

// -- Completion notification email --------------------------------------
async function sendComplete(body, env) {
  const { studentEmail, studentName, title, dates, appBaseUrl } = body

  if (!studentEmail) {
    return json({ error: 'studentEmail is required' }, 400)
  }

  const base     = appBaseUrl || env.APP_BASE_URL || ''
  const datesStr = (dates || []).join(', ')

  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;background:#f5f5f5;padding:24px;margin:0">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:#1a2744;padding:20px 28px"><div style="color:#fff;font-size:18px;font-weight:700">Mito Daiichi High School</div><div style="color:#a0b0cc;font-size:12px;margin-top:2px">Digital Student Handbook - Absence Application System</div></div>
  <div style="padding:28px;text-align:center">
    <div style="font-size:48px;margin-bottom:12px">&#10004;</div>
    <div style="font-size:18px;font-weight:700;color:#1a2744;margin-bottom:8px">Absence Application Approved</div>
    <p style="color:#333;font-size:14px;margin-bottom:16px">${studentName}'s application has been approved by both supervisor and homeroom teacher.</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;text-align:left">
      <tr style="background:#f8f9fa"><td style="padding:10px 14px;border:1px solid #e0e0e0;font-weight:600;width:30%">Subject</td><td style="padding:10px 14px;border:1px solid #e0e0e0">${title}</td></tr>
      <tr><td style="padding:10px 14px;border:1px solid #e0e0e0;font-weight:600">Absence Dates</td><td style="padding:10px 14px;border:1px solid #e0e0e0">${datesStr}</td></tr>
    </table>
    <a href="${base}" style="display:inline-block;background:#1a2744;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700;margin-top:8px">Open Handbook</a>
  </div>
</div></body></html>`

  const r = await resend(env, { to: studentEmail, subject: `[Approved] Absence Application "${title}" (${datesStr})`, html })
  if (!r.ok) {
    const detail = await r.text().catch(() => 'Unknown error')
    console.error('[send-complete] Resend API error:', r.status, detail)
    return json({ error: 'Email send failed', detail, status: r.status }, 500)
  }
  return json({ ok: true })
}

// -- Resend API ---------------------------------------------------------
function resend(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY) {
    console.error('[resend] RESEND_API_KEY is not set in Workers secrets')
    // Return a fake Response-like object that indicates failure
    return Promise.resolve({
      ok: false,
      status: 500,
      text: () => Promise.resolve('RESEND_API_KEY not configured in Workers secrets'),
    })
  }

  // Use RESEND_FROM env var if set, otherwise fall back to sandbox address.
  // IMPORTANT: onboarding@resend.dev can ONLY deliver to the Resend account owner's email.
  if (!env.RESEND_FROM) {
    return new Response('RESEND_FROM is not set. onboarding@resend.dev can only send to the Resend account owner. Please verify your domain and set the RESEND_FROM environment variable.', { status: 403 })
  }

  const from = env.RESEND_FROM

  return fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.RESEND_API_KEY}` },
    body:    JSON.stringify({ from, to: [to], subject, html }),
  })
}

// -- JSON response helper -----------------------------------------------
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
