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
} from 'firebase/auth'
import {
  doc, setDoc, getDoc, serverTimestamp,
} from 'firebase/firestore'

// =============================================
// 新規登録（生徒）
// =============================================
export async function registerStudent({ email, password, name, grade, classLabel, number }) {
  // メール形式チェック（学校ドメインは任意制限・今は全ドメイン許可）
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  const uid  = cred.user.uid

  await setDoc(doc(db, 'users', uid), {
    role:    'student',
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
