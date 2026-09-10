/**
 * src/line.js
 * LINE アカウント連携（LINE Login チャネルの認可コードフロー）クライアント側モジュール
 *
 * ■ これは「LINEでログイン」ではありません
 *   Firebase Auth のアカウント（= 生徒手帳のアカウント）に対して
 *   LINE のユーザーID（Uxxxxxxxx...）を紐づけ、Messaging API 経由で
 *   通知を LINE に送れるようにするための「連携」機能です。
 *   したがって未ログイン状態では利用できません（マイページ限定）。
 *
 * ■ フロー
 *   1. マイページの連携バナーをクリック
 *      → state を生成して sessionStorage に保存
 *      → Workers の /line/authorize に遷移（client_id は Workers のシークレット）
 *   2. Workers が https://access.line.me/oauth2/v2.1/authorize へ 302 リダイレクト
 *      （bot_prompt=normal / scope=profile%20openid）
 *   3. ユーザーが認可 → LINE Login チャネルのコールバックURLへ code & state 付きで戻る
 *      コールバックURL: {APP_BASE}/line-callback.html
 *   4. line-callback.html が state を検証し、Workers の /line/exchange に code を渡す
 *   5. Workers が code → アクセストークン → LINE プロフィール取得API
 *      （GET https://api.line.me/v2/profile）を叩いて userId を取得して返す
 *   6. クライアントが Firestore の users/{uid} に lineUserId 等を書き込み完了表示
 *
 * ■ LINE Developers Console に登録すべきコールバックURL
 *   https://mito1-tetyo.tech/line-callback.html
 *   （ローカル開発時は http://localhost:5173/line-callback.html も追加）
 */
import { db } from './firebase.js'
import { doc, updateDoc, getDoc, deleteField, serverTimestamp } from 'firebase/firestore'

// Workers のベースURL（cases.js と同じデプロイ先）
export const WORKERS_URL = 'https://mito1-hundbook.asanuma-ryuto.workers.dev'

// LINE Login のコールバックURL（LINE Developers Console に登録する値と完全一致させる）
export const LINE_CALLBACK_PATH = '/line-callback.html'

const STATE_KEY    = 'mito1_line_state'
const RETURN_KEY   = 'mito1_line_return'

// =============================================
// state（CSRF対策）
// =============================================
function genState() {
  const arr = new Uint8Array(24)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

export function callbackUrl() {
  return window.location.origin + LINE_CALLBACK_PATH
}

// =============================================
// 連携開始（バナークリック時）
// =============================================
/**
 * LINE の認可画面へ遷移する。
 * client_id は Workers のシークレット（LINE_client_id）にあるため、
 * 認可URLの組み立ては Workers 側で行い、こちらは /line/authorize へ飛ばすだけ。
 * @param {string} returnTo 連携完了後に戻したいページ（例: '/#mypage'）
 */
export function startLineLink(returnTo = '/') {
  const state = genState()
  try {
    sessionStorage.setItem(STATE_KEY, state)
    sessionStorage.setItem(RETURN_KEY, returnTo)
  } catch { /* プライベートブラウジング等で失敗しても続行 */ }

  const params = new URLSearchParams({
    state,
    redirect_uri: callbackUrl(),
  })
  window.location.href = `${WORKERS_URL}/line/authorize?${params.toString()}`
}

export function consumeStoredState() {
  let state = null
  try {
    state = sessionStorage.getItem(STATE_KEY)
    sessionStorage.removeItem(STATE_KEY)
  } catch { /* noop */ }
  return state
}

export function consumeReturnTo() {
  let ret = null
  try {
    ret = sessionStorage.getItem(RETURN_KEY)
    sessionStorage.removeItem(RETURN_KEY)
  } catch { /* noop */ }
  return ret || '/'
}

// =============================================
// 認可コード → LINE プロフィール（Workers 経由）
// =============================================
/**
 * @param {string} code LINE から返ってきた認可コード（10分間・1回のみ有効）
 * @returns {Promise<{userId:string, displayName:string, pictureUrl?:string}>}
 */
export async function exchangeCodeForProfile(code) {
  const res = await fetch(`${WORKERS_URL}/line/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri: callbackUrl() }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error_description || data?.detail || data?.error || `LINE連携に失敗しました (${res.status})`)
  }
  if (!data.userId) throw new Error('LINEのユーザーIDを取得できませんでした')
  return data
}

// =============================================
// Firestore（users/{uid}）への保存・解除
// =============================================
/**
 * LINEユーザーIDをユーザードキュメントに書き込む
 */
export async function saveLineLink(uid, profile) {
  await updateDoc(doc(db, 'users', uid), {
    lineUserId:      profile.userId,
    lineDisplayName: profile.displayName || '',
    linePictureUrl:  profile.pictureUrl || '',
    lineNotify:      true,          // LINE通知の有効/無効（将来的に個別設定できるように）
    lineLinkedAt:    serverTimestamp(),
  })
}

/**
 * 連携解除（LINEユーザーIDを削除）
 */
export async function unlinkLine(uid) {
  await updateDoc(doc(db, 'users', uid), {
    lineUserId:      deleteField(),
    lineDisplayName: deleteField(),
    linePictureUrl:  deleteField(),
    lineNotify:      deleteField(),
    lineLinkedAt:    deleteField(),
  })
}

/**
 * 連携状態の取得
 */
export async function getLineLinkStatus(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return { linked: false }
  const d = snap.data()
  return {
    linked:      !!d.lineUserId,
    userId:      d.lineUserId || '',
    displayName: d.lineDisplayName || '',
    pictureUrl:  d.linePictureUrl || '',
    notify:      d.lineNotify !== false,
  }
}

export function isLinked(profile) {
  return !!(profile && profile.lineUserId)
}
