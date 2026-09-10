import"./firebase--zY0ciXM.js";import{o as g,l as v,r as f,a as h,b,g as y}from"./auth-sQCKFxHS.js";const o="";document.getElementById("mainCard").innerHTML=`
  <div class="tabs">
    <div class="tab on" id="tabLogin" onclick="switchTab('login')">ログイン</div>
    <div class="tab" id="tabRegister" onclick="switchTab('register')">新規登録</div>
  </div>
  <div class="err" id="authErr"></div>

  <div class="section on" id="sec-login">
    <div class="form-group">
      <label class="form-label">メールアドレス <span class="req">必須</span></label>
      <input class="form-input" id="loginEmail" type="email" placeholder="example@mito1-h.ibk.ed.jp" autocomplete="email">
    </div>
    <div class="form-group">
      <label class="form-label">パスワード <span class="req">必須</span></label>
      <input class="form-input" id="loginPass" type="password" placeholder="パスワード" autocomplete="current-password">
    </div>
    <button class="btn-primary" id="loginBtn">ログイン</button>
    <div class="hint"><a id="resetLink">パスワードを忘れた方</a></div>
  </div>

  <div class="section" id="sec-register">
    <div class="role-tabs">
      <div class="role-tab on" id="roleStudent" onclick="switchRole('student')">生徒</div>
      <div class="role-tab" id="roleTeacher" onclick="switchRole('teacher')">先生</div>
    </div>

    <div id="formStudent">
      <div class="form-group">
        <label class="form-label">氏名 <span class="req">必須</span></label>
        <input class="form-input" id="regName" type="text" placeholder="山田 太郎">
      </div>
      <div class="row3">
        <div class="form-group">
          <label class="form-label">学年 <span class="req">必須</span></label>
          <select class="form-input" id="regGrade">
            <option value="1">1年</option><option value="2">2年</option><option value="3">3年</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">クラス <span class="req">必須</span></label>
          <select class="form-input" id="regClass">
            <option value="1">1組</option><option value="2">2組</option><option value="3">3組</option>
            <option value="4">4組</option><option value="5">5組</option><option value="6">6組</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">出席番号</label>
          <input class="form-input" id="regNumber" type="number" min="1" max="50" placeholder="1">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">メールアドレス <span class="req">必須</span></label>
        <input class="form-input" id="regEmail" type="email" placeholder="example@mito1-h.ibk.ed.jp">
        <div style="font-size:11px;color:var(--text-3);margin-top:4px">※学校のメールアドレス（@mito1-h.ibk.ed.jp）の使用を推奨します。</div>
      </div>
      <div class="row2">
        <div class="form-group">
          <label class="form-label">パスワード <span class="req">必須</span></label>
          <input class="form-input" id="regPass" type="password" placeholder="6文字以上">
        </div>
        <div class="form-group">
          <label class="form-label">確認</label>
          <input class="form-input" id="regPass2" type="password" placeholder="再入力">
        </div>
      </div>
      <button class="btn-primary" id="regStudentBtn">登録して始める</button>
    </div>

    <div id="formTeacher" style="display:none">
      <div class="form-group">
        <label class="form-label">氏名（フルネーム） <span class="req">必須</span></label>
        <input class="form-input" id="regTeacherName" type="text" placeholder="鈴木 太郎">
        <div style="font-size:11px;color:var(--text-3);margin-top:4px">※「先生」は付けずにフルネームで入力してください。ダッシュボードでは自動で「先生」が付加されます。</div>
      </div>
      <div class="form-group">
        <label class="form-label">メールアドレス <span class="req">必須</span></label>
        <input class="form-input" id="regTeacherEmail" type="email" placeholder="teacher@mito1-h.ibk.ed.jp">
        <div style="font-size:11px;color:var(--text-3);margin-top:4px">※学校のメールアドレス（@mito1-h.ibk.ed.jp）の使用を推奨します。</div>
      </div>
      <div class="row2">
        <div class="form-group">
          <label class="form-label">パスワード <span class="req">必須</span></label>
          <input class="form-input" id="regTeacherPass" type="password" placeholder="6文字以上">
        </div>
        <div class="form-group">
          <label class="form-label">確認</label>
          <input class="form-input" id="regTeacherPass2" type="password" placeholder="再入力">
        </div>
      </div>
      <button class="btn-primary" id="regTeacherBtn">登録して始める</button>
    </div>
  </div>
`;document.getElementById("loginBtn").addEventListener("click",B);document.getElementById("regStudentBtn").addEventListener("click",w);document.getElementById("regTeacherBtn").addEventListener("click",I);document.getElementById("resetLink").addEventListener("click",T);let r=!1;g(async e=>{!e||r||await E(e)});async function E(e){const t=await y(e);if(t){if(["moderator","admin_student","admin_teacher","owner"].includes(t.role)){location.href=o+"/admin/";return}if(t.role==="teacher"){location.href=o+"/teacher.html";return}}sessionStorage.setItem("mito1_nav","mypage"),location.href=o+"/"}function d(e){return{"auth/user-not-found":"このメールアドレスは登録されていません","auth/wrong-password":"パスワードが正しくありません","auth/invalid-credential":"メールアドレスまたはパスワードが正しくありません","auth/email-already-in-use":"このメールアドレスはすでに使用されています","auth/weak-password":"パスワードは6文字以上にしてください","auth/invalid-email":"メールアドレスの形式が正しくありません","auth/too-many-requests":"しばらく時間をおいてから再試行してください"}[e]||"エラー（"+e+"）"}function s(e){const t=document.getElementById("authErr");t&&typeof e=="string"&&(t.textContent=e,t.classList.add("show"))}function m(){document.getElementById("authErr")?.classList.remove("show")}function n(e,t,a){const l=document.getElementById(e);l&&(l.disabled=t,l.textContent=t?"処理中...":a)}async function B(){m();const e=document.getElementById("loginEmail").value.trim(),t=document.getElementById("loginPass").value;if(!e||!t){s("メールアドレスとパスワードを入力してください");return}n("loginBtn",!0,"ログイン");try{await v(e,t)}catch(a){s(d(a.code)),n("loginBtn",!1,"ログイン")}}async function w(){m();const e=document.getElementById("regName").value.trim(),t=document.getElementById("regGrade").value,a=document.getElementById("regClass").value,l=document.getElementById("regNumber").value,i=document.getElementById("regEmail").value.trim(),c=document.getElementById("regPass").value,u=document.getElementById("regPass2").value;if(!e||!i||!c){s("必須項目を入力してください");return}if(c!==u){s("パスワードが一致しません");return}if(c.length<6){s("パスワードは6文字以上にしてください");return}n("regStudentBtn",!0,"登録して始める"),r=!0;try{await f({email:i,password:c,name:e,grade:Number(t),classLabel:Number(a),number:l?Number(l):0}),location.href=o+"/"}catch(p){r=!1,s(d(p.code)),n("regStudentBtn",!1,"登録して始める")}}async function I(){m();const e=document.getElementById("regTeacherName").value.trim(),t=document.getElementById("regTeacherEmail").value.trim(),a=document.getElementById("regTeacherPass").value,l=document.getElementById("regTeacherPass2").value;if(!e||!t||!a){s("必須項目を入力してください");return}if(a!==l){s("パスワードが一致しません");return}if(a.length<6){s("パスワードは6文字以上にしてください");return}n("regTeacherBtn",!0,"登録して始める"),r=!0;try{await h({email:t,password:a,name:e}),location.href=o+"/teacher.html"}catch(i){r=!1,s(d(i.code)),n("regTeacherBtn",!1,"登録して始める")}}async function T(){const e=prompt("登録時のメールアドレスを入力してください");if(e)try{await b(e),alert("パスワードリセットメールを送信しました")}catch(t){alert("送信に失敗: "+d(t.code))}}window.switchTab=function(e){["login","register"].forEach(t=>{document.getElementById("tab"+(t==="login"?"Login":"Register"))?.classList.toggle("on",t===e),document.getElementById("sec-"+t)?.classList.toggle("on",t===e)}),document.getElementById("authErr")?.classList.remove("show")};window.switchRole=function(e){document.getElementById("roleStudent")?.classList.toggle("on",e==="student"),document.getElementById("roleTeacher")?.classList.toggle("on",e==="teacher"),document.getElementById("formStudent").style.display=e==="student"?"":"none",document.getElementById("formTeacher").style.display=e==="teacher"?"":"none"};
