/**
 * src/roles.js
 * ロール定義・権限判定の共通モジュール（Issue #18: ロールの細分化）
 *
 * ロール一覧:
 *  - student        : 生徒（未承認 / 承認済みは users.approved フラグで区別）
 *  - teacher        : 先生（顧問・担任として公欠申請を承認する既存ロール。委員会の管理者ではない）
 *  - moderator      : モデレーター（生徒）— 委員会内の委員
 *  - admin_student  : 管理者（生徒）— 委員会内の管理者
 *  - admin_teacher   : 管理者（先生）— 委員の顧問先生
 *  - owner          : オーナー — 全て可能
 *
 * 権限マトリクス（Issue #18 コメントより）:
 *  生徒(未承認)   → システム使用可能。デジタル身分証・先生サジェストは不可
 *  生徒(承認済み) → 生徒機能すべて利用可能
 *  モデレーター   → 公欠申請ケース閲覧不可 / ロール変更不可 / 生徒承認の切替は可能 /
 *                   ユーザー情報閲覧可・変更不可 / 条文変更可 / 問い合わせ閲覧可・下書き可・返信不可
 *  管理者(生徒)   → 公欠申請ケース閲覧不可 / ロール変更は自分と同等まで可 / 生徒承認可 /
 *                   ユーザー情報変更可 / 条文変更可 / 問い合わせ返信可
 *  管理者(先生)   → 公欠申請ケース閲覧可能。他は管理者(生徒)と同じ
 *  オーナー       → 全て可能
 */

// =============================================
// ロール定義
// =============================================
export const ROLES = {
  STUDENT:       'student',
  TEACHER:       'teacher',
  MODERATOR:     'moderator',
  ADMIN_STUDENT: 'admin_student',
  ADMIN_TEACHER: 'admin_teacher',
  OWNER:         'owner',
}

// 表示ラベル
export const ROLE_LABELS = {
  student:       '生徒',
  teacher:       '先生',
  moderator:     'モデレーター',
  admin_student: '管理者（生徒）',
  admin_teacher: '管理者（先生）',
  owner:         'オーナー',
}

export const ROLE_COLORS = {
  student:       '#004085',
  teacher:       '#856404',
  moderator:     '#5b2c6f',
  admin_student: '#0e6655',
  admin_teacher: '#7d6608',
  owner:         '#922b21',
}

export const ROLE_BGS = {
  student:       '#cce5ff',
  teacher:       '#fff3cd',
  moderator:     '#e8daef',
  admin_student: '#d1f2eb',
  admin_teacher: '#fcf3cf',
  owner:         '#fadbd8',
}

// 委員会内の「レベル」（ロール変更可否の上限判定に使用）
// student/teacher は委員会外の一般ロールなのでレベル0
const ROLE_LEVEL = {
  student:       0,
  teacher:       0,
  moderator:     1,
  admin_student: 2,
  admin_teacher: 2,
  owner:         99,
}

export function roleLevel(role) {
  return ROLE_LEVEL[role] ?? 0
}

// =============================================
// 基本判定
// =============================================
export function isStaff(role) {
  // モデレーター以上（委員会メンバー）
  return roleLevel(role) >= 1
}

export function isCommitteeAdmin(role) {
  // 管理者（生徒/先生）またはオーナー
  return role === ROLES.ADMIN_STUDENT || role === ROLES.ADMIN_TEACHER || role === ROLES.OWNER
}

export function isOwnerRole(role) {
  return role === ROLES.OWNER
}

// =============================================
// 個別権限
// =============================================

// 管理者パネルにログインできるか
export function canAccessAdminPanel(role) {
  return isStaff(role)
}

// 公欠申請ケース（管理用の一覧）を閲覧できるか
export function canViewCasesAdmin(role) {
  return role === ROLES.ADMIN_TEACHER || role === ROLES.OWNER
}

// ユーザーのロールを変更できるか（対象ロールのレベルが自分以下であることは呼び出し側で別途チェック）
export function canManageRoles(role) {
  return isCommitteeAdmin(role)
}

// 生徒の承認状態（承認済み/未承認）を切り替えられるか
export function canToggleApproval(role) {
  return isStaff(role)
}

// ユーザー情報（氏名・学年・クラス等）を変更できるか
export function canEditUserInfo(role) {
  return isCommitteeAdmin(role)
}

// ユーザー一覧・詳細を閲覧できるか
export function canViewUsers(role) {
  return isStaff(role)
}

// 条文・コンテンツ（校則・行事等）を変更できるか
export function canEditContent(role) {
  return isStaff(role)
}

// お問い合わせを閲覧できるか
export function canViewInquiries(role) {
  return isStaff(role)
}

// お問い合わせに返信（保存・送信）できるか。AIによる下書き生成自体はブラウザ内だけなので全スタッフ可。
export function canReplyInquiries(role) {
  return isCommitteeAdmin(role)
}

// あるロールを、自分が「割り当てられる」ロールかどうか判定
// （自分のレベル以下のロールにしか変更できない。オーナーは無制限）
export function canAssignRole(myRole, targetRole) {
  if (myRole === ROLES.OWNER) return true
  if (!canManageRoles(myRole)) return false
  return roleLevel(targetRole) <= roleLevel(myRole)
}

// 対象ユーザーの現在のロールを自分が操作できるか
// （自分のレベル以下のユーザーにしか操作できない。オーナーは無制限）
export function canManageTargetRole(myRole, targetRole) {
  if (myRole === ROLES.OWNER) return true
  if (!canManageRoles(myRole)) return false
  return roleLevel(targetRole) <= roleLevel(myRole)
}

// =============================================
// 生徒（一般ユーザー）向け機能ゲート
// =============================================

// 生徒が「承認済み」かどうか（role !== 'student' の場合は対象外 = true 扱い）
export function isApprovedStudent(profile) {
  if (!profile) return false
  if (profile.role !== ROLES.STUDENT) return true
  return !!profile.approved
}

// デジタル身分証を利用できるか
export function canUseDigitalId(profile) {
  return isApprovedStudent(profile)
}

// 先生のメールアドレスサジェスト（一覧から選ぶ）機能を利用できるか
export function canUseTeacherSuggest(profile) {
  return isApprovedStudent(profile)
}

// このロールが割り当て可能な選択肢一覧（自分のレベル以下）を返す
export function assignableRoles(myRole) {
  return Object.values(ROLES).filter(r => canAssignRole(myRole, r))
}
