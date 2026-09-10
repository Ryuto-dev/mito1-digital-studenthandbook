/**
 * src/line_callback.js
 * LINE Login チャネルのコールバック処理
 *
 * LINE Developers Console の「コールバックURL」に登録する値:
 *   https://mito1-tetyo.tech/line-callback.html
 *   http://localhost:5173/line-callback.html （ローカル開発用・任意）
 *
 * 流れ:
 *   1. クエリの error / code & state を確認
 *   2. sessionStorage に保存した state と一致するか検証（CSRF対策）
 *   3. Firebase Auth のログイン状態を確認（連携先アカウントの特定に必須）
 *   4. Workers /line/exchange に code を渡して LINE の userId を取得
 *   5. users/{uid} に lineUserId を保存して完了表示
 */
import { onAuth } from './auth.js'
import {
  consumeStoredState, consumeReturnTo,
  exchangeCodeForProfile, saveLineLink,
} from './line.js'

const card = document.getElementById('card')

const LINE_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M24 10.3C24 5 18.6.7 12 .7S0 5 0 10.3c0 4.8 4.3 8.8 10 9.5.4.1.9.3 1.1.6.1.3.1.7.1 1l-.2 1.1c0 .3-.2 1.2 1.1.7 1.3-.6 7.2-4.2 9.7-7.2 1.7-1.9 2.2-3.8 2.2-5.7z"/></svg>`

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderError(title, detail, showRetry = true) {
  card.innerHTML = `
    <div class="line-mark" style="background:var(--enjii)">${LINE_ICON}</div>
    <div class="ttl">${esc(title)}</div>
    <div class="err">${detail}</div>
    ${showRetry ? `<a class="btn btn-primary" href="/#mypage">マイページへ戻る</a>` : ''}
    <a class="btn btn-ghost" href="/">ホームへ</a>
  `
}

function renderSuccess(profile, returnTo) {
  const avatar = profile.pictureUrl
    ? `<img src="${esc(profile.pictureUrl)}" alt="">`
    : `<div style="width:44px;height:44px;border-radius:50%;background:var(--line);display:flex;align-items:center;justify-content:center">${LINE_ICON.replace('width:40px', '')}</div>`

  card.innerHTML = `
    <div class="line-mark">${LINE_ICON}</div>
    <div class="badge-ok">✓ 連携完了</div>
    <div class="ttl">LINE連携が完了しました</div>
    <div class="sub">
      これから公欠申請の承認完了などのお知らせを<br>LINEでお届けします。
    </div>
    <div class="profile">
      ${avatar}
      <div style="text-align:left">
        <div class="pname">${esc(profile.displayName || 'LINEアカウント')}</div>
        <div class="pmeta">このアカウントと連携しました</div>
      </div>
    </div>
    <div class="sub" style="font-size:11.5px">
      通知を受け取るには、公式アカウントを友だち追加したままにしてください。<br>
      連携はマイページからいつでも解除できます。
    </div>
    <a class="btn btn-primary" href="${esc(returnTo)}">マイページへ戻る</a>
  `
}

function renderLoginRequired() {
  card.innerHTML = `
    <div class="line-mark" style="background:var(--navy)">${LINE_ICON}</div>
    <div class="ttl">ログインが必要です</div>
    <div class="sub">
      LINE連携は生徒手帳のアカウントに紐づけて行います。<br>
      ログインしてから、マイページの連携バナーをタップしてください。
    </div>
    <a class="btn btn-primary" href="/auth.html">ログイン</a>
  `
}

async function main() {
  const params = new URLSearchParams(location.search)
  const error  = params.get('error')
  const code   = params.get('code')
  const state  = params.get('state')
  const storedState = consumeStoredState()
  const returnTo    = consumeReturnTo() || '/#mypage'

  // --- ユーザーが認可をキャンセルした / LINE 側エラー ---
  if (error) {
    const desc = params.get('error_description') || ''
    if (error === 'ACCESS_DENIED') {
      renderError('LINE連携をキャンセルしました',
        'LINEの同意画面でキャンセルされました。<br>連携する場合はマイページからもう一度お試しください。')
    } else {
      renderError('LINE連携に失敗しました',
        `エラーコード: ${esc(error)}<br>${esc(desc)}`)
    }
    return
  }

  if (!code) {
    renderError('リンクが無効です',
      '認可コードが見つかりません。マイページの連携バナーから改めてお試しください。')
    return
  }

  // --- state 検証（CSRF対策） ---
  if (!storedState || !state || storedState !== state) {
    renderError('セキュリティ検証に失敗しました',
      'リクエストの照合に失敗しました（state不一致）。<br>' +
      'ブラウザのタブを開き直した場合などに発生します。マイページから改めて連携してください。')
    return
  }

  // --- Firebase Auth のログイン状態を待つ ---
  const user = await new Promise(resolve => {
    let settled = false
    const unsub = onAuth(u => {
      if (settled) return
      settled = true
      try { unsub() } catch { /* noop */ }
      resolve(u)
    })
    setTimeout(() => {
      if (!settled) { settled = true; resolve(null) }
    }, 8000)
  })

  if (!user) {
    renderLoginRequired()
    return
  }

  // --- 認可コード → アクセストークン → LINEプロフィール（Workers 経由） ---
  try {
    const profile = await exchangeCodeForProfile(code)
    await saveLineLink(user.uid, profile)
    // 認可コードを URL から消す（再読み込みでの二重使用を防ぐ）
    history.replaceState(null, '', location.pathname)
    renderSuccess(profile, returnTo)
  } catch (e) {
    renderError('LINE連携に失敗しました', esc(e?.message || String(e)))
  }
}

main()
