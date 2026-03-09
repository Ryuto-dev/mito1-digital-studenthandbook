import { db, auth } from '../firebase.js'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import {
  collection, doc, getDocs, getDoc,
  addDoc, setDoc, updateDoc, deleteDoc,
  orderBy, query, where,
} from 'firebase/firestore'
import { getCurrentProfile } from '../auth.js'

// =============================================
// STATE
// =============================================
let currentSection = 'dashboard'
let editingId = null
let editingType = null

// =============================================
// DOM READY
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  // Login
  document.getElementById('loginBtn')?.addEventListener('click', doLogin)
  document.getElementById('loginPass')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin()
  })

  // Logout
  document.getElementById('logoutBtnEl')?.addEventListener('click', doLogout)

  // Sidebar items
  document.querySelectorAll('.adm-sb-item[data-sec]').forEach(btn => {
    btn.addEventListener('click', () => switchSec(btn.dataset.sec))
  })

  // Add buttons
  document.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.add))
  })

  // Modal
  document.getElementById('modalSaveBtn')?.addEventListener('click', saveModal)
  document.getElementById('modalCancelBtn')?.addEventListener('click', closeModal)
  document.getElementById('modalCloseBtn')?.addEventListener('click', closeModal)
  document.getElementById('modalOverlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal()
  })

  // Event delegation for dynamically generated edit/delete/action buttons
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-edit],[data-delete],[data-nav],[data-save-action]')
    if (!btn) return
    if (btn.dataset.edit) {
      const [col, id] = btn.dataset.edit.split('|')
      openModal(col, id)
    }
    if (btn.dataset.delete) {
      const [col, id] = btn.dataset.delete.split('|')
      deleteItem(col, id)
    }
    if (btn.dataset.nav) {
      switchSec(btn.dataset.nav)
    }
    if (btn.dataset.saveAction === 'goals') saveGoals()
    if (btn.dataset.saveAction === 'council-activities') saveCouncilActivities()
    if (btn.dataset.saveAction === 'special-desc') saveSpecialDesc()
    if (btn.dataset.saveAction === 'charter-preamble') saveCharterPreamble()
  })
})

// =============================================
// AUTH — 管理者権限チェック
// =============================================
onAuthStateChanged(auth, async user => {
  if (user) {
    // Firestoreでユーザーのロールを確認
    const profile = await getCurrentProfile(user)
    if (!profile || profile.role !== 'admin') {
      // 管理者権限がない場合はログイン画面に戻す
      document.getElementById('loginErr').textContent = 'この機能は管理者のみアクセスできます'
      document.getElementById('loginScreen').classList.remove('hide')
      document.getElementById('appShell').classList.remove('show')
      await signOut(auth)
      return
    }
    document.getElementById('loginScreen').classList.add('hide')
    document.getElementById('appShell').classList.add('show')
    document.getElementById('headerUser').textContent = user.email
    loadSection('dashboard')
    // Load badge counts immediately on login
    loadBadgeCounts()
  } else {
    document.getElementById('loginScreen').classList.remove('hide')
    document.getElementById('appShell').classList.remove('show')
  }
})

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim()
  const pass  = document.getElementById('loginPass').value
  const btn   = document.getElementById('loginBtn')
  const err   = document.getElementById('loginErr')
  err.textContent = ''
  btn.disabled = true
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass)
    // ログイン成功後、ロールチェックはonAuthStateChangedで行われる
  } catch (e) {
    const msgs = {
      'auth/invalid-credential': 'メールアドレスまたはパスワードが違います',
      'auth/user-not-found':     'ユーザーが見つかりません',
      'auth/wrong-password':     'パスワードが違います',
      'auth/invalid-email':      'メールアドレスの形式が正しくありません',
    }
    err.textContent = msgs[e.code] || 'ログインに失敗しました（' + e.code + '）'
    btn.disabled = false
  }
}

async function doLogout() {
  await signOut(auth)
}

// =============================================
// NAVIGATION
// =============================================
function switchSec(sec) {
  currentSection = sec
  document.querySelectorAll('.adm-section').forEach(s => s.classList.remove('on'))
  document.querySelectorAll('.adm-sb-item').forEach(s => s.classList.remove('on'))
  document.getElementById('sec-' + sec)?.classList.add('on')
  document.querySelector(`.adm-sb-item[data-sec="${sec}"]`)?.classList.add('on')
  loadSection(sec)
}

async function loadSection(sec) {
  switch (sec) {
    case 'dashboard':        return loadDashboard()
    case 'history':          return loadList('history', renderHistoryList)
    case 'principals':       return loadList('principals', renderPrincipalsList)
    case 'goals':            return loadGoalsForm()
    case 'songs':            return loadList('songs', renderSongsList)
    case 'rules':            return loadList('rules', renderArticleList('rulesList'))
    case 'special':          return Promise.all([loadList('special', renderArticleList('specialList')), loadSpecialDescForm()])
    case 'curriculum':       return loadList('curriculum', renderCurriculumList)
    case 'events':           return loadList('events', renderEventsList)
    case 'council-activities': return loadCouncilActivitiesForm()
    case 'council-charter':  return Promise.all([loadList('council-charter', renderArticleList('councilCharterList')), loadCharterPreambleForm()])
    case 'council-rules':    return loadList('council-rules', renderArticleList('councilRulesList'))
    case 'inquiries':        return loadInquiries()
    case 'cases':            return loadAdminCases()
    case 'users':            return loadUsers()
  }
}

// =============================================
// HELPERS
// =============================================
async function loadList(col, renderFn) {
  const q = query(collection(db, col), orderBy('order', 'asc'))
  try {
    const snap = await getDocs(q)
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    renderFn(items)
  } catch (e) {
    // orderフィールドがない場合はorderなしで取得
    const snap = await getDocs(collection(db, col))
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    renderFn(items)
  }
}

function showToast(msg) {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.classList.add('show')
  setTimeout(() => t.classList.remove('show'), 2500)
}

function emptyState(msg = 'まだデータがありません') {
  return `<div class="empty-state">
    <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    <p>${msg}</p>
  </div>`
}

// =============================================
// DASHBOARD
// =============================================
async function loadDashboard() {
  const grid = document.getElementById('dashGrid')

  const DASH_ICONS = {
    rules:            { bg: '#1a2744', svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' },
    special:          { bg: '#6c3483', svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>' },
    events:           { bg: '#2471a3', svg: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' },
    history:          { bg: '#1e8449', svg: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>' },
    principals:       { bg: '#d4ac0d', svg: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
    songs:            { bg: '#cb4335', svg: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>' },
    curriculum:       { bg: '#117a65', svg: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>' },
    'council-charter':{ bg: '#8b1a2c', svg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' },
    'council-rules':  { bg: '#7d6608', svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' },
  }

  const sections = [
    { col: 'rules',           label: '諸規定（本則）',     sec: 'rules',           unit: '条' },
    { col: 'special',         label: '特別教育活動',       sec: 'special',          unit: '条' },
    { col: 'events',          label: '年間主要行事',       sec: 'events',           unit: '件' },
    { col: 'history',         label: '本校の沿革',         sec: 'history',          unit: '件' },
    { col: 'principals',      label: '歴代校長',           sec: 'principals',       unit: '名' },
    { col: 'songs',           label: '歌詞',               sec: 'songs',            unit: '曲' },
    { col: 'curriculum',      label: '教育課程',           sec: 'curriculum',       unit: '科目' },
    { col: 'council-charter', label: '知道生徒会憲章',     sec: 'council-charter',  unit: '条' },
    { col: 'council-rules',   label: '生徒会関係諸規定',   sec: 'council-rules',    unit: '条' },
  ]
  const counts = await Promise.all(
    sections.map(s => getDocs(collection(db, s.col)).then(sn => sn.size).catch(() => 0))
  )

  // Also fetch inquiries/cases counts for the summary
  let inquiryNewCount = 0, casePendingCount = 0, totalUsers = 0
  try {
    const [iqSnap, csSnap, usSnap] = await Promise.all([
      getDocs(collection(db, 'inquiries')),
      getDocs(collection(db, 'cases')),
      getDocs(collection(db, 'users')),
    ])
    inquiryNewCount = iqSnap.docs.filter(d => d.data().status === 'new').length
    casePendingCount = csSnap.docs.filter(d => ['pending_supervisor','pending_homeroom'].includes(d.data().status)).length
    totalUsers = usSnap.size
  } catch(e) { /* ignore */ }

  const totalContent = counts.reduce((a, b) => a + b, 0)

  grid.innerHTML = `
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
          <div class="dash-summary-num">${totalContent}</div>
          <div class="dash-summary-label">全コンテンツ数</div>
        </div>
      </div>
      <div class="dash-summary-card" style="cursor:pointer" data-nav="inquiries">
        <div class="dash-summary-icon" style="background:linear-gradient(135deg,#c0392b,#e74c3c)">
          <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div class="dash-summary-info">
          <div class="dash-summary-num">${inquiryNewCount}</div>
          <div class="dash-summary-label">未対応のお問い合わせ</div>
        </div>
      </div>
      <div class="dash-summary-card" style="cursor:pointer" data-nav="cases">
        <div class="dash-summary-icon" style="background:linear-gradient(135deg,#856404,#d4ac0d)">
          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
        </div>
        <div class="dash-summary-info">
          <div class="dash-summary-num">${casePendingCount}</div>
          <div class="dash-summary-label">承認待ち公欠申請</div>
        </div>
      </div>
      <div class="dash-summary-card" style="cursor:pointer" data-nav="users">
        <div class="dash-summary-icon" style="background:linear-gradient(135deg,#1e8449,#27ae60)">
          <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div class="dash-summary-info">
          <div class="dash-summary-num">${totalUsers}</div>
          <div class="dash-summary-label">登録ユーザー</div>
        </div>
      </div>
    </div>

    <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:12px;padding-left:2px">コンテンツ管理</div>
    <div class="dash-grid" style="margin-bottom:0">
      ${sections.map((s, i) => {
        const ic = DASH_ICONS[s.col] || DASH_ICONS.rules
        return `
          <div class="dash-card">
            <div class="dash-card-top">
              <div class="dash-card-icon" style="background:${ic.bg}">
                <svg viewBox="0 0 24 24">${ic.svg}</svg>
              </div>
              <div class="dash-card-info">
                <div class="dash-card-num">${counts[i]}</div>
                <div class="dash-card-label">${s.label}</div>
              </div>
            </div>
            <div class="dash-card-bottom">
              <span class="dash-card-link" data-nav="${s.sec}">管理する <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></span>
              <span class="dash-card-tag">${counts[i]}${s.unit}</span>
            </div>
          </div>`
      }).join('')}
    </div>
  `
}

// =============================================
// BADGE COUNTS (load on site access)
// =============================================
async function loadBadgeCounts() {
  try {
    // Inquiries badge
    const iqSnap = await getDocs(query(collection(db, 'inquiries'), orderBy('createdAt', 'desc')))
    const newCount = iqSnap.docs.filter(d => d.data().status === 'new').length
    const iqBadge = document.getElementById('inquiryBadge')
    if (iqBadge) { iqBadge.textContent = newCount; iqBadge.style.display = newCount ? '' : 'none' }
  } catch(e) { /* ignore */ }

  try {
    // Cases badge
    const csSnap = await getDocs(query(collection(db, 'cases'), orderBy('createdAt', 'desc')))
    const pending = csSnap.docs.filter(d => ['pending_supervisor','pending_homeroom'].includes(d.data().status)).length
    const csBadge = document.getElementById('casesBadge')
    if (csBadge) { csBadge.textContent = pending; csBadge.style.display = pending ? '' : 'none' }
  } catch(e) { /* ignore */ }
}

// =============================================
// HISTORY
// =============================================
function renderHistoryList(items) {
  const el = document.getElementById('historyList')
  if (!items.length) { el.innerHTML = emptyState(); return }
  el.innerHTML = items.map(item => `
    <div class="history-row">
      <div class="history-year-cell">${item.year || ''}</div>
      <div class="history-event-cell">${item.event || ''}</div>
      <div class="item-actions">
        <button class="btn-icon" data-edit="history|${item.id}">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon del" data-delete="history|${item.id}">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>
      </div>
    </div>
  `).join('')
}

// =============================================
// PRINCIPALS
// =============================================
function renderPrincipalsList(items) {
  const el = document.getElementById('principalsList')
  if (!items.length) { el.innerHTML = emptyState(); return }
  el.innerHTML = items.map(item => `
    <div class="history-row" style="grid-template-columns:60px 1fr 1fr auto">
      <div><span class="item-num">${item.gen || ''}</span></div>
      <div class="history-event-cell">${item.name || ''}</div>
      <div class="history-year-cell">${item.term || ''}</div>
      <div class="item-actions">
        <button class="btn-icon" data-edit="principals|${item.id}">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon del" data-delete="principals|${item.id}">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    </div>
  `).join('')
}

// =============================================
// GOALS (single doc)
// =============================================
async function loadGoalsForm() {
  const el = document.getElementById('goalsForm')
  const snap = await getDoc(doc(db, 'content', 'goals')).catch(() => null)
  const data = snap?.data() || {}
  el.innerHTML = `
    <div class="form-row">
      <label>校是の画像URL</label>
      <input type="text" id="goalsImgUrl" value="${data.imageUrl || ''}" placeholder="https://...">
    </div>
    <div class="form-row">
      <label>就学の目標（本文）</label>
      <textarea id="goalsText" rows="8" placeholder="目標の内容を入力...">${data.text || ''}</textarea>
    </div>
    <button class="btn-save" style="margin-top:8px" data-save-action="goals">保存</button>
  `
}

async function saveGoals() {
  const imageUrl = document.getElementById('goalsImgUrl').value.trim()
  const text     = document.getElementById('goalsText').value.trim()
  await setDoc(doc(db, 'content', 'goals'), { imageUrl, text })
  showToast('就学の目標を保存しました')
}

// =============================================
// SONGS
// =============================================
function renderSongsList(items) {
  const el = document.getElementById('songsList')
  if (!items.length) { el.innerHTML = emptyState(); return }
  el.innerHTML = items.map(item => `
    <div class="item-card">
      <div class="item-card-header">
        <span class="item-num">${item.type || '校歌'}</span>
        <span class="item-title">${item.title || ''}</span>
        <div class="item-actions">
          <button class="btn-icon" data-edit="songs|${item.id}">
            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon del" data-delete="songs|${item.id}">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </div>
      <div class="item-card-body">
        <div class="item-body-text" style="white-space:pre-wrap">${(item.verses || []).map((v,i)=>`${i+1}番\n${v}`).join('\n\n')}</div>
      </div>
    </div>
  `).join('')
}

// =============================================
// ARTICLES (rules / special / charter / council-rules)
// =============================================
function renderArticleList(containerId) {
  // Map container ID to Firestore collection name
  const colMap = {
    rulesList: 'rules',
    specialList: 'special',
    councilCharterList: 'council-charter',
    councilRulesList: 'council-rules',
  }
  const colName = colMap[containerId] || containerId.replace('List', '')
  return function(items) {
    const el = document.getElementById(containerId)
    if (!items.length) { el.innerHTML = emptyState(); return }
    el.innerHTML = items.map(item => `
      <div class="item-card">
        <div class="item-card-header">
          <span class="item-num">${item.number || ''}</span>
          <span class="item-title">${item.title || ''}</span>
          ${item.section ? `<span style="font-size:10px;color:var(--navy);background:rgba(26,39,68,.07);padding:2px 7px;border-radius:4px;margin-left:4px">${item.section}</span>` : ''}
          <div class="item-actions">
            <button class="btn-icon" data-edit="${colName}|${item.id}">
              <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon del" data-delete="${colName}|${item.id}">
              <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </div>
        </div>
        <div class="item-card-body">
          <div class="item-body-text">${item.body || ''}</div>
          ${(item.items||[]).length ? `<div style="margin-top:8px;font-size:12px;color:var(--text-3)">${item.items.filter(it => !/^[\s\t　]+/.test(it) && !/^[ア-ン][\s　.]/.test(it.trim())).length}項あり${item.items.some(it => /^[\s\t　]+/.test(it) || /^[ア-ン][\s　.]/.test(it.trim())) ? '（サブ項目含む）' : ''}</div>` : ''}
        </div>
      </div>
    `).join('')
  }
}

// =============================================
// CURRICULUM
// =============================================
function renderCurriculumList(items) {
  const el = document.getElementById('curriculumList')
  if (!items.length) { el.innerHTML = emptyState(); return }
  // Group by year
  const byYear = {}
  items.forEach(item => {
    const y = item.year || '2024'
    if (!byYear[y]) byYear[y] = []
    byYear[y].push(item)
  })
  el.innerHTML = Object.entries(byYear).map(([year, rows]) => `
    <div class="item-card" style="margin-bottom:14px">
      <div class="item-card-header" style="background:var(--surface2)">
        <span class="item-num">${year}年度入学</span>
        <span class="item-title">${rows.length}科目</span>
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
            ${rows.map(r => `
              <tr>
                <td style="padding:8px 12px;border-bottom:1px solid var(--border-2);color:var(--text-2)">${r.subject||''}</td>
                <td style="padding:8px 12px;border-bottom:1px solid var(--border-2);color:var(--text-2)">${r.course||''}</td>
                <td style="padding:8px 12px;text-align:center;border-bottom:1px solid var(--border-2);color:var(--text-2)">${r.y1||'—'}</td>
                <td style="padding:8px 12px;text-align:center;border-bottom:1px solid var(--border-2);color:var(--text-2)">${r.y2||'—'}</td>
                <td style="padding:8px 12px;text-align:center;border-bottom:1px solid var(--border-2);color:var(--text-2)">${r.y3||'—'}</td>
                <td style="padding:8px 12px;text-align:center;border-bottom:1px solid var(--border-2);color:var(--text-2)">${r.required||''}</td>
                <td style="padding:8px 12px;border-bottom:1px solid var(--border-2)">
                  <div style="display:flex;gap:4px">
                    <button class="btn-icon" data-edit="curriculum|${r.id}">
                      <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/></svg>
                    </button>
                    <button class="btn-icon del" data-delete="curriculum|${r.id}">
                      <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `).join('')
}

// =============================================
// EVENTS
// =============================================
function renderEventsList(items) {
  const el = document.getElementById('eventsList')
  if (!items.length) { el.innerHTML = emptyState(); return }
  const months = ['1','2','3','4','5','6','7','8','9','10','11','12']
  const byMonth = {}
  items.forEach(item => {
    const m = String(item.month || '1')
    if (!byMonth[m]) byMonth[m] = []
    byMonth[m].push(item)
  })
  el.innerHTML = months.filter(m => byMonth[m]).map(m => `
    <div class="item-card" style="margin-bottom:10px;overflow:hidden">
      <div class="item-card-header" style="background:var(--navy);color:white">
        <span style="font-family:'Noto Serif JP',serif;font-size:14px;font-weight:600">${m}月</span>
        <span style="font-size:12px;opacity:.6;margin-left:auto">${byMonth[m].length}件</span>
      </div>
      ${byMonth[m].map(item => `
        <div class="history-row" style="grid-template-columns:1fr auto">
          <div class="history-event-cell">${item.name || ''}</div>
          <div class="item-actions">
            <button class="btn-icon" data-edit="events|${item.id}">
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/></svg>
            </button>
            <button class="btn-icon del" data-delete="events|${item.id}">
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('')
}

// =============================================
// COUNCIL ACTIVITIES (single doc)
// =============================================
async function loadCouncilActivitiesForm() {
  const el = document.getElementById('councilActivitiesForm')
  const snap = await getDoc(doc(db, 'content', 'council-activities')).catch(() => null)
  const data = snap?.data() || {}
  // overview と committees を1つのフィールドに統合して表示
  const merged = [data.overview, data.committees].filter(Boolean).join('\n\n')
  el.innerHTML = `
    <div class="form-row">
      <label>生徒会活動の内容（本文）</label>
      <div style="font-size:11px;color:var(--text-3);margin-bottom:6px">
        1枠でまとめて入力してください。段落は空行で区切られます。
      </div>
      <textarea id="caContent" rows="12" style="width:100%;font-size:13px">${merged}</textarea>
    </div>
    <button class="btn-save" style="margin-top:8px" data-save-action="council-activities">保存</button>
  `
}

async function saveCouncilActivities() {
  const content = document.getElementById('caContent').value.trim()
  // 後方互換のため overview に保存、committees は空にする
  await setDoc(doc(db, 'content', 'council-activities'), { overview: content, committees: '' })
  showToast('生徒会活動を保存しました')
}

// =============================================
// 特別教育活動 説明文（content/special ドキュメント）
// =============================================
async function loadSpecialDescForm() {
  const el = document.getElementById('specialDescForm')
  if (!el) return
  const snap = await getDoc(doc(db, 'content', 'special')).catch(() => null)
  const data = snap?.data() || {}
  el.innerHTML = `
    <textarea id="specialDescription" rows="6" style="width:100%;font-size:13px;border:1.5px solid var(--border);border-radius:var(--r);padding:9px 12px;line-height:1.7;resize:vertical" placeholder="特別教育活動の目的や概要を入力...">${data.description || ''}</textarea>
    <button class="btn-save" style="margin-top:8px" data-save-action="special-desc">保存</button>
  `
}

async function saveSpecialDesc() {
  const description = document.getElementById('specialDescription').value.trim()
  // merge with existing data
  const snap = await getDoc(doc(db, 'content', 'special')).catch(() => null)
  const existing = snap?.data() || {}
  await setDoc(doc(db, 'content', 'special'), { ...existing, description })
  showToast('特別教育活動の説明文を保存しました')
}

// =============================================
// 知道生徒会憲章 前文（content/council-charter ドキュメント）
// =============================================
async function loadCharterPreambleForm() {
  const el = document.getElementById('charterPreambleForm')
  if (!el) return
  const snap = await getDoc(doc(db, 'content', 'council-charter')).catch(() => null)
  const data = snap?.data() || {}
  el.innerHTML = `
    <textarea id="charterPreamble" rows="6" style="width:100%;font-size:13px;border:1.5px solid var(--border);border-radius:var(--r);padding:9px 12px;line-height:1.7;resize:vertical" placeholder="憲章の前文を入力...">${data.preamble || ''}</textarea>
    <button class="btn-save" style="margin-top:8px" data-save-action="charter-preamble">保存</button>
  `
}

async function saveCharterPreamble() {
  const preamble = document.getElementById('charterPreamble').value.trim()
  const snap = await getDoc(doc(db, 'content', 'council-charter')).catch(() => null)
  const existing = snap?.data() || {}
  await setDoc(doc(db, 'content', 'council-charter'), { ...existing, preamble })
  showToast('憲章の前文を保存しました')
}

// =============================================
// MODAL
// =============================================
const MODAL_CONFIGS = {
  history: {
    title: '沿革',
    fields: () => `
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
    `,
    getData: () => ({
      year:  document.getElementById('f_year').value.trim(),
      event: document.getElementById('f_event').value.trim(),
      order: Number(document.getElementById('f_order').value),
    }),
    fill: (data) => {
      document.getElementById('f_year').value  = data.year  || ''
      document.getElementById('f_event').value = data.event || ''
      document.getElementById('f_order').value = data.order ?? 0
    }
  },
  principals: {
    title: '歴代校長',
    fields: () => `
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
    `,
    getData: () => ({
      gen:   document.getElementById('f_gen').value.trim(),
      name:  document.getElementById('f_name').value.trim(),
      term:  document.getElementById('f_term').value.trim(),
      order: Number(document.getElementById('f_order').value),
    }),
    fill: (data) => {
      document.getElementById('f_gen').value   = data.gen   || ''
      document.getElementById('f_name').value  = data.name  || ''
      document.getElementById('f_term').value  = data.term  || ''
      document.getElementById('f_order').value = data.order ?? 0
    }
  },
  songs: {
    title: '歌詞',
    fields: () => `
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
    `,
    getData: () => {
      const verses = [
        document.getElementById('f_v1').value.trim(),
        document.getElementById('f_v2').value.trim(),
        document.getElementById('f_v3').value.trim(),
      ].filter(Boolean)
      return {
        type:     document.getElementById('f_type').value,
        title:    document.getElementById('f_title').value.trim(),
        lyricist: document.getElementById('f_lyricist').value.trim(),
        composer: document.getElementById('f_composer').value.trim(),
        verses,
        order: Number(document.getElementById('f_order').value),
      }
    },
    fill: (data) => {
      document.getElementById('f_type').value     = data.type     || '校歌'
      document.getElementById('f_title').value    = data.title    || ''
      document.getElementById('f_lyricist').value = data.lyricist || ''
      document.getElementById('f_composer').value = data.composer || ''
      const v = data.verses || []
      document.getElementById('f_v1').value = v[0] || ''
      document.getElementById('f_v2').value = v[1] || ''
      document.getElementById('f_v3').value = v[2] || ''
      document.getElementById('f_order').value = data.order ?? 0
    }
  },
  events: {
    title: '年間行事',
    fields: () => `
      <div class="form-row">
        <label>月</label>
        <select id="f_month">
          ${[...Array(12)].map((_,i)=>`<option value="${i+1}">${i+1}月</option>`).join('')}
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
    `,
    getData: () => ({
      month: Number(document.getElementById('f_month').value),
      name:  document.getElementById('f_name').value.trim(),
      order: Number(document.getElementById('f_order').value),
    }),
    fill: (data) => {
      document.getElementById('f_month').value = data.month || 1
      document.getElementById('f_name').value  = data.name  || ''
      document.getElementById('f_order').value = data.order ?? 0
    }
  },
  curriculum: {
    title: '教育課程',
    fields: () => `
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
    `,
    getData: () => ({
      year:     document.getElementById('f_year').value.trim(),
      subject:  document.getElementById('f_subject').value.trim(),
      course:   document.getElementById('f_course').value.trim(),
      y1:       document.getElementById('f_y1').value.trim(),
      y2:       document.getElementById('f_y2').value.trim(),
      y3:       document.getElementById('f_y3').value.trim(),
      required: document.getElementById('f_required').value,
      order:    Number(document.getElementById('f_order').value),
    }),
    fill: (data) => {
      document.getElementById('f_year').value     = data.year     || ''
      document.getElementById('f_subject').value  = data.subject  || ''
      document.getElementById('f_course').value   = data.course   || ''
      document.getElementById('f_y1').value       = data.y1       || ''
      document.getElementById('f_y2').value       = data.y2       || ''
      document.getElementById('f_y3').value       = data.y3       || ''
      document.getElementById('f_required').value = data.required || '必修'
      document.getElementById('f_order').value    = data.order    ?? 0
    }
  },
}

// Article types share the same form
const articleForm = (type) => ({
  title: '条文',
  fields: () => `
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
    ${type === 'council-charter' ? `
    <div class="form-row">
      <label>セクション（任意 — 例: 総則、細則）</label>
      <input type="text" id="f_section" placeholder="総則">
      <div style="font-size:10.5px;color:var(--text-3);margin-top:3px">条文が「総則」「細則」などのセクションに分かれる場合に指定</div>
    </div>
    ` : ''}
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
  `,
  getData: () => {
    const data = {
      number:  document.getElementById('f_number').value.trim(),
      title:   document.getElementById('f_title_art').value.trim(),
      chapter: document.getElementById('f_chapter').value.trim(),
      body:    document.getElementById('f_body').value.trim(),
      items:   document.getElementById('f_items').value.trim().split('\n').filter(Boolean),
      order:   Number(document.getElementById('f_order').value),
    }
    const sectionEl = document.getElementById('f_section')
    if (sectionEl) data.section = sectionEl.value.trim()
    return data
  },
  fill: (data) => {
    document.getElementById('f_number').value    = data.number  || ''
    document.getElementById('f_title_art').value = data.title   || ''
    document.getElementById('f_chapter').value   = data.chapter || ''
    document.getElementById('f_body').value      = data.body    || ''
    document.getElementById('f_items').value     = (data.items || []).join('\n')
    document.getElementById('f_order').value     = data.order   ?? 0
    const sectionEl = document.getElementById('f_section')
    if (sectionEl) sectionEl.value = data.section || ''
  }
})

MODAL_CONFIGS['rules']           = articleForm('rules')
MODAL_CONFIGS['special']         = articleForm('special')
MODAL_CONFIGS['council-charter'] = articleForm('council-charter')
MODAL_CONFIGS['council-rules']   = articleForm('council-rules')

// Map containerId back to collection name
const CONTAINER_TO_COL = {
  rulesList: 'rules', specialList: 'special',
  councilCharterList: 'council-charter', councilRulesList: 'council-rules',
}

async function openModal(type, id = null) {
  editingType = type
  editingId   = id
  const cfg = MODAL_CONFIGS[type]
  if (!cfg) return

  document.getElementById('modalTitle').textContent = (id ? '編集 — ' : '追加 — ') + cfg.title
  document.getElementById('modalBody').innerHTML = cfg.fields()

  // bind inline save buttons (goals / council-activities)
  document.getElementById('modalBody').querySelectorAll('[data-action]').forEach(btn => {
    if (btn.dataset.action === 'saveGoals') btn.addEventListener('click', saveGoals)
    if (btn.dataset.action === 'saveCouncilActivities') btn.addEventListener('click', saveCouncilActivities)
  })

  if (id) {
    const snap = await getDoc(doc(db, type, id))
    if (snap.exists()) cfg.fill(snap.data())
  }

  document.getElementById('modalOverlay').classList.add('open')
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open')
  editingId = null; editingType = null
}

async function saveModal() {
  const cfg = MODAL_CONFIGS[editingType]
  if (!cfg) return
  const btn = document.getElementById('modalSaveBtn')
  btn.disabled = true
  try {
    const data = cfg.getData()
    if (editingId) {
      await updateDoc(doc(db, editingType, editingId), data)
      showToast('更新しました')
    } else {
      await addDoc(collection(db, editingType), data)
      showToast('追加しました')
    }
    closeModal()
    loadSection(currentSection)
  } catch (e) {
    showToast('エラーが発生しました: ' + e.message)
  }
  btn.disabled = false
}

async function deleteItem(col, id) {
  if (!confirm('削除しますか？')) return
  try {
    await deleteDoc(doc(db, col, id))
    showToast('削除しました')
    loadSection(currentSection)
  } catch (e) {
    const msg = e?.message || String(e)
    if (msg.includes('Missing or insufficient permissions')) {
      alert('削除に失敗しました: Firestoreのセキュリティルールで操作が拒否されました。\nFirebase Console でルールを更新してください（firestore.rules を参照）。')
    } else {
      alert('削除に失敗しました: ' + msg)
    }
  }
}

// =============================================
// お問い合わせ管理
// =============================================
const AI_URL = 'https://mito1-hundbook.asanuma-ryuto.workers.dev'
const CATEGORY_LABELS = { bug:'バグ・不具合', feature:'機能要望', content:'内容修正依頼', other:'その他' }
const STATUS_LABELS   = { new:'未対応', replied:'返信済', closed:'完了' }
const STATUS_COLORS   = { new:'#c0392b', replied:'#2980b9', closed:'#27ae60' }

window.loadInquiries = async function() {
  const el = document.getElementById('inquiriesList')
  if (!el) return
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div>読み込み中...</div>'
  const filter = document.getElementById('inquiryFilter')?.value || 'all'

  try {
    const snap = await getDocs(query(collection(db, 'inquiries'), orderBy('createdAt', 'desc')))
    let items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    if (filter !== 'all') items = items.filter(i => i.status === filter)

    // バッジ更新
    const newCount = snap.docs.filter(d => d.data().status === 'new').length
    const badge = document.getElementById('inquiryBadge')
    if (badge) { badge.textContent = newCount; badge.style.display = newCount ? '' : 'none' }

    if (!items.length) { el.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-3)">該当するお問い合わせはありません</div>'; return }

    el.innerHTML = items.map(item => `
      <div class="item-card" id="inq-${item.id}" style="margin-bottom:12px">
        <div style="display:flex;align-items:flex-start;gap:12px;padding:18px 20px">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
              <span style="font-size:10px;font-weight:700;color:${STATUS_COLORS[item.status]||'#888'};background:${STATUS_COLORS[item.status]||'#888'}18;border-radius:4px;padding:2px 8px">${STATUS_LABELS[item.status]||item.status}</span>
              <span style="font-size:10px;color:var(--text-3);background:var(--surface2);border-radius:4px;padding:2px 8px">${CATEGORY_LABELS[item.category]||item.category||'その他'}</span>
              <span style="font-size:11px;color:var(--text-3);margin-left:auto">${item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString('ja') : ''}</span>
            </div>
            <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px">${escHtml(item.subject||'（件名なし）')}</div>
            <div style="font-size:12px;color:var(--text-3);margin-bottom:6px">差出人: ${escHtml(item.name||'不明')} &lt;${escHtml(item.email||'')}&gt;</div>
            <div style="font-size:13px;color:var(--text-2);white-space:pre-wrap;border-left:3px solid var(--border);padding-left:10px;margin-bottom:12px">${escHtml(item.body||'')}</div>
            ${item.reply ? `<div style="font-size:12px;color:var(--text-3);border:1px solid var(--border);border-radius:8px;padding:10px 12px;background:var(--surface2)"><strong>返信済み内容:</strong><br><span style="white-space:pre-wrap">${escHtml(item.reply)}</span></div>` : ''}
          </div>
        </div>
        <div style="padding:0 20px 16px;display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
          <textarea id="reply-${item.id}" rows="3" placeholder="返信内容を入力（メールで送信する文章）"
            style="flex:1;min-width:200px;border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:13px;resize:vertical;background:var(--surface);color:var(--text)">${escHtml(item.reply||'')}</textarea>
          <div style="display:flex;flex-direction:column;gap:6px">
            <button onclick="draftReply('${item.id}','${escAttr(item.subject)}','${escAttr(item.body)}')"
              style="font-size:11px;padding:6px 12px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);cursor:pointer;color:var(--text-2)">
              ✦ AIで下書き
            </button>
            <button onclick="saveReply('${item.id}')"
              style="font-size:11px;padding:6px 12px;border:none;border-radius:6px;background:var(--navy);cursor:pointer;color:#fff">
              返信内容を保存
            </button>
            <button onclick="sendReplyEmail('${item.id}', event)"
              style="font-size:11px;padding:6px 12px;border:none;border-radius:6px;background:#27ae60;cursor:pointer;color:#fff">
              📧 メールで送信
            </button>
            <select onchange="changeStatus('${item.id}',this.value)"
              style="font-size:11px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text)">
              ${Object.entries(STATUS_LABELS).map(([k,v])=>`<option value="${k}"${item.status===k?' selected':''}>${v}</option>`).join('')}
            </select>
            <button onclick="deleteInquiry('${item.id}')"
              style="font-size:11px;padding:6px 12px;border:1px solid #e74c3c;border-radius:6px;background:transparent;cursor:pointer;color:#e74c3c;margin-top:4px">
              削除
            </button>
          </div>
        </div>
      </div>
    `).join('')
  } catch(e) {
    el.innerHTML = `<div style="padding:20px;color:#c0392b">読み込みエラー: ${e.message}</div>`
  }
}

function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }
function escAttr(s){ return String(s).replace(/'/g,"\\'").replace(/\n/g,' ').slice(0,100) }

window.draftReply = async function(id, subject, body) {
  const ta = document.getElementById('reply-'+id)
  if (!ta) return
  ta.value = 'AI生成中...'
  try {
    const prompt = `以下のお問い合わせに対する丁寧な返信メール文を日本語で作成してください。
学校名：茨城県立水戸第一高等学校
件名：${subject}
内容：${body}
---
・200字程度・生徒への敬意ある丁寧な文体・回答がない場合は確認中と書く`
    const res = await fetch(AI_URL, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    })
    const text = await res.text()
    const d = JSON.parse(text)
    const answer = d.candidates?.[0]?.content?.parts?.[0]?.text || d.text || d.result || '生成できませんでした'
    ta.value = answer
  } catch(e) {
    ta.value = `エラー: ${e.message}`
  }
}

window.saveReply = async function(id) {
  const ta = document.getElementById('reply-'+id)
  if (!ta) return
  await updateDoc(doc(db, 'inquiries', id), { reply: ta.value, status: 'replied' })
  showToast('返信内容を保存しました')
  loadInquiries()
}

// メールで返信を送信
window.sendReplyEmail = async function(id, evt) {
  const ta = document.getElementById('reply-'+id)
  if (!ta || !ta.value.trim()) { showToast('返信内容を入力してください'); return }

  // お問い合わせデータを取得
  const snap = await getDoc(doc(db, 'inquiries', id))
  if (!snap.exists()) { showToast('お問い合わせが見つかりません'); return }
  const data = snap.data()
  if (!data.email) { showToast('送信先メールアドレスがありません'); return }

  const btn = evt ? evt.currentTarget : document.querySelector(`#inq-${id} button[onclick*="sendReplyEmail"]`)
  if (btn) {
    btn.disabled = true
    btn.textContent = '送信中...'
  }

  try {
    const res = await fetch(AI_URL + '/send-reply', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        recipientEmail: data.email,
        recipientName: data.name || '',
        subject: data.subject || 'お問い合わせ',
        replyBody: ta.value.trim(),
        appBaseUrl: window.location.origin,
      })
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`送信失敗 (${res.status}): ${detail}`)
    }
    // 返信内容も保存
    await updateDoc(doc(db, 'inquiries', id), { reply: ta.value, status: 'replied' })
    showToast('メールを送信しました')
    loadInquiries()
  } catch(e) {
    showToast('メール送信エラー: ' + e.message)
    if (btn) {
      btn.disabled = false
      btn.textContent = '📧 メールで送信'
    }
  }
}

window.changeStatus = async function(id, status) {
  await updateDoc(doc(db, 'inquiries', id), { status })
  showToast('ステータスを変更しました')
  loadInquiries()
}

window.deleteInquiry = async function(id) {
  if (!confirm('このお問い合わせを削除しますか？\nこの操作は取り消せません。')) return
  await deleteDoc(doc(db, 'inquiries', id))
  showToast('削除しました')
  loadInquiries()
}

// =============================================
// 公欠申請ケース管理
// =============================================
const CASE_STATUS_LABEL = { pending_supervisor:'顧問承認待ち', pending_homeroom:'担任承認待ち', approved:'承認済み', rejected:'差し戻し' }
const CASE_STATUS_COLOR = { pending_supervisor:'#856404', pending_homeroom:'#004085', approved:'#155724', rejected:'#721c24' }
const CASE_STATUS_BG    = { pending_supervisor:'#fff3cd', pending_homeroom:'#cce5ff', approved:'#d4edda', rejected:'#f8d7da' }

window.loadAdminCases = async function() {
  const el = document.getElementById('adminCasesList')
  if (!el) return
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div>読み込み中...</div>'
  const filter = document.getElementById('casesFilter')?.value || 'all'

  try {
    const { getDocs: gds, query: qr, collection: col, orderBy: ob } = await import('firebase/firestore')
    let snap = await gds(qr(col(db, 'cases'), ob('createdAt', 'desc')))
    let items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    if (filter !== 'all') items = items.filter(c => c.status === filter)

    // バッジ（承認待ち件数）
    const pending = snap.docs.filter(d => ['pending_supervisor','pending_homeroom'].includes(d.data().status)).length
    const badge = document.getElementById('casesBadge')
    if (badge) { badge.textContent = pending; badge.style.display = pending ? '' : 'none' }

    if (!items.length) { el.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-3)">該当するケースはありません</div>'; return }

    el.innerHTML = items.map(c => {
      const datesStr = (c.dates||[]).join('、')
      const st = c.status
      const steps = [
        { label:'申請',   done:true },
        { label:'顧問承認', done:['pending_homeroom','approved'].includes(st), active:st==='pending_supervisor' },
        { label:'担任承認', done:st==='approved', active:st==='pending_homeroom' },
        { label:'完了',   done:st==='approved' },
      ]
      const progressBar = st === 'rejected'
        ? `<span style="font-size:11px;color:#721c24">❌ 差し戻し${c.rejectedReason?'：'+c.rejectedReason:''}</span>`
        : `<div style="display:flex;gap:0;margin-top:8px">${steps.map(s=>`
            <div style="flex:1;text-align:center">
              <div style="height:3px;border-radius:2px;margin-bottom:4px;background:${s.done?'#1a2744':s.active?'#ffc107':'#e0e0e0'}"></div>
              <span style="font-size:9.5px;color:${s.done?'#1a2744':s.active?'#856404':'#aaa'};font-weight:${s.done||s.active?700:400}">${s.label}</span>
            </div>`).join('')}</div>`

      return `
        <div class="item-card" style="margin-bottom:12px;padding:18px 20px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
            <span style="font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:4px;color:${CASE_STATUS_COLOR[st]||'#888'};background:${CASE_STATUS_BG[st]||'#eee'}">${CASE_STATUS_LABEL[st]||st}</span>
            <span style="font-size:11px;color:var(--text-3);margin-left:auto">${c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString('ja') : ''}</span>
          </div>
          <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px">${escHtml(c.title||'')}</div>
          <div style="font-size:12px;color:var(--text-3);margin-bottom:2px">申請者: <strong>${escHtml(c.studentName||'')}</strong> &lt;${escHtml(c.studentEmail||'')}&gt;</div>
          <div style="font-size:12px;color:var(--text-3);margin-bottom:2px">公欠日: ${escHtml(datesStr)} ／ 事由: ${escHtml(c.reasonDetail ? c.reason + '（' + c.reasonDetail + '）' : (c.reason||''))}</div>
          <div style="font-size:11.5px;color:var(--text-3)">顧問: ${escHtml(c.supervisorEmail||'')} ／ 担任: ${escHtml(c.homeRoomEmail||'')}</div>
          ${progressBar}
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);display:flex;justify-content:flex-end">
            <button onclick="deleteAdminCase('${c.id}')"
              style="font-size:11px;padding:5px 12px;border:1px solid #e74c3c;border-radius:6px;background:transparent;cursor:pointer;color:#e74c3c;font-family:inherit;transition:background .15s"
              onmouseover="this.style.background='#fdf0f0'" onmouseout="this.style.background='transparent'">
              削除
            </button>
          </div>
        </div>`
    }).join('')
  } catch(e) {
    el.innerHTML = `<div style="padding:20px;color:#c0392b">読み込みエラー: ${e.message}</div>`
  }
}

// 管理者：ケース削除
window.deleteAdminCase = async function(caseId) {
  if (!confirm('このケースを削除しますか？\nこの操作は取り消せません。')) return
  try {
    await deleteDoc(doc(db, 'cases', caseId))
    showToast('ケースを削除しました')
    loadAdminCases()
  } catch(e) {
    const msg = e?.message || String(e)
    if (msg.includes('Missing or insufficient permissions')) {
      alert('削除に失敗しました: Firestoreのセキュリティルールで操作が拒否されました。\nFirebase Console > Firestore Database > Rules でルールを更新してください。\n\n詳細: リポジトリの firestore.rules ファイルの内容をコピーして反映してください。')
    } else {
      alert('削除に失敗しました: ' + msg)
    }
  }
}

// =============================================
// ユーザー管理
// =============================================
const ROLE_LABELS = { student: '生徒', teacher: '先生', admin: '管理者' }
const ROLE_COLORS = { student: '#004085', teacher: '#856404', admin: '#155724' }
const ROLE_BGS    = { student: '#cce5ff', teacher: '#fff3cd', admin: '#d4edda' }

let allUsers = []
let userFilters = { role: 'all', grade: 'all', class: 'all', search: '' }

async function loadUsers() {
  const el = document.getElementById('usersList')
  if (!el) return
  el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div>読み込み中...</div>'

  try {
    const snap = await getDocs(collection(db, 'users'))
    allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    renderUsers()
  } catch(e) {
    el.innerHTML = `<div style="padding:20px;color:#c0392b">読み込みエラー: ${e.message}</div>`
  }
}

function renderUsers() {
  const el = document.getElementById('usersList')
  if (!el) return

  let filtered = [...allUsers]

  // ロールフィルタ
  if (userFilters.role !== 'all') {
    filtered = filtered.filter(u => u.role === userFilters.role)
  }
  // 学年フィルタ
  if (userFilters.grade !== 'all') {
    filtered = filtered.filter(u => String(u.grade) === userFilters.grade)
  }
  // クラスフィルタ
  if (userFilters.class !== 'all') {
    filtered = filtered.filter(u => String(u.class) === userFilters.class)
  }
  // 検索フィルタ
  if (userFilters.search) {
    const kw = userFilters.search.toLowerCase()
    filtered = filtered.filter(u =>
      (u.name||'').toLowerCase().includes(kw) ||
      (u.email||'').toLowerCase().includes(kw)
    )
  }

  // ソート: 先生→管理者→生徒（学年→クラス→番号）
  filtered.sort((a,b) => {
    const ro = { admin:0, teacher:1, student:2 }
    const rr = (ro[a.role]||9) - (ro[b.role]||9)
    if (rr !== 0) return rr
    if (a.grade !== b.grade) return (a.grade||0) - (b.grade||0)
    if (a.class !== b.class) return (a.class||0) - (b.class||0)
    return (a.number||0) - (b.number||0)
  })

  if (!filtered.length) {
    el.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-3)">該当するユーザーはいません</div>'
    return
  }

  el.innerHTML = `
    <div style="margin-bottom:8px;font-size:12px;color:var(--text-3)">
      全${allUsers.length}件中 ${filtered.length}件表示
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
            <th style="padding:9px 12px;text-align:center;border-bottom:2px solid var(--border);font-weight:600;color:var(--text-3);font-size:11px">管理者</th>
            <th style="padding:9px 12px;border-bottom:2px solid var(--border)"></th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(u => `
            <tr>
              <td style="padding:9px 12px;border-bottom:1px solid var(--border-2);color:var(--text);font-weight:500">${escHtml(u.name||'')}</td>
              <td style="padding:9px 12px;border-bottom:1px solid var(--border-2);color:var(--text-2);font-size:12px">${escHtml(u.email||'')}</td>
              <td style="padding:9px 12px;border-bottom:1px solid var(--border-2);text-align:center">
                <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;color:${ROLE_COLORS[u.role]||'#888'};background:${ROLE_BGS[u.role]||'#eee'}">${ROLE_LABELS[u.role]||u.role||'不明'}</span>
              </td>
              <td style="padding:9px 12px;border-bottom:1px solid var(--border-2);text-align:center;color:var(--text-2)">${u.grade||'—'}</td>
              <td style="padding:9px 12px;border-bottom:1px solid var(--border-2);text-align:center;color:var(--text-2)">${u.class||'—'}</td>
              <td style="padding:9px 12px;border-bottom:1px solid var(--border-2);text-align:center;color:var(--text-2)">${u.number||'—'}</td>
              <td style="padding:9px 12px;border-bottom:1px solid var(--border-2);text-align:center">
                ${u.role === 'admin' ? '<span style="color:#27ae60;font-weight:700">✓</span>' : '<span style="color:var(--text-3)">—</span>'}
              </td>
              <td style="padding:9px 12px;border-bottom:1px solid var(--border-2)">
                <div style="display:flex;gap:4px;justify-content:flex-end">
                  <button onclick="editUser('${u.id}')"
                    style="font-size:11px;padding:4px 10px;border:1px solid var(--border);border-radius:5px;background:var(--surface);cursor:pointer;color:var(--text-2);font-family:inherit">
                    編集
                  </button>
                  <button onclick="deleteUser('${u.id}','${escHtml(u.name||u.email||'')}')"
                    style="font-size:11px;padding:4px 10px;border:1px solid #e74c3c;border-radius:5px;background:transparent;cursor:pointer;color:#e74c3c;font-family:inherit">
                    削除
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`
}

window.filterUsers = function(type, value) {
  userFilters[type] = value
  renderUsers()
}

window.searchUsers = function(q) {
  userFilters.search = q
  renderUsers()
}

window.editUser = async function(uid) {
  const user = allUsers.find(u => u.id === uid)
  if (!user) return

  const overlay = document.getElementById('modalOverlay')
  document.getElementById('modalTitle').textContent = '編集 — ユーザー'
  document.getElementById('modalBody').innerHTML = `
    <div class="form-row">
      <label>氏名</label>
      <input type="text" id="f_user_name" value="${escHtml(user.name||'')}">
    </div>
    <div class="form-row">
      <label>メールアドレス</label>
      <input type="email" id="f_user_email" value="${escHtml(user.email||'')}" disabled style="opacity:0.6;cursor:not-allowed">
      <div style="font-size:10px;color:var(--text-3);margin-top:3px">※メールアドレスはFirebase Authenticationで管理されるためここでは変更できません</div>
    </div>
    <div class="form-row">
      <label>ロール</label>
      <select id="f_user_role">
        <option value="student" ${user.role==='student'?'selected':''}>生徒</option>
        <option value="teacher" ${user.role==='teacher'?'selected':''}>先生</option>
        <option value="admin" ${user.role==='admin'?'selected':''}>管理者</option>
      </select>
    </div>
    <div class="form-row-2 form-row" id="f_user_student_fields" style="${user.role==='student'?'':'display:none'}">
      <div>
        <label>学年</label>
        <select id="f_user_grade">
          <option value="">—</option>
          <option value="1" ${user.grade==1?'selected':''}>1年</option>
          <option value="2" ${user.grade==2?'selected':''}>2年</option>
          <option value="3" ${user.grade==3?'selected':''}>3年</option>
        </select>
      </div>
      <div>
        <label>クラス</label>
        <select id="f_user_class">
          <option value="">—</option>
          ${[1,2,3,4,5,6].map(i=>`<option value="${i}" ${user.class==i?'selected':''}>${i}組</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row" id="f_user_number_field" style="${user.role==='student'?'':'display:none'}">
      <label>出席番号</label>
      <input type="number" id="f_user_number" value="${user.number||''}" min="1" max="50">
    </div>
    <script>
      document.getElementById('f_user_role').addEventListener('change', function(){
        const isStudent = this.value === 'student';
        document.getElementById('f_user_student_fields').style.display = isStudent ? '' : 'none';
        document.getElementById('f_user_number_field').style.display = isStudent ? '' : 'none';
      });
    <\/script>
  `

  // Rebind modal save for user editing
  const saveBtn = document.getElementById('modalSaveBtn')
  const origHandler = saveBtn.onclick
  saveBtn.onclick = async function() {
    saveBtn.disabled = true
    try {
      const data = {
        name: document.getElementById('f_user_name').value.trim(),
        role: document.getElementById('f_user_role').value,
      }
      if (data.role === 'student') {
        const g = document.getElementById('f_user_grade').value
        const c = document.getElementById('f_user_class').value
        const n = document.getElementById('f_user_number').value
        if (g) data.grade = Number(g)
        if (c) data.class = c
        if (n) data.number = Number(n)
      }
      await updateDoc(doc(db, 'users', uid), data)
      showToast('ユーザーを更新しました')
      closeModal()
      loadUsers()
    } catch(e) {
      showToast('エラー: ' + e.message)
    }
    saveBtn.disabled = false
    saveBtn.onclick = origHandler
  }

  overlay.classList.add('open')
}

window.deleteUser = async function(uid, name) {
  if (!confirm(`ユーザー「${name}」の登録情報を削除しますか？\n※Firebase Authenticationのアカウント自体はFirebase Consoleから削除する必要があります。`)) return
  try {
    await deleteDoc(doc(db, 'users', uid))
    showToast('ユーザー情報を削除しました')
    loadUsers()
  } catch(e) {
    alert('削除に失敗しました: ' + (e?.message || String(e)))
  }
}
