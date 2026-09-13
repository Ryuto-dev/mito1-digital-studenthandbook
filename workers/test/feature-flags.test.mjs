/**
 * workers/test/feature-flags.test.mjs
 *
 * Issue #53: βテスト（機能フラグ + βテスター）の判定ロジック回帰テスト。
 *
 * 仕様:
 *  - disabled → 全員 false
 *  - beta     → βテスター or 委員会スタッフ（moderator/admin_student/admin_teacher/owner）のみ true
 *               ※ teacher はスタッフではないため betaTester 付与がなければ false
 *  - enabled（+不明な status のフォールバック） → 全員 true
 *
 * 実行:
 *   node --test workers/test/
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  FLAG_STATUSES,
  normalizeFlag,
  validateFlagKey,
  isStaffRole,
  isBetaTester,
  isFeatureEnabled,
  filterVisibleFlags,
  onlyBetaFlags,
  KNOWN_FLAGS,
  getFlagStatus,
  isFlagEnabled,
} from '../../src/featureFlags.js'
import {
  canManageBetaTester,
  betaBadge,
  profileBadges,
} from '../../src/roles.js'

const guest = null
const student = { role: 'student' }
const betaStudent = { role: 'student', betaTester: true }
const teacher = { role: 'teacher' }
const betaTeacher = { role: 'teacher', betaTester: true }
const moderator = { role: 'moderator' }
const adminStudent = { role: 'admin_student' }
const adminTeacher = { role: 'admin_teacher' }
const owner = { role: 'owner' }

test('disabled は全員 false', () => {
  for (const p of [guest, student, betaStudent, teacher, betaTeacher, moderator, adminStudent, adminTeacher, owner]) {
    assert.equal(isFeatureEnabled({ status: 'disabled' }, p), false)
    assert.equal(isFeatureEnabled('disabled', p), false)
  }
})

test('enabled は全員 true（未ログイン含む）', () => {
  for (const p of [guest, student, betaStudent, teacher, moderator, adminStudent, adminTeacher, owner]) {
    assert.equal(isFeatureEnabled({ status: 'enabled' }, p), true)
  }
})

test('beta はβテスターと委員会スタッフのみ true', () => {
  assert.equal(isFeatureEnabled({ status: 'beta' }, guest), false)
  assert.equal(isFeatureEnabled({ status: 'beta' }, student), false)
  assert.equal(isFeatureEnabled({ status: 'beta' }, teacher), false)
  assert.equal(isFeatureEnabled({ status: 'beta' }, betaStudent), true)
  assert.equal(isFeatureEnabled({ status: 'beta' }, betaTeacher), true)
  assert.equal(isFeatureEnabled({ status: 'beta' }, moderator), true)
  assert.equal(isFeatureEnabled({ status: 'beta' }, adminStudent), true)
  assert.equal(isFeatureEnabled({ status: 'beta' }, adminTeacher), true)
  assert.equal(isFeatureEnabled({ status: 'beta' }, owner), true)
})

test('不明な status・空フラグは enabled 扱い（後方互換）', () => {
  assert.equal(isFeatureEnabled({ status: '???' }, guest), true)
  assert.equal(isFeatureEnabled(null, guest), true)
  assert.equal(isFeatureEnabled(undefined, student), true)
})

test('normalizeFlag は status 不正を enabled に丸める', () => {
  assert.equal(normalizeFlag({ key: 'a', status: '???' }).status, FLAG_STATUSES.ENABLED)
  assert.equal(normalizeFlag(null).status, FLAG_STATUSES.ENABLED)
  assert.equal(normalizeFlag({ key: '  New-Search ' }).key, 'New-Search')
})

test('validateFlagKey は形式不正を拒否する', () => {
  assert.equal(validateFlagKey('new-search'), null)
  assert.equal(validateFlagKey('abc123'), null)
  assert.ok(validateFlagKey(''))
  assert.ok(validateFlagKey('New-Search'))
  assert.ok(validateFlagKey('new_search'))
  assert.ok(validateFlagKey('あいう'))
})

test('isBetaTester は true のみ真', () => {
  assert.equal(isBetaTester({ betaTester: true }), true)
  assert.equal(isBetaTester({ betaTester: false }), false)
  assert.equal(isBetaTester({}), false)
  assert.equal(isBetaTester(null), false)
})

test('isStaffRole は teacher を含まない', () => {
  assert.equal(isStaffRole('moderator'), true)
  assert.equal(isStaffRole('admin_student'), true)
  assert.equal(isStaffRole('admin_teacher'), true)
  assert.equal(isStaffRole('owner'), true)
  assert.equal(isStaffRole('teacher'), false)
  assert.equal(isStaffRole('student'), false)
})

test('filterVisibleFlags は対象だけ残す', () => {
  const flags = [
    { key: 'a', status: 'disabled' },
    { key: 'b', status: 'beta' },
    { key: 'c', status: 'enabled' },
  ]
  assert.deepEqual(filterVisibleFlags(flags, student).map(f => f.key), ['c'])
  assert.deepEqual(filterVisibleFlags(flags, betaStudent).map(f => f.key).sort(), ['b', 'c'])
  assert.deepEqual(filterVisibleFlags(flags, moderator).map(f => f.key).sort(), ['b', 'c'])
  // key なしは除外
  assert.deepEqual(filterVisibleFlags([{ status: 'enabled' }], guest), [])
})

test('onlyBetaFlags は beta のみ返す', () => {
  const flags = [
    { key: 'a', status: 'disabled' },
    { key: 'b', status: 'beta' },
    { key: 'c', status: 'enabled' },
  ]
  assert.deepEqual(onlyBetaFlags(flags).map(f => f.key), ['b'])
})

test('canManageBetaTester は委員会管理者以上のみ', () => {
  assert.equal(canManageBetaTester('owner'), true)
  assert.equal(canManageBetaTester('admin_student'), true)
  assert.equal(canManageBetaTester('admin_teacher'), true)
  assert.equal(canManageBetaTester('moderator'), false)
  assert.equal(canManageBetaTester('teacher'), false)
  assert.equal(canManageBetaTester('student'), false)
})

test('betaBadge / profileBadges はβテスターのみ付与', () => {
  assert.equal(betaBadge({ betaTester: true }).label, 'βテスター')
  assert.equal(betaBadge({}), null)
  assert.equal(betaBadge(null), null)
  const badges = profileBadges({ role: 'student', approved: true, betaTester: true })
  assert.ok(badges.some(b => b.label === 'βテスター'))
  const noBeta = profileBadges({ role: 'student', approved: true })
  assert.ok(!noBeta.some(b => b.label === 'βテスター'))
})

test('既知フラグ web-push / absence-request は未作成でも beta 扱い', () => {
  assert.ok(KNOWN_FLAGS['web-push'])
  assert.ok(KNOWN_FLAGS['absence-request'])
  assert.equal(getFlagStatus({}, 'web-push'), 'beta')
  assert.equal(getFlagStatus({}, 'absence-request'), 'beta')
  assert.equal(getFlagStatus(null, 'web-push'), 'beta')
  // 未知の key は enabled 扱い（後方互換）
  assert.equal(getFlagStatus({}, 'some-future-feature'), 'enabled')
  // ドキュメントがあればそちらが優先
  assert.equal(getFlagStatus({ 'web-push': { status: 'enabled' } }, 'web-push'), 'enabled')
  assert.equal(getFlagStatus({ 'web-push': { status: 'disabled' } }, 'web-push'), 'disabled')
  assert.equal(getFlagStatus({ 'web-push': { status: 'beta' } }, 'web-push'), 'beta')
})

test('isFlagEnabled は既知フラグのデフォルトで判定する', () => {
  assert.equal(isFlagEnabled({}, 'web-push', student), false)
  assert.equal(isFlagEnabled({}, 'web-push', betaStudent), true)
  assert.equal(isFlagEnabled({}, 'web-push', moderator), true)
  assert.equal(isFlagEnabled({}, 'absence-request', teacher), false)
  assert.equal(isFlagEnabled({}, 'absence-request', betaTeacher), true)
  assert.equal(isFlagEnabled({}, 'unknown-key', guest), true)
  assert.equal(isFlagEnabled({ 'absence-request': { status: 'enabled' } }, 'absence-request', guest), true)
})
