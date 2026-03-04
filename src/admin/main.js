import { db, auth } from '../firebase.js'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import {
  collection, doc, getDocs, getDoc,
  addDoc, setDoc, updateDoc, deleteDoc,
  orderBy, query
} from 'firebase/firestore'

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
  })
})

// =============================================
// AUTH
// =============================================
onAuthStateChanged(auth, user => {
  if (user) {
    document.getElementById('loginScreen').classList.add('hide')
    document.getElementById('appShell').classList.add('show')
    document.getElementById('headerUser').textContent = user.email
    loadSection('dashboard')
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
    await signInWithEmailAndPassword(auth, email, pass)
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
    case 'special':          return loadList('special', renderArticleList('specialList'))
    case 'curriculum':       return loadList('curriculum', renderCurriculumList)
    case 'events':           return loadList('events', renderEventsList)
    case 'council-activities': return loadCouncilActivitiesForm()
    case 'council-charter':  return loadList('council-charter', renderArticleList('councilCharterList'))
    case 'council-rules':    return loadList('council-rules', renderArticleList('councilRulesList'))
    case 'inquiries':        return loadInquiries()
    case 'cases':            return loadAdminCases()
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
  const sections = [
    { col: 'rules',           label: '諸規定（本則）',     sec: 'rules' },
    { col: 'special',         label: '特別教育活動',       sec: 'special' },
    { col: 'events',          label: '年間主要行事',       sec: 'events' },
    { col: 'history',         label: '本校の沿革',         sec: 'history' },
    { col: 'principals',      label: '歴代校長',           sec: 'principals' },
    { col: 'songs',           label: '歌詞',               sec: 'songs' },
    { col: 'curriculum',      label: '教育課程',           sec: 'curriculum' },
    { col: 'council-charter', label: '知道生徒会憲章',     sec: 'council-charter' },
    { col: 'council-rules',   label: '生徒会関係諸規定',   sec: 'council-rules' },
  ]
  const counts = await Promise.all(
    sections.map(s => getDocs(collection(db, s.col)).then(sn => sn.size).catch(() => 0))
  )
  grid.innerHTML = sections.map((s, i) => `
    <div class="dash-card">
      <div class="dash-card-num">${counts[i]}</div>
      <div class="dash-card-label">${s.label}</div>
      <span class="dash-card-link" data-nav="${s.sec}">管理する →</span>
    </div>
  `).join('')
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
  return function(items) {
    const el = document.getElementById(containerId)
    if (!items.length) { el.innerHTML = emptyState(); return }
    el.innerHTML = items.map(item => `
      <div class="item-card">
        <div class="item-card-header">
          <span class="item-num">${item.number || ''}</span>
          <span class="item-title">${item.title || ''}</span>
          <div class="item-actions">
            <button class="btn-icon" data-edit="${containerId.replace('List','')}|${item.id}">
              <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon del" data-delete="${containerId.replace('List','')}|${item.id}">
              <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </div>
        </div>
        <div class="item-card-body">
          <div class="item-body-text">${item.body || ''}</div>
          ${(item.items||[]).length ? `<div style="margin-top:8px;font-size:12px;color:var(--text-3)">${item.items.length}項あり</div>` : ''}
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
    <div class="form-row">
      <label>章見出し（任意 — 例: 第一章 総則）</label>
      <input type="text" id="f_chapter" placeholder="第一章 総則">
    </div>
    <div class="form-row">
      <label>本文</label>
      <textarea id="f_body" rows="4" placeholder="条文の本文を入力..."></textarea>
    </div>
    <div class="form-row">
      <label>項（1行1項。空行で区切り）</label>
      <textarea id="f_items" rows="6" placeholder="1 授業に関すること&#10;2 施設の利用に関すること"></textarea>
    </div>
    <div class="form-row">
      <label>並び順</label>
      <input type="number" id="f_order" value="0">
    </div>
  `,
  getData: () => ({
    number:  document.getElementById('f_number').value.trim(),
    title:   document.getElementById('f_title_art').value.trim(),
    chapter: document.getElementById('f_chapter').value.trim(),
    body:    document.getElementById('f_body').value.trim(),
    items:   document.getElementById('f_items').value.trim().split('\n').filter(Boolean),
    order:   Number(document.getElementById('f_order').value),
  }),
  fill: (data) => {
    document.getElementById('f_number').value    = data.number  || ''
    document.getElementById('f_title_art').value = data.title   || ''
    document.getElementById('f_chapter').value   = data.chapter || ''
    document.getElementById('f_body').value      = data.body    || ''
    document.getElementById('f_items').value     = (data.items || []).join('\n')
    document.getElementById('f_order').value     = data.order   ?? 0
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
          <div style="font-size:12px;color:var(--text-3);margin-bottom:2px">公欠日: ${escHtml(datesStr)} ／ 事由: ${escHtml(c.reason||'')}</div>
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
