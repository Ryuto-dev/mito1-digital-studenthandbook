import{l as u}from"./firebase--zY0ciXM.js";import{o as b,c as y,g as $}from"./auth-sQCKFxHS.js";import{a as w,r as E,b as m}from"./cases-DGaBOMY4.js";const L={pending_supervisor:"顧問承認待ち",pending_homeroom:"担任承認待ち",approved:"承認済み",rejected:"差し戻し"};let d="all",i=[],n=null;b(async t=>{if(!t){location.href="/auth.html";return}try{n=await $(t),n||(n={uid:t.uid,email:t.email,name:t.email,role:"teacher"}),document.getElementById("headerName").textContent=`${n.name} 先生`,await c()}catch(a){console.error("Teacher page init error:",a),document.getElementById("caseList").innerHTML=`<div class="empty">読み込みに失敗しました: ${a.message}<br><br><button onclick="location.reload()" style="padding:8px 16px;cursor:pointer">再読み込み</button></div>`}});async function c(){document.getElementById("caseList").innerHTML='<div class="loading-wrap"><span class="spinner"></span>読み込み中...</div>';try{const t=u.currentUser?.email,a=n.email;if(i=await m(a),t&&t!==a){const e=await m(t),r=new Set(i.map(s=>s.id));e.forEach(s=>{r.has(s.id)||i.push(s)}),i.sort((s,o)=>(o.createdAt?.seconds||0)-(s.createdAt?.seconds||0))}v()}catch(t){console.error("loadCases error:",t),document.getElementById("caseList").innerHTML=`<div class="empty">申請の読み込みに失敗しました: ${t.message}<br><br><button onclick="location.reload()" style="padding:8px 16px;cursor:pointer">再読み込み</button></div>`}}function v(){const t=d==="all"?i:i.filter(e=>e.status===d),a=document.getElementById("caseList");if(!t.length){a.innerHTML='<div class="empty">該当する申請はありません</div>';return}a.innerHTML=t.map(e=>{const r=(e.dates||[]).join("、"),s=u.currentUser?.email,o=e.supervisorEmail===n.email||e.supervisorEmail===s;e.homeRoomEmail===n.email||e.homeRoomEmail;const g=o?"顧問":"担任",h=o&&e.status==="pending_supervisor"||!o&&e.status==="pending_homeroom",f=A(e),p=h?`
      <button class="btn-approve" onclick="handleApprove('${e.id}','${o?"supervisor":"homeroom"}')">
        ✓ 承認する
      </button>
      <button class="btn-reject" onclick="handleReject('${e.id}','${o?"supervisor":"homeroom"}')">
        差し戻す
      </button>`:"";return`
      <div class="case-card">
        <div class="case-head">
          <div style="flex:1">
            <div class="case-badges">
              <span class="badge badge-${e.status}">${L[e.status]||e.status}</span>
              <span class="badge badge-role">${g}として</span>
            </div>
            <div class="case-title">${l(e.title)}</div>
            <div class="case-meta">
              <span>申請者: ${l(e.studentName)}</span>
              <span>${l(e.reasonDetail?e.reason+"（"+e.reasonDetail+"）":e.reason||"")}</span>
              <span>${e.createdAt?.toDate?e.createdAt.toDate().toLocaleDateString("ja"):""}</span>
            </div>
            <div class="case-dates">📅 ${l(r)}</div>
            ${f}
          </div>
        </div>
        ${p?`<div class="case-actions">${p}</div>`:""}
      </div>`}).join("")}function A(t){return`<div style="margin-top:12px">
    <div class="progress">
      ${[{label:"申請",done:!0},{label:"顧問承認",done:["pending_homeroom","approved"].includes(t.status),active:t.status==="pending_supervisor"},{label:"担任承認",done:t.status==="approved",active:t.status==="pending_homeroom"},{label:"完了",done:t.status==="approved"}].map(e=>`
        <div class="prog-step ${e.done?"done":e.active?"active":""}">
          <div class="prog-line ${e.done?"done":e.active?"active":""}"></div>
          ${e.label}
        </div>`).join("")}
    </div>
  </div>`}window.setFilter=function(t,a){d=t,document.querySelectorAll(".filter-btn").forEach(e=>e.classList.remove("on")),a.classList.add("on"),v()};window.handleApprove=async function(t,a){if(confirm("この申請を承認しますか？"))try{await w(t,a,n.uid),await c()}catch(e){alert("エラー: "+e.message)}};window.handleReject=async function(t,a){const e=prompt("差し戻し理由を入力してください（任意）");if(e!==null)try{await E(t,a,e,n.uid),await c()}catch(r){alert("エラー: "+r.message)}};window.doLogout=async function(){await y(),location.href="/auth.html"};function l(t){return String(t||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
