import{j as u,l as b}from"./firebase--zY0ciXM.js";import{f as y,g as h,p as g}from"./cases-DGaBOMY4.js";const f=new URLSearchParams(location.search);let s=f.get("caseId");const r=f.get("token"),v=f.get("action")||"approve",p=document.getElementById("card");function i(a,e,t,n=""){p.innerHTML=`
    <div class="icon">${a}</div>
    <div class="ttl">${e}</div>
    <div class="sub">${t}</div>
    ${n}
  `}async function x(){if(!r){i("❌","リンクが無効です","承認リンクが正しくありません。<br>メールのリンクを再度ご確認ください。");return}if(!s)try{const t=await fetch(`https://mito1-hundbook.asanuma-ryuto.workers.dev/resolve-token?token=${encodeURIComponent(r)}`);if(t.ok){const n=await t.json();if(n.caseId){s=n.caseId;const o=new URL(location.href);o.searchParams.set("caseId",s),history.replaceState(null,"",o.toString())}}}catch(e){console.warn("Worker resolve-token failed, trying auth fallback:",e)}if(!s&&await new Promise(t=>{const n=u(b,o=>{n(),t(o)})}))try{if(s=await y(r),s){const t=new URL(location.href);t.searchParams.set("caseId",s),history.replaceState(null,"",t.toString())}}catch(t){console.warn("Failed to find caseId by token:",t)}if(!s){i("❌","ケースIDを特定できません",'このリンクからケースを特定できませんでした。<br><a href="/teacher.html" style="color:#1a2744;font-weight:600">先生用ダッシュボード</a>からログインして承認してください。');return}let a=null;try{a=await h(s)}catch(e){console.warn("Failed to fetch case info:",e)}if(v==="approve"){let e="";a?e=`
        <div class="info-box" style="margin:16px 0">
          <div class="info-row"><span class="info-key">申請者</span><span id="caseStudentName"></span></div>
          <div class="info-row"><span class="info-key">件名</span><span id="caseTitle"></span></div>
          <div class="info-row"><span class="info-key">公欠日</span><span id="caseDates"></span></div>
        </div>`:e='<div style="margin:16px 0;color:var(--enjii)">申請情報の詳細が取得できませんでしたが、承認処理は可能です。</div>',p.innerHTML=`
      <div class="icon">📋</div>
      <div class="ttl">公欠申請の承認確認</div>
      <div class="sub">以下の申請を承認してよろしいですか？</div>
      <div id="caseInfo">${e}</div>
      <button class="btn btn-approve" id="btnApprove">✓ 承認する</button>
      <button class="btn btn-reject" id="btnReject">差し戻す</button>
      <div id="rejectReasonWrap" style="display:none;margin-top:12px">
        <textarea id="rejectReasonInput" placeholder="差し戻し理由（任意）" rows="3"
          style="width:100%;border:1.5px solid #e2e2de;border-radius:8px;padding:10px 12px;font-size:13px;font-family:inherit;resize:vertical;margin-bottom:8px"></textarea>
        <button class="btn btn-reject" id="btnRejectConfirm">差し戻しを確定する</button>
      </div>
    `,a&&(document.getElementById("caseStudentName").textContent=a.studentName,document.getElementById("caseTitle").textContent=a.title,document.getElementById("caseDates").textContent=(a.dates||[]).join("、")),document.getElementById("btnApprove").onclick=()=>l("approve"),document.getElementById("btnReject").onclick=()=>{document.getElementById("rejectReasonWrap").style.display="",document.getElementById("btnReject").style.display="none"},document.getElementById("btnRejectConfirm").onclick=()=>l("reject")}else if(v==="reject"){let e="";a&&(e=`
        <div class="info-box" style="margin:16px 0">
          <div class="info-row"><span class="info-key">申請者</span><span>${a.studentName||""}</span></div>
          <div class="info-row"><span class="info-key">件名</span><span>${a.title||""}</span></div>
          <div class="info-row"><span class="info-key">公欠日</span><span>${(a.dates||[]).join("、")}</span></div>
        </div>`),p.innerHTML=`
      <div class="icon">⚠️</div>
      <div class="ttl">申請を差し戻しますか？</div>
      <div class="sub">この操作は取り消せません。</div>
      ${e}
      <textarea id="rejectReasonInput" placeholder="差し戻し理由（任意）" rows="3"
        style="width:100%;border:1.5px solid #e2e2de;border-radius:8px;padding:10px 12px;font-size:13px;font-family:inherit;resize:vertical;margin-bottom:12px"></textarea>
      <button class="btn btn-reject" id="btnRejectConfirm">差し戻す</button>
      <button class="btn btn-back" id="btnCancel" style="margin-top:4px">キャンセル</button>
    `,document.getElementById("btnRejectConfirm").onclick=()=>l("reject"),document.getElementById("btnCancel").onclick=()=>{const t=new URL(location.href);t.searchParams.set("action","approve"),location.href=t.toString()}}}async function l(a){const e=document.getElementById("btnApprove")||document.getElementById("btnRejectConfirm");e&&(e.disabled=!0,e.textContent="処理中...");const t=document.getElementById("btnReject");t&&(t.disabled=!0);try{const n=await g(r,a,s);if(!n.ok){n.reason==="already_processed"?i("⚠️","すでに処理済みです","この申請はすでに処理されています。<br>ダッシュボードで最新の状況をご確認ください。",'<a class="btn btn-back" style="display:block;margin-top:16px;text-decoration:none;padding:13px;border-radius:10px" href="/teacher.html">ダッシュボードへ</a>'):i("❌","リンクが無効です",'このリンクは有効期限切れか、すでに使用されています。<br><a href="/teacher.html" style="color:#1a2744;font-weight:600">先生用ダッシュボード</a>から操作してください。');return}const o=n.caseData,m="infoBox_"+Date.now(),d=`
      <div class="info-box" id="${m}">
        <div class="info-row"><span class="info-key">申請者</span><span class="val-name"></span></div>
        <div class="info-row"><span class="info-key">件名</span><span class="val-title"></span></div>
        <div class="info-row"><span class="info-key">公欠日</span><span class="val-dates"></span></div>
      </div>`;n.result==="rejected"?i("🔴","申請を差し戻しました","生徒に通知されます。",d):n.result==="supervisor_approved"?i("✅","顧問承認が完了しました","担任の先生に承認依頼メールを送信しました。",d):n.result==="approved"&&i("🎉","公欠申請が承認されました","顧問・担任の両方の承認が完了し、<br>生徒に完了通知を送信しました。",d);const c=document.getElementById(m);c&&(c.querySelector(".val-name").textContent=o.studentName,c.querySelector(".val-title").textContent=o.title,c.querySelector(".val-dates").textContent=(o.dates||[]).join("、"))}catch(n){i("❌","エラーが発生しました",n.message)}}x();
