/**
 * src/announcements.js
 * Issue #37: アプリ内お知らせ機能
 *
 * - Push通知連携なし。Firestore `announcements` コレクション + クライアント完結の既読管理。
 * - コレクション fields:
 *   title, body, category(info/update/feature/important/welcome),
 *   linkPage(任意のページキー), status(published/draft), pinned(bool),
 *   publishedAt, createdAt, updatedAt, createdBy
 * - 既読管理:
 *   ログイン時: users/{uid}.lastSeenAnnouncementsAt + localStorage `mito1_read_ann_<uid>`
 *   未ログイン時: localStorage `mito1_lastSeenAnn_guest` + `mito1_read_ann_guest`
 * - 表示フィルタ:
 *   status == 'published' のみ表示。
 *   ログイン時は publishedAt >= user.createdAt のもののみ（登録日以前は見せない）。
 *   ただし category == 'welcome' は登録日フィルタを免除（新規ユーザーに必ず届けるため）。
 *   未ログイン時は直近すべて表示（フィルタなし）。
 */
import { db } from './firebase.js'
import {
  collection, getDocs, query, orderBy,
  doc, updateDoc, serverTimestamp,
} from 'firebase/firestore'

export const ANNOUNCE_CATEGORIES = {
  info:      { label: 'お知らせ', color: '#1a2744', bg: 'rgba(26,39,68,.08)' },
  update:    { label: '更新',     color: '#0e6655', bg: '#d1f2eb' },
  feature:   { label: '新機能',   color: '#5b2c6f', bg: '#e8daef' },
  important: { label: '重要',     color: '#922b21', bg: '#fadbd8' },
  welcome:   { label: 'ウェルカム', color: '#7d6608', bg: '#fcf3cf' },
}

export function categoryMeta(cat) {
  return ANNOUNCE_CATEGORIES[cat] || ANNOUNCE_CATEGORIES.info
}

// Firestore Timestamp / Date / number / ISO文字列 → ミリ秒に正規化
export function toMillis(v) {
  if (v == null) return 0
  try {
    if (typeof v?.toMillis === 'function') return v.toMillis()
    if (typeof v?.toDate === 'function') return v.toDate().getTime()
  } catch { /* ignore */ }
  if (v instanceof Date) return v.getTime()
  if (typeof v === 'number') return v
  const t = Date.parse(v)
  return Number.isNaN(t) ? 0 : t
}

// =============================================
// 取得
// =============================================
let _cache = null
let _cacheAt = 0
const CACHE_TTL = 60 * 1000

export async function fetchAnnouncements({ force = false } = {}) {
  const now = Date.now()
  if (!force && _cache && now - _cacheAt < CACHE_TTL) return _cache
  try {
    const snap = await getDocs(query(collection(db, 'announcements'), orderBy('publishedAt', 'desc')))
    _cache = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch {
    // publishedAt がない/混在ドキュメントがある場合は orderBy なしで取得
    try {
      const snap = await getDocs(collection(db, 'announcements'))
      _cache = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      _cache.sort((a, b) => toMillis(b.publishedAt || b.createdAt) - toMillis(a.publishedAt || a.createdAt))
    } catch {
      _cache = []
    }
  }
  _cacheAt = now
  return _cache
}

export function clearAnnouncementCache() {
  _cache = null
  _cacheAt = 0
}

// 公開中のみ
export function onlyPublished(list) {
  return (list || []).filter(a => (a.status || 'published') === 'published')
}

// =============================================
// ウェルカム（フォールバック）
// Firestoreが空でも新規ユーザーに必ず届くよう、クライアントで合成する。
// 管理者が category=welcome を作った場合はそちらが優先（重複を避けるため
// Firestore側にwelcomeがあれば合成しない）。
// =============================================
export function buildLocalWelcome(profile) {
  const createdMs = toMillis(profile?.createdAt) || Date.now()
  return {
    id: '__welcome_local__',
    title: 'ご登録ありがとうございます！',
    body: 'デジタル生徒手帳へのご登録ありがとうございます。\n\nこの「お知らせ」では、校則・行事の更新や新機能の追加などをお届けします。\nベルアイコンのバッジは、すべて確認すると消えます。\n\nまずは「ホーム」から各コンテンツをご覧ください。',
    category: 'welcome',
    linkPage: 'home',
    status: 'published',
    pinned: true,
    publishedAt: profile?.createdAt || new Date(createdMs),
    _local: true,
  }
}

// ユーザーに見せる一覧（登録日フィルタ + pinned優先ソート）
export function visibleAnnouncements(all, profile) {
  const list = onlyPublished(all || [])
  const hasWelcomeRemote = list.some(a => a.category === 'welcome')
  let merged = [...list]
  if (profile && !hasWelcomeRemote) {
    merged = [buildLocalWelcome(profile), ...merged]
  }
  const createdMs = profile ? toMillis(profile.createdAt) : 0
  const filtered = merged.filter(a => {
    if (a.category === 'welcome') return true // ウェルカムは登録日以前でも表示
    if (!profile) return true // 未ログインは全表示
    if (!createdMs) return true // createdAt未取得時は念のため表示
    return toMillis(a.publishedAt || a.createdAt) >= createdMs
  })
  // pinned優先 → publishedAt降順
  filtered.sort((a, b) => {
    const pa = a.pinned ? 1 : 0
    const pb = b.pinned ? 1 : 0
    if (pa !== pb) return pb - pa
    return toMillis(b.publishedAt || b.createdAt) - toMillis(a.publishedAt || a.createdAt)
  })
  return filtered
}

// =============================================
// 既読管理（localStorage + users.lastSeenAnnouncementsAt）
// =============================================
function uidKey(profile, user) {
  if (profile?.uid) return profile.uid
  if (user?.uid) return user.uid
  return 'guest'
}

function readIdsKey(uid) {
  return `mito1_read_ann_${uid}`
}

function lastSeenKey(uid) {
  return `mito1_lastSeenAnn_${uid}`
}

export function getReadIds(uid) {
  try {
    return new Set(JSON.parse(localStorage.getItem(readIdsKey(uid)) || '[]'))
  } catch {
    return new Set()
  }
}

export function getLastSeenMs(uid, profile) {
  // localStorage優先（即時反映）、なければ Firestore の値を参照
  try {
    const raw = localStorage.getItem(lastSeenKey(uid))
    if (raw) {
      const t = Number(raw)
      if (t > 0) return t
    }
  } catch { /* ignore */ }
  return toMillis(profile?.lastSeenAnnouncementsAt) || 0
}

export function isUnread(ann, uid, lastSeenMs, readIds) {
  if (readIds?.has(ann.id)) return false
  const pub = toMillis(ann.publishedAt || ann.createdAt)
  if (!pub) return false
  if (lastSeenMs && pub <= lastSeenMs) return false
  return true
}

// 未読件数
export function countUnread(visibleList, uid, lastSeenMs, readIds) {
  return (visibleList || []).filter(a => isUnread(a, uid, lastSeenMs, readIds)).length
}

// 個別既読
export function markOneRead(uid, announcementId) {
  try {
    const set = getReadIds(uid)
    set.add(announcementId)
    localStorage.setItem(readIdsKey(uid), JSON.stringify([...set]))
  } catch { /* ignore */ }
}

// すべて既読（バッジを消す）。ログイン時は Firestore にも保存。
export async function markAllRead({ user, profile }) {
  const uid = uidKey(profile, user)
  const now = Date.now()
  try {
    localStorage.setItem(lastSeenKey(uid), String(now))
  } catch { /* ignore */ }
  try {
    const visible = visibleAnnouncements(_cache || [], profile)
    localStorage.setItem(readIdsKey(uid), JSON.stringify(visible.map(a => a.id)))
  } catch { /* ignore */ }
  if (user?.uid) {
    try {
      await updateDoc(doc(db, 'users', user.uid), { lastSeenAnnouncementsAt: serverTimestamp() })
    } catch {
      // 本人ドキュメントへのupdateがrulesで拒否された場合もバッジ消去自体は継続
    }
  }
  // 次回取得時に最新 publishedAt を lastSeen として扱えるよう localStorage は残す
}

// ログイン直後に localStorage の lastSeen がなければ Firestore の値をコピー
export function syncLastSeenFromProfile(profile) {
  const uid = uidKey(profile, null)
  try {
    if (!localStorage.getItem(lastSeenKey(uid))) {
      const ms = toMillis(profile?.lastSeenAnnouncementsAt)
      if (ms > 0) localStorage.setItem(lastSeenKey(uid), String(ms))
    }
  } catch { /* ignore */ }
}

export { uidKey }
