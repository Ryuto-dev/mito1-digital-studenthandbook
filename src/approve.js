import { processToken, getCaseById, findCaseIdByToken } from './cases.js'
import { auth } from './firebase.js'
import { onAuthStateChanged } from 'firebase/auth'

const params = new URLSearchParams(location.search)
let caseId = params.get('caseId')
const token  = params.get('token')
const action = params.get('action') || 'approve'

const card = document.getElementById('card')

function render(icon, title, sub, extra = '') {
  card.innerHTML = `
    <div class="icon">${icon}</div>
    <div class="ttl">${title}</div>
    <div class="sub">${sub}</div>
    ${extra}
  `
}

async function main() {
  if (!token) {
    render('❌', 'リンクが無効です', '承認リンクが正しくありません。<br>メールのリンクを再度ご確認ください。')
    return
  }

  // caseId が URL にない場合、Workers API でトークンから検索を試みる
  if (!caseId) {
    try {
      const workerUrl = 'https://mito1-hundbook.asanuma-ryuto.workers.dev'
      const res = await fetch(`${workerUrl}/resolve-token?token=${encodeURIComponent(token)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.caseId) {
          caseId = data.caseId
          // URL に caseId を追加
          const url = new URL(location.href)
          url.searchParams.set('caseId', caseId)
          history.replaceState(null, '', url.toString())
        }
      }
    } catch (e) {
      console.warn('Worker resolve-token failed, trying auth fallback:', e)
    }
  }

  // それでもなければログイン状態でFirestore直接検索
  if (!caseId) {
    const user = await new Promise(resolve => {
      const unsub = onAuthStateChanged(auth, u => { unsub(); resolve(u) })
    })
    if (user) {
      try {
        caseId = await findCaseIdByToken(token)
        if (caseId) {
          const url = new URL(location.href)
          url.searchParams.set('caseId', caseId)
          history.replaceState(null, '', url.toString())
        }
      } catch (e) {
        console.warn('Failed to find caseId by token:', e)
      }
    }
  }

  if (!caseId) {
    render('❌', 'ケースIDを特定できません',
      'このリンクからケースを特定できませんでした。<br>' +
      '<a href="/teacher.html" style="color:#1a2744;font-weight:600">先生用ダッシュボード</a>からログインして承認してください。')
    return
  }

  // caseId があれば情報を取得して表示
  let caseData = null
  try {
    caseData = await getCaseById(caseId)
  } catch (e) {
    console.warn('Failed to fetch case info:', e)
  }

  // 確認画面を先に表示（action=approve の場合）
  if (action === 'approve') {
    let infoHtml = ''
    if (caseData) {
      infoHtml = `
        <div class="info-box" style="margin:16px 0">
          <div class="info-row"><span class="info-key">申請者</span><span id="caseStudentName"></span></div>
          <div class="info-row"><span class="info-key">件名</span><span id="caseTitle"></span></div>
          <div class="info-row"><span class="info-key">公欠日</span><span id="caseDates"></span></div>
        </div>`
    } else {
      infoHtml = '<div style="margin:16px 0;color:var(--enjii)">申請情報の詳細が取得できませんでしたが、承認処理は可能です。</div>'
    }

    card.innerHTML = `
      <div class="icon">📋</div>
      <div class="ttl">公欠申請の承認確認</div>
      <div class="sub">以下の申請を承認してよろしいですか？</div>
      <div id="caseInfo">${infoHtml}</div>
      <button class="btn btn-approve" id="btnApprove">✓ 承認する</button>
      <button class="btn btn-reject" id="btnReject">差し戻す</button>
      <div id="rejectReasonWrap" style="display:none;margin-top:12px">
        <textarea id="rejectReasonInput" placeholder="差し戻し理由（任意）" rows="3"
          style="width:100%;border:1.5px solid #e2e2de;border-radius:8px;padding:10px 12px;font-size:13px;font-family:inherit;resize:vertical;margin-bottom:8px"></textarea>
        <button class="btn btn-reject" id="btnRejectConfirm">差し戻しを確定する</button>
      </div>
    `
    if (caseData) {
      document.getElementById('caseStudentName').textContent = caseData.studentName
      document.getElementById('caseTitle').textContent = caseData.title
      document.getElementById('caseDates').textContent = (caseData.dates || []).join('、')
    }

    document.getElementById('btnApprove').onclick = () => doProcess('approve')
    document.getElementById('btnReject').onclick = () => {
      document.getElementById('rejectReasonWrap').style.display = ''
      document.getElementById('btnReject').style.display = 'none'
    }
    document.getElementById('btnRejectConfirm').onclick = () => doProcess('reject')
  } else if (action === 'reject') {
    // reject 確認画面
    let infoHtml = ''
    if (caseData) {
      infoHtml = `
        <div class="info-box" style="margin:16px 0">
          <div class="info-row"><span class="info-key">申請者</span><span>${caseData.studentName || ''}</span></div>
          <div class="info-row"><span class="info-key">件名</span><span>${caseData.title || ''}</span></div>
          <div class="info-row"><span class="info-key">公欠日</span><span>${(caseData.dates || []).join('、')}</span></div>
        </div>`
    }
    card.innerHTML = `
      <div class="icon">⚠️</div>
      <div class="ttl">申請を差し戻しますか？</div>
      <div class="sub">この操作は取り消せません。</div>
      ${infoHtml}
      <textarea id="rejectReasonInput" placeholder="差し戻し理由（任意）" rows="3"
        style="width:100%;border:1.5px solid #e2e2de;border-radius:8px;padding:10px 12px;font-size:13px;font-family:inherit;resize:vertical;margin-bottom:12px"></textarea>
      <button class="btn btn-reject" id="btnRejectConfirm">差し戻す</button>
      <button class="btn btn-back" id="btnCancel" style="margin-top:4px">キャンセル</button>
    `
    document.getElementById('btnRejectConfirm').onclick = () => doProcess('reject')
    document.getElementById('btnCancel').onclick = () => {
      const url = new URL(location.href)
      url.searchParams.set('action', 'approve')
      location.href = url.toString()
    }
  }
}

async function doProcess(processAction) {
  const btn = document.getElementById('btnApprove') || document.getElementById('btnRejectConfirm')
  if (btn) { btn.disabled = true; btn.textContent = '処理中...' }
  const rejectBtn = document.getElementById('btnReject')
  if (rejectBtn) { rejectBtn.disabled = true }

  try {
    const result = await processToken(token, processAction, caseId)

    if (!result.ok) {
      if (result.reason === 'already_processed') {
        render('⚠️', 'すでに処理済みです',
          'この申請はすでに処理されています。<br>ダッシュボードで最新の状況をご確認ください。',
          `<a class="btn btn-back" style="display:block;margin-top:16px;text-decoration:none;padding:13px;border-radius:10px" href="/teacher.html">ダッシュボードへ</a>`)
      } else {
        render('❌', 'リンクが無効です', 'このリンクは有効期限切れか、すでに使用されています。<br>' +
          '<a href="/teacher.html" style="color:#1a2744;font-weight:600">先生用ダッシュボード</a>から操作してください。')
      }
      return
    }

    const d = result.caseData
    const infoBoxId = 'infoBox_' + Date.now()
    const infoBox = `
      <div class="info-box" id="${infoBoxId}">
        <div class="info-row"><span class="info-key">申請者</span><span class="val-name"></span></div>
        <div class="info-row"><span class="info-key">件名</span><span class="val-title"></span></div>
        <div class="info-row"><span class="info-key">公欠日</span><span class="val-dates"></span></div>
      </div>`

    if (result.result === 'rejected') {
      render('🔴', '申請を差し戻しました', '生徒に通知されます。', infoBox)
    } else if (result.result === 'supervisor_approved') {
      render('✅', '顧問承認が完了しました',
        '担任の先生に承認依頼メールを送信しました。', infoBox)
    } else if (result.result === 'approved') {
      render('🎉', '公欠申請が承認されました',
        '顧問・担任の両方の承認が完了し、<br>生徒に完了通知を送信しました。', infoBox)
    }

    const box = document.getElementById(infoBoxId)
    if (box) {
      box.querySelector('.val-name').textContent = d.studentName
      box.querySelector('.val-title').textContent = d.title
      box.querySelector('.val-dates').textContent = (d.dates || []).join('、')
    }
  } catch(e) {
    render('❌', 'エラーが発生しました', e.message)
  }
}

main()
