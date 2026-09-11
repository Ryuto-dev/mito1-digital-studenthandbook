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
