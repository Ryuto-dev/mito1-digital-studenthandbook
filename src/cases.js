/**
 * src/cases.js
 * 公欠申請（ケース）の作成・取得・承認・削除ロジック
 */
import { db } from './firebase.js'
import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs, deleteDoc,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore'

// NOTE: "hundbook" might be a typo for "handbook". Please verify against the Worker deployment.
const WORKERS_URL = 'https://mito1-hundbook.asanuma-ryuto.workers.dev'
const APP_BASE    = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, '')

// =============================================
// エラーメッセージのマッピング
// =============================================
function friendlyError(e) {
  const msg = e?.message || String(e)
  if (msg.includes('Missing or insufficient permissions')) {
    return 'Firestoreのセキュリティルールで操作が拒否されました。Firebase Console でルールを更新してください（firestore.rules を参照）。'
  }
  return msg
}

// =============================================
// ランダムトークン生成
// =============================================
function genToken() {
  const arr = new Uint8Array(24)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2,'0')).join('')
}

// =============================================
// メール送信ヘルパー（エラーをキャッチして返す）
// =============================================
async function sendEmail(endpoint, payload) {
  try {
    const res = await fetch(`${WORKERS_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.warn(`[email] ${endpoint} failed (${res.status}):`, body)
      return { ok: false, status: res.status, detail: body }
    }
    return { ok: true, detail: '' }
  } catch (e) {
    console.warn(`[email] ${endpoint} network error:`, e.message)
    return { ok: false, status: 0, detail: e.message }
  }
}

// =============================================
// ケース作成 + 顧問へ承認依頼メール送信
// =============================================
export async function createCase({ studentId, studentName, studentEmail, title, reason, dates, supervisorEmail, homeRoomEmail }) {
  const approveToken = genToken()
  const rejectToken  = genToken()

  // Firestoreに保存
  const ref = await addDoc(collection(db, 'cases'), {
    studentId,
    studentName,
    studentEmail,
    title,
    reason,
    dates,                    // ["2025-06-14", "2025-06-15"]
    supervisorEmail,
    homeRoomEmail,
    status: 'pending_supervisor',
    approveToken,             // 顧問用承認トークン
    rejectToken,              // 顧問用差し戻しトークン
    homeRoomApproveToken: '', // 担任用（顧問承認後に生成）
    homeRoomRejectToken:  '',
    supervisorApprovedAt: null,
    homeRoomApprovedAt:   null,
    rejectedReason: '',
    rejectedBy: '',
    createdAt: serverTimestamp(),
  })

  // 顧問へ承認依頼メール送信
  const emailResult = await sendEmail('/send-approval', {
    caseId: ref.id,
    studentName, title, dates, reason,
    step: 'supervisor',
    recipientEmail: supervisorEmail,
    recipientRole: 'supervisor',
    approveToken,
    rejectToken,
    appBaseUrl: APP_BASE,
  })

  return { caseId: ref.id, emailSent: emailResult.ok, emailError: emailResult.detail }
}

// =============================================
// トークンで承認・差し戻し処理
// =============================================
// =============================================
// IDで単一ケース取得（承認画面用）
// =============================================
export async function getCaseById(caseId) {
  const docRef = doc(db, 'cases', caseId)
  const snap = await getDoc(docRef)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

// =============================================
// トークンで承認・差し戻し処理
// =============================================
export async function processToken(token, action, caseIdFromUrl = null) {
  // 顧問トークン or 担任トークンを検索
  const fields = [
    { field: 'approveToken',          step: 'supervisor', act: 'approve' },
    { field: 'rejectToken',           step: 'supervisor', act: 'reject'  },
    { field: 'homeRoomApproveToken',  step: 'homeroom',   act: 'approve' },
    { field: 'homeRoomRejectToken',   step: 'homeroom',   act: 'reject'  },
  ]

  let caseDoc, caseId, caseData, step, act

  if (caseIdFromUrl) {
    // caseIdがある場合は直接取得（セキュリティ的に望ましい）
    const docRef = doc(db, 'cases', caseIdFromUrl)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return { ok: false, reason: 'token_not_found' }

    caseDoc = snap
    caseId = snap.id
    caseData = snap.data()

    const match = fields.find(f => caseData[f.field] === token)
    if (!match) return { ok: false, reason: 'token_not_found' }
    step = match.step
    act = match.act
  } else {
    // 互換性のためのクエリ検索
    for (const f of fields) {
      const q = query(collection(db, 'cases'), where(f.field, '==', token))
      const snap = await getDocs(q)
      if (snap.empty) continue

      caseDoc  = snap.docs[0]
      caseId   = caseDoc.id
      caseData = caseDoc.data()
      step = f.step
      act = f.act
      break
    }
  }

  if (!caseDoc) return { ok: false, reason: 'token_not_found' }

    // 既に使用済みトークン（ステータスが進んでいる）はエラー
    if (step === 'supervisor' && caseData.status !== 'pending_supervisor') {
      return { ok: false, reason: 'already_processed', caseId }
    }
    if (step === 'homeroom' && caseData.status !== 'pending_homeroom') {
      return { ok: false, reason: 'already_processed', caseId }
    }

    if (act === 'reject' && action === 'reject') {
      // 差し戻し
      await updateDoc(doc(db, 'cases', caseId), {
        status: 'rejected',
        rejectedBy: step,
        [`${step === 'supervisor' ? 'approveToken' : 'homeRoomApproveToken'}`]: '', // トークン無効化
        [`${step === 'supervisor' ? 'rejectToken'  : 'homeRoomRejectToken'}`]:  '',
        providedToken: token, // セキュリティルールでの検証用
      })
      return { ok: true, result: 'rejected', step, caseData }
    }

    if (act === 'approve' && action === 'approve') {
      if (step === 'supervisor') {
        // 顧問承認 → 担任への依頼へ進む
        const hrApproveToken = genToken()
        const hrRejectToken  = genToken()
        await updateDoc(doc(db, 'cases', caseId), {
          status: 'pending_homeroom',
          supervisorApprovedAt: serverTimestamp(),
          approveToken: '', // 使用済み無効化
          rejectToken:  '',
          homeRoomApproveToken: hrApproveToken,
          homeRoomRejectToken:  hrRejectToken,
          providedToken: token, // セキュリティルールでの検証用
        })
        // 担任へ承認依頼メール
        await sendEmail('/send-approval', {
          caseId,
          studentName: caseData.studentName,
          title: caseData.title,
          dates: caseData.dates,
          reason: caseData.reason,
          step: 'homeroom',
          recipientEmail: caseData.homeRoomEmail,
          recipientRole: 'homeroom',
          supervisorEmail: caseData.supervisorEmail,
          approveToken: hrApproveToken,
          rejectToken:  hrRejectToken,
          appBaseUrl: APP_BASE,
        })
        return { ok: true, result: 'supervisor_approved', caseData }

      } else {
        // 担任承認 → 完了
        await updateDoc(doc(db, 'cases', caseId), {
          status: 'approved',
          homeRoomApprovedAt: serverTimestamp(),
          homeRoomApproveToken: '',
          homeRoomRejectToken:  '',
          providedToken: token, // セキュリティルールでの検証用
        })
        // 生徒へ完了通知メール
        await sendEmail('/send-complete', {
          studentEmail: caseData.studentEmail,
          studentName:  caseData.studentName,
          title: caseData.title,
          dates: caseData.dates,
          appBaseUrl: APP_BASE,
        })
        return { ok: true, result: 'approved', caseData }
      }
    }

  return { ok: false, reason: 'token_not_found' }
}

// =============================================
// ダッシュボード承認（先生がログイン状態で承認）
// =============================================
export async function approveByTeacher(caseId, step, teacherUid) {
  const caseRef  = doc(db, 'cases', caseId)
  const caseSnap = await getDoc(caseRef)
  if (!caseSnap.exists()) throw new Error('ケースが見つかりません')
  const caseData = caseSnap.data()

  if (step === 'supervisor') {
    const hrApproveToken = genToken()
    const hrRejectToken  = genToken()
    await updateDoc(caseRef, {
      status: 'pending_homeroom',
      supervisorApprovedAt: serverTimestamp(),
      supervisorUid: teacherUid,
      approveToken: '',
      rejectToken:  '',
      homeRoomApproveToken: hrApproveToken,
      homeRoomRejectToken:  hrRejectToken,
    })
    await sendEmail('/send-approval', {
      caseId,
      studentName: caseData.studentName,
      title: caseData.title,
      dates: caseData.dates,
      reason: caseData.reason,
      step: 'homeroom',
      recipientEmail: caseData.homeRoomEmail,
      recipientRole: 'homeroom',
      supervisorEmail: caseData.supervisorEmail,
      approveToken: hrApproveToken,
      rejectToken:  hrRejectToken,
      appBaseUrl: APP_BASE,
    })
  } else {
    await updateDoc(caseRef, {
      status: 'approved',
      homeRoomApprovedAt: serverTimestamp(),
      homeRoomUid: teacherUid,
      homeRoomApproveToken: '',
      homeRoomRejectToken:  '',
    })
    await sendEmail('/send-complete', {
      studentEmail: caseData.studentEmail,
      studentName:  caseData.studentName,
      title: caseData.title,
      dates: caseData.dates,
      appBaseUrl: APP_BASE,
    })
  }
}

export async function rejectByTeacher(caseId, step, reason, teacherUid) {
  await updateDoc(doc(db, 'cases', caseId), {
    status: 'rejected',
    rejectedBy: step,
    rejectedReason: reason || '',
    rejectedByUid: teacherUid,
  })
}

// =============================================
// ケース削除（生徒がマイページから取り下げ）
// 顧問承認前（pending_supervisor）のみ許可
// =============================================
export async function deleteCaseByStudent(caseId, studentId) {
  const caseRef  = doc(db, 'cases', caseId)
  const caseSnap = await getDoc(caseRef)
  if (!caseSnap.exists()) throw new Error('申請が見つかりません')

  const caseData = caseSnap.data()
  if (caseData.studentId !== studentId) {
    throw new Error('この申請を削除する権限がありません')
  }
  if (caseData.status !== 'pending_supervisor') {
    throw new Error('顧問承認後の申請は取り下げできません')
  }

  try {
    await deleteDoc(caseRef)
  } catch (e) {
    throw new Error(friendlyError(e))
  }
}

// =============================================
// ケース削除（管理者用 — ステータス制限なし）
// =============================================
export async function deleteCaseByAdmin(caseId) {
  const caseRef = doc(db, 'cases', caseId)
  const caseSnap = await getDoc(caseRef)
  if (!caseSnap.exists()) throw new Error('ケースが見つかりません')
  try {
    await deleteDoc(caseRef)
  } catch (e) {
    throw new Error(friendlyError(e))
  }
}

// =============================================
// 生徒の自分のケース一覧取得
// =============================================
export async function getMyCases(studentId) {
  const q = query(
    collection(db, 'cases'),
    where('studentId', '==', studentId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// =============================================
// 先生の担当ケース一覧（自分のメール宛）
// =============================================
export async function getTeacherCases(teacherEmail) {
  const [asSupervisor, asHomeRoom] = await Promise.all([
    getDocs(query(collection(db, 'cases'), where('supervisorEmail', '==', teacherEmail), orderBy('createdAt', 'desc'))),
    getDocs(query(collection(db, 'cases'), where('homeRoomEmail',   '==', teacherEmail), orderBy('createdAt', 'desc'))),
  ])
  const map = new Map()
  ;[...asSupervisor.docs, ...asHomeRoom.docs].forEach(d => map.set(d.id, { id: d.id, ...d.data() }))
  return [...map.values()].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
}

// =============================================
// 管理者：全ケース取得
// =============================================
export async function getAllCases() {
  const snap = await getDocs(query(collection(db, 'cases'), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
