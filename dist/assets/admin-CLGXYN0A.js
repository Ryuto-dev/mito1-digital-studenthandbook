const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/roles-D6yFixml.js","assets/firebase--zY0ciXM.js"])))=>i.map(i=>d[i]);
import{j as de,k as ne,l as H,m as ce,q,o as j,c as x,b as p,e as h,g as B,d as m,p as O,u as L,f as pe,a as U}from"./firebase--zY0ciXM.js";import{g as ue}from"./auth-sQCKFxHS.js";import{b as ve,R as V,d as S,e as me,f as A,g as R,h as ge,i as ye,j as ae,k as oe,l as fe,m as xe,n as G}from"./roles-D6yFixml.js";const be="modulepreload",he=function(e){return"/"+e},Y={},we=function(t,n,o){let i=Promise.resolve();if(n&&n.length>0){let c=function(d){return Promise.all(d.map(l=>Promise.resolve(l).then(f=>({status:"fulfilled",value:f}),f=>({status:"rejected",reason:f}))))};document.getElementsByTagName("link");const a=document.querySelector("meta[property=csp-nonce]"),r=a?.nonce||a?.getAttribute("nonce");i=c(n.map(d=>{if(d=he(d),d in Y)return;Y[d]=!0;const l=d.endsWith(".css"),f=l?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${d}"]${f}`))return;const v=document.createElement("link");if(v.rel=l?"stylesheet":be,l||(v.as="script"),v.crossOrigin="",v.href=d,r&&v.setAttribute("nonce",r),document.head.appendChild(v),l)return new Promise((_,w)=>{v.addEventListener("load",_),v.addEventListener("error",()=>w(new Error(`Unable to preload CSS for ${d}`)))})}))}function s(a){const r=new Event("vite:preloadError",{cancelable:!0});if(r.payload=a,window.dispatchEvent(r),!r.defaultPrevented)throw a}return i.then(a=>{for(const r of a||[])r.status==="rejected"&&s(r.reason);return t().catch(s)})};let J="dashboard",D=null,C=null,y=null;document.addEventListener("DOMContentLoaded",()=>{document.getElementById("loginBtn")?.addEventListener("click",K),document.getElementById("loginPass")?.addEventListener("keydown",e=>{e.key==="Enter"&&K()}),document.getElementById("logoutBtnEl")?.addEventListener("click",Be),document.querySelectorAll(".adm-sb-item[data-sec]").forEach(e=>{e.addEventListener("click",()=>Q(e.dataset.sec))}),document.querySelectorAll("[data-add]").forEach(e=>{e.addEventListener("click",()=>X(e.dataset.add))}),document.getElementById("modalSaveBtn")?.addEventListener("click",je),document.getElementById("modalCancelBtn")?.addEventListener("click",k),document.getElementById("modalCloseBtn")?.addEventListener("click",k),document.getElementById("modalOverlay")?.addEventListener("click",e=>{e.target===e.currentTarget&&k()}),document.addEventListener("click",e=>{const t=e.target.closest("[data-edit],[data-delete],[data-nav],[data-save-action]");if(t){if(t.dataset.edit){const[n,o]=t.dataset.edit.split("|");X(n,o)}if(t.dataset.delete){const[n,o]=t.dataset.delete.split("|");Re(n,o)}t.dataset.nav&&Q(t.dataset.nav),t.dataset.saveAction==="goals"&&re(),t.dataset.saveAction==="council-activities"&&ie(),t.dataset.saveAction==="special-desc"&&Te(),t.dataset.saveAction==="charter-preamble"&&qe()}})});de(H,async e=>{if(e){const t=await ue(e);if(!t||!ve(t.role)){document.getElementById("loginErr").textContent="この機能は委員会メンバー（モデレーター以上）のみアクセスできます",document.getElementById("loginScreen").classList.remove("hide"),document.getElementById("appShell").classList.remove("show"),await ne(H);return}y=t,document.getElementById("loginScreen").classList.add("hide"),document.getElementById("appShell").classList.add("show"),document.getElementById("headerUser").textContent=`${e.email}（${V[t.role]||t.role}）`,Ee(),P("dashboard"),$e()}else y=null,document.getElementById("loginScreen").classList.remove("hide"),document.getElementById("appShell").classList.remove("show")});function Ee(){if(!y)return;const e=y.role,t=document.querySelector('.adm-sb-item[data-sec="cases"]');t&&(t.style.display=S(e)?"":"none");const n=document.querySelector('.adm-sb-item[data-sec="users"]');n&&(n.style.display=me(e)?"":"none")}async function K(){const e=document.getElementById("loginEmail").value.trim(),t=document.getElementById("loginPass").value,n=document.getElementById("loginBtn"),o=document.getElementById("loginErr");o.textContent="",n.disabled=!0;try{const i=await ce(H,e,t)}catch(i){const s={"auth/invalid-credential":"メールアドレスまたはパスワードが違います","auth/user-not-found":"ユーザーが見つかりません","auth/wrong-password":"パスワードが違います","auth/invalid-email":"メールアドレスの形式が正しくありません"};o.textContent=s[i.code]||"ログインに失敗しました（"+i.code+"）",n.disabled=!1}}async function Be(){await ne(H)}function Q(e){J=e,document.querySelectorAll(".adm-section").forEach(t=>t.classList.remove("on")),document.querySelectorAll(".adm-sb-item").forEach(t=>t.classList.remove("on")),document.getElementById("sec-"+e)?.classList.add("on"),document.querySelector(`.adm-sb-item[data-sec="${e}"]`)?.classList.add("on"),P(e)}async function P(e){switch(e){case"dashboard":return _e();case"history":return E("history",Ie);case"principals":return E("principals",Le);case"goals":return Se();case"songs":return E("songs",ze);case"rules":return E("rules",T("rulesList"));case"special":return Promise.all([E("special",T("specialList")),Ae()]);case"curriculum":return E("curriculum",Me);case"events":return E("events",Ce);case"council-activities":return ke();case"council-charter":return Promise.all([E("council-charter",T("councilCharterList")),He()]);case"council-rules":return E("council-rules",T("councilRulesList"));case"inquiries":return loadInquiries();case"cases":return S(y?.role)?loadAdminCases():le();case"users":return F()}}async function E(e,t){const n=q(x(p,e),j("order","asc"));try{const i=(await h(n)).docs.map(s=>({id:s.id,...s.data()}));t(i)}catch{const s=(await h(x(p,e))).docs.map(a=>({id:a.id,...a.data()}));t(s)}}function u(e){const t=document.getElementById("toast");t.textContent=e,t.classList.add("show"),setTimeout(()=>t.classList.remove("show"),2500)}function z(e="まだデータがありません"){return`<div class="empty-state">
    <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    <p>${e}</p>
  </div>`}async function _e(){const e=document.getElementById("dashGrid"),t={rules:{bg:"#1a2744",svg:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'},special:{bg:"#6c3483",svg:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>'},events:{bg:"#2471a3",svg:'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'},history:{bg:"#1e8449",svg:'<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'},principals:{bg:"#d4ac0d",svg:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'},songs:{bg:"#cb4335",svg:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'},curriculum:{bg:"#117a65",svg:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>'},"council-charter":{bg:"#8b1a2c",svg:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'},"council-rules":{bg:"#7d6608",svg:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'}},n=[{col:"rules",label:"諸規定（本則）",sec:"rules",unit:"条"},{col:"special",label:"特別教育活動",sec:"special",unit:"条"},{col:"events",label:"年間主要行事",sec:"events",unit:"件"},{col:"history",label:"本校の沿革",sec:"history",unit:"件"},{col:"principals",label:"歴代校長",sec:"principals",unit:"名"},{col:"songs",label:"歌詞",sec:"songs",unit:"曲"},{col:"curriculum",label:"教育課程",sec:"curriculum",unit:"科目"},{col:"council-charter",label:"知道生徒会憲章",sec:"council-charter",unit:"条"},{col:"council-rules",label:"生徒会関係諸規定",sec:"council-rules",unit:"条"}],o=await Promise.all(n.map(d=>h(x(p,d.col)).then(l=>l.size).catch(()=>0))),i=S(y?.role);let s=0,a=0,r=0;try{const d=[h(x(p,"inquiries")),h(x(p,"users"))];i&&d.splice(1,0,h(x(p,"cases")));const l=await Promise.all(d),f=l[0],v=i?l[1]:null,_=i?l[2]:l[1];s=f.docs.filter(w=>w.data().status==="new").length,v&&(a=v.docs.filter(w=>["pending_supervisor","pending_homeroom"].includes(w.data().status)).length),r=_.size}catch{}const c=o.reduce((d,l)=>d+l,0);e.innerHTML=`
    <div class="dash-welcome">
      <div class="dash-welcome-title">管理者ダッシュボード</div>
      <div class="dash-welcome-sub">水戸第一高等学校 デジタル生徒手帳の全コンテンツを管理できます</div>
    </div>

    <div class="dash-summary">
      <div class="dash-summary-card">
        <div class="dash-summary-icon" style="background:linear-gradient(135deg,#1a2744,#253a78)">
          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div class="dash-summary-info">
          <div class="dash-summary-num">${c}</div>
          <div class="dash-summary-label">全コンテンツ数</div>
        </div>
      </div>
      <div class="dash-summary-card" style="cursor:pointer" data-nav="inquiries">
        <div class="dash-summary-icon" style="background:linear-gradient(135deg,#c0392b,#e74c3c)">
          <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div class="dash-summary-info">
          <div class="dash-summary-num">${s}</div>
          <div class="dash-summary-label">未対応のお問い合わせ</div>
        </div>
      </div>
      ${i?`
      <div class="dash-summary-card" style="cursor:pointer" data-nav="cases">
        <div class="dash-summary-icon" style="background:linear-gradient(135deg,#856404,#d4ac0d)">
          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
        </div>
        <div class="dash-summary-info">
          <div class="dash-summary-num">${a}</div>
          <div class="dash-summary-label">承認待ち公欠申請</div>
        </div>
      </div>`:""}
      <div class="dash-summary-card" style="cursor:pointer" data-nav="users">
        <div class="dash-summary-icon" style="background:linear-gradient(135deg,#1e8449,#27ae60)">
          <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div class="dash-summary-info">
          <div class="dash-summary-num">${r}</div>
          <div class="dash-summary-label">登録ユーザー</div>
        </div>
      </div>
    </div>

    <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:12px;padding-left:2px">コンテンツ管理</div>
    <div class="dash-grid" style="margin-bottom:0">
      ${n.map((d,l)=>{const f=t[d.col]||t.rules;return`
          <div class="dash-card">
            <div class="dash-card-top">
              <div class="dash-card-icon" style="background:${f.bg}">
                <svg viewBox="0 0 24 24">${f.svg}</svg>
              </div>
              <div class="dash-card-info">
                <div class="dash-card-num">${o[l]}</div>
                <div class="dash-card-label">${d.label}</div>
              </div>
            </div>
            <div class="dash-card-bottom">
              <span class="dash-card-link" data-nav="${d.sec}">管理する <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></span>
              <span class="dash-card-tag">${o[l]}${d.unit}</span>
            </div>
          </div>`}).join("")}
    </div>
  `}async function $e(){try{const t=(await h(q(x(p,"inquiries"),j("createdAt","desc")))).docs.filter(o=>o.data().status==="new").length,n=document.getElementById("inquiryBadge");n&&(n.textContent=t,n.style.display=t?"":"none")}catch{}if(S(y?.role))try{const t=(await h(q(x(p,"cases"),j("createdAt","desc")))).docs.filter(o=>["pending_supervisor","pending_homeroom"].includes(o.data().status)).length,n=document.getElementById("casesBadge");n&&(n.textContent=t,n.style.display=t?"":"none")}catch{}}function Ie(e){const t=document.getElementById("historyList");if(!e.length){t.innerHTML=z();return}t.innerHTML=e.map(n=>`
    <div class="history-row">
      <div class="history-year-cell">${n.year||""}</div>
      <div class="history-event-cell">${n.event||""}</div>
      <div class="item-actions">
        <button class="btn-icon" data-edit="history|${n.id}">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon del" data-delete="history|${n.id}">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>
      </div>
    </div>
  `).join("")}function Le(e){const t=document.getElementById("principalsList");if(!e.length){t.innerHTML=z();return}t.innerHTML=e.map(n=>`
    <div class="history-row" style="grid-template-columns:60px 1fr 1fr auto">
      <div><span class="item-num">${n.gen||""}</span></div>
      <div class="history-event-cell">${n.name||""}</div>
      <div class="history-year-cell">${n.term||""}</div>
      <div class="item-actions">
        <button class="btn-icon" data-edit="principals|${n.id}">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon del" data-delete="principals|${n.id}">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    </div>
  `).join("")}async function Se(){const e=document.getElementById("goalsForm"),n=(await B(m(p,"content","goals")).catch(()=>null))?.data()||{};e.innerHTML=`
    <div class="form-row">
      <label>校是の画像URL</label>
      <input type="text" id="goalsImgUrl" value="${n.imageUrl||""}" placeholder="https://...">
    </div>
    <div class="form-row">
      <label>就学の目標（本文）</label>
      <textarea id="goalsText" rows="8" placeholder="目標の内容を入力...">${n.text||""}</textarea>
    </div>
    <button class="btn-save" style="margin-top:8px" data-save-action="goals">保存</button>
  `}async function re(){const e=document.getElementById("goalsImgUrl").value.trim(),t=document.getElementById("goalsText").value.trim();await O(m(p,"content","goals"),{imageUrl:e,text:t}),u("就学の目標を保存しました")}function ze(e){const t=document.getElementById("songsList");if(!e.length){t.innerHTML=z();return}t.innerHTML=e.map(n=>`
    <div class="item-card">
      <div class="item-card-header">
        <span class="item-num">${n.type||"校歌"}</span>
        <span class="item-title">${n.title||""}</span>
        <div class="item-actions">
          <button class="btn-icon" data-edit="songs|${n.id}">
            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon del" data-delete="songs|${n.id}">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </div>
      <div class="item-card-body">
        <div class="item-body-text" style="white-space:pre-wrap">${(n.verses||[]).map((o,i)=>`${i+1}番
${o}`).join(`

`)}</div>
      </div>
    </div>
  `).join("")}function T(e){const n={rulesList:"rules",specialList:"special",councilCharterList:"council-charter",councilRulesList:"council-rules"}[e]||e.replace("List","");return function(o){const i=document.getElementById(e);if(!o.length){i.innerHTML=z();return}i.innerHTML=o.map(s=>`
      <div class="item-card">
        <div class="item-card-header">
          <span class="item-num">${s.number||""}</span>
          <span class="item-title">${s.title||""}</span>
          ${s.section?`<span style="font-size:10px;color:var(--navy);background:rgba(26,39,68,.07);padding:2px 7px;border-radius:4px;margin-left:4px">${s.section}</span>`:""}
          <div class="item-actions">
            <button class="btn-icon" data-edit="${n}|${s.id}">
              <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon del" data-delete="${n}|${s.id}">
              <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </div>
        </div>
        <div class="item-card-body">
          <div class="item-body-text">${s.body||""}</div>
          ${(s.items||[]).length?`<div style="margin-top:8px;font-size:12px;color:var(--text-3)">${s.items.filter(a=>!/^[\s\t　]+/.test(a)&&!/^[ア-ン][\s　.]/.test(a.trim())).length}項あり${s.items.some(a=>/^[\s\t　]+/.test(a)||/^[ア-ン][\s　.]/.test(a.trim()))?"（サブ項目含む）":""}</div>`:""}
        </div>
      </div>
    `).join("")}}function Me(e){const t=document.getElementById("curriculumList");if(!e.length){t.innerHTML=z();return}const n={};e.forEach(o=>{const i=o.year||"2024";n[i]||(n[i]=[]),n[i].push(o)}),t.innerHTML=Object.entries(n).map(([o,i])=>`
    <div class="item-card" style="margin-bottom:14px">
      <div class="item-card-header" style="background:var(--surface2)">
        <span class="item-num">${o}年度入学</span>
        <span class="item-title">${i.length}科目</span>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:var(--surface2)">
            <th style="padding:8px 12px;text-align:left;border-bottom:1px solid var(--border);font-weight:600;color:var(--text-3);font-size:11px">教科</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:1px solid var(--border);font-weight:600;color:var(--text-3);font-size:11px">科目</th>
            <th style="padding:8px 12px;text-align:center;border-bottom:1px solid var(--border);font-weight:600;color:var(--text-3);font-size:11px">1年</th>
            <th style="padding:8px 12px;text-align:center;border-bottom:1px solid var(--border);font-weight:600;color:var(--text-3);font-size:11px">2年</th>
            <th style="padding:8px 12px;text-align:center;border-bottom:1px solid var(--border);font-weight:600;color:var(--text-3);font-size:11px">3年</th>
            <th style="padding:8px 12px;text-align:center;border-bottom:1px solid var(--border);font-weight:600;color:var(--text-3);font-size:11px">必選</th>
            <th style="padding:8px 12px;border-bottom:1px solid var(--border)"></th>
          </tr></thead>
          <tbody>
            ${i.map(s=>`
              <tr>
                <td style="padding:8px 12px;border-bottom:1px solid var(--border-2);color:var(--text-2)">${s.subject||""}</td>
                <td style="padding:8px 12px;border-bottom:1px solid var(--border-2);color:var(--text-2)">${s.course||""}</td>
                <td style="padding:8px 12px;text-align:center;border-bottom:1px solid var(--border-2);color:var(--text-2)">${s.y1||"—"}</td>
                <td style="padding:8px 12px;text-align:center;border-bottom:1px solid var(--border-2);color:var(--text-2)">${s.y2||"—"}</td>
                <td style="padding:8px 12px;text-align:center;border-bottom:1px solid var(--border-2);color:var(--text-2)">${s.y3||"—"}</td>
                <td style="padding:8px 12px;text-align:center;border-bottom:1px solid var(--border-2);color:var(--text-2)">${s.required||""}</td>
                <td style="padding:8px 12px;border-bottom:1px solid var(--border-2)">
                  <div style="display:flex;gap:4px">
                    <button class="btn-icon" data-edit="curriculum|${s.id}">
                      <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/></svg>
                    </button>
                    <button class="btn-icon del" data-delete="curriculum|${s.id}">
                      <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `).join("")}function Ce(e){const t=document.getElementById("eventsList");if(!e.length){t.innerHTML=z();return}const n=["1","2","3","4","5","6","7","8","9","10","11","12"],o={};e.forEach(i=>{const s=String(i.month||"1");o[s]||(o[s]=[]),o[s].push(i)}),t.innerHTML=n.filter(i=>o[i]).map(i=>`
    <div class="item-card" style="margin-bottom:10px;overflow:hidden">
      <div class="item-card-header" style="background:var(--navy);color:white">
        <span style="font-family:'Noto Serif JP',serif;font-size:14px;font-weight:600">${i}月</span>
        <span style="font-size:12px;opacity:.6;margin-left:auto">${o[i].length}件</span>
      </div>
      ${o[i].map(s=>`
        <div class="history-row" style="grid-template-columns:1fr auto">
          <div class="history-event-cell">${s.name||""}</div>
          <div class="item-actions">
            <button class="btn-icon" data-edit="events|${s.id}">
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/></svg>
            </button>
            <button class="btn-icon del" data-delete="events|${s.id}">
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </div>
        </div>
      `).join("")}
    </div>
  `).join("")}async function ke(){const e=document.getElementById("councilActivitiesForm"),n=(await B(m(p,"content","council-activities")).catch(()=>null))?.data()||{},o=[n.overview,n.committees].filter(Boolean).join(`

`);e.innerHTML=`
    <div class="form-row">
      <label>生徒会活動の内容（本文）</label>
      <div style="font-size:11px;color:var(--text-3);margin-bottom:6px">
        1枠でまとめて入力してください。段落は空行で区切られます。
      </div>
      <textarea id="caContent" rows="12" style="width:100%;font-size:13px">${o}</textarea>
    </div>
    <button class="btn-save" style="margin-top:8px" data-save-action="council-activities">保存</button>
  `}async function ie(){const e=document.getElementById("caContent").value.trim();await O(m(p,"content","council-activities"),{overview:e,committees:""}),u("生徒会活動を保存しました")}async function Ae(){const e=document.getElementById("specialDescForm");if(!e)return;const n=(await B(m(p,"content","special")).catch(()=>null))?.data()||{};e.innerHTML=`
    <textarea id="specialDescription" rows="6" style="width:100%;font-size:13px;border:1.5px solid var(--border);border-radius:var(--r);padding:9px 12px;line-height:1.7;resize:vertical" placeholder="特別教育活動の目的や概要を入力...">${n.description||""}</textarea>
    <button class="btn-save" style="margin-top:8px" data-save-action="special-desc">保存</button>
  `}async function Te(){const e=document.getElementById("specialDescription").value.trim(),n=(await B(m(p,"content","special")).catch(()=>null))?.data()||{};await O(m(p,"content","special"),{...n,description:e}),u("特別教育活動の説明文を保存しました")}async function He(){const e=document.getElementById("charterPreambleForm");if(!e)return;const n=(await B(m(p,"content","council-charter")).catch(()=>null))?.data()||{};e.innerHTML=`
    <textarea id="charterPreamble" rows="6" style="width:100%;font-size:13px;border:1.5px solid var(--border);border-radius:var(--r);padding:9px 12px;line-height:1.7;resize:vertical" placeholder="憲章の前文を入力...">${n.preamble||""}</textarea>
    <button class="btn-save" style="margin-top:8px" data-save-action="charter-preamble">保存</button>
  `}async function qe(){const e=document.getElementById("charterPreamble").value.trim(),n=(await B(m(p,"content","council-charter")).catch(()=>null))?.data()||{};await O(m(p,"content","council-charter"),{...n,preamble:e}),u("憲章の前文を保存しました")}const M={history:{title:"沿革",fields:()=>`
      <div class="form-row">
        <label>年号（例: 1878（明11）8・12）</label>
        <input type="text" id="f_year" placeholder="1878（明11）8・12">
      </div>
      <div class="form-row">
        <label>出来事</label>
        <textarea id="f_event" rows="3" placeholder="茨城県立第一中学校創立"></textarea>
      </div>
      <div class="form-row">
        <label>並び順（数字）</label>
        <input type="number" id="f_order" value="0">
      </div>
    `,getData:()=>({year:document.getElementById("f_year").value.trim(),event:document.getElementById("f_event").value.trim(),order:Number(document.getElementById("f_order").value)}),fill:e=>{document.getElementById("f_year").value=e.year||"",document.getElementById("f_event").value=e.event||"",document.getElementById("f_order").value=e.order??0}},principals:{title:"歴代校長",fields:()=>`
      <div class="form-row-2 form-row">
        <div>
          <label>代数（例: 初代、2代）</label>
          <input type="text" id="f_gen" placeholder="初代">
        </div>
        <div>
          <label>氏名</label>
          <input type="text" id="f_name" placeholder="〇〇 〇〇">
        </div>
      </div>
      <div class="form-row">
        <label>在任期間（例: 明治13・7 ― 明治14・5）</label>
        <input type="text" id="f_term" placeholder="明治13・7 ― 明治14・5">
      </div>
      <div class="form-row">
        <label>並び順（数字）</label>
        <input type="number" id="f_order" value="0">
      </div>
    `,getData:()=>({gen:document.getElementById("f_gen").value.trim(),name:document.getElementById("f_name").value.trim(),term:document.getElementById("f_term").value.trim(),order:Number(document.getElementById("f_order").value)}),fill:e=>{document.getElementById("f_gen").value=e.gen||"",document.getElementById("f_name").value=e.name||"",document.getElementById("f_term").value=e.term||"",document.getElementById("f_order").value=e.order??0}},songs:{title:"歌詞",fields:()=>`
      <div class="form-row-2 form-row">
        <div>
          <label>種別</label>
          <select id="f_type">
            <option value="校歌">校歌</option>
            <option value="応援歌">応援歌</option>
            <option value="その他">その他</option>
          </select>
        </div>
        <div>
          <label>タイトル</label>
          <input type="text" id="f_title" placeholder="水戸第一高等学校校歌">
        </div>
      </div>
      <div class="form-row">
        <label>作詞者</label>
        <input type="text" id="f_lyricist" placeholder="〇〇 〇〇">
      </div>
      <div class="form-row">
        <label>作曲者</label>
        <input type="text" id="f_composer" placeholder="〇〇 〇〇">
      </div>
      <div class="form-row">
        <label>一番</label>
        <textarea id="f_v1" rows="4" placeholder="歌詞を入力..."></textarea>
      </div>
      <div class="form-row">
        <label>二番（なければ空欄）</label>
        <textarea id="f_v2" rows="4"></textarea>
      </div>
      <div class="form-row">
        <label>三番（なければ空欄）</label>
        <textarea id="f_v3" rows="4"></textarea>
      </div>
      <div class="form-row">
        <label>並び順</label>
        <input type="number" id="f_order" value="0">
      </div>
    `,getData:()=>{const e=[document.getElementById("f_v1").value.trim(),document.getElementById("f_v2").value.trim(),document.getElementById("f_v3").value.trim()].filter(Boolean);return{type:document.getElementById("f_type").value,title:document.getElementById("f_title").value.trim(),lyricist:document.getElementById("f_lyricist").value.trim(),composer:document.getElementById("f_composer").value.trim(),verses:e,order:Number(document.getElementById("f_order").value)}},fill:e=>{document.getElementById("f_type").value=e.type||"校歌",document.getElementById("f_title").value=e.title||"",document.getElementById("f_lyricist").value=e.lyricist||"",document.getElementById("f_composer").value=e.composer||"";const t=e.verses||[];document.getElementById("f_v1").value=t[0]||"",document.getElementById("f_v2").value=t[1]||"",document.getElementById("f_v3").value=t[2]||"",document.getElementById("f_order").value=e.order??0}},events:{title:"年間行事",fields:()=>`
      <div class="form-row">
        <label>月</label>
        <select id="f_month">
          ${[...Array(12)].map((e,t)=>`<option value="${t+1}">${t+1}月</option>`).join("")}
        </select>
      </div>
      <div class="form-row">
        <label>行事名</label>
        <input type="text" id="f_name" placeholder="始業式">
      </div>
      <div class="form-row">
        <label>並び順</label>
        <input type="number" id="f_order" value="0">
      </div>
    `,getData:()=>({month:Number(document.getElementById("f_month").value),name:document.getElementById("f_name").value.trim(),order:Number(document.getElementById("f_order").value)}),fill:e=>{document.getElementById("f_month").value=e.month||1,document.getElementById("f_name").value=e.name||"",document.getElementById("f_order").value=e.order??0}},curriculum:{title:"教育課程",fields:()=>`
      <div class="form-row">
        <label>入学年度</label>
        <input type="text" id="f_year" placeholder="2024">
      </div>
      <div class="form-row-2 form-row">
        <div>
          <label>教科</label>
          <input type="text" id="f_subject" placeholder="国語">
        </div>
        <div>
          <label>科目</label>
          <input type="text" id="f_course" placeholder="現代の国語">
        </div>
      </div>
      <div class="form-row-2 form-row">
        <div><label>1年（単位）</label><input type="text" id="f_y1" placeholder="2"></div>
        <div><label>2年（単位）</label><input type="text" id="f_y2" placeholder="—"></div>
      </div>
      <div class="form-row-2 form-row">
        <div><label>3年（単位）</label><input type="text" id="f_y3" placeholder="—"></div>
        <div>
          <label>必修/選択</label>
          <select id="f_required">
            <option value="必修">必修</option>
            <option value="選択">選択</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <label>並び順</label>
        <input type="number" id="f_order" value="0">
      </div>
    `,getData:()=>({year:document.getElementById("f_year").value.trim(),subject:document.getElementById("f_subject").value.trim(),course:document.getElementById("f_course").value.trim(),y1:document.getElementById("f_y1").value.trim(),y2:document.getElementById("f_y2").value.trim(),y3:document.getElementById("f_y3").value.trim(),required:document.getElementById("f_required").value,order:Number(document.getElementById("f_order").value)}),fill:e=>{document.getElementById("f_year").value=e.year||"",document.getElementById("f_subject").value=e.subject||"",document.getElementById("f_course").value=e.course||"",document.getElementById("f_y1").value=e.y1||"",document.getElementById("f_y2").value=e.y2||"",document.getElementById("f_y3").value=e.y3||"",document.getElementById("f_required").value=e.required||"必修",document.getElementById("f_order").value=e.order??0}}},N=e=>({title:"条文",fields:()=>`
    <div class="form-row-2 form-row">
      <div>
        <label>条番号（例: 第一条、前文）</label>
        <input type="text" id="f_number" placeholder="第一条">
      </div>
      <div>
        <label>条名（例: 目的）</label>
        <input type="text" id="f_title_art" placeholder="目的">
      </div>
    </div>
    ${e==="council-charter"?`
    <div class="form-row">
      <label>セクション（任意 — 例: 総則、細則）</label>
      <input type="text" id="f_section" placeholder="総則">
      <div style="font-size:10.5px;color:var(--text-3);margin-top:3px">条文が「総則」「細則」などのセクションに分かれる場合に指定</div>
    </div>
    `:""}
    <div class="form-row">
      <label>章見出し（任意 — 例: 第一章 総則）</label>
      <input type="text" id="f_chapter" placeholder="第一章 総則">
    </div>
    <div class="form-row">
      <label>本文</label>
      <textarea id="f_body" rows="4" placeholder="条文の本文を入力..."></textarea>
    </div>
    <div class="form-row">
      <label>項（1行1項。サブ項目はスペースで字下げ、ア イ ウ...で始める）</label>
      <textarea id="f_items" rows="8" placeholder="1 授業に関すること&#10;  ア 遅刻について&#10;  イ 欠席について&#10;2 施設の利用に関すること"></textarea>
      <div style="font-size:10.5px;color:var(--text-3);margin-top:3px">サブ項目はスペースで字下げするか「ア」「イ」等で始めてください</div>
    </div>
    <div class="form-row">
      <label>並び順</label>
      <input type="number" id="f_order" value="0">
    </div>
  `,getData:()=>{const t={number:document.getElementById("f_number").value.trim(),title:document.getElementById("f_title_art").value.trim(),chapter:document.getElementById("f_chapter").value.trim(),body:document.getElementById("f_body").value.trim(),items:document.getElementById("f_items").value.trim().split(`
`).filter(Boolean),order:Number(document.getElementById("f_order").value)},n=document.getElementById("f_section");return n&&(t.section=n.value.trim()),t},fill:t=>{document.getElementById("f_number").value=t.number||"",document.getElementById("f_title_art").value=t.title||"",document.getElementById("f_chapter").value=t.chapter||"",document.getElementById("f_body").value=t.body||"",document.getElementById("f_items").value=(t.items||[]).join(`
`),document.getElementById("f_order").value=t.order??0;const n=document.getElementById("f_section");n&&(n.value=t.section||"")}});M.rules=N("rules");M.special=N("special");M["council-charter"]=N("council-charter");M["council-rules"]=N("council-rules");async function X(e,t=null){C=e,D=t;const n=M[e];if(n){if(document.getElementById("modalTitle").textContent=(t?"編集 — ":"追加 — ")+n.title,document.getElementById("modalBody").innerHTML=n.fields(),document.getElementById("modalBody").querySelectorAll("[data-action]").forEach(o=>{o.dataset.action==="saveGoals"&&o.addEventListener("click",re),o.dataset.action==="saveCouncilActivities"&&o.addEventListener("click",ie)}),t){const o=await B(m(p,e,t));o.exists()&&n.fill(o.data())}document.getElementById("modalOverlay").classList.add("open")}}function k(){document.getElementById("modalOverlay").classList.remove("open"),D=null,C=null}async function je(){const e=M[C];if(!e)return;const t=document.getElementById("modalSaveBtn");t.disabled=!0;try{const n=e.getData();D?(await L(m(p,C,D),n),u("更新しました")):(await pe(x(p,C),n),u("追加しました")),k(),P(J)}catch(n){u("エラーが発生しました: "+n.message)}t.disabled=!1}async function Re(e,t){if(confirm("削除しますか？"))try{await U(m(p,e,t)),u("削除しました"),P(J)}catch(n){const o=n?.message||String(n);o.includes("Missing or insufficient permissions")?alert(`削除に失敗しました: Firestoreのセキュリティルールで操作が拒否されました。
Firebase Console でルールを更新してください（firestore.rules を参照）。`):alert("削除に失敗しました: "+o)}}const se="https://mito1-hundbook.asanuma-ryuto.workers.dev",De={bug:"バグ・不具合",feature:"機能要望",content:"内容修正依頼",other:"その他"},Z={new:"未対応",replied:"返信済",closed:"完了"},ee={new:"#c0392b",replied:"#2980b9",closed:"#27ae60"};window.loadInquiries=async function(){const e=document.getElementById("inquiriesList");if(!e)return;e.innerHTML='<div class="loading-spinner"><div class="spinner"></div>読み込み中...</div>';const t=document.getElementById("inquiryFilter")?.value||"all";try{const n=await h(q(x(p,"inquiries"),j("createdAt","desc")));let o=n.docs.map(r=>({id:r.id,...r.data()}));t!=="all"&&(o=o.filter(r=>r.status===t));const i=n.docs.filter(r=>r.data().status==="new").length,s=document.getElementById("inquiryBadge");if(s&&(s.textContent=i,s.style.display=i?"":"none"),!o.length){e.innerHTML='<div style="padding:32px;text-align:center;color:var(--text-3)">該当するお問い合わせはありません</div>';return}const a=A(y?.role);e.innerHTML=o.map(r=>`
      <div class="item-card" id="inq-${r.id}" style="margin-bottom:12px">
        <div style="display:flex;align-items:flex-start;gap:12px;padding:18px 20px">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
              <span style="font-size:10px;font-weight:700;color:${ee[r.status]||"#888"};background:${ee[r.status]||"#888"}18;border-radius:4px;padding:2px 8px">${Z[r.status]||r.status}</span>
              <span style="font-size:10px;color:var(--text-3);background:var(--surface2);border-radius:4px;padding:2px 8px">${De[r.category]||r.category||"その他"}</span>
              <span style="font-size:11px;color:var(--text-3);margin-left:auto">${r.createdAt?.toDate?r.createdAt.toDate().toLocaleString("ja"):""}</span>
            </div>
            <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px">${g(r.subject||"（件名なし）")}</div>
            <div style="font-size:12px;color:var(--text-3);margin-bottom:6px">差出人: ${g(r.name||"不明")} &lt;${g(r.email||"")}&gt;</div>
            <div style="font-size:13px;color:var(--text-2);white-space:pre-wrap;border-left:3px solid var(--border);padding-left:10px;margin-bottom:12px">${g(r.body||"")}</div>
            ${r.reply?`<div style="font-size:12px;color:var(--text-3);border:1px solid var(--border);border-radius:8px;padding:10px 12px;background:var(--surface2)"><strong>返信済み内容:</strong><br><span style="white-space:pre-wrap">${g(r.reply)}</span></div>`:""}
          </div>
        </div>
        <div style="padding:0 20px 16px;display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
          <textarea id="reply-${r.id}" rows="3" placeholder="返信内容を入力（メールで送信する文章）" ${a?"":"readonly"}
            style="flex:1;min-width:200px;border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:13px;resize:vertical;background:var(--surface);color:var(--text)">${g(r.reply||"")}</textarea>
          <div style="display:flex;flex-direction:column;gap:6px">
            <button onclick="draftReply('${r.id}','${te(r.subject)}','${te(r.body)}')"
              style="font-size:11px;padding:6px 12px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);cursor:pointer;color:var(--text-2)">
              ✦ AIで下書き
            </button>
            ${a?`
            <button onclick="saveReply('${r.id}')"
              style="font-size:11px;padding:6px 12px;border:none;border-radius:6px;background:var(--navy);cursor:pointer;color:#fff">
              返信内容を保存
            </button>
            <button onclick="sendReplyEmail('${r.id}', event)"
              style="font-size:11px;padding:6px 12px;border:none;border-radius:6px;background:#27ae60;cursor:pointer;color:#fff">
              📧 メールで送信
            </button>
            <select onchange="changeStatus('${r.id}',this.value)"
              style="font-size:11px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text)">
              ${Object.entries(Z).map(([c,d])=>`<option value="${c}"${r.status===c?" selected":""}>${d}</option>`).join("")}
            </select>
            <button onclick="deleteInquiry('${r.id}')"
              style="font-size:11px;padding:6px 12px;border:1px solid #e74c3c;border-radius:6px;background:transparent;cursor:pointer;color:#e74c3c;margin-top:4px">
              削除
            </button>`:`
            <div style="font-size:10.5px;color:var(--text-3);max-width:160px">返信・状態変更は管理者以上のみ行えます</div>`}
          </div>
        </div>
      </div>
    `).join("")}catch(n){e.innerHTML=`<div style="padding:20px;color:#c0392b">読み込みエラー: ${n.message}</div>`}};function g(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function te(e){return String(e).replace(/'/g,"\\'").replace(/\n/g," ").slice(0,100)}window.draftReply=async function(e,t,n){const o=document.getElementById("reply-"+e);if(o){o.value="AI生成中...";try{const i=`以下のお問い合わせに対する丁寧な返信メール文を日本語で作成してください。
学校名：茨城県立水戸第一高等学校
件名：${t}
内容：${n}
---
・200字程度・生徒への敬意ある丁寧な文体・回答がない場合は確認中と書く`,a=await(await fetch(se,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:i}]}]})})).text(),r=JSON.parse(a),c=r.candidates?.[0]?.content?.parts?.[0]?.text||r.text||r.result||"生成できませんでした";o.value=c}catch(i){o.value=`エラー: ${i.message}`}}};window.saveReply=async function(e){if(!A(y?.role)){u("返信を保存する権限がありません");return}const t=document.getElementById("reply-"+e);t&&(await L(m(p,"inquiries",e),{reply:t.value,status:"replied"}),u("返信内容を保存しました"),loadInquiries())};window.sendReplyEmail=async function(e,t){if(!A(y?.role)){u("返信を送信する権限がありません");return}const n=document.getElementById("reply-"+e);if(!n||!n.value.trim()){u("返信内容を入力してください");return}const o=await B(m(p,"inquiries",e));if(!o.exists()){u("お問い合わせが見つかりません");return}const i=o.data();if(!i.email){u("送信先メールアドレスがありません");return}const s=t?t.currentTarget:document.querySelector(`#inq-${e} button[onclick*="sendReplyEmail"]`);s&&(s.disabled=!0,s.textContent="送信中...");try{const a=await fetch(se+"/send-reply",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({recipientEmail:i.email,recipientName:i.name||"",subject:i.subject||"お問い合わせ",replyBody:n.value.trim(),appBaseUrl:window.location.origin})});if(!a.ok){const r=await a.text().catch(()=>"");throw new Error(`送信失敗 (${a.status}): ${r}`)}await L(m(p,"inquiries",e),{reply:n.value,status:"replied"}),u("メールを送信しました"),loadInquiries()}catch(a){u("メール送信エラー: "+a.message),s&&(s.disabled=!1,s.textContent="📧 メールで送信")}};window.changeStatus=async function(e,t){if(!A(y?.role)){u("ステータスを変更する権限がありません");return}await L(m(p,"inquiries",e),{status:t}),u("ステータスを変更しました"),loadInquiries()};window.deleteInquiry=async function(e){if(!A(y?.role)){u("削除する権限がありません");return}confirm(`このお問い合わせを削除しますか？
この操作は取り消せません。`)&&(await U(m(p,"inquiries",e)),u("削除しました"),loadInquiries())};const Oe={pending_supervisor:"顧問承認待ち",pending_homeroom:"担任承認待ち",approved:"承認済み",rejected:"差し戻し"},Ue={pending_supervisor:"#856404",pending_homeroom:"#004085",approved:"#155724",rejected:"#721c24"},Pe={pending_supervisor:"#fff3cd",pending_homeroom:"#cce5ff",approved:"#d4edda",rejected:"#f8d7da"};function le(){const e=document.getElementById("adminCasesList");e&&(e.innerHTML='<div style="padding:32px;text-align:center;color:var(--text-3)">公欠申請ケースの閲覧権限がありません。<br>（管理者（先生）またはオーナーのみ閲覧可能です）</div>')}window.loadAdminCases=async function(){const e=document.getElementById("adminCasesList");if(!e)return;if(!S(y?.role)){le();return}e.innerHTML='<div class="loading-spinner"><div class="spinner"></div>読み込み中...</div>';const t=document.getElementById("casesFilter")?.value||"all";try{const{getDocs:n,query:o,collection:i,orderBy:s}=await we(async()=>{const{getDocs:l,query:f,collection:v,orderBy:_}=await import("./roles-D6yFixml.js").then(w=>w.o);return{getDocs:l,query:f,collection:v,orderBy:_}},__vite__mapDeps([0,1]));let a=await n(o(i(p,"cases"),s("createdAt","desc"))),r=a.docs.map(l=>({id:l.id,...l.data()}));t!=="all"&&(r=r.filter(l=>l.status===t));const c=a.docs.filter(l=>["pending_supervisor","pending_homeroom"].includes(l.data().status)).length,d=document.getElementById("casesBadge");if(d&&(d.textContent=c,d.style.display=c?"":"none"),!r.length){e.innerHTML='<div style="padding:32px;text-align:center;color:var(--text-3)">該当するケースはありません</div>';return}e.innerHTML=r.map(l=>{const f=(l.dates||[]).join("、"),v=l.status,_=[{label:"申請",done:!0},{label:"顧問承認",done:["pending_homeroom","approved"].includes(v),active:v==="pending_supervisor"},{label:"担任承認",done:v==="approved",active:v==="pending_homeroom"},{label:"完了",done:v==="approved"}],w=v==="rejected"?`<span style="font-size:11px;color:#721c24">❌ 差し戻し${l.rejectedReason?"："+l.rejectedReason:""}</span>`:`<div style="display:flex;gap:0;margin-top:8px">${_.map($=>`
            <div style="flex:1;text-align:center">
              <div style="height:3px;border-radius:2px;margin-bottom:4px;background:${$.done?"#1a2744":$.active?"#ffc107":"#e0e0e0"}"></div>
              <span style="font-size:9.5px;color:${$.done?"#1a2744":$.active?"#856404":"#aaa"};font-weight:${$.done||$.active?700:400}">${$.label}</span>
            </div>`).join("")}</div>`;return`
        <div class="item-card" style="margin-bottom:12px;padding:18px 20px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
            <span style="font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:4px;color:${Ue[v]||"#888"};background:${Pe[v]||"#eee"}">${Oe[v]||v}</span>
            <span style="font-size:11px;color:var(--text-3);margin-left:auto">${l.createdAt?.toDate?l.createdAt.toDate().toLocaleString("ja"):""}</span>
          </div>
          <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px">${g(l.title||"")}</div>
          <div style="font-size:12px;color:var(--text-3);margin-bottom:2px">申請者: <strong>${g(l.studentName||"")}</strong> &lt;${g(l.studentEmail||"")}&gt;</div>
          <div style="font-size:12px;color:var(--text-3);margin-bottom:2px">公欠日: ${g(f)} ／ 事由: ${g(l.reasonDetail?l.reason+"（"+l.reasonDetail+"）":l.reason||"")}</div>
          <div style="font-size:11.5px;color:var(--text-3)">顧問: ${g(l.supervisorEmail||"")} ／ 担任: ${g(l.homeRoomEmail||"")}</div>
          ${w}
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);display:flex;justify-content:flex-end">
            <button onclick="deleteAdminCase('${l.id}')"
              style="font-size:11px;padding:5px 12px;border:1px solid #e74c3c;border-radius:6px;background:transparent;cursor:pointer;color:#e74c3c;font-family:inherit;transition:background .15s"
              onmouseover="this.style.background='#fdf0f0'" onmouseout="this.style.background='transparent'">
              削除
            </button>
          </div>
        </div>`}).join("")}catch(n){e.innerHTML=`<div style="padding:20px;color:#c0392b">読み込みエラー: ${n.message}</div>`}};window.deleteAdminCase=async function(e){if(!S(y?.role)){u("この操作を行う権限がありません");return}if(confirm(`このケースを削除しますか？
この操作は取り消せません。`))try{await U(m(p,"cases",e)),u("ケースを削除しました"),loadAdminCases()}catch(t){const n=t?.message||String(t);n.includes("Missing or insufficient permissions")?alert(`削除に失敗しました: Firestoreのセキュリティルールで操作が拒否されました。
Firebase Console > Firestore Database > Rules でルールを更新してください。

詳細: リポジトリの firestore.rules ファイルの内容をコピーして反映してください。`):alert("削除に失敗しました: "+n)}};let I=[],b={role:"all",grade:"all",class:"all",search:""};async function F(){const e=document.getElementById("usersList");if(e){e.innerHTML='<div class="loading-spinner"><div class="spinner"></div>読み込み中...</div>';try{I=(await h(x(p,"users"))).docs.map(n=>({id:n.id,...n.data()})),W()}catch(t){e.innerHTML=`<div style="padding:20px;color:#c0392b">読み込みエラー: ${t.message}</div>`}}}function W(){const e=document.getElementById("usersList");if(!e)return;let t=[...I];if(b.role!=="all"&&(t=t.filter(a=>a.role===b.role)),b.grade!=="all"&&(t=t.filter(a=>String(a.grade)===b.grade)),b.class!=="all"&&(t=t.filter(a=>String(a.class)===b.class)),b.search){const a=b.search.toLowerCase();t=t.filter(r=>(r.name||"").toLowerCase().includes(a)||(r.email||"").toLowerCase().includes(a))}if(t.sort((a,r)=>{const c={owner:0,admin_teacher:1,admin_student:2,moderator:3,teacher:4,student:5},d=(c[a.role]??9)-(c[r.role]??9);return d!==0?d:a.grade!==r.grade?(a.grade||0)-(r.grade||0):a.class!==r.class?(a.class||0)-(r.class||0):(a.number||0)-(r.number||0)}),!t.length){e.innerHTML='<div style="padding:32px;text-align:center;color:var(--text-3)">該当するユーザーはいません</div>';return}const n=y?.role,o=oe(n),i=ae(n),s=G(n);e.innerHTML=`
    <div style="margin-bottom:8px;font-size:12px;color:var(--text-3)">
      全${I.length}件中 ${t.length}件表示
    </div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:var(--surface2)">
            <th style="padding:9px 12px;text-align:left;border-bottom:2px solid var(--border);font-weight:600;color:var(--text-3);font-size:11px">氏名</th>
            <th style="padding:9px 12px;text-align:left;border-bottom:2px solid var(--border);font-weight:600;color:var(--text-3);font-size:11px">メール</th>
            <th style="padding:9px 12px;text-align:center;border-bottom:2px solid var(--border);font-weight:600;color:var(--text-3);font-size:11px">ロール</th>
            <th style="padding:9px 12px;text-align:center;border-bottom:2px solid var(--border);font-weight:600;color:var(--text-3);font-size:11px">学年</th>
            <th style="padding:9px 12px;text-align:center;border-bottom:2px solid var(--border);font-weight:600;color:var(--text-3);font-size:11px">クラス</th>
            <th style="padding:9px 12px;text-align:center;border-bottom:2px solid var(--border);font-weight:600;color:var(--text-3);font-size:11px">番号</th>
            <th style="padding:9px 12px;text-align:center;border-bottom:2px solid var(--border);font-weight:600;color:var(--text-3);font-size:11px">承認</th>
            <th style="padding:9px 12px;border-bottom:2px solid var(--border)"></th>
          </tr>
        </thead>
        <tbody>
          ${t.map(a=>{const c=a.role==="student"?i?`<button onclick="toggleApproval('${a.id}', ${!a.approved})"
                       style="font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:10px;border:none;cursor:pointer;color:${a.approved?"#155724":"#856404"};background:${a.approved?"#d4edda":"#fff3cd"}">
                       ${a.approved?"✓ 承認済み":"未承認"}
                     </button>`:`<span style="font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:10px;color:${a.approved?"#155724":"#856404"};background:${a.approved?"#d4edda":"#fff3cd"}">${a.approved?"✓ 承認済み":"未承認"}</span>`:'<span style="color:var(--text-3)">—</span>',d=o&&R(n,a.role),l=s&&R(n,a.role);return`
            <tr>
              <td style="padding:9px 12px;border-bottom:1px solid var(--border-2);color:var(--text);font-weight:500">${g(a.name||"")}</td>
              <td style="padding:9px 12px;border-bottom:1px solid var(--border-2);color:var(--text-2);font-size:12px">${g(a.email||"")}</td>
              <td style="padding:9px 12px;border-bottom:1px solid var(--border-2);text-align:center">
                <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;color:${ge[a.role]||"#888"};background:${ye[a.role]||"#eee"}">${V[a.role]||a.role||"不明"}</span>
              </td>
              <td style="padding:9px 12px;border-bottom:1px solid var(--border-2);text-align:center;color:var(--text-2)">${a.grade||"—"}</td>
              <td style="padding:9px 12px;border-bottom:1px solid var(--border-2);text-align:center;color:var(--text-2)">${a.class||"—"}</td>
              <td style="padding:9px 12px;border-bottom:1px solid var(--border-2);text-align:center;color:var(--text-2)">${a.number||"—"}</td>
              <td style="padding:9px 12px;border-bottom:1px solid var(--border-2);text-align:center">
                ${c}
              </td>
              <td style="padding:9px 12px;border-bottom:1px solid var(--border-2)">
                <div style="display:flex;gap:4px;justify-content:flex-end">
                  ${d?`
                  <button onclick="editUser('${a.id}')"
                    style="font-size:11px;padding:4px 10px;border:1px solid var(--border);border-radius:5px;background:var(--surface);cursor:pointer;color:var(--text-2);font-family:inherit">
                    編集
                  </button>`:""}
                  ${l?`
                  <button onclick="deleteUser('${a.id}','${g(a.name||a.email||"")}')"
                    style="font-size:11px;padding:4px 10px;border:1px solid #e74c3c;border-radius:5px;background:transparent;cursor:pointer;color:#e74c3c;font-family:inherit">
                    削除
                  </button>`:""}
                  ${!d&&!l?'<span style="font-size:11px;color:var(--text-3)">—</span>':""}
                </div>
              </td>
            </tr>
          `}).join("")}
        </tbody>
      </table>
    </div>`}window.toggleApproval=async function(e,t){if(I.find(o=>o.id===e)){if(!ae(y?.role)){u("この操作を行う権限がありません");return}try{await L(m(p,"users",e),{approved:t}),u(t?"生徒を承認済みにしました":"承認を取り消しました"),F()}catch(o){u("エラー: "+(o?.message||String(o)))}}};window.filterUsers=function(e,t){b[e]=t,W()};window.searchUsers=function(e){b.search=e,W()};window.editUser=async function(e){const t=I.find(c=>c.id===e);if(!t)return;const n=y?.role;if(!oe(n)||!R(n,t.role)){u("このユーザーを編集する権限がありません");return}const o=G(n),i=fe(n);i.includes(t.role)||i.push(t.role);const s=document.getElementById("modalOverlay");document.getElementById("modalTitle").textContent="編集 — ユーザー",document.getElementById("modalBody").innerHTML=`
    <div class="form-row">
      <label>氏名</label>
      <input type="text" id="f_user_name" value="${g(t.name||"")}">
    </div>
    <div class="form-row">
      <label>メールアドレス</label>
      <input type="email" id="f_user_email" value="${g(t.email||"")}" disabled style="opacity:0.6;cursor:not-allowed">
      <div style="font-size:10px;color:var(--text-3);margin-top:3px">※メールアドレスはFirebase Authenticationで管理されるためここでは変更できません</div>
    </div>
    <div class="form-row">
      <label>ロール</label>
      <select id="f_user_role" ${o?"":'disabled style="opacity:0.6;cursor:not-allowed"'}>
        ${i.map(c=>`<option value="${c}" ${t.role===c?"selected":""}>${V[c]||c}</option>`).join("")}
      </select>
      ${o?"":'<div style="font-size:10px;color:var(--text-3);margin-top:3px">※ロールの変更権限がありません</div>'}
      ${o?'<div style="font-size:10px;color:var(--text-3);margin-top:3px">※自分と同等以下のロールにのみ変更できます</div>':""}
    </div>
    <div class="form-row-2 form-row" id="f_user_student_fields" style="${t.role==="student"?"":"display:none"}">
      <div>
        <label>学年</label>
        <select id="f_user_grade">
          <option value="">—</option>
          <option value="1" ${t.grade==1?"selected":""}>1年</option>
          <option value="2" ${t.grade==2?"selected":""}>2年</option>
          <option value="3" ${t.grade==3?"selected":""}>3年</option>
        </select>
      </div>
      <div>
        <label>クラス</label>
        <select id="f_user_class">
          <option value="">—</option>
          ${[1,2,3,4,5,6].map(c=>`<option value="${c}" ${t.class==c?"selected":""}>${c}組</option>`).join("")}
        </select>
      </div>
    </div>
    <div class="form-row" id="f_user_number_field" style="${t.role==="student"?"":"display:none"}">
      <label>出席番号</label>
      <input type="number" id="f_user_number" value="${t.number||""}" min="1" max="50">
    </div>
    <script>
      document.getElementById('f_user_role').addEventListener('change', function(){
        const isStudent = this.value === 'student';
        document.getElementById('f_user_student_fields').style.display = isStudent ? '' : 'none';
        document.getElementById('f_user_number_field').style.display = isStudent ? '' : 'none';
      });
    <\/script>
  `;const a=document.getElementById("modalSaveBtn"),r=a.onclick;a.onclick=async function(){a.disabled=!0;try{const c={name:document.getElementById("f_user_name").value.trim()};if(o){const d=document.getElementById("f_user_role").value;if(!xe(n,d))throw new Error("そのロールへの変更権限がありません");c.role=d}if((c.role||t.role)==="student"){const d=document.getElementById("f_user_grade").value,l=document.getElementById("f_user_class").value,f=document.getElementById("f_user_number").value;d&&(c.grade=Number(d)),l&&(c.class=l),f&&(c.number=Number(f))}await L(m(p,"users",e),c),u("ユーザーを更新しました"),k(),F()}catch(c){u("エラー: "+c.message)}a.disabled=!1,a.onclick=r},s.classList.add("open")};window.deleteUser=async function(e,t){const n=I.find(i=>i.id===e),o=y?.role;if(!G(o)||n&&!R(o,n.role)){u("このユーザーを削除する権限がありません");return}if(confirm(`ユーザー「${t}」の登録情報を削除しますか？
※Firebase Authenticationのアカウント自体はFirebase Consoleから削除する必要があります。`))try{await U(m(p,"users",e)),u("ユーザー情報を削除しました"),F()}catch(i){alert("削除に失敗しました: "+(i?.message||String(i)))}};
