/**
 * mito1-hundbook Cloudflare Workers (ES Module)
 *
 * wrangler.toml or Cloudflare Dashboard:
 *   "Module Worker" -> "Module: ES Modules"
 *
 * Secrets (Settings > Variables and Secrets):
 *   GEMINI_API_KEY  -- Gemini API key (Secret)
 *   GEMINI_MODEL    -- 使用するモデル名（Plain text / 任意・カンマ区切りで優先順に複数可）
 *                      未設定なら GEMINI_MODEL_CANDIDATES を上から順に自動フォールバック。
 *                      GET /ai/diag でこのキーが使えるモデル一覧を確認できる。
 *   RESEND_API_KEY  -- Resend API key (Secret)
 *   APP_BASE_URL    -- https://mito1-tetyo.tech (Plain text)
 *   RESEND_FROM     -- Verified sender (Plain text, e.g. "mito1-handbook <noreply@yourdomain.com>")
 *                      If not set, falls back to "mito1-handbook <onboarding@resend.dev>"
 *                      NOTE: onboarding@resend.dev can ONLY deliver to the Resend account owner's email.
 *                      To send to any recipient, you MUST verify your own domain in the Resend dashboard
 *                      and set this variable to an address on that domain.
 *   FIREBASE_PROJECT_ID -- Firebase project ID (Plain text, e.g. "mito1-digital-handbook")
 *   FIREBASE_API_KEY    -- Firebase Web API Key (Plain text, for Firestore REST API)
 *
 * LINE Login channel (account linking):
 *   LINE_client_id     -- LINE Login channel ID     (Secret)
 *   LINE_client_secret -- LINE Login channel secret (Secret)
 *
 * LINE Messaging API channel (push notifications):
 *   LINE_Channel_ID     -- Messaging API channel ID     (Secret)
 *   LINE_Channel_secret -- Messaging API channel secret (Secret)
 *
 * Web Push (PWA push notifications):
 *   VAPID_PUBLIC_KEY  -- VAPID public key, base64url (Secret or Plain text)
 *   VAPID_PRIVATE_KEY -- VAPID private key, base64url (Secret)
 *   VAPID_SUBJECT     -- contact, e.g. "mailto:noreply@mito1-tetyo.tech" (Plain text)
 *   Key generation (run once locally, never commit the private key):
 *     node -e "const c=require('crypto');const e=c.createECDH('prime256v1');e.generateKeys();const b=(x)=>Buffer.from(x).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');console.log('PUBLIC:'+b(e.getPublicKey()));console.log('PRIVATE:'+b(e.getPrivateKey()))"
 *   Registration:
 *     npx wrangler secret put VAPID_PRIVATE_KEY --config workers/wrangler.toml
 *     npx wrangler secret put VAPID_PUBLIC_KEY  --config workers/wrangler.toml
 *
 * =====================================================================
 * LINE Developers Console — LINE Login チャネルに登録するコールバックURL
 * =====================================================================
 *   https://mito1-tetyo.tech/line-callback.html
 *   （ローカル開発用に追加する場合）
 *   http://localhost:5173/line-callback.html
 *
 * 認可リクエストは Workers の GET /line/authorize が組み立てて
 * https://access.line.me/oauth2/v2.1/authorize へ 302 リダイレクトする。
 * （client_id を露出させないため、フロントは Workers を経由する）
 */

// LINE endpoints
const LINE_AUTHORIZE_URL = 'https://access.line.me/oauth2/v2.1/authorize'
const LINE_TOKEN_URL     = 'https://api.line.me/oauth2/v2.1/token'
const LINE_PROFILE_URL   = 'https://api.line.me/v2/profile'
// Messaging API
const LINE_STATELESS_TOKEN_URL = 'https://api.line.me/oauth2/v3/token'
const LINE_PUSH_URL            = 'https://api.line.me/v2/bot/message/push'

// LINE Login のコールバックURLとして許可するオリジン（オープンリダイレクト対策）
const ALLOWED_REDIRECT_ORIGINS = [
  'https://mito1-tetyo.tech',
  'https://www.mito1-tetyo.tech',
  'https://ryuto-dev.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
]

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
      const caseId = url.searchParams.get('caseId')
      const token  = url.searchParams.get('token')
      const action = url.searchParams.get('action') || 'approve'
      const base   = env.APP_BASE_URL || 'https://mito1-tetyo.tech'
      if (!token) return new Response('Token is invalid', { status: 400 })

      let redirectUrl = `${base}/approve.html?token=${encodeURIComponent(token)}&action=${action}`
      if (caseId) redirectUrl += `&caseId=${encodeURIComponent(caseId)}`

      return Response.redirect(redirectUrl, 302)
    }

    // GET /resolve-token?token=xxx -> resolve token to caseId via Firestore REST API
    if (request.method === 'GET' && url.pathname === '/resolve-token') {
      return resolveToken(url.searchParams.get('token'), env)
    }

    // GET /line/authorize -> redirect to the LINE authorization endpoint
    if (request.method === 'GET' && url.pathname === '/line/authorize') {
      return lineAuthorize(url, env)
    }

    // GET /ai/diag -> Gemini の疎通診断（キーの有無・利用可能モデル一覧）
    if (request.method === 'GET' && url.pathname === '/ai/diag') {
      return geminiDiag(env)
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405)
    }

    let body
    try { body = await request.json() }
    catch { return json({ error: 'Invalid JSON' }, 400) }

    if (url.pathname === '/send-approval') return sendApproval(body, env)
    if (url.pathname === '/send-complete')  return sendComplete(body, env)
    if (url.pathname === '/send-reply')     return sendReply(body, env)

    // LINE account linking / notifications
    if (url.pathname === '/line/exchange')  return lineExchange(body, env)
    if (url.pathname === '/line/notify-complete') return lineNotifyComplete(body, env)

    // Web Push (PWA push notifications)
    if (url.pathname === '/push/send') return pushSend(body, env)

    // Default -> Gemini proxy
    return gemini(body, env)
  }
}

// -- Resolve token to caseId via Firestore REST API -------------------------
async function resolveToken(token, env) {
  if (!token) return json({ error: 'token required' }, 400)

  const projectId = env.FIREBASE_PROJECT_ID
  if (!projectId) {
    return json({ error: 'FIREBASE_PROJECT_ID not set' }, 500)
  }

  const tokenFields = ['approveToken', 'rejectToken', 'homeRoomApproveToken', 'homeRoomRejectToken']

  for (const field of tokenFields) {
    try {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`
      const queryBody = {
        structuredQuery: {
          from: [{ collectionId: 'cases' }],
          where: {
            fieldFilter: {
              field: { fieldPath: field },
              op: 'EQUAL',
              value: { stringValue: token }
            }
          },
          limit: 1
        }
      }

      const res = await fetch(firestoreUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryBody)
      })

      if (res.ok) {
        const results = await res.json()
        if (results && results.length > 0 && results[0].document) {
          // Extract document ID from the name path
          const docName = results[0].document.name
          const caseId = docName.split('/').pop()
          return json({ caseId, field })
        }
      }
    } catch (e) {
      console.error(`[resolve-token] Error querying field ${field}:`, e)
    }
  }

  return json({ error: 'token not found' }, 404)
}

// -- Gemini proxy -------------------------------------------------------
/**
 * 404 の主因は「モデル名の綴り」ではなく、
 *   ① API キーを作り直した Google Cloud プロジェクトで
 *      そのモデルが有効化されていない／"no longer available to new users" 扱いになる
 *   ② コードを直しても Worker を再デプロイしていないため旧モデル名が生きている
 * の2点。そこで
 *   - 候補モデルを順に試し、404/NOT_FOUND なら次の候補へフォールバック
 *   - 成功したモデル名を isolate 内にキャッシュして以降の待ち時間をゼロにする
 *   - どれも駄目なら ListModels の結果を添えて返す（原因が一目で分かる）
 * という実装にする。
 */
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

// 上から順に試す。env.GEMINI_MODEL があればそれが最優先。
const GEMINI_MODEL_CANDIDATES = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash',
]

// isolate 単位のキャッシュ（この Worker インスタンスで確実に動いたモデル名）
let _resolvedGeminiModel = null

function geminiApiKey(env) {
  // Support both GEMINI_KEY and GEMINI_API_KEY for backwards compatibility
  return env.GEMINI_API_KEY || env.GEMINI_KEY || env.GOOGLE_API_KEY || ''
}

function geminiModelCandidates(env) {
  const configured = (env.GEMINI_MODEL || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  const list = [
    ...(_resolvedGeminiModel ? [_resolvedGeminiModel] : []),
    ...configured,
    ...GEMINI_MODEL_CANDIDATES,
  ]
  // 重複排除（順序維持）
  return [...new Set(list)]
}

/** そのエラーが「モデルが使えない」系かどうか */
function isModelUnavailable(status, data) {
  if (status === 404) return true
  const msg = String(data?.error?.message || '')
  if (status === 400 && /not (found|supported)|is not available|no longer available/i.test(msg)) return true
  if (status === 403 && /not (supported|available)|does not have access/i.test(msg)) return true
  return false
}

async function callGeminiModel(model, body, apiKey) {
  const res = await fetch(
    `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )
  let data
  try { data = await res.json() }
  catch { data = { error: { code: res.status, message: 'Invalid JSON from Gemini API' } } }
  return { status: res.status, data }
}

/** API キーで実際に generateContent が使えるモデル一覧を取得（診断用） */
async function listGeminiModels(apiKey) {
  try {
    const res = await fetch(`${GEMINI_API_BASE}/models?key=${apiKey}&pageSize=200`)
    if (!res.ok) {
      return { ok: false, status: res.status, error: (await res.text()).slice(0, 500) }
    }
    const data = await res.json()
    const models = (data.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map(m => String(m.name || '').replace(/^models\//, ''))
    return { ok: true, models }
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) }
  }
}

async function gemini(body, env) {
  const apiKey = geminiApiKey(env)
  if (!apiKey) {
    return json({ error: { code: 500, message: 'GEMINI_API_KEY not set in Workers secrets' } }, 500)
  }

  const candidates = geminiModelCandidates(env)
  const attempts = []

  for (const model of candidates) {
    const { status, data } = await callGeminiModel(model, body, apiKey)

    if (status >= 200 && status < 300) {
      _resolvedGeminiModel = model            // 次回以降はこのモデルを最優先
      return json(data, status)
    }

    attempts.push({ model, status, message: String(data?.error?.message || '').slice(0, 200) })

    if (isModelUnavailable(status, data)) {
      if (_resolvedGeminiModel === model) _resolvedGeminiModel = null
      console.warn(`[gemini] model "${model}" unavailable (${status}) -> try next`)
      continue                                 // 次の候補モデルへ
    }

    // モデル以外の理由（キー無効・レート制限・入力不正など）はそのまま返す
    console.error(`[gemini] non-model error on "${model}" (${status})`, data?.error)
    return json(data, status)
  }

  // すべての候補が駄目 → このキーで本当に使えるモデルを添えて返す
  const available = await listGeminiModels(apiKey)
  console.error('[gemini] all candidates failed', JSON.stringify({ attempts, available }).slice(0, 800))

  return json({
    error: {
      code: 502,
      status: 'MODEL_UNAVAILABLE',
      message:
        'このGemini APIキーでは候補モデルがいずれも利用できませんでした。' +
        'Google AI Studio で新しいキーを発行したプロジェクトの有効モデルを確認し、' +
        'Workers の環境変数 GEMINI_MODEL に設定してください。',
      attempts,
      availableModels: available.ok ? available.models.slice(0, 40) : undefined,
      listModelsError: available.ok ? undefined : available,
    },
  }, 502)
}

/**
 * GET /ai/diag
 *   キーの有無・候補モデル・実際に使えるモデル一覧を返す診断用エンドポイント。
 *   API キーそのものは絶対に返さない（長さと先頭数文字のみ）。
 */
async function geminiDiag(env) {
  const apiKey = geminiApiKey(env)
  if (!apiKey) {
    return json({ ok: false, hasKey: false, message: 'GEMINI_API_KEY not set in Workers secrets' }, 500)
  }

  const available = await listGeminiModels(apiKey)
  const candidates = geminiModelCandidates(env)
  const usable = available.ok ? candidates.filter(m => available.models.includes(m)) : []

  return json({
    ok: available.ok && usable.length > 0,
    hasKey: true,
    keyPreview: `${apiKey.slice(0, 6)}...(${apiKey.length} chars)`,
    configuredModel: env.GEMINI_MODEL || null,
    cachedModel: _resolvedGeminiModel,
    candidates,
    usableCandidates: usable,
    availableModels: available.ok ? available.models : undefined,
    listModelsError: available.ok ? undefined : available,
  }, available.ok ? 200 : 502)
}

// -- Approval request email ---------------------------------------------
async function sendApproval(body, env) {
  const {
    studentName, title, dates, reason, reasonDetail,
    step, recipientEmail, recipientRole,
    supervisorEmail, approveToken, rejectToken, appBaseUrl,
  } = body

  // Validate required fields
  if (!recipientEmail) {
    return json({ error: 'recipientEmail is required' }, 400)
  }

  const base     = appBaseUrl || env.APP_BASE_URL || 'https://mito1-tetyo.tech'
  const datesStr = (dates || []).join(', ')
  const roleName = recipientRole === 'supervisor' ? '顧問' : '担任'
  const reasonDisplay = reasonDetail ? `${reason}（${reasonDetail}）` : (reason || '部活動')
  // Always include caseId in approve/reject URLs
  const approveUrl = `${base}/approve.html?caseId=${body.caseId}&token=${approveToken}&action=approve`
  const rejectUrl  = `${base}/approve.html?caseId=${body.caseId}&token=${rejectToken}&action=reject`
  const supNote    = step === 'homeroom'
    ? `<p style="color:#27ae60;background:#eafaf1;padding:10px 14px;border-radius:6px;font-size:13px;margin:12px 0">顧問（${supervisorEmail}）が承認済みです。</p>`
    : ''

  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"></head>
<body style="font-family:'Helvetica Neue',Arial,'Noto Sans JP',sans-serif;background:#f5f5f5;padding:24px;margin:0">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:#1a2744;padding:20px 28px;display:flex;align-items:center;gap:14px">
    <img src="${base}/icons/icon-192.png" alt="" style="width:40px;height:40px;border-radius:8px" />
    <div><div style="color:#fff;font-size:18px;font-weight:700">水戸第一高等学校</div><div style="color:#a0b0cc;font-size:12px;margin-top:2px">デジタル生徒手帳 公欠申請システム</div></div>
  </div>
  <div style="padding:28px">
    <p style="color:#333;font-size:15px;margin:0 0 16px">${roleName}の先生<br><br>以下の公欠申請の承認をお願いいたします。</p>
    ${supNote}
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0">
      <tr style="background:#f8f9fa"><td style="padding:10px 14px;border:1px solid #e0e0e0;font-weight:600;width:30%">申請者</td><td style="padding:10px 14px;border:1px solid #e0e0e0">${studentName}</td></tr>
      <tr><td style="padding:10px 14px;border:1px solid #e0e0e0;font-weight:600">件名</td><td style="padding:10px 14px;border:1px solid #e0e0e0">${title}</td></tr>
      <tr style="background:#f8f9fa"><td style="padding:10px 14px;border:1px solid #e0e0e0;font-weight:600">事由</td><td style="padding:10px 14px;border:1px solid #e0e0e0">${reasonDisplay}</td></tr>
      <tr><td style="padding:10px 14px;border:1px solid #e0e0e0;font-weight:600">公欠日</td><td style="padding:10px 14px;border:1px solid #e0e0e0">${datesStr}</td></tr>
    </table>
    <div style="display:flex;gap:12px;margin-top:24px">
      <a href="${approveUrl}" style="flex:1;display:block;text-align:center;background:#1a2744;color:#fff;padding:14px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700">承認する</a>
      <a href="${rejectUrl}" style="flex:1;display:block;text-align:center;background:#fff;color:#e74c3c;border:1.5px solid #e74c3c;padding:14px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700">差し戻す</a>
    </div>
    <p style="font-size:11px;color:#999;margin-top:20px">このリンクの有効期限は7日間です。<a href="${base}/teacher.html" style="color:#1a2744">先生用ダッシュボード</a>からも操作できます。</p>
  </div>
</div></body></html>`

  const r = await resend(env, { to: recipientEmail, subject: `【公欠申請】${studentName} - ${title}（${datesStr}）`, html })
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
<body style="font-family:'Helvetica Neue',Arial,'Noto Sans JP',sans-serif;background:#f5f5f5;padding:24px;margin:0">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:#1a2744;padding:20px 28px;display:flex;align-items:center;gap:14px">
    <img src="${base}/icons/icon-192.png" alt="" style="width:40px;height:40px;border-radius:8px" />
    <div><div style="color:#fff;font-size:18px;font-weight:700">水戸第一高等学校</div><div style="color:#a0b0cc;font-size:12px;margin-top:2px">デジタル生徒手帳 公欠申請システム</div></div>
  </div>
  <div style="padding:28px;text-align:center">
    <div style="font-size:48px;margin-bottom:12px">&#10004;</div>
    <div style="font-size:18px;font-weight:700;color:#1a2744;margin-bottom:8px">公欠申請が承認されました</div>
    <p style="color:#333;font-size:14px;margin-bottom:16px">${studentName} さんの公欠申請が顧問・担任の両方に承認されました。</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;text-align:left">
      <tr style="background:#f8f9fa"><td style="padding:10px 14px;border:1px solid #e0e0e0;font-weight:600;width:30%">件名</td><td style="padding:10px 14px;border:1px solid #e0e0e0">${title}</td></tr>
      <tr><td style="padding:10px 14px;border:1px solid #e0e0e0;font-weight:600">公欠日</td><td style="padding:10px 14px;border:1px solid #e0e0e0">${datesStr}</td></tr>
    </table>
    <a href="${base}/#mypage" style="display:inline-block;background:#1a2744;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700;margin-top:8px">手帳を開く（マイページ）</a>
  </div>
</div></body></html>`

  const r = await resend(env, { to: studentEmail, subject: `【承認完了】公欠申請「${title}」（${datesStr}）`, html })
  if (!r.ok) {
    const detail = await r.text().catch(() => 'Unknown error')
    console.error('[send-complete] Resend API error:', r.status, detail)
    return json({ error: 'Email send failed', detail, status: r.status }, 500)
  }
  return json({ ok: true })
}

// -- Inquiry reply email ------------------------------------------------
async function sendReply(body, env) {
  const { recipientEmail, recipientName, subject, replyBody, appBaseUrl } = body

  if (!recipientEmail) {
    return json({ error: 'recipientEmail is required' }, 400)
  }
  if (!replyBody) {
    return json({ error: 'replyBody is required' }, 400)
  }

  const base = appBaseUrl || env.APP_BASE_URL || ''
  const replyText = (replyBody || '').replace(/\n/g, '<br>')
  const iconUrl = base ? `${base}/icons/icon-192.png` : ''

  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"></head>
<body style="font-family:'Helvetica Neue',Arial,'Noto Sans JP',sans-serif;background:#f5f5f5;padding:24px;margin:0">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:#1a2744;padding:20px 28px;display:flex;align-items:center;gap:14px">
    ${iconUrl ? `<img src="${iconUrl}" alt="" style="width:40px;height:40px;border-radius:8px" />` : ''}
    <div><div style="color:#fff;font-size:18px;font-weight:700">水戸第一高等学校</div><div style="color:#a0b0cc;font-size:12px;margin-top:2px">デジタル生徒手帳 お問い合わせ回答</div></div>
  </div>
  <div style="padding:28px">
    <p style="color:#333;font-size:15px;margin:0 0 16px">${recipientName || ''} 様<br><br>お問い合わせいただきありがとうございます。<br>以下の通り回答いたします。</p>
    <div style="background:#f8f9fa;border-radius:8px;padding:16px 18px;margin:16px 0;font-size:14px;color:#333;line-height:1.8;border-left:4px solid #1a2744">
      ${replyText}
    </div>
    <p style="font-size:12px;color:#999;margin-top:20px">このメールはデジタル生徒手帳のお問い合わせシステムから自動送信されています。<br>ご不明な点がございましたら、再度お問い合わせフォームよりご連絡ください。</p>
    <a href="${base}" style="display:inline-block;background:#1a2744;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;margin-top:8px">デジタル生徒手帳を開く</a>
  </div>
</div></body></html>`

  const r = await resend(env, { to: recipientEmail, subject: `【回答】${subject || 'お問い合わせ'}`, html })
  if (!r.ok) {
    const detail = await r.text().catch(() => 'Unknown error')
    console.error('[send-reply] Resend API error:', r.status, detail)
    return json({ error: 'Email send failed', detail, status: r.status }, 500)
  }
  return json({ ok: true })
}

// =======================================================================
// LINE アカウント連携（LINE Login チャネル・認可コードフロー）
// =======================================================================

function isAllowedRedirect(redirectUri) {
  try {
    const u = new URL(redirectUri)
    if (!ALLOWED_REDIRECT_ORIGINS.includes(u.origin)) return false
    // コールバックページ以外へは飛ばさない
    return u.pathname === '/line-callback.html'
  } catch {
    return false
  }
}

/**
 * GET /line/authorize?state=xxx&redirect_uri=https://.../line-callback.html
 *
 * https://developers.line.biz/ja/docs/line-login/integrate-line-login/#making-an-authorization-request
 *   response_type = code       (必須)
 *   client_id     = チャネルID  (必須・シークレット LINE_client_id)
 *   redirect_uri  = コールバックURL（URLエンコード・必須）
 *   state         = CSRF対策のランダム文字列（必須）
 *   scope         = profile openid
 *   bot_prompt    = normal     （公式アカウントの友だち追加オプションを表示）
 */
function lineAuthorize(url, env) {
  const clientId = env.LINE_client_id || env.LINE_CLIENT_ID
  if (!clientId) {
    return json({ error: 'LINE_client_id not set in Workers secrets' }, 500)
  }

  const state       = url.searchParams.get('state')
  const redirectUri = url.searchParams.get('redirect_uri')

  if (!state)       return json({ error: 'state required' }, 400)
  if (!redirectUri) return json({ error: 'redirect_uri required' }, 400)
  if (!isAllowedRedirect(redirectUri)) {
    return json({ error: 'redirect_uri not allowed' }, 400)
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     clientId,
    redirect_uri:  redirectUri,
    state,
    scope:         'profile openid',
    bot_prompt:    'normal',
    ui_locales:    'ja-JP',
  })

  return Response.redirect(`${LINE_AUTHORIZE_URL}?${params.toString()}`, 302)
}

/**
 * POST /line/exchange  { code, redirectUri }
 *
 * 1. 認可コード → アクセストークン
 *    POST https://api.line.me/oauth2/v2.1/token
 * 2. アクセストークン → LINEプロフィール（userId）
 *    GET https://api.line.me/v2/profile
 *
 * userId のみをクライアントへ返す（アクセストークンは返さない）。
 */
async function lineExchange(body, env) {
  const clientId     = env.LINE_client_id || env.LINE_CLIENT_ID
  const clientSecret = env.LINE_client_secret || env.LINE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return json({ error: 'LINE_client_id / LINE_client_secret not set in Workers secrets' }, 500)
  }

  const { code, redirectUri } = body || {}
  if (!code)        return json({ error: 'code required' }, 400)
  if (!redirectUri) return json({ error: 'redirectUri required' }, 400)
  if (!isAllowedRedirect(redirectUri)) {
    return json({ error: 'redirectUri not allowed' }, 400)
  }

  // --- 1. アクセストークン取得 ---
  let tokenData
  try {
    const tokenRes = await fetch(LINE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  redirectUri,
        client_id:     clientId,
        client_secret: clientSecret,
      }).toString(),
    })
    tokenData = await tokenRes.json().catch(() => ({}))
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[line/exchange] token error:', tokenRes.status, JSON.stringify(tokenData))
      return json({
        error: 'line_token_failed',
        error_description: tokenData?.error_description || 'アクセストークンの取得に失敗しました（認可コードの有効期限は10分・1回のみ有効です）',
      }, 400)
    }
  } catch (e) {
    console.error('[line/exchange] token network error:', e)
    return json({ error: 'line_token_network_error', error_description: e.message }, 502)
  }

  // --- 2. プロフィール取得（userId） ---
  try {
    const profRes = await fetch(LINE_PROFILE_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const prof = await profRes.json().catch(() => ({}))
    if (!profRes.ok || !prof.userId) {
      console.error('[line/exchange] profile error:', profRes.status, JSON.stringify(prof))
      return json({
        error: 'line_profile_failed',
        error_description: prof?.message || 'LINEプロフィールの取得に失敗しました',
      }, 400)
    }

    return json({
      userId:      prof.userId,
      displayName: prof.displayName || '',
      pictureUrl:  prof.pictureUrl  || '',
    })
  } catch (e) {
    console.error('[line/exchange] profile network error:', e)
    return json({ error: 'line_profile_network_error', error_description: e.message }, 502)
  }
}

// =======================================================================
// LINE Messaging API（プッシュ通知）
// =======================================================================

/**
 * ステートレスチャネルアクセストークンを発行する（15分間有効・発行数無制限）
 * POST https://api.line.me/oauth2/v3/token
 *   grant_type=client_credentials & client_id & client_secret
 * https://developers.line.biz/ja/reference/messaging-api/#issue-stateless-channel-access-token
 */
async function issueMessagingToken(env) {
  const clientId     = env.LINE_Channel_ID || env.LINE_CHANNEL_ID || env.LINE_client_id || env.LINE_CLIENT_ID
  const clientSecret = env.LINE_Channel_secret || env.LINE_CHANNEL_SECRET || env.LINE_client_secret || env.LINE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('LINE_Channel_ID / LINE_Channel_secret not set in Workers secrets')
  }

  const res = await fetch(LINE_STATELESS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     clientId,
      client_secret: clientSecret,
    }).toString(),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token) {
    throw new Error(`channel access token failed (${res.status}): ${data?.error_description || data?.error || 'unknown'}`)
  }
  return data.access_token
}

/**
 * プッシュメッセージ送信
 * POST https://api.line.me/v2/bot/message/push
 */
async function linePush(env, to, messages) {
  let accessToken = env.LINE_CHANNEL_ACCESS_TOKEN || env.LINE_CHANNEL_TOKEN || env.LINE_MESSAGING_ACCESS_TOKEN || env.LINE_ACCESS_TOKEN
  if (!accessToken) {
    accessToken = await issueMessagingToken(env)
  }

  const res = await fetch(LINE_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${accessToken}`,
      // 同じ内容の再送による重複配信を防ぐ
      'X-Line-Retry-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({ to, messages }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`push failed (${res.status}): ${detail}`)
  }
  return true
}

/**
 * 承認完了通知の Flex Message を組み立てる（モダンなカードデザイン）
 * https://developers.line.biz/ja/docs/messaging-api/using-flex-messages/
 */
function buildApprovalFlex({ studentName, title, dates, reason, reasonDetail, base }) {
  const datesArr = Array.isArray(dates) ? dates : (dates ? [dates] : [])
  const datesStr = datesArr.join('、') || '—'
  const reasonDisplay = reasonDetail ? `${reason}（${reasonDetail}）` : (reason || '—')

  const row = (label, value) => ({
    type: 'box',
    layout: 'baseline',
    spacing: 'sm',
    contents: [
      { type: 'text', text: label, color: '#9aa4b8', size: 'sm', flex: 2, weight: 'bold' },
      { type: 'text', text: value, color: '#333333', size: 'sm', flex: 5, wrap: true },
    ],
  })

  return {
    type: 'flex',
    altText: `【承認完了】公欠申請「${title}」が承認されました`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#1A2744',
        paddingAll: '20px',
        spacing: 'xs',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'md',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                width: '36px',
                height: '36px',
                cornerRadius: '18px',
                backgroundColor: '#27AE60',
                justifyContent: 'center',
                alignItems: 'center',
                contents: [
                  { type: 'text', text: '✓', color: '#FFFFFF', size: 'lg', weight: 'bold', align: 'center' },
                ],
              },
              {
                type: 'box',
                layout: 'vertical',
                spacing: 'none',
                justifyContent: 'center',
                contents: [
                  { type: 'text', text: '公欠申請が承認されました', color: '#FFFFFF', size: 'md', weight: 'bold', wrap: true },
                  { type: 'text', text: '顧問・担任の承認が完了しました', color: '#A0B0CC', size: 'xxs', margin: 'xs', wrap: true },
                ],
              },
            ],
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: title || '公欠申請', weight: 'bold', size: 'lg', color: '#111111', wrap: true },
          { type: 'separator', color: '#EEEEE9' },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              row('申請者', studentName || '—'),
              row('事由',   reasonDisplay),
              row('公欠日', datesStr),
            ],
          },
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#EAFAF1',
            cornerRadius: '8px',
            paddingAll: '12px',
            contents: [
              {
                type: 'text',
                text: '担任の先生の承認をもって手続きが完了しました。当日は担任の指示に従ってください。',
                size: 'xxs',
                color: '#1E8449',
                wrap: true,
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '16px',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#1A2744',
            height: 'sm',
            action: {
              type: 'uri',
              label: 'マイページで確認',
              uri: `${base || 'https://mito1-tetyo.tech'}/#mypage`,
            },
          },
          {
            type: 'text',
            text: 'デジタル生徒手帳 公欠申請システム',
            size: 'xxs',
            color: '#AAAAAA',
            align: 'center',
          },
        ],
      },
      styles: {
        header: { separator: false },
        footer: { separator: true, separatorColor: '#EEEEE9' },
      },
    },
  }
}

/**
 * Firestore REST API 経由で生徒の lineUserId を取得する
 */
async function getLineUserIdByStudentId(studentId, env) {
  if (!studentId) return null
  const projectId = env.FIREBASE_PROJECT_ID
  if (!projectId) return null

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${studentId}`
    const res = await fetch(url)
    if (res.ok) {
      const docData = await res.json()
      const lineUserId = docData.fields?.lineUserId?.stringValue
      return lineUserId || null
    } else {
      console.error(`[getLineUserIdByStudentId] Firestore REST error (${res.status}):`, await res.text())
    }
  } catch (e) {
    console.error('[getLineUserIdByStudentId] error:', e)
  }
  return null
}

/**
 * POST /line/notify-complete
 *   { lineUserId, studentId, studentName, title, dates, reason, reasonDetail, appBaseUrl }
 *
 * 担任承認完了時に生徒の LINE へ完了通知（Flex Message）を送る。
 * lineUserId が無い（未連携）場合は skipped を返すだけで、呼び出し側の処理は止めない。
 */
async function lineNotifyComplete(body, env) {
  const { lineUserId, studentId, studentName, title, dates, reason, reasonDetail, appBaseUrl } = body || {}

  let targetLineUserId = lineUserId
  if (!targetLineUserId && studentId) {
    targetLineUserId = await getLineUserIdByStudentId(studentId, env)
  }

  if (!targetLineUserId) {
    return json({ ok: true, skipped: true, reason: 'not_linked' })
  }

  const base = appBaseUrl || env.APP_BASE_URL || 'https://mito1-tetyo.tech'
  const flex = buildApprovalFlex({ studentName, title, dates, reason, reasonDetail, base })

  try {
    await linePush(env, targetLineUserId, [flex])
    return json({ ok: true })
  } catch (e) {
    console.error('[line/notify-complete] flex push failed, trying text fallback:', e)
    try {
      const datesArr = Array.isArray(dates) ? dates : (dates ? [dates] : [])
      const datesStr = datesArr.join('、') || '—'
      const textMsg = {
        type: 'text',
        text: `【公欠申請 承認完了】\n${studentName || ''} さんの公欠申請「${title || ''}」（${datesStr}）が顧問・担任の両方に承認されました。\n\n詳細: ${base}/#mypage`
      }
      await linePush(env, targetLineUserId, [textMsg])
      return json({ ok: true, fallback: true })
    } catch (fallbackErr) {
      console.error('[line/notify-complete] text fallback push failed:', fallbackErr)
      return json({ error: 'line_push_failed', detail: e.message }, 500)
    }
  }
}

// =======================================================================
// Web Push（PWAプッシュ通知送信・依存なしWebCrypto実装）
// =======================================================================
//
// フロー:
//   1. クライアント(src/push.js)がPush APIで購読し、購読情報{endpoint,keys}を
//      Firestore users/{uid}/pushSubscriptions に保存（クライアントSDK経由）
//   2. 承認完了時などに先生側クライアントが購読情報を読み、
//      POST /push/send { subscription, payload } で本エンドポイントを呼ぶ
//      （Workersは秘密鍵のみ保持し、Firestoreを読まない設計）
//   3. VAPID署名＋aes128gcm暗号化（RFC8292/RFC8188）してpush endpointへPOST
//
// 404/410応答時は購読切れ → { ok:false, gone:true } を返すので、
// 呼び出し側は該当購読をFirestoreから削除すること。

/** POST /push/send */
async function pushSend(body, env) {
  const { subscription, payload } = body || {}
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return json({ error: 'subscription required (endpoint, keys.p256dh, keys.auth)' }, 400)
  }

  const vapidPublic  = env.VAPID_PUBLIC_KEY
  const vapidPrivate = env.VAPID_PRIVATE_KEY
  const subject = env.VAPID_SUBJECT || 'mailto:noreply@mito1-tetyo.tech'
  if (!vapidPublic || !vapidPrivate) {
    return json({ error: 'VAPID keys not set in Workers secrets' }, 500)
  }

  try {
    const message = JSON.stringify({
      title: payload?.title || '水一手帳',
      body:  payload?.body  || '',
      url:   payload?.url   || '/',
      tag:   payload?.tag   || 'mito1-notify',
    })
    const status = await webPushSend(subscription, message, { vapidPublic, vapidPrivate, subject })
    console.log(`[push/send] delivered: appleStatus=${status} host=${new URL(subscription.endpoint).host}`)
    return json({ ok: true, status })
  } catch (e) {
    const msg = String((e && e.message) || e)
    // 購読切れ（ブラウザ側で削除済み等）
    if (/\(410\)|\(404\)/.test(msg)) {
      return json({ ok: false, gone: true, detail: msg }, 410)
    }
    console.error('[push/send] failed:', msg)
    return json({ error: 'push_failed', detail: msg }, 502)
  }
}

async function webPushSend(subscription, message, { vapidPublic, vapidPrivate, subject }) {
  const endpoint = new URL(subscription.endpoint)
  const audience = `${endpoint.protocol}//${endpoint.host}`
  const jwt = await vapidJwt(audience, subject, vapidPublic, vapidPrivate)
  const { body } = await encryptAes128gcm(
    subscription.keys.p256dh,
    subscription.keys.auth,
    new TextEncoder().encode(message)
  )

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'TTL': '86400',
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'Authorization': `vapid t=${jwt}, k=${vapidPublic}`,
    },
    body,
  })

  if (res.status === 404 || res.status === 410) {
    throw new Error(`subscription gone (${res.status})`)
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    // 403 は VAPID鍵の不一致（購読時の鍵とサーバー鍵が別物）が典型。
    // フロントの VAPID_PUBLIC_KEY と Workers の鍵ペアが揃っているか確認すること。
    throw new Error(`push endpoint error (${res.status}): ${detail.slice(0, 200)}`)
  }
  // Apple/Google は成功時 201 Created を返す。200 や 2xx でも受理扱いにする。
  return res.status
}

// ---- VAPID JWT (ES256) ----
async function vapidJwt(audience, subject, vapidPublicB64, vapidPrivateB64) {
  const pubBytes = b64urlToBytes(vapidPublicB64) // 65B uncompressed: 0x04 || X(32) || Y(32)
  if (pubBytes.length !== 65 || pubBytes[0] !== 0x04) {
    throw new Error('invalid VAPID_PUBLIC_KEY')
  }
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToB64url(pubBytes.slice(1, 33)),
    y: bytesToB64url(pubBytes.slice(33, 65)),
    d: vapidPrivateB64,
    ext: true,
  }
  const key = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  )
  const header  = bytesToB64url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600
  const payload = bytesToB64url(new TextEncoder().encode(JSON.stringify({ aud: audience, exp, sub: subject })))
  const unsignedToken = `${header}.${payload}`
  // WebCryptoのECDSA署名はJWS用の生R||S形式（64B）で返る
  const sig = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsignedToken)
  ))
  return `${unsignedToken}.${bytesToB64url(sig)}`
}

// ---- aes128gcm 本文暗号化 (RFC8188 §4.3) ----
async function encryptAes128gcm(clientP256dhB64, clientAuthB64, plaintextBytes) {
  const te = new TextEncoder()
  const clientPub  = b64urlToBytes(clientP256dhB64)
  const authSecret = b64urlToBytes(clientAuthB64)

  // サーバー側エフェメラル鍵
  const serverKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  )
  const serverPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeys.publicKey))
  const clientPubKey = await crypto.subtle.importKey(
    'raw', clientPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  )
  const shared = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPubKey }, serverKeys.privateKey, 256
  ))

  const prkKey = await hkdfExtract(authSecret, shared)
  const keyInfo = concatBytes(
    te.encode('WebPush: info'), new Uint8Array([0]), clientPub, serverPubRaw
  )
  const ikm = await hkdfExpand(prkKey, keyInfo, 32)

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const prk = await hkdfExtract(salt, ikm)
  const cek   = await hkdfExpand(prk, concatBytes(te.encode('Content-Encoding: aes128gcm'), new Uint8Array([0])), 16)
  const nonce = await hkdfExpand(prk, concatBytes(te.encode('Content-Encoding: nonce'), new Uint8Array([0])), 12)

  // 単一レコード（RFC8188 §2）: 平文 + パディングデリミタ。
  //
  // ★ここが「200が返るのに通知が出ない」原因だった。
  //   aes128gcm(RFC8188)のレコードは「平文 || デリミタ(1B) || パディング(0x00...)」で、
  //   最終レコードのデリミタは 0x02、非最終レコードは 0x01 と決まっている。
  //   旧実装は aesgcm(draft-04)形式の「2Bパディング長を先頭に付ける」レイアウトを
  //   使っていたため、復号自体は成功する（AES-GCM認証タグは正しい＝Appleは201を返す）
  //   一方で、ブラウザ側のRFC8188デコーダがレコード末尾にデリミタを見つけられず
  //   パースに失敗し、pushイベントが配送されずに黙って捨てられていた。
  //   さらに先頭2バイトのゴミにより e.data.json() も壊れる。
  const plain = concatBytes(plaintextBytes, new Uint8Array([0x02]))
  const cekKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt'])
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cekKey, plain))

  // ヘッダ: salt(16) + rs(4B BE) + idlen(1B) + keyid(serverPub=65B)
  const rs = 4096
  const header = concatBytes(
    salt,
    new Uint8Array([(rs >>> 24) & 0xff, (rs >>> 16) & 0xff, (rs >>> 8) & 0xff, rs & 0xff]),
    new Uint8Array([serverPubRaw.length]), serverPubRaw
  )
  return { body: concatBytes(header, ct) }
}

// ---- Web Push用バイト列ユーティリティ ----
function b64urlToBytes(s) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToB64url(bytes) {
  const arr = new Uint8Array(bytes)
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < arr.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, arr.subarray(i, i + CHUNK))
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function concatBytes(...arrs) {
  const total = arrs.reduce((n, a) => n + a.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const a of arrs) { out.set(a, off); off += a.length }
  return out
}

async function hkdfExtract(salt, ikm) {
  const key = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, ikm))
}

async function hkdfExpand(prk, info, len) {
  const key = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const input = concatBytes(info, new Uint8Array([1]))
  const out = new Uint8Array(await crypto.subtle.sign('HMAC', key, input))
  return out.slice(0, len)
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
    return Promise.resolve({
      ok: false,
      status: 403,
      text: () => Promise.resolve('RESEND_FROM is not set. onboarding@resend.dev can only send to the Resend account owner. Please verify your domain and set the RESEND_FROM environment variable.'),
    })
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
