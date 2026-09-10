import"./firebase--zY0ciXM.js";import{o as g}from"./auth-sQCKFxHS.js";import{c as f,a as b,e as h,s as y}from"./line-DblkRJQY.js";const d=document.getElementById("card"),c='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M24 10.3C24 5 18.6.7 12 .7S0 5 0 10.3c0 4.8 4.3 8.8 10 9.5.4.1.9.3 1.1.6.1.3.1.7.1 1l-.2 1.1c0 .3-.2 1.2 1.1.7 1.3-.6 7.2-4.2 9.7-7.2 1.7-1.9 2.2-3.8 2.2-5.7z"/></svg>';function a(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function i(e,r,s=!0){d.innerHTML=`
    <div class="line-mark" style="background:var(--enjii)">${c}</div>
    <div class="ttl">${a(e)}</div>
    <div class="err">${r}</div>
    ${s?'<a class="btn btn-primary" href="/#mypage">マイページへ戻る</a>':""}
    <a class="btn btn-ghost" href="/">ホームへ</a>
  `}function L(e,r){const s=e.pictureUrl?`<img src="${a(e.pictureUrl)}" alt="">`:`<div style="width:44px;height:44px;border-radius:50%;background:var(--line);display:flex;align-items:center;justify-content:center">${c.replace("width:40px","")}</div>`;d.innerHTML=`
    <div class="line-mark">${c}</div>
    <div class="badge-ok">✓ 連携完了</div>
    <div class="ttl">LINE連携が完了しました</div>
    <div class="sub">
      これから公欠申請の承認完了などのお知らせを<br>LINEでお届けします。
    </div>
    <div class="profile">
      ${s}
      <div style="text-align:left">
        <div class="pname">${a(e.displayName||"LINEアカウント")}</div>
        <div class="pmeta">このアカウントと連携しました</div>
      </div>
    </div>
    <div class="sub" style="font-size:11.5px">
      通知を受け取るには、公式アカウントを友だち追加したままにしてください。<br>
      連携はマイページからいつでも解除できます。
    </div>
    <a class="btn btn-primary" href="${a(r)}">マイページへ戻る</a>
  `}function E(){d.innerHTML=`
    <div class="line-mark" style="background:var(--navy)">${c}</div>
    <div class="ttl">ログインが必要です</div>
    <div class="sub">
      LINE連携は生徒手帳のアカウントに紐づけて行います。<br>
      ログインしてから、マイページの連携バナーをタップしてください。
    </div>
    <a class="btn btn-primary" href="/auth.html">ログイン</a>
  `}async function $(){const e=new URLSearchParams(location.search),r=e.get("error"),s=e.get("code"),l=e.get("state"),o=f(),v=b()||"/#mypage";if(r){const t=e.get("error_description")||"";r==="ACCESS_DENIED"?i("LINE連携をキャンセルしました","LINEの同意画面でキャンセルされました。<br>連携する場合はマイページからもう一度お試しください。"):i("LINE連携に失敗しました",`エラーコード: ${a(r)}<br>${a(t)}`);return}if(!s){i("リンクが無効です","認可コードが見つかりません。マイページの連携バナーから改めてお試しください。");return}if(!o||!l||o!==l){i("セキュリティ検証に失敗しました","リクエストの照合に失敗しました（state不一致）。<br>ブラウザのタブを開き直した場合などに発生します。マイページから改めて連携してください。");return}const u=await new Promise(t=>{let n=!1;const m=g(p=>{if(!n){n=!0;try{m()}catch{}t(p)}});setTimeout(()=>{n||(n=!0,t(null))},8e3)});if(!u){E();return}try{const t=await h(s);await y(u.uid,t),history.replaceState(null,"",location.pathname),L(t,v)}catch(t){i("LINE連携に失敗しました",a(t?.message||String(t)))}}$();
