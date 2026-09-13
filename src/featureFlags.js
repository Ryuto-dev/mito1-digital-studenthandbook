/**
 * src/featureFlags.js
 * Issue #53: 機能リリース前のβテスト（限定ユーザー先行公開）
 *
 * 仕組み:
 *  - Firestore `featureFlags` コレクションで機能ごとに公開状態を管理する。
 *    status: 'disabled'（全員非表示） / 'beta'（βテスター＋スタッフのみ） / 'enabled'（全員公開）
 *  - Firestore `users/{uid}.betaTester` (boolean) が true のユーザーがβテスター。
 *  - 委員会スタッフ（モデレーター以上）は常にβ機能を見られる（検証のため）。
 *    ※ teachers はスタッフではないため、βを見るには betaTester 付与が必要。
 *
 * 使い方（新機能を追加する側）:
 *  ```js
 *  import { fetchFeatureFlags, isFeatureEnabled } from './featureFlags.js'
 *  const flags = await fetchFeatureFlags()
 *  if (isFeatureEnabled(flags['new-search'], profile)) { ... }
 *  ```
 *
 * このファイルの純粋関数（normalizeFlag / isBetaTester / isFeatureEnabled 等）は
 * Firebase に依存しないため `node --test` から直接 import して検証できる。
 * Firestore への依存は fetchFeatureFlags() 内の動的 import に閉じ込めている。
 */

// =============================================
// 定数
// =============================================
export const FLAG_STATUSES = {
  DISABLED: 'disabled',
  BETA: 'beta',
  ENABLED: 'enabled',
}

export const FLAG_STATUS_LABELS = {
  disabled: '無効（全員非表示）',
  beta: 'βテスト中（βテスターのみ）',
  enabled: '公開（全員表示）',
}

export const FLAG_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// =============================================
// 正規化・バリデーション
// =============================================
export function normalizeFlag(raw) {
  const f = raw && typeof raw === 'object' ? raw : {}
  const status = Object.values(FLAG_STATUSES).includes(f.status) ? f.status : FLAG_STATUSES.ENABLED
  return {
    key: typeof f.key === 'string' ? f.key.trim() : '',
    name: typeof f.name === 'string' ? f.name : '',
    description: typeof f.description === 'string' ? f.description : '',
    status,
  }
}

export function validateFlagKey(key) {
  const k = String(key || '').trim()
  if (!k) return 'キー（機能ID）を入力してください'
  if (k.length > 60) return 'キーは60文字以内にしてください'
  if (!FLAG_KEY_PATTERN.test(k)) return 'キーは半角英小文字・数字・ハイフンのみ（例: new-search）'
  return null
}

// =============================================
// 判定（純粋関数）
// =============================================

/** 委員会スタッフ（モデレーター以上）か。roles.js の isStaff と同義の軽量版。 */
export function isStaffRole(role) {
  return role === 'moderator' || role === 'admin_student' || role === 'admin_teacher' || role === 'owner'
}

export function isBetaTester(profile) {
  return !!(profile && profile.betaTester === true)
}

/**
 * この機能をそのユーザーに見せてよいか。
 * @param {object|string|null|undefined} flagOrStatus normalizeFlag済みオブジェクト or status文字列
 * @param {object|null|undefined} profile users/{uid}（未ログインは null）
 * @returns {boolean}
 */
export function isFeatureEnabled(flagOrStatus, profile) {
  const status = typeof flagOrStatus === 'string'
    ? flagOrStatus
    : normalizeFlag(flagOrStatus).status
  if (status === FLAG_STATUSES.DISABLED) return false
  if (status === FLAG_STATUSES.ENABLED) return true
  // beta: βテスター本人 or 委員会スタッフ（検証用に常時可）
  return isBetaTester(profile) || isStaffRole(profile?.role)
}

/** フラグ一覧（配列 or key→flag のマップ）から、そのユーザーに見せるものだけ残す */
export function filterVisibleFlags(flags, profile) {
  const list = Array.isArray(flags) ? flags : Object.values(flags || {})
  return list
    .map(normalizeFlag)
    .filter(f => f.key && isFeatureEnabled(f.status, profile))
}

/** βテスト中（status === 'beta'）のフラグだけ返す（管理画面の概要表示用） */
export function onlyBetaFlags(flags) {
  const list = Array.isArray(flags) ? flags : Object.values(flags || {})
  return list.map(normalizeFlag).filter(f => f.status === FLAG_STATUSES.BETA)
}

// =============================================
// Firestore 取得（キャッシュ付き・announcements.js と同じ方式）
// =============================================
let _cache = null
let _cacheAt = 0
const CACHE_TTL = 60 * 1000

/** @returns {Promise<Object>} key → flag のマップ */
export async function fetchFeatureFlags({ force = false } = {}) {
  const now = Date.now()
  if (!force && _cache && now - _cacheAt < CACHE_TTL) return _cache
  try {
    const { db } = await import('./firebase.js')
    const { collection, getDocs } = await import('firebase/firestore')
    const snap = await getDocs(collection(db, 'featureFlags'))
    const map = {}
    snap.docs.forEach(d => {
      const f = normalizeFlag({ ...d.data(), key: d.data()?.key || d.id })
      if (f.key) map[f.key] = { id: d.id, ...f }
    })
    _cache = map
  } catch {
    _cache = _cache || {}
  }
  _cacheAt = now
  return _cache
}

export function clearFeatureFlagCache() {
  _cache = null
  _cacheAt = 0
}
