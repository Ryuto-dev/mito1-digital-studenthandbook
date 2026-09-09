/**
 * src/auth.js
 * Firebase Auth ヘルパー + ユーザープロフィール管理
 */
import { auth, db } from './firebase.js'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  browserSessionPersistence,
  setPersistence,
} from 'firebase/auth'
import {
  doc, setDoc, getDoc, getDocs, collection, serverTimestamp, query, where,
} from 'firebase/firestore'

// タブを閉じたらログアウト
setPersistence(auth, browserSessionPersistence).catch(() => {})

// =============================================
// 新規登録（生徒）
// =============================================
export async function registerStudent({ email, password, name, grade, classLabel, number }) {
  // メール形式チェック（学校ドメインは任意制限・今は全ドメイン許可）
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  const uid  = cred.user.uid

  await setDoc(doc(db, 'users', uid), {
    role:    'student',
    approved: false, // 生徒は登録直後は未承認。承認されるまで一部機能が制限される
    name,
    grade:   Number(grade),
    class:   classLabel,
    number:  Number(number),
    email,
    createdAt: serverTimestamp(),
  })

  return cred.user
}

// =============================================
// 新規登録（先生）
// =============================================
export async function registerTeacher({ email, password, name }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  const uid  = cred.user.uid

  await setDoc(doc(db, 'users', uid), {
    role: 'teacher',
    name,
    email,
    createdAt: serverTimestamp(),
  })

  return cred.user
}

// =============================================
// ログイン
// =============================================
export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  return cred.user
}

// =============================================
// ログアウト
// =============================================
export async function logout() {
  await signOut(auth)
}

// =============================================
// 現在のユーザープロフィール取得
// user引数を渡すとauth.currentUserに依存しない
// =============================================
export async function getCurrentProfile(user) {
  const u = user || auth.currentUser
  if (!u) return null
  const snap = await getDoc(doc(db, 'users', u.uid))
  if (!snap.exists()) return null
  return { uid: u.uid, email: u.email, ...snap.data() }
}

// =============================================
// Auth状態変化を監視してコールバック
// =============================================
export function onAuth(callback) {
  return onAuthStateChanged(auth, callback)
}

// =============================================
// パスワードリセットメール送信
// =============================================
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email)
}

// =============================================
// 先生のメールアドレス一覧取得（公欠申請フォームのサジェスト用）
// 承認済み生徒のみ呼び出し可能（firestore.rules で制限）。
// role === 'teacher' のユーザーのみを対象とする
// （委員会の管理者(先生)等は既存の顧問・担任フローの対象外のため含めない）。
// =============================================
let _teacherDirectoryCache = null
export async function getTeacherDirectory() {
  if (_teacherDirectoryCache) return _teacherDirectoryCache
  const q = query(collection(db, 'users'), where('role', '==', 'teacher'))
  const snap = await getDocs(q)
  const list = snap.docs
    .map(d => ({ email: d.data().email || '', name: d.data().name || '' }))
    .filter(t => !!t.email)
  _teacherDirectoryCache = list
  return list
}
