import { db } from './firebase.js'
import {
  collection, doc,
  getDocs, getDoc,
  orderBy, query
} from 'firebase/firestore'

// =============================================
// Firestoreから全データを取得してページを更新
// =============================================

async function fetchOrdered(col) {
  try {
    const q = query(collection(db, col), orderBy('order', 'asc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch {
    // orderフィールドがない場合はそのまま取得
    const snap = await getDocs(collection(db, col))
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  }
}

async function fetchDoc(col, docId) {
  try {
    const snap = await getDoc(doc(db, col, docId))
    return snap.exists() ? snap.data() : null
  } catch {
    return null
  }
}

// =============================================
// 沿革
// =============================================
async function loadHistory() {
  const items = await fetchOrdered('history')
  if (!items.length) return

  const el = document.getElementById('historyListFront')
  if (!el) return

  el.innerHTML = items.map(item => `
    <li class="history-item">
      <span class="history-year">${item.year || ''}</span>
      <span class="history-event">${item.event || ''}</span>
    </li>
  `).join('')
}

// =============================================
// 歴代校長
// =============================================
async function loadPrincipals() {
  const items = await fetchOrdered('principals')
  if (!items.length) return

  const el = document.getElementById('principalsListFront')
  if (!el) return

  el.innerHTML = items.map(item => `
    <li class="principal-item">
      <span class="principal-gen">${item.gen || ''}</span>
      <span class="principal-name">${item.name || ''}</span>
      <span class="principal-term">${item.term || ''}</span>
    </li>
  `).join('')
}

// =============================================
// 就学の目標
// =============================================
async function loadGoals() {
  const data = await fetchDoc('content', 'goals')
  if (!data) return

  const imgEl  = document.getElementById('goalsImageFront')
  const textEl = document.getElementById('goalsTextFront')

  if (imgEl && data.imageUrl) {
    imgEl.innerHTML = `<img src="${data.imageUrl}" alt="校是" style="max-width:100%;border-radius:var(--r)">`
  }
  if (textEl && data.text) {
    textEl.innerHTML = data.text
      .split('\n')
      .filter(Boolean)
      .map(line => `<p>${line}</p>`)
      .join('')
  }
}

// =============================================
// 歌詞
// =============================================
async function loadSongs() {
  const items = await fetchOrdered('songs')
  if (!items.length) return

  const el = document.getElementById('songsListFront')
  if (!el) return

  el.innerHTML = items.map(item => `
    <div class="song-card">
      <div class="song-hdr">
        <div class="song-hdr-ttl">${item.title || item.type || ''}</div>
        <div class="song-hdr-badge">
          ${[item.lyricist && `作詞：${item.lyricist}`, item.composer && `作曲：${item.composer}`]
            .filter(Boolean).join('　／　')}
        </div>
      </div>
      <div class="song-verses">
        ${(item.verses || []).map((v, i) => `
          <div>
            <div class="verse-num">${i + 1}番</div>
            <div class="verse-text">${v.replace(/\n/g, '<br>')}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('')
}

// =============================================
// 条文（諸規定・特別教育活動・生徒会憲章・生徒会関係諸規定）
// =============================================
function renderArticles(items, containerId, tocId) {
  const el  = document.getElementById(containerId)
  const toc = document.getElementById(tocId)
  if (!el || !items.length) return

  let html     = ''
  let tocHtml  = ''
  let prevChapter = ''

  items.forEach(item => {
    // 章見出し
    if (item.chapter && item.chapter !== prevChapter) {
      html += `<div class="chapter-div">${item.chapter}</div>`
      tocHtml += `<a class="toc-lnk sub">${item.chapter}</a>`
      prevChapter = item.chapter
    }

    // 条文本体
    const artId = `${containerId}-${item.id}`
    html += `
      <div class="article" id="${artId}">
        <div class="art-hdr">
          <span class="art-num">${item.number || ''}</span>
          ${item.title ? `<span class="art-title">${item.title}</span>` : ''}
        </div>
        <div class="art-body">
          ${item.body ? `<div class="art-main">${item.body}</div>` : ''}
          ${(item.items || []).length ? `
            <ol class="items-list">
              ${item.items.map((itm, i) => `
                <li class="item-row">
                  <span class="item-idx">${i + 1}</span>
                  <span>${itm}</span>
                </li>
              `).join('')}
            </ol>
          ` : ''}
        </div>
      </div>
    `

    tocHtml += `
      <a class="toc-lnk" onclick="scrollArt('${artId}')">
        ${item.number}${item.title ? `　${item.title}` : ''}
      </a>
    `
  })

  el.innerHTML = html
  if (toc) toc.innerHTML = tocHtml
}

async function loadArticles(col, containerId, tocId) {
  const items = await fetchOrdered(col)
  if (items.length) {
    renderArticles(items, containerId, tocId)
    // 諸規定の条数を動的更新
    if (col === 'rules') {
      const metaEl = document.getElementById('rulesMetaCount')
      const cardEl = document.getElementById('rulesCardCount')
      if (metaEl) metaEl.textContent = `全${items.length}条`
      if (cardEl) cardEl.textContent = `条文検索・全${items.length}条`
    }
  }
}

// =============================================
// 年間主要行事
// =============================================
async function loadEvents() {
  const items = await fetchOrdered('events')
  if (!items.length) return

  const el = document.getElementById('eventsListFront')
  if (!el) return

  // 月ごとにグループ化
  const byMonth = {}
  items.forEach(item => {
    const m = String(item.month || 1)
    if (!byMonth[m]) byMonth[m] = []
    byMonth[m].push(item)
  })

  const months = ['1','2','3','4','5','6','7','8','9','10','11','12']
  el.innerHTML = months
    .filter(m => byMonth[m])
    .map(m => `
      <div class="ev-month">
        <div class="ev-month-hdr">
          <span class="ev-month-name">${m}月</span>
          <span class="ev-month-num">${m}</span>
        </div>
        <div class="ev-items">
          ${byMonth[m].map(item => `
            <div class="ev-item">
              <div class="ev-bullet"></div>
              <div class="ev-name">${item.name || ''}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')
}

// =============================================
// 教育課程
// =============================================
async function loadCurriculum() {
  const items = await fetchOrdered('curriculum')
  if (!items.length) return

  const el = document.getElementById('curriculumTableFront')
  if (!el) return

  // 入学年度ごとにグループ化
  const byYear = {}
  items.forEach(item => {
    const y = item.year || '2024'
    if (!byYear[y]) byYear[y] = []
    byYear[y].push(item)
  })

  const years = Object.keys(byYear).sort().reverse()

  // タブHTML
  const tabsEl = document.getElementById('curriculumTabsFront')
  if (tabsEl) {
    tabsEl.innerHTML = years.map((y, i) => `
      <button class="year-tab ${i === 0 ? 'on' : ''}"
        onclick="switchCurriculumYear('${y}', this)">
        ${y}年度入学
      </button>
    `).join('')
  }

  // テーブルHTML（年度ごと）
  el.innerHTML = years.map((y, i) => `
    <div class="curriculum-year-table ${i === 0 ? '' : 'hidden-yr'}" data-year="${y}">
      <div class="table-outer">
        <table>
          <thead>
            <tr>
              <th>教科</th><th>科目</th>
              <th>1年</th><th>2年</th><th>3年</th><th>必選</th>
            </tr>
          </thead>
          <tbody>
            ${byYear[y].map(r => `
              <tr>
                <td>${r.subject || ''}</td>
                <td>${r.course  || ''}</td>
                <td style="text-align:center">${r.y1 || '—'}</td>
                <td style="text-align:center">${r.y2 || '—'}</td>
                <td style="text-align:center">${r.y3 || '—'}</td>
                <td style="text-align:center">${r.required || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `).join('')
}

// 年度タブ切り替え（グローバルに公開）
window.switchCurriculumYear = (year, btn) => {
  document.querySelectorAll('.curriculum-year-table').forEach(el => {
    el.classList.toggle('hidden-yr', el.dataset.year !== year)
  })
  document.querySelectorAll('#curriculumTabsFront .year-tab').forEach(t => t.classList.remove('on'))
  btn.classList.add('on')
}

// =============================================
// 生徒会活動
// =============================================
async function loadCouncilActivities() {
  const data = await fetchDoc('content', 'council-activities')
  if (!data) return

  const overviewEl    = document.getElementById('councilOverviewFront')
  const committeesEl  = document.getElementById('councilCommitteesFront')

  if (overviewEl && data.overview) {
    overviewEl.innerHTML = data.overview
      .split('\n').filter(Boolean).map(l => `<p>${l}</p>`).join('')
  }
  if (committeesEl && data.committees) {
    committeesEl.innerHTML = data.committees
      .split('\n').filter(Boolean).map(l => `<p>${l}</p>`).join('')
  }
}

// =============================================
// 検索インデックスをFirestoreから動的生成
// =============================================
async function buildSearchIndex() {
  const [rules, special, events, history, charter, councilRules] = await Promise.all([
    fetchOrdered('rules'),
    fetchOrdered('special'),
    fetchOrdered('events'),
    fetchOrdered('history'),
    fetchOrdered('council-charter'),
    fetchOrdered('council-rules'),
  ])

  const index = []

  rules.forEach(item => {
    index.push({
      path: `諸規定 › ${item.number}`,
      title: item.title || item.number,
      snip: (item.body || '') + ' ' + (item.items || []).join(' '),
      page: 'rules',
      id: `rulesList-${item.id}`,
      tags: item.title || '',
    })
  })

  special.forEach(item => {
    index.push({
      path: `特別教育活動 › ${item.number}`,
      title: item.title || item.number,
      snip: (item.body || '') + ' ' + (item.items || []).join(' '),
      page: 'special',
      id: `specialList-${item.id}`,
      tags: item.title || '',
    })
  })

  events.forEach(item => {
    index.push({
      path: `年間主要行事 › ${item.month}月`,
      title: `${item.month}月 — ${item.name}`,
      snip: item.name || '',
      page: 'events',
      tags: `${item.month}月 行事`,
    })
  })

  history.forEach(item => {
    index.push({
      path: '本校の沿革',
      title: item.year || '',
      snip: item.event || '',
      page: 'about',
      tags: '沿革 歴史',
    })
  })

  charter.forEach(item => {
    index.push({
      path: `知道生徒会憲章 › ${item.number}`,
      title: item.title || item.number,
      snip: item.body || '',
      page: 'council-charter',
      id: `councilCharterList-${item.id}`,
      tags: item.title || '',
    })
  })

  councilRules.forEach(item => {
    index.push({
      path: `生徒会関係諸規定 › ${item.number}`,
      title: item.title || item.number,
      snip: item.body || '',
      page: 'council-rules',
      id: `councilRulesList-${item.id}`,
      tags: item.title || '',
    })
  })

  // グローバルの検索インデックスを動的データで上書き
  if (window._handbookSearchReady) {
    window.DYNAMIC_SEARCH_INDEX = index
  } else {
    window.DYNAMIC_SEARCH_INDEX = index
  }
}

// =============================================
// 全データ一括ロード（自己実行）
// =============================================
export async function loadAllData() {
  await Promise.all([
    loadHistory(),
    loadPrincipals(),
    loadGoals(),
    loadSongs(),
    loadEvents(),
    loadCurriculum(),
    loadCouncilActivities(),
    loadArticles('rules',           'rulesContentFront',   'rulesTocFront'),
    loadArticles('special',         'specialContentFront', 'specialTocFront'),
    loadArticles('council-charter', 'charterContentFront', 'charterTocFront'),
    loadArticles('council-rules',   'councilRulesContentFront', 'councilRulesTocFront'),
    buildSearchIndex(),
  ])
}

// DOMが準備でき次第自動実行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => loadAllData().catch(console.error))
} else {
  loadAllData().catch(console.error)
}
