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
// description（説明文/前文）やsection（総則/細則）にも対応
// =============================================
function renderArticles(items, containerId, tocId, options = {}) {
  const el  = document.getElementById(containerId)
  const toc = document.getElementById(tocId)
  if (!el) return

  let html     = ''
  let tocHtml  = ''
  let prevChapter = ''
  let prevSection = ''

  // description（説明文/前文）がある場合はページ冒頭に表示
  if (options.description) {
    html += `<div class="card" style="margin-bottom:18px">
      <div class="card-body" style="font-size:14px;color:var(--text-2);line-height:2.0;white-space:pre-wrap">${options.description}</div>
    </div>`
    tocHtml += `<a class="toc-lnk sub" style="font-style:italic;color:var(--text-3)">説明・前文</a>`
  }

  // preamble（前文テキスト — 憲章用）
  if (options.preamble) {
    html += `<div class="card" style="margin-bottom:18px">
      <div class="card-h2">前文</div>
      <div class="card-body" style="font-size:14px;color:var(--text-2);line-height:2.0;white-space:pre-wrap">${options.preamble}</div>
    </div>`
    tocHtml += `<a class="toc-lnk sub" style="font-weight:600">前文</a>`
  }

  items.forEach(item => {
    // セクション見出し（総則/細則）
    if (item.section && item.section !== prevSection) {
      html += `<div class="chapter-div" style="background:rgba(139,26,44,.06);border-left-color:var(--enjii);font-size:15px;margin-top:28px">${item.section}</div>`
      tocHtml += `<a class="toc-lnk sub" style="font-weight:700;color:var(--enjii)">${item.section}</a>`
      prevSection = item.section
    }

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

  // コンテンツドキュメントから description / preamble を取得
  const contentDoc = await fetchDoc('content', col)
  const options = {}
  if (contentDoc) {
    if (contentDoc.description) options.description = contentDoc.description
    if (contentDoc.preamble) options.preamble = contentDoc.preamble
  }

  if (!items.length && !options.description && !options.preamble) return
  renderArticles(items, containerId, tocId, options)

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
  const el = document.getElementById('councilActivitiesFront')
  if (!el) return

  // overview を1枠で表示（committees は legacy フィールド）
  const text = [data?.overview, data?.committees].filter(Boolean).join('\n\n')
  if (!text) {
    el.innerHTML = '<p style="color:var(--text-3)">データがありません</p>'
    return
  }
  el.innerHTML = text.split('\n').filter(l => l !== undefined).map(line =>
    line.trim() === '' ? '<br>' : `<p>${line}</p>`
  ).join('')
}

// =============================================
// 検索インデックスをFirestoreから動的生成
// 全条文・説明文・前文を完全に格納
// =============================================
async function buildSearchIndex() {
  const [rules, special, events, history, principals, charter, councilRules, songs, goals] = await Promise.all([
    fetchOrdered('rules'),
    fetchOrdered('special'),
    fetchOrdered('events'),
    fetchOrdered('history'),
    fetchOrdered('principals'),
    fetchOrdered('council-charter'),
    fetchOrdered('council-rules'),
    fetchOrdered('songs'),
    fetchDoc('content', 'goals'),
  ])

  // コンテンツドキュメント（description/preamble）を取得
  const [specialContent, charterContent, councilRulesContent, councilActivitiesContent] = await Promise.all([
    fetchDoc('content', 'special'),
    fetchDoc('content', 'council-charter'),
    fetchDoc('content', 'council-rules'),
    fetchDoc('content', 'council-activities'),
  ])

  const index = []

  rules.forEach(item => {
    const fullText = [item.body || '', ...(item.items || [])].join(' ')
    index.push({
      path: `諸規定 › ${item.number}`,
      title: item.title || item.number,
      snip: fullText,
      page: 'rules',
      id: `rulesContentFront-${item.id}`,
      tags: [item.title || '', item.chapter || ''].join(' '),
    })
  })

  special.forEach(item => {
    const fullText = [item.body || '', ...(item.items || [])].join(' ')
    index.push({
      path: `特別教育活動 › ${item.number}`,
      title: item.title || item.number,
      snip: fullText,
      page: 'special',
      id: `specialContentFront-${item.id}`,
      tags: [item.title || '', item.chapter || ''].join(' '),
    })
  })

  // 特別教育活動の説明文
  if (specialContent?.description) {
    index.push({
      path: '特別教育活動 › 説明',
      title: '特別教育活動について',
      snip: specialContent.description,
      page: 'special',
      tags: '特別教育活動 目的 説明',
    })
  }

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

  principals.forEach(item => {
    index.push({
      path: '歴代校長一覧',
      title: `${item.gen || ''} ${item.name || ''}`,
      snip: `${item.name || ''} ${item.term || ''}`,
      page: 'principals',
      tags: '歴代校長 校長',
    })
  })

  charter.forEach(item => {
    const fullText = [item.body || '', ...(item.items || [])].join(' ')
    index.push({
      path: `知道生徒会憲章 › ${item.number}`,
      title: item.title || item.number,
      snip: fullText,
      page: 'council-charter',
      id: `charterContentFront-${item.id}`,
      tags: [item.title || '', item.chapter || '', item.section || ''].join(' '),
    })
  })

  // 憲章の前文
  if (charterContent?.preamble) {
    index.push({
      path: '知道生徒会憲章 › 前文',
      title: '知道生徒会憲章 前文',
      snip: charterContent.preamble,
      page: 'council-charter',
      tags: '憲章 前文',
    })
  }

  councilRules.forEach(item => {
    const fullText = [item.body || '', ...(item.items || [])].join(' ')
    index.push({
      path: `生徒会関係諸規定 › ${item.number}`,
      title: item.title || item.number,
      snip: fullText,
      page: 'council-rules',
      id: `councilRulesContentFront-${item.id}`,
      tags: [item.title || '', item.chapter || ''].join(' '),
    })
  })

  // 歌詞
  songs.forEach(item => {
    index.push({
      path: `歌詞 › ${item.type || ''}`,
      title: item.title || item.type || '',
      snip: (item.verses || []).join('\n'),
      page: 'songs',
      tags: '歌詞 校歌 応援歌',
    })
  })

  // 就学の目標
  if (goals?.text) {
    index.push({
      path: '就学の目標',
      title: '就学の目標',
      snip: goals.text,
      page: 'goals',
      tags: '就学 目標 校是',
    })
  }

  // 生徒会活動
  if (councilActivitiesContent?.overview) {
    index.push({
      path: '生徒会活動',
      title: '生徒会活動',
      snip: councilActivitiesContent.overview,
      page: 'council-activities',
      tags: '生徒会 活動',
    })
  }

  // グローバルの検索インデックスを動的データで更新
  window.DYNAMIC_SEARCH_INDEX = index

  // 全データをキャッシュ（AI用）
  window._allArticleData = { rules, special, charter, councilRules, principals, songs, history, specialContent, charterContent, councilRulesContent }
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
  // AIコンテキスト生成（Firestoreデータの完全サマリー）
  buildAIContext()
}

// =============================================
// AIコンテキスト生成
// 全条文の完全なテキストをAIに送れるようにキャッシュ
// =============================================
function buildAIContext() {
  if (!window.DYNAMIC_SEARCH_INDEX || !window.DYNAMIC_SEARCH_INDEX.length) return

  const data = window._allArticleData || {}

  const lines = []

  // 諸規定（全文）
  if (data.rules?.length) {
    lines.push('========== 諸規定（本則） ==========')
    data.rules.forEach(r => {
      let text = `${r.number}`
      if (r.title) text += `（${r.title}）`
      if (r.chapter) text += ` [${r.chapter}]`
      if (r.body) text += `\n${r.body}`
      if (r.items?.length) text += '\n' + r.items.map((it, i) => `  ${i + 1}. ${it}`).join('\n')
      lines.push(text)
    })
  }

  // 特別教育活動（説明文＋全文）
  if (data.specialContent?.description || data.special?.length) {
    lines.push('\n========== 特別教育活動 ==========')
    if (data.specialContent?.description) {
      lines.push('[説明文]\n' + data.specialContent.description)
    }
    data.special?.forEach(r => {
      let text = `${r.number}`
      if (r.title) text += `（${r.title}）`
      if (r.chapter) text += ` [${r.chapter}]`
      if (r.body) text += `\n${r.body}`
      if (r.items?.length) text += '\n' + r.items.map((it, i) => `  ${i + 1}. ${it}`).join('\n')
      lines.push(text)
    })
  }

  // 知道生徒会憲章（前文＋全文）
  if (data.charterContent?.preamble || data.charter?.length) {
    lines.push('\n========== 知道生徒会憲章 ==========')
    if (data.charterContent?.preamble) {
      lines.push('[前文]\n' + data.charterContent.preamble)
    }
    data.charter?.forEach(r => {
      let text = `${r.number}`
      if (r.title) text += `（${r.title}）`
      if (r.section) text += ` {${r.section}}`
      if (r.chapter) text += ` [${r.chapter}]`
      if (r.body) text += `\n${r.body}`
      if (r.items?.length) text += '\n' + r.items.map((it, i) => `  ${i + 1}. ${it}`).join('\n')
      lines.push(text)
    })
  }

  // 生徒会関係諸規定（全文）
  if (data.councilRules?.length) {
    lines.push('\n========== 生徒会関係諸規定 ==========')
    data.councilRules.forEach(r => {
      let text = `${r.number}`
      if (r.title) text += `（${r.title}）`
      if (r.chapter) text += ` [${r.chapter}]`
      if (r.body) text += `\n${r.body}`
      if (r.items?.length) text += '\n' + r.items.map((it, i) => `  ${i + 1}. ${it}`).join('\n')
      lines.push(text)
    })
  }

  // 歴代校長
  if (data.principals?.length) {
    lines.push('\n========== 歴代校長一覧 ==========')
    data.principals.forEach(p => {
      lines.push(`${p.gen || ''} ${p.name || ''} （${p.term || ''}）`)
    })
  }

  // 歌詞
  if (data.songs?.length) {
    lines.push('\n========== 歌詞 ==========')
    data.songs.forEach(s => {
      lines.push(`[${s.type || ''}] ${s.title || ''}`)
      if (s.lyricist) lines.push(`作詞：${s.lyricist}`)
      if (s.composer) lines.push(`作曲：${s.composer}`)
      ;(s.verses || []).forEach((v, i) => {
        lines.push(`${i + 1}番\n${v}`)
      })
    })
  }

  // 沿革
  if (data.history?.length) {
    lines.push('\n========== 本校の沿革 ==========')
    data.history.forEach(h => {
      lines.push(`${h.year || ''} ${h.event || ''}`)
    })
  }

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
