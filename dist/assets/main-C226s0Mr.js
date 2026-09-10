import{q as M,c as I,b as w,o as k,e as B,g as S,d as R,f as F,s as H}from"./firebase--zY0ciXM.js";import{o as _,c as A,d as N,g as z}from"./auth-sQCKFxHS.js";import{d as U,c as q,e as P}from"./cases-DGaBOMY4.js";import{c as L,p as O,a as Y}from"./roles-D6yFixml.js";import{i as W,b as X,u as G}from"./line-DblkRJQY.js";async function f(t){try{const n=M(I(w,t),k("order","asc"));return(await B(n)).docs.map(a=>({id:a.id,...a.data()}))}catch{return(await B(I(w,t))).docs.map(e=>({id:e.id,...e.data()}))}}async function b(t,n){try{const e=await S(R(w,t,n));return e.exists()?e.data():null}catch{return null}}async function J(){const t=await f("history");if(!t.length)return;const n=document.getElementById("historyListFront");n&&(n.innerHTML=t.map(e=>`
    <li class="history-item">
      <span class="history-year">${e.year||""}</span>
      <span class="history-event">${e.event||""}</span>
    </li>
  `).join(""))}async function K(){const t=await f("principals");if(!t.length)return;const n=document.getElementById("principalsListFront");n&&(n.innerHTML=t.map(e=>`
    <li class="principal-item">
      <span class="principal-gen">${e.gen||""}</span>
      <span class="principal-name">${e.name||""}</span>
      <span class="principal-term">${e.term||""}</span>
    </li>
  `).join(""))}async function Q(){const t=await b("content","goals");if(!t)return;const n=document.getElementById("goalsImageFront"),e=document.getElementById("goalsTextFront");n&&t.imageUrl&&(n.innerHTML=`<img src="${t.imageUrl}" alt="校是" style="max-width:100%;border-radius:var(--r)">`),e&&t.text&&(e.innerHTML=t.text.split(`
`).filter(Boolean).map(a=>`<p>${a}</p>`).join(""))}async function V(){const t=await f("songs");if(!t.length)return;const n=document.getElementById("songsListFront");n&&(n.innerHTML=t.map(e=>`
    <div class="song-card">
      <div class="song-hdr">
        <div class="song-hdr-ttl">${e.title||e.type||""}</div>
        <div class="song-hdr-badge">
          ${[e.lyricist&&`作詞：${e.lyricist}`,e.composer&&`作曲：${e.composer}`].filter(Boolean).join("　／　")}
        </div>
      </div>
      <div class="song-verses">
        ${(e.verses||[]).map((a,s)=>`
          <div>
            <div class="verse-num">${s+1}番</div>
            <div class="verse-text">${a.replace(/\n/g,"<br>")}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `).join(""))}function Z(t){if(!t||!t.length)return"";const n=[];let e=0;for(let a=0;a<t.length;a++){const s=t[a];(/^[\s\t　]+/.test(s)||/^[ア-ン][\s　.]/.test(s.trim()))&&n.length>0?n[n.length-1].subs.push(s.trim()):(e++,n.push({idx:e,text:s,subs:[]}))}return n.map(a=>`
    <li class="item-row">
      <span class="item-idx">${a.idx}</span>
      <span>
        ${a.text}
        ${a.subs.length?`
          <ul class="sub-list">
            ${a.subs.map(s=>{const o=s.match(/^([ア-ン])\s*(.*)$/);return o?`<li class="sub-row"><span class="sub-idx">${o[1]}</span><span>${o[2]}</span></li>`:`<li class="sub-row"><span class="sub-idx">・</span><span>${s}</span></li>`}).join("")}
          </ul>
        `:""}
      </span>
    </li>
  `).join("")}function ee(t,n,e,a={}){const s=document.getElementById(n),o=document.getElementById(e);if(!s)return;let l="",r="",d="",y="";a.description&&(l+=`<div class="card" style="margin-bottom:18px">
      <div class="card-body" style="font-size:14px;color:var(--text-2);line-height:2.0;white-space:pre-wrap">${a.description}</div>
    </div>`,r+='<a class="toc-lnk sub" style="font-style:italic;color:var(--text-3)">説明・前文</a>'),a.preamble&&(l+=`<div class="card" style="margin-bottom:18px">
      <div class="card-h2">前文</div>
      <div class="card-body" style="font-size:14px;color:var(--text-2);line-height:2.0;white-space:pre-wrap">${a.preamble}</div>
    </div>`,r+='<a class="toc-lnk sub" style="font-weight:600">前文</a>'),t.forEach(c=>{c.section&&c.section!==y&&(l+=`<div class="chapter-div" style="background:rgba(139,26,44,.06);border-left-color:var(--enjii);font-size:15px;margin-top:28px">${c.section}</div>`,r+=`<a class="toc-lnk sub" style="font-weight:700;color:var(--enjii)">${c.section}</a>`,y=c.section),c.chapter&&c.chapter!==d&&(l+=`<div class="chapter-div">${c.chapter}</div>`,r+=`<a class="toc-lnk sub">${c.chapter}</a>`,d=c.chapter);const p=`${n}-${c.id}`;l+=`
      <div class="article" id="${p}">
        <div class="art-hdr">
          <span class="art-num">${c.number||""}</span>
          ${c.title?`<span class="art-title">${c.title}</span>`:""}
        </div>
        <div class="art-body">
          ${c.body?`<div class="art-main">${c.body}</div>`:""}
          ${(c.items||[]).length?`
            <ol class="items-list">
              ${Z(c.items)}
            </ol>
          `:""}
        </div>
      </div>
    `,r+=`
      <a class="toc-lnk" onclick="scrollArt('${p}')">
        ${c.number}${c.title?`　${c.title}`:""}
      </a>
    `}),s.innerHTML=l,o&&(o.innerHTML=r)}async function E(t,n,e){const a=await f(t),s=await b("content",t),o={};if(s&&(s.description&&(o.description=s.description),s.preamble&&(o.preamble=s.preamble)),!a.length&&!o.description&&!o.preamble)return;ee(a,n,e,o);const l=`全${a.length}条`,d={rules:"sbBadgeRules",special:"sbBadgeSpecial","council-charter":"sbBadgeCharter","council-rules":"sbBadgeCouncilRules"}[t];if(d){const p=document.getElementById(d);p&&(p.textContent=l,p.style.display="")}const c={rules:"rulesMetaCount",special:"specialMetaCount","council-charter":"charterMetaCount","council-rules":"councilRulesMetaCount"}[t];if(c){const p=document.getElementById(c);p&&(p.textContent=l)}if(t==="rules"){const p=document.getElementById("rulesCardCount");p&&(p.textContent=`条文検索・${l}`)}}async function te(){const t=await f("events");if(!t.length)return;const n=document.getElementById("eventsListFront");if(!n)return;const e={};t.forEach(s=>{const o=String(s.month||1);e[o]||(e[o]=[]),e[o].push(s)});const a=["1","2","3","4","5","6","7","8","9","10","11","12"];n.innerHTML=a.filter(s=>e[s]).map(s=>`
      <div class="ev-month">
        <div class="ev-month-hdr">
          <span class="ev-month-name">${s}月</span>
          <span class="ev-month-num">${s}</span>
        </div>
        <div class="ev-items">
          ${e[s].map(o=>`
            <div class="ev-item">
              <div class="ev-bullet"></div>
              <div class="ev-name">${o.name||""}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `).join("")}async function ne(){const t=await f("curriculum");if(!t.length)return;const n=document.getElementById("curriculumTableFront");if(!n)return;const e={};t.forEach(o=>{const l=o.year||"2024";e[l]||(e[l]=[]),e[l].push(o)});const a=Object.keys(e).sort().reverse(),s=document.getElementById("curriculumTabsFront");s&&(s.innerHTML=a.map((o,l)=>`
      <button class="year-tab ${l===0?"on":""}"
        onclick="switchCurriculumYear('${o}', this)">
        ${o}年度入学
      </button>
    `).join("")),n.innerHTML=a.map((o,l)=>`
    <div class="curriculum-year-table ${l===0?"":"hidden-yr"}" data-year="${o}">
      <div class="table-outer">
        <table>
          <thead>
            <tr>
              <th>教科</th><th>科目</th>
              <th>1年</th><th>2年</th><th>3年</th><th>必選</th>
            </tr>
          </thead>
          <tbody>
            ${e[o].map(r=>`
              <tr>
                <td>${r.subject||""}</td>
                <td>${r.course||""}</td>
                <td style="text-align:center">${r.y1||"—"}</td>
                <td style="text-align:center">${r.y2||"—"}</td>
                <td style="text-align:center">${r.y3||"—"}</td>
                <td style="text-align:center">${r.required||""}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `).join("")}window.switchCurriculumYear=(t,n)=>{document.querySelectorAll(".curriculum-year-table").forEach(e=>{e.classList.toggle("hidden-yr",e.dataset.year!==t)}),document.querySelectorAll("#curriculumTabsFront .year-tab").forEach(e=>e.classList.remove("on")),n.classList.add("on")};async function ae(){const t=await b("content","council-activities"),n=document.getElementById("councilActivitiesFront");if(!n)return;const e=[t?.overview,t?.committees].filter(Boolean).join(`

`);if(!e){n.innerHTML='<p style="color:var(--text-3)">データがありません</p>';return}n.innerHTML=e.split(`
`).filter(a=>a!==void 0).map(a=>a.trim()===""?"<br>":`<p>${a}</p>`).join("")}async function ie(){const[t,n,e,a,s,o,l,r,d]=await Promise.all([f("rules"),f("special"),f("events"),f("history"),f("principals"),f("council-charter"),f("council-rules"),f("songs"),b("content","goals")]),[y,c,p,h]=await Promise.all([b("content","special"),b("content","council-charter"),b("content","council-rules"),b("content","council-activities")]),g=[];t.forEach(i=>{const v=[i.body||"",...i.items||[]].join(" ");g.push({path:`諸規定 › ${i.number}`,title:i.title||i.number,snip:v,page:"rules",id:`rulesContentFront-${i.id}`,tags:[i.title||"",i.chapter||""].join(" ")})}),n.forEach(i=>{const v=[i.body||"",...i.items||[]].join(" ");g.push({path:`特別教育活動 › ${i.number}`,title:i.title||i.number,snip:v,page:"special",id:`specialContentFront-${i.id}`,tags:[i.title||"",i.chapter||""].join(" ")})}),y?.description&&g.push({path:"特別教育活動 › 説明",title:"特別教育活動について",snip:y.description,page:"special",tags:"特別教育活動 目的 説明"}),e.forEach(i=>{g.push({path:`年間主要行事 › ${i.month}月`,title:`${i.month}月 — ${i.name}`,snip:i.name||"",page:"events",tags:`${i.month}月 行事`})}),a.forEach(i=>{g.push({path:"本校の沿革",title:i.year||"",snip:i.event||"",page:"about",tags:"沿革 歴史"})}),s.forEach(i=>{g.push({path:"歴代校長一覧",title:`${i.gen||""} ${i.name||""}`,snip:`${i.name||""} ${i.term||""}`,page:"principals",tags:"歴代校長 校長"})}),o.forEach(i=>{const v=[i.body||"",...i.items||[]].join(" ");g.push({path:`知道生徒会憲章 › ${i.number}`,title:i.title||i.number,snip:v,page:"council-charter",id:`charterContentFront-${i.id}`,tags:[i.title||"",i.chapter||"",i.section||""].join(" ")})}),c?.preamble&&g.push({path:"知道生徒会憲章 › 前文",title:"知道生徒会憲章 前文",snip:c.preamble,page:"council-charter",tags:"憲章 前文"}),l.forEach(i=>{const v=[i.body||"",...i.items||[]].join(" ");g.push({path:`生徒会関係諸規定 › ${i.number}`,title:i.title||i.number,snip:v,page:"council-rules",id:`councilRulesContentFront-${i.id}`,tags:[i.title||"",i.chapter||""].join(" ")})}),r.forEach(i=>{g.push({path:`歌詞 › ${i.type||""}`,title:i.title||i.type||"",snip:(i.verses||[]).join(`
`),page:"songs",tags:"歌詞 校歌 応援歌"})}),d?.text&&g.push({path:"就学の目標",title:"就学の目標",snip:d.text,page:"goals",tags:"就学 目標 校是"}),h?.overview&&g.push({path:"生徒会活動",title:"生徒会活動",snip:h.overview,page:"council-activities",tags:"生徒会 活動"}),window.DYNAMIC_SEARCH_INDEX=g,window._allArticleData={rules:t,special:n,charter:o,councilRules:l,principals:s,songs:r,history:a,specialContent:y,charterContent:c,councilRulesContent:p}}async function se(){await Promise.all([J(),K(),Q(),V(),te(),ne(),ae(),E("rules","rulesContentFront","rulesTocFront"),E("special","specialContentFront","specialTocFront"),E("council-charter","charterContentFront","charterTocFront"),E("council-rules","councilRulesContentFront","councilRulesTocFront"),ie()]),oe()}function oe(){if(!window.DYNAMIC_SEARCH_INDEX||!window.DYNAMIC_SEARCH_INDEX.length)return;const t=window._allArticleData||{},n=[];t.rules?.length&&(n.push("========== 諸規定（本則） =========="),t.rules.forEach(e=>{let a=`${e.number}`;e.title&&(a+=`（${e.title}）`),e.chapter&&(a+=` [${e.chapter}]`),e.body&&(a+=`
${e.body}`),e.items?.length&&(a+=`
`+e.items.map(s=>/^[\s\t　]+/.test(s)||/^[ア-ン][\s　.]/.test(s.trim())?`      ${s.trim()}`:`  ${s}`).join(`
`)),n.push(a)})),(t.specialContent?.description||t.special?.length)&&(n.push(`
========== 特別教育活動 ==========`),t.specialContent?.description&&n.push(`[説明文]
`+t.specialContent.description),t.special?.forEach(e=>{let a=`${e.number}`;e.title&&(a+=`（${e.title}）`),e.chapter&&(a+=` [${e.chapter}]`),e.body&&(a+=`
${e.body}`),e.items?.length&&(a+=`
`+e.items.map((s,o)=>`  ${o+1}. ${s}`).join(`
`)),n.push(a)})),(t.charterContent?.preamble||t.charter?.length)&&(n.push(`
========== 知道生徒会憲章 ==========`),t.charterContent?.preamble&&n.push(`[前文]
`+t.charterContent.preamble),t.charter?.forEach(e=>{let a=`${e.number}`;e.title&&(a+=`（${e.title}）`),e.section&&(a+=` {${e.section}}`),e.chapter&&(a+=` [${e.chapter}]`),e.body&&(a+=`
${e.body}`),e.items?.length&&(a+=`
`+e.items.map((s,o)=>`  ${o+1}. ${s}`).join(`
`)),n.push(a)})),t.councilRules?.length&&(n.push(`
========== 生徒会関係諸規定 ==========`),t.councilRules.forEach(e=>{let a=`${e.number}`;e.title&&(a+=`（${e.title}）`),e.chapter&&(a+=` [${e.chapter}]`),e.body&&(a+=`
${e.body}`),e.items?.length&&(a+=`
`+e.items.map((s,o)=>`  ${o+1}. ${s}`).join(`
`)),n.push(a)})),t.principals?.length&&(n.push(`
========== 歴代校長一覧 ==========`),t.principals.forEach(e=>{n.push(`${e.gen||""} ${e.name||""} （${e.term||""}）`)})),t.songs?.length&&(n.push(`
========== 歌詞 ==========`),t.songs.forEach(e=>{n.push(`[${e.type||""}] ${e.title||""}`),e.lyricist&&n.push(`作詞：${e.lyricist}`),e.composer&&n.push(`作曲：${e.composer}`),(e.verses||[]).forEach((a,s)=>{n.push(`${s+1}番
${a}`)})})),t.history?.length&&(n.push(`
========== 本校の沿革 ==========`),t.history.forEach(e=>{n.push(`${e.year||""} ${e.event||""}`)})),window._aiContext=n.join(`
`)}se().catch(t=>console.error("[Firestore]",t));window._db=w;window._fsAddDoc=F;window._fsCollection=I;window._fsServerTimestamp=H;let m=null,u=null,C=!1;_(async t=>{if(m=t,t){for(let n=0;n<3;n++){try{if(u=await z(t),u)break}catch{}await new Promise(e=>setTimeout(e,500))}u||(u={uid:t.uid,email:t.email,name:t.email.split("@")[0],role:"student",grade:"",class:"",number:""})}else u=null;if(T(),!C){C=!0;const n=sessionStorage.getItem("mito1_nav");n&&m&&(sessionStorage.removeItem("mito1_nav"),window._pendingNav=n)}});function T(){const t=!!m,n=document.getElementById("applyLoginRequired"),e=document.getElementById("applyForm");n&&(n.style.display=t?"none":""),e&&(e.style.display=t?"":"none");const a=document.getElementById("mypageLoginRequired"),s=document.getElementById("mypageContent");if(a&&(a.style.display=t?"none":""),s&&(s.style.display=t?"":"none"),!t){const o=document.getElementById("lineLinkBanner"),l=document.getElementById("lineLinkedCard");o&&(o.style.display="none"),l&&(l.style.display="none")}if(t){const o=u||{},l=document.getElementById("mypageName"),r=document.getElementById("mypageInfo");if(l&&(l.textContent=o.name||m.email),r){const y=o.grade,c=o.class,p=o.number;r.textContent=y&&c?`${y}年${c}組${p?" "+p+"番":""}`:m.email}le(o),j(o);const d=document.getElementById("pg-mypage");d&&d.classList.contains("on")&&window.loadMyCases()}}function le(t){const n=document.getElementById("mypageBadges");n&&(n.innerHTML=O(t).map(a=>`<span class="mp-badge" style="color:${a.color};background:${a.bg}">${x(a.label)}</span>`).join(""));const e=document.getElementById("mypageApprovalNotice");if(e){const a=Y(t);a?(e.textContent=a,e.style.display=""):(e.style.display="none",e.textContent="")}}function j(t){const n=document.getElementById("lineLinkBanner"),e=document.getElementById("lineLinkedCard");if(!(!n||!e))if(W(t)){n.style.display="none",e.style.display="";const a=document.getElementById("lineLinkedName");a&&(a.textContent=t.lineDisplayName||"LINEアカウント");const s=document.getElementById("lineLinkedAvatar");s&&t.linePictureUrl&&(s.innerHTML=`<img src="${x(t.linePictureUrl)}" alt="">`)}else n.style.display="",e.style.display="none"}window.startLineLinkFront=function(){if(!m){location.href="/auth.html";return}const t=document.getElementById("lineLinkBtn");t&&(t.disabled=!0),X("/#mypage")};window.unlinkLineFront=async function(){if(!m||!confirm(`LINE連携を解除しますか？
以降、公欠申請の承認完了などのお知らせがLINEに届かなくなります。`))return;const t=document.getElementById("lineUnlinkBtn");t&&(t.disabled=!0,t.textContent="解除中...");try{await G(m.uid),u&&(delete u.lineUserId,delete u.lineDisplayName,delete u.linePictureUrl,delete u.lineNotify,delete u.lineLinkedAt),j(u||{}),alert("LINE連携を解除しました")}catch(n){alert("連携の解除に失敗しました: "+(n?.message||String(n)))}finally{t&&(t.disabled=!1,t.textContent="連携を解除")}};window.toggleReasonDetail=function(){const t=document.getElementById("applyReason").value,n=document.getElementById("applyReasonDetailField"),e=document.getElementById("applyReasonDetailLabel"),a=document.getElementById("applyReasonDetail");t==="部活動"?(n.style.display="",e.innerHTML='部活動名<span class="cf-req">必須</span>',a.placeholder="例: 野球部"):t==="その他"?(n.style.display="",e.innerHTML='内容<span class="cf-req">必須</span>',a.placeholder="例: 大学のオープンキャンパス参加"):(n.style.display="none",a.value="")};setTimeout(()=>{window.toggleReasonDetail()},0);window.addDateField=function(){const t=document.getElementById("applyDatesWrap"),n=document.createElement("div");n.style.cssText="display:flex;gap:8px;align-items:center",n.innerHTML=`
    <input class="cf-input apply-date" type="date" style="flex:1">
    <button onclick="this.parentElement.remove()" style="padding:9px 13px;border:1.5px solid var(--border);border-radius:8px;background:var(--surface2);color:var(--enjii);cursor:pointer;font-size:16px;font-weight:600">−</button>
  `,t.appendChild(n)};let $=null;async function re(){if($)return $;try{$=await N()}catch(t){console.warn("[teacher-suggest] failed to load teacher directory",t),$=[]}return $}function x(t){return String(t||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function ce(t,n){const e=t.slice();for(let a=e.length-1;a>0;a--){const s=Math.floor(Math.random()*(a+1));[e[a],e[s]]=[e[s],e[a]]}return e.slice(0,n)}function D(t,n){const e=document.getElementById(t),a=document.getElementById(n);if(!e||!a)return;function s(l){if(!l.length){a.classList.remove("open"),a.innerHTML="";return}a.innerHTML=l.map(r=>`
      <div class="es-item" data-email="${x(r.email)}">
        <span class="es-name">${x(r.name||r.email)}</span>
        <span class="es-email">${x(r.email)}</span>
      </div>`).join("")+'<div class="es-hint">登録されていない先生の場合はそのまま直接入力できます</div>',a.classList.add("open")}function o(){const l=$||[];if(!l.length){a.classList.remove("open");return}const r=e.value.trim().toLowerCase();if(!r)s(ce(l,Math.min(3,l.length)));else{const d=l.filter(y=>y.email.toLowerCase().startsWith(r));s(d.slice(0,8))}}e.addEventListener("focus",async()=>{L(u)&&(await re(),o())}),e.addEventListener("input",()=>{L(u)&&$&&o()}),a.addEventListener("mousedown",l=>{const r=l.target.closest(".es-item");r&&(l.preventDefault(),e.value=r.dataset.email,a.classList.remove("open"),a.innerHTML="")}),document.addEventListener("click",l=>{l.target===e||a.contains(l.target)||a.classList.remove("open")})}D("applySupervisorEmail","applySupervisorEmailDD");D("applyHomeRoomEmail","applyHomeRoomEmailDD");window.submitApply=async function(){if(!m){alert("ログインが必要です");return}const t=document.getElementById("applyTitle").value.trim(),n=document.getElementById("applyReason").value,e=document.getElementById("applyReasonDetail").value.trim(),a=document.getElementById("applySupervisorEmail").value.trim(),s=document.getElementById("applyHomeRoomEmail").value.trim(),o=[...document.querySelectorAll(".apply-date")].map(h=>h.value).filter(Boolean),l=document.getElementById("applyErrMsg"),r=h=>{l.textContent=h,l.style.display=""};if(l.style.display="none",!t){r("件名を入力してください");return}if((n==="部活動"||n==="その他")&&!e){r(n==="部活動"?"部活動名を入力してください":"内容を入力してください");return}if(o.length===0){r("公欠日を1日以上入力してください");return}if(!a.includes("@")){r("顧問のメールアドレスを正しく入力してください");return}if(!s.includes("@")){r("担任のメールアドレスを正しく入力してください");return}const d=o.join("、"),y=e?`${n}（${e}）`:n;if(!confirm(`以下の内容で申請します。

件名: ${t}
公欠日: ${d}
事由: ${y}
顧問: ${a}
担任: ${s}

よろしいですか？`))return;const p=document.getElementById("applySubmitBtn");p.disabled=!0,p.textContent="送信中...";try{const h=await q({studentId:m.uid,studentName:u&&u.name||m.email,studentEmail:m.email,title:t,reason:n,reasonDetail:e,dates:o,supervisorEmail:a,homeRoomEmail:s});if(document.getElementById("applyForm").style.display="none",document.getElementById("applyDone").style.display="",!h.emailSent&&!document.getElementById("applyDone").querySelector(".email-warn")){const i=document.createElement("div");i.className="email-warn",i.style.cssText="font-size:12px;color:#856404;background:#fff3cd;padding:10px 14px;border-radius:8px;margin-top:12px;text-align:left";let v=h.emailError||"";v.includes("RESEND_FROM is not set")&&(v="RESEND_FROM が設定されていません。onboarding@resend.dev は Resend アカウント所有者への送信のみ可能です。ドメイン認証を完了し、環境変数を設定してください。"),i.innerHTML=`⚠️ 顧問への承認依頼メールの自動送信に失敗しました。<br>申請データは保存済みです。顧問の先生に直接ご連絡ください。<br><span style="font-size:11px;color:#666;margin-top:4px;display:block">${v}</span>`,document.getElementById("applyDone").querySelector(".card").appendChild(i)}}catch(h){r("送信に失敗しました: "+h.message),p.disabled=!1,p.textContent="申請する"}};window.resetApply=function(){document.getElementById("applyTitle").value="",document.getElementById("applyReasonDetail").value="",document.getElementById("applySupervisorEmail").value="",document.getElementById("applyHomeRoomEmail").value="";const t=document.getElementById("applyDatesWrap");t.innerHTML=`
    <div style="display:flex;gap:8px;align-items:center">
      <input class="cf-input apply-date" type="date" style="flex:1">
      <button onclick="addDateField()" style="padding:9px 13px;border:1.5px solid var(--border);border-radius:8px;background:var(--surface2);color:var(--text-2);cursor:pointer;font-size:16px;font-weight:600">＋</button>
    </div>`,document.getElementById("applyForm").style.display="",document.getElementById("applyDone").style.display="none",document.getElementById("applyErrMsg").style.display="none";const n=document.getElementById("applySubmitBtn");n.disabled=!1,n.textContent="申請する"};window.loadMyCases=async function(){if(!m)return;const t=document.getElementById("mypageCaseList");if(!t)return;t.innerHTML='<div style="padding:24px;text-align:center;color:var(--text-3);font-size:13px">読み込み中...</div>';const n={pending_supervisor:"顧問承認待ち",pending_homeroom:"担任承認待ち",approved:"承認完了",rejected:"差し戻し"},e={pending_supervisor:"#856404",pending_homeroom:"#004085",approved:"#155724",rejected:"#721c24"},a={pending_supervisor:"#fff3cd",pending_homeroom:"#cce5ff",approved:"#d4edda",rejected:"#f8d7da"};try{const s=m.uid,o=await P(s);if(!o.length){t.innerHTML='<div style="padding:32px;text-align:center;color:var(--text-3);font-size:13px">申請履歴はありません</div>';return}t.innerHTML=o.map(l=>{const r=(l.dates||[]).join("、"),d=l.status,y=[{label:"申請",done:!0,active:!1},{label:"顧問承認",done:["pending_homeroom","approved"].includes(d),active:d==="pending_supervisor"},{label:"担任承認",done:d==="approved",active:d==="pending_homeroom"},{label:"完了",done:d==="approved",active:!1}],c=d==="rejected",p=d==="pending_supervisor",h=c?`<div style="margin:12px 0;font-size:11.5px;color:#721c24;background:#f8d7da;padding:8px 12px;border-radius:6px">
             ❌ 差し戻されました${l.rejectedReason?"："+l.rejectedReason:""}
           </div>`:`<div style="display:flex;margin:14px 0 4px;gap:0">
             ${y.map(i=>`
               <div style="flex:1;text-align:center">
                 <div style="height:4px;border-radius:2px;margin-bottom:5px;background:${i.done?"var(--navy)":i.active?"#ffc107":"var(--border)"}"></div>
                 <span style="font-size:10px;font-weight:${i.done||i.active?"700":"400"};color:${i.done?"var(--navy)":i.active?"#856404":"var(--text-3)"}">${i.label}</span>
               </div>`).join("")}
           </div>`,g=p?`<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);display:flex;justify-content:flex-end">
             <button onclick="deleteMyCaseBtn('${l.id}')"
               style="font-size:11.5px;padding:6px 14px;border:1.5px solid var(--enjii);border-radius:7px;background:transparent;color:var(--enjii);cursor:pointer;font-family:inherit;font-weight:500;transition:background .15s"
               onmouseover="this.style.background='var(--enjii-bg)'" onmouseout="this.style.background='transparent'">
               申請を取り下げる
             </button>
           </div>`:"";return`
        <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:var(--r);padding:18px 20px;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
            <span style="font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:4px;color:${e[d]||"#888"};background:${a[d]||"#eee"}">${n[d]||d}</span>
            <span style="font-size:11px;color:var(--text-3);margin-left:auto">${l.createdAt?.toDate?l.createdAt.toDate().toLocaleDateString("ja"):""}</span>
          </div>
          <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px">${l.title||""}</div>
          <div style="font-size:12px;color:var(--text-3);margin-bottom:2px">${l.reason||""} ／ 📅 ${r}</div>
          ${h}
          ${g}
        </div>`}).join("")}catch(s){t.innerHTML=`<div style="padding:16px;color:var(--enjii);font-size:12px">読み込みエラー: ${s.message}</div>`}};const de=window.nav;window.nav=function(t,n){de(t,n),t==="mypage"&&window.loadMyCases()};window.doLogoutFront=async function(){await A(),m=null,u=null,T(),nav("home")};window.deleteMyCaseBtn=async function(t){if(!m){alert("ログインが必要です");return}if(confirm(`この申請を取り下げますか？
この操作は取り消せません。`))try{await U(t,m.uid),window.loadMyCases()}catch(n){const e=n?.message||String(n);e.includes("Firestore")||e.includes("permissions")?alert(`削除に失敗しました: Firestoreのセキュリティルールで操作が拒否されました。
Firebase Console でルールを更新してください。`):alert("削除に失敗しました: "+e)}};
