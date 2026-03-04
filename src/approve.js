import { processToken, getCaseById } from './cases.js'

const params = new URLSearchParams(location.search)
const caseId = params.get('caseId')
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

  // caseId があれば情報を取得して表示
  let caseData = null
  if (caseId) {
    try {
      caseData = await getCaseById(caseId)
    } catch (e) {
      console.warn('Failed to fetch case info:', e)
    }
  }

  // 確認画面を先に表示（action=approve の場合）
  if (action === 'approve') {
    let infoHtml = '確認中...'
    if (caseData) {
      const datesStr = (caseData.dates || []).join('、')
      infoHtml = `
        <div class="info-box" style="margin:16px 0">
          <div class="info-row"><span class="info-key">申請者</span><span id="caseStudentName"></span></div>
          <div class="info-row"><span class="info-key">件名</span><span id="caseTitle"></span></div>
          <div class="info-row"><span class="info-key">公欠日</span><span id="caseDates"></span></div>
        </div>`
    } else if (caseId) {
      infoHtml = '<div style="margin:16px 0;color:var(--enjii)">申請情報が見つかりませんでした</div>'
    }

    card.innerHTML = `
      <div class="icon">📋</div>
      <div class="ttl">公欠申請の承認確認</div>
      <div class="sub">以下の申請を承認してよろしいですか？</div>
      <div id="caseInfo">${infoHtml}</div>
      <button class="btn btn-approve" id="btnApprove">✓ 承認する</button>
      <button class="btn btn-reject" id="btnReject">差し戻す</button>
    `
    if (caseData) {
      document.getElementById('caseStudentName').textContent = caseData.studentName
      document.getElementById('caseTitle').textContent = caseData.title
      document.getElementById('caseDates').textContent = (caseData.dates || []).join('、')
    }

    document.getElementById('btnApprove').onclick = doProcess
    document.getElementById('btnReject').onclick = () => {
      const url = new URL(location.href)
      url.searchParams.set('action', 'reject')
      location.href = url.toString()
    }
  } else {
    // reject は確認なしで処理
    doProcess()
  }
}

async function doProcess() {
  const btn = document.getElementById('btnApprove')
  if (btn) { btn.disabled = true; btn.textContent = '処理中...' }

  try {
    const result = await processToken(token, action, caseId)

    if (!result.ok) {
      if (result.reason === 'already_processed') {
        render('⚠️', 'すでに処理済みです',
          'この申請はすでに処理されています。<br>ダッシュボードで最新の状況をご確認ください。',
          `<a class="btn btn-back" style="display:block;margin-top:16px;text-decoration:none;padding:13px;border-radius:10px" href="/mito1-digital-studenthandbook/auth.html">ダッシュボードへ</a>`)
      } else {
        render('❌', 'リンクが無効です', 'このリンクは有効期限切れか、すでに使用されています。')
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
      const box = document.getElementById(infoBoxId)
      box.querySelector('.val-name').textContent = d.studentName
      box.querySelector('.val-title').textContent = d.title
      box.querySelector('.val-dates').textContent = (d.dates || []).join('、')
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
