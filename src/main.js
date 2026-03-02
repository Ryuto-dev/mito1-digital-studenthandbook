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
  if (!items.length) return
  renderArticles(items, containerId, tocId)

  const label = `全${items.length}条`

  // サイドバーバッジ
  const badgeIds = {
    'rules':          'sbBadgeRules',
    'special':        'sbBadgeSpecial',
    'council-charter':'sbBadgeCharter',
    'council-rules':  'sbBadgeCouncilRules',
  }
  const bid = badgeIds[col]
  if (bid) {
    const el = document.getElementById(bid)
    if (el) { el.textContent = label; el.style.display = '' }
  }

  // ページのpg-meta
  const metaIds = {
    'rules':          'rulesMetaCount',
    'special':        'specialMetaCount',
    'council-charter':'charterMetaCount',
    'council-rules':  'councilRulesMetaCount',
  }
  const mid = metaIds[col]
  if (mid) {
    const el = document.getElementById(mid)
    if (el) el.textContent = label
  }

  // ホームカード（rulesのみ）
  if (col === 'rules') {
    const ce = document.getElementById('rulesCardCount')
    if (ce) ce.textContent = `条文検索・${label}`
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
// 生徒会活動（1枠統合）
// =============================================
async function loadCouncilActivities() {
  const data = await fetchDoc('content', 'council-activities')
  if (!data) return

  const el = document.getElementById('councilActivitiesFront')
  if (!el) return

  const parts = []
  if (data.overview) {
    parts.push(`<h3 style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:10px">生徒会の概要</h3>`)
    parts.push(...data.overview.split('\n').filter(Boolean).map(l => `<p>${l}</p>`))
  }
  if (data.committees) {
    parts.push(`<h3 style="font-size:15px;font-weight:600;color:var(--text);margin:20px 0 10px">各委員会の活動</h3>`)
    parts.push(...data.committees.split('\n').filter(Boolean).map(l => `<p>${l}</p>`))
  }
  el.innerHTML = parts.join('') || '<p style="color:var(--text-3)">データがありません</p>'
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

  // グローバルの検索インデックスを動的データで更新
  window.DYNAMIC_SEARCH_INDEX = index

  // AIコンテキスト：条文の要約を compact にキャッシュ（全文はAPIコール時に検索ヒット分のみ付加）
  const ctxLines = []
  rules.forEach(r    => ctxLines.push(`[諸規定 ${r.number}]${r.title}：${(r.body||'').slice(0,80)}`))
  special.forEach(r  => ctxLines.push(`[特別活動 ${r.number}]${r.title}：${(r.body||'').slice(0,60)}`))
  charter.forEach(r  => ctxLines.push(`[憲章 ${r.number}]${r.title}：${(r.body||'').slice(0,60)}`))
  councilRules.forEach(r => ctxLines.push(`[会規定 ${r.number}]${r.title}：${(r.body||'').slice(0,60)}`))
  window._aiContext = ctxLines.join('\n')
}

// =============================================
// 全データ一括ロード
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
  // AIコンテキスト生成（Firestoreデータの圧縮サマリー）
  buildAIContext()
}

// =============================================
// AIコンテキスト生成
// 全条文を毎回渡すとAPI消費が多くなるため、
// 条文のタイトル一覧と行事リストのみキャッシュし、
// 質問時にdoSearch()でヒットした上位3件の本文を付加する
// =============================================
function buildAIContext() {
  if (!window.DYNAMIC_SEARCH_INDEX || !window.DYNAMIC_SEARCH_INDEX.length) return

  const idx = window.DYNAMIC_SEARCH_INDEX
  const bySection = {}
  idx.forEach(item => {
    const section = item.path.split(' › ')[0]
    if (!bySection[section]) bySection[section] = []
    bySection[section].push(item.title || item.snip?.slice(0,30))
  })

  const lines = Object.entries(bySection).map(([sec, titles]) => {
    // 重複排除 & 最大8件
    const uniq = [...new Set(titles)].slice(0, 8)
    return `▼${sec}：${uniq.join('、')}`
  })

  window._aiContext = lines.join('\n')
}

// =============================================
// お問い合わせ送信（Firestoreへ保存）
// =============================================
export async function submitContactToFirestore(data) {
  const { addDoc, serverTimestamp } = await import('firebase/firestore')
  await addDoc(collection(db, 'contacts'), {
    name:     data.name     || '',
    email:    data.email    || '',
    category: data.category || 'other',
    subject:  data.subject  || '',
    body:     data.body     || '',
    status:   'new',
    reply:    '',
    createdAt: serverTimestamp(),
  })
}
