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
    loadSection('dashboard').catch(e => console.error('loadSection error:', e))
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
  if (!grid) { console.error('dashGrid not found'); return }

  const sections = [
    { col: 'rules',           label: '諸規定（本則）',   sec: 'rules' },
    { col: 'special',         label: '特別教育活動',     sec: 'special' },
    { col: 'events',          label: '年間主要行事',     sec: 'events' },
    { col: 'history',         label: '本校の沿革',       sec: 'history' },
    { col: 'principals',      label: '歴代校長',         sec: 'principals' },
    { col: 'songs',           label: '歌詞',             sec: 'songs' },
    { col: 'curriculum',      label: '教育課程',         sec: 'curriculum' },
    { col: 'council-charter', label: '知道生徒会憲章',   sec: 'council-charter' },
    { col: 'council-rules',   label: '生徒会関係諸規定', sec: 'council-rules' },
  ]

  try {
    const counts = await Promise.all(
      sections.map(s =>
        getDocs(collection(db, s.col))
          .then(sn => sn.size)
          .catch(e => { console.warn(s.col, e.message); return 0 })
      )
    )
    grid.innerHTML = sections.map((s, i) => `
      <div class="dash-card">
        <div class="dash-card-num">${counts[i]}</div>
        <div class="dash-card-label">${s.label}</div>
        <span class="dash-card-link" data-nav="${s.sec}">管理する →</span>
      </div>
    `).join('')
  } catch (e) {
    console.error('loadDashboard error:', e)
    grid.innerHTML = `<div style="padding:20px;color:red">エラー: ${e.message}</div>`
  }
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
  el.innerHTML = `
    <div class="form-row">
      <label>生徒会概要（本文）</label>
      <textarea id="caOverview" rows="5">${data.overview || ''}</textarea>
    </div>
    <div class="form-row">
      <label>各委員会の活動（本文）</label>
      <textarea id="caCommittees" rows="5">${data.committees || ''}</textarea>
    </div>
    <button class="btn-save" style="margin-top:8px" data-save-action="council-activities">保存</button>
  `
}

async function saveCouncilActivities() {
  const overview    = document.getElementById('caOverview').value.trim()
  const committees  = document.getElementById('caCommittees').value.trim()
  await setDoc(doc(db, 'content', 'council-activities'), { overview, committees })
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
  await deleteDoc(doc(db, col, id))
  showToast('削除しました')
  loadSection(currentSection)
}
