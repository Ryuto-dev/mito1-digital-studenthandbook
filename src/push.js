/**
 * src/push.js
 * Web Push クライアントモジュール（PWA / iPhone対応）
 *
 * ■ 仕組み
 *   1. Service Worker（/sw.js）の pushManager でブラウザのプッシュサーバー
 *      （Apple/Google）に購読登録 → endpoint + p256dh/auth鍵を取得
 *   2. 購読情報を Firestore users/{uid}/pushSubscriptions/{subId} に保存
 *   3. 送信時は Workers の POST /push/send が VAPID署名＋aes128gcm暗号化して
 *      プッシュサーバーへ配信（秘密鍵はWorkersのシークレットのみ）
 *
 * ■ iPhone条件: iOS 16.4+ / Safariから「ホーム画面に追加」したPWAで開くこと。
 *   Safariタブ内では購読不可。その場合は案内メッセージを表示する。
 */
import { db } from './firebase.js'
import {
  doc, setDoc, getDocs, deleteDoc, collection, serverTimestamp,
} from 'firebase/firestore'

// VAPID公開鍵（Workersの VAPID_PRIVATE_KEY とペア。公開情報なのでコミット可）
export const VAPID_PUBLIC_KEY =
  'BKkk44MwpNWv4Mo66MvsEGTC08FmqU6EYOpdGExqhZ9Dl90ZylQgQhlVHZwqBmbqYQ4NgKND6LgwFW-meoVs7HE'

// Workers のベースURL（line.js / cases.js と同じデプロイ先）
export const WORKERS_URL = 'https://mito1-hundbook.asanuma-ryuto.workers.dev'

// =============================================
// 対応判定
// =============================================
export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function isIos() {
  const ua = navigator.userAgent || ''
  return /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/** ホーム画面追加のPWA（standalone）として開かれているか */
export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

/**
 * 購読可否の判定結果を返す（UI表示用）
 *   { supported, isIos, standalone, reason }
 *   reason: 'ok' | 'unsupported' | 'ios-browser'
 */
export function pushAvailability() {
  if (!isPushSupported()) {
    return { supported: false, reason: 'unsupported' }
  }
  const ios = isIos()
  const standalone = isStandalone()
  // iPhoneはPWA（ホーム画面追加）でのみWeb Push可
  if (ios && !standalone) {
    return { supported: false, isIos: true, standalone, reason: 'ios-browser' }
  }
  return { supported: true, isIos: ios, standalone, reason: 'ok' }
}

// =============================================
// 購読状態
// =============================================
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function swRegistration() {
  // index.html側ですでに /sw.js を登録済み。readyで取得する
  let reg = await navigator.serviceWorker.ready.catch(() => null)
  if (!reg) {
    reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
  }
  return reg
}

function subIdFor(endpoint) {
  // endpointは長いURLなのでハッシュ化してドキュメントIDにする（非同期不要の簡易ハッシュ）
  let h1 = 0x811c9dc5, h2 = 0x01000193
  for (let i = 0; i < endpoint.length; i++) {
    const c = endpoint.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0
    h2 = Math.imul(h2 + c, 0x811c9dc5) >>> 0
  }
  return `s${h1.toString(36)}${h2.toString(36)}`
}

/**
 * 現在の購読状態を取得
 * → { permission, subscribed, endpoint }
 */
export async function getPushState() {
  const permission = ('Notification' in window) ? Notification.permission : 'unsupported'
  if (!isPushSupported()) return { permission, subscribed: false, endpoint: null }
  try {
    const reg = await swRegistration()
    const sub = await reg.pushManager.getSubscription()
    return { permission, subscribed: !!sub, endpoint: sub ? sub.endpoint : null }
  } catch {
    return { permission, subscribed: false, endpoint: null }
  }
}

// =============================================
// 購読ON（必ずタップ等のユーザー操作内から呼ぶこと）
// =============================================
export async function subscribePush(uid) {
  if (!uid) throw new Error('ログインが必要です')
  const avail = pushAvailability()
  if (!avail.supported) {
    if (avail.reason === 'ios-browser') {
      throw new Error('iPhoneでは「共有→ホーム画面に追加」して追加したアプリアイコンから開いてください')
    }
    throw new Error('このブラウザはプッシュ通知に対応していません')
  }

  // 1. 通知許可（ユーザー操作内で呼ぶ）
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('通知が許可されませんでした')

  // 2. プッシュサーバーへ購読登録
  const reg = await swRegistration()
  const old = await reg.pushManager.getSubscription().catch(() => null)
  const sub = old || await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })
  const json = sub.toJSON()

  // 3. Firestoreに保存（本人専用サブコレクション）
  const id = subIdFor(sub.endpoint)
  await setDoc(doc(db, 'users', uid, 'pushSubscriptions', id), {
    endpoint: sub.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    userAgent: navigator.userAgent || '',
    standalone: isStandalone(),
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, { merge: true })

  return { endpoint: sub.endpoint }
}

// =============================================
// 購読OFF
// =============================================
export async function unsubscribePush(uid) {
  try {
    const reg = await swRegistration()
    const sub = await reg.pushManager.getSubscription().catch(() => null)
    if (sub) {
      const endpoint = sub.endpoint
      await sub.unsubscribe().catch(() => {})
      // Firestore側も削除（best-effort）
      if (uid) {
        try {
          await deleteDoc(doc(db, 'users', uid, 'pushSubscriptions', subIdFor(endpoint)))
        } catch { /* ignore */ }
      }
    } else if (uid) {
      // SW側に購読が無い場合もFirestore側を全掃除
      try {
        const snap = await getDocs(collection(db, 'users', uid, 'pushSubscriptions'))
        await Promise.all(snap.docs.map(d =>
          deleteDoc(doc(db, 'users', uid, 'pushSubscriptions', d.id)).catch(() => {})
        ))
      } catch { /* ignore */ }
    }
  } catch (e) {
    throw new Error('通知OFFに失敗しました: ' + (e?.message || String(e)))
  }
}

// =============================================
// 送信（テスト用・承認完了通知用）
// =============================================

/** 自分の購読へテスト送信（Workers経由） */
export async function sendTestPush() {
  const reg = await swRegistration()
  const sub = await reg.pushManager.getSubscription()
  if (!sub) throw new Error('先に通知をONにしてください')
  const j = sub.toJSON()
  const res = await fetch(`${WORKERS_URL}/push/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: {
        endpoint: sub.endpoint,
        keys: { p256dh: j.keys.p256dh, auth: j.keys.auth },
      },
      payload: {
        title: 'テスト通知',
        body: 'PWAプッシュ通知は正常に届いています',
        url: '/#mypage',
      },
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.ok !== true) {
    throw new Error(data?.detail || data?.error || `送信失敗 (${res.status})`)
  }
  return true
}

/**
 * 指定生徒の全購読へ承認完了通知を送る。
 * 呼び出し側（先生・管理者）の権限で購読一覧を読み、Workersへ1件ずつ送信する。
 * Workersは秘密鍵を持ちFirestoreを読まない設計のため、この方式にしている。
 */
export async function notifyStudentPush(studentId, payload) {
  if (!studentId) return { sent: 0 }
  let subs = []
  try {
    const snap = await getDocs(collection(db, 'users', studentId, 'pushSubscriptions'))
    subs = snap.docs.map(d => d.data()).filter(s => s?.endpoint && s?.keys?.p256dh)
  } catch {
    return { sent: 0, skipped: true }
  }
  let sent = 0
  for (const s of subs) {
    try {
      const res = await fetch(`${WORKERS_URL}/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: { endpoint: s.endpoint, keys: s.keys },
          payload,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok === true) sent++
    } catch { /* 次の購読へ */ }
  }
  return { sent, total: subs.length }
}
