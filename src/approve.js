import { processToken, getCase } from './cases.js'

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

  // 確認画面を先に表示（action=approve の場合）
  if (action === 'approve') {
    card.innerHTML = `
      <div class="icon">📋</div>
      <div class="ttl">公欠申請の承認確認</div>
      <div class="sub">以下の申請を承認してよろしいですか？</div>
      <div id="caseInfo" style="margin:20px 0;text-align:left">
        <div class="spinner" style="width:24px;height:24px;margin:10px auto"></div>
      </div>
      <button class="btn btn-approve" id="btnApprove" disabled>✓ 承認する</button>
      <button class="btn btn-reject" onclick="location.href=location.href.replace('action=approve','action=reject')">差し戻す</button>
    `
    const infoEl = document.getElementById('caseInfo')
    const btnApprove = document.getElementById('btnApprove')
    btnApprove.onclick = doProcess

    // ケース情報を取得して表示
    if (caseId) {
      try {
        const d = await getCase(caseId)
        if (d) {
          const datesStr = (d.dates || []).join('、')
          infoEl.innerHTML = `
            <div class="info-box" style="margin:0">
              <div class="info-row"><span class="info-key">申請者</span><span>${d.studentName}</span></div>
              <div class="info-row"><span class="info-key">件名</span><span>${d.title}</span></div>
              <div class="info-row"><span class="info-key">公欠日</span><span>${datesStr}</span></div>
            </div>`
          btnApprove.disabled = false
        } else {
          infoEl.innerHTML = '<div style="text-align:center;color:var(--enjii);font-size:13px">申請が見つかりませんでした</div>'
        }
      } catch (e) {
        infoEl.innerHTML = '<div style="text-align:center;color:var(--enjii);font-size:12px">情報の取得に失敗しました</div>'
      }
    } else {
      infoEl.innerHTML = '<div style="text-align:center;color:var(--text-3);font-size:12px">（詳細情報を表示できません）</div>'
      btnApprove.disabled = false
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
    const datesStr = (d.dates || []).join('、')
    const infoBox = `
      <div class="info-box">
        <div class="info-row"><span class="info-key">申請者</span><span>${d.studentName}</span></div>
        <div class="info-row"><span class="info-key">件名</span><span>${d.title}</span></div>
        <div class="info-row"><span class="info-key">公欠日</span><span>${datesStr}</span></div>
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
  } catch(e) {
    render('❌', 'エラーが発生しました', e.message)
  }
}

main()
