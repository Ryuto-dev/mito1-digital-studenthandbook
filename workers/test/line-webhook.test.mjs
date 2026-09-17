/**
 * workers/test/line-webhook.test.mjs
 *
 * LINE Webhook（Reply API による時間割・申請状況の問い合わせ応答）の回帰テスト。
 *
 * ■ なぜこのテストが必要か
 *   - 署名検証の誤りは「正規のLINEイベントを403で捨てる」か
 *     「第三者の偽造リクエストでReply APIを悪用される」のどちらかに直結する。
 *     本番でしか気づけない類の不具合のため、HMAC-SHA256の正系・誤系を固定する。
 *   - キーワード判定の変更（例：正規表現の編集ミス）で「時間割」「申請状況」と送っても
 *     無反応になると、ユーザーからは原因不明の沈黙に見える。境界例を固定する。
 *   - Reply上限（5件/回）を超える構成だとAPIが400を返し、replyTokenを
 *     使い捨てる（再送不可）。件数上限の回帰を防ぐ。
 *   - 申請状況カードの進行状況（プログレスバー）がステータスごとに
 *     正しい段階を「済み／進行中」で描けるかを固定する（#31）。
 *
 * 実行:
 *   node --test workers/test/
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WORKER_SRC = path.join(__dirname, '..', 'index.js')

// テスト対象の純粋関数だけをソースから抜き出して読み込む。
const EXPORTED = [
  'isTimetableQuery',
  'isStatusQuery',
  'verifyLineSignature',
  'buildTimetableReplyMessages',
  'buildStatusFlex',
]

function extractFunctions(src, names) {
  let out = ''
  for (const name of names) {
    const re = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`)
    const m = src.match(re)
    assert.ok(m, `workers/index.js に function ${name} が見つかりません`)
    const start = src.indexOf(m[0])
    let i = start + m[0].length
    let depth = 1
    while (depth > 0 && i < src.length) {
      const c = src[i]
      if (c === '{') depth++
      else if (c === '}') depth--
      i++
    }
    out += src.slice(start, i) + '\n'
  }
  return out + `export { ${names.join(', ')} }\n`
}

const src = fs.readFileSync(WORKER_SRC, 'utf8')
const tmpFile = path.join(__dirname, '.tmp-line-webhook.mjs')
fs.writeFileSync(tmpFile, extractFunctions(src, EXPORTED))
const { isTimetableQuery, isStatusQuery, verifyLineSignature, buildTimetableReplyMessages, buildStatusFlex } =
  await import(tmpFile)
fs.unlinkSync(tmpFile)

// --------------------------------------------------------------------------
// キーワード判定
// --------------------------------------------------------------------------
test('isTimetableQuery: 「>時間割」の完全一致のみ検出する', () => {
  assert.equal(isTimetableQuery('>時間割'), true)
  assert.equal(isTimetableQuery('＞時間割'), true)
  assert.equal(isTimetableQuery('  >時間割  '), true)
})

test('isTimetableQuery: 無関係・部分一致には反応しない', () => {
  assert.equal(isTimetableQuery('時間割'), false)
  assert.equal(isTimetableQuery('今日の時間割教えて'), false)
  assert.equal(isTimetableQuery('じかんわり'), false)
  assert.equal(isTimetableQuery('timetable'), false)
  assert.equal(isTimetableQuery('>時間割です'), false)
  assert.equal(isTimetableQuery('こんにちは'), false)
  assert.equal(isTimetableQuery(''), false)
  assert.equal(isTimetableQuery(null), false)
  assert.equal(isTimetableQuery(undefined), false)
})

test('isStatusQuery: 「>申請状況」の完全一致のみ検出する', () => {
  assert.equal(isStatusQuery('>申請状況'), true)
  assert.equal(isStatusQuery('＞申請状況'), true)
  assert.equal(isStatusQuery('  >申請状況  '), true)
})

test('isStatusQuery: 無関係・部分一致には反応しない', () => {
  assert.equal(isStatusQuery('申請状況'), false)
  assert.equal(isStatusQuery('申請状況を教えて'), false)
  assert.equal(isStatusQuery('>時間割'), false)
  assert.equal(isStatusQuery('>公欠'), false)
  assert.equal(isStatusQuery('しんせいじょうきょう'), false)
  assert.equal(isStatusQuery(''), false)
  assert.equal(isStatusQuery(null), false)
  assert.equal(isStatusQuery(undefined), false)
})

// --------------------------------------------------------------------------
// 署名検証（HMAC-SHA256）
// --------------------------------------------------------------------------
async function hmacSign(bodyText, secret) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const mac = new Uint8Array(await crypto.subtle.sign(
    'HMAC', key, new TextEncoder().encode(bodyText)
  ))
  return Buffer.from(mac).toString('base64')
}

test('verifyLineSignature: 正規の署名を通す', async () => {
  const body = '{"events":[{"type":"message"}]}'
  const sig = await hmacSign(body, 'test-channel-secret')
  assert.equal(await verifyLineSignature(body, sig, 'test-channel-secret'), true)
})

test('verifyLineSignature: 改ざん・別鍵・欠損を弾く', async () => {
  const body = '{"events":[{"type":"message"}]}'
  const sig = await hmacSign(body, 'test-channel-secret')
  assert.equal(await verifyLineSignature(body + ' ', sig, 'test-channel-secret'), false)
  assert.equal(await verifyLineSignature(body, sig, 'other-secret'), false)
  assert.equal(await verifyLineSignature(body, '', 'test-channel-secret'), false)
  assert.equal(await verifyLineSignature(body, sig, ''), false)
  assert.equal(await verifyLineSignature(body, '!!!not-base64!!!', 'test-channel-secret'), false)
})

// --------------------------------------------------------------------------
// Replyメッセージ組み立て
// --------------------------------------------------------------------------
const BASE = 'https://mito1-tetyo.tech'

test('buildTimetableReplyMessages: 画像＋案内テキストを返す', () => {
  const manifest = {
    updatedAt: '2026-09-15T08:16:52+09:00',
    updatedAtLabel: '2026年9月15日 8:16更新',
    images: [{ file: 'slot-0.jpg', hash: 'abc', bytes: 132763 }],
  }
  const msgs = buildTimetableReplyMessages(manifest, BASE)
  assert.equal(msgs.length, 2)
  assert.equal(msgs[0].type, 'image')
  assert.equal(msgs[0].originalContentUrl, `${BASE}/timetable/slot-0.jpg`)
  assert.equal(msgs[0].previewImageUrl, `${BASE}/timetable/slot-0.jpg`)
  assert.equal(msgs[1].type, 'text')
  assert.match(msgs[1].text, /8:16更新/)
})

test('buildTimetableReplyMessages: 上限5件に収める', () => {
  const manifest = {
    updatedAtLabel: 'x',
    images: Array.from({ length: 10 }, (_, i) => ({ file: `slot-${i}.jpg` })),
  }
  const msgs = buildTimetableReplyMessages(manifest, BASE)
  assert.ok(msgs.length <= 5)
  assert.equal(msgs[msgs.length - 1].type, 'text')
})

test('buildTimetableReplyMessages: 未登録時はテキスト案内のみ', () => {
  for (const manifest of [null, {}, { images: [] }]) {
    const msgs = buildTimetableReplyMessages(manifest, BASE)
    assert.equal(msgs.length, 1)
    assert.equal(msgs[0].type, 'text')
  }
})

// --------------------------------------------------------------------------
// 申請状況カード（#31）
// --------------------------------------------------------------------------
const caseBase = {
  title: '部活動合宿のため公欠',
  reason: '部活動',
  reasonDetail: '',
  dates: ['2026-10-01', '2026-10-02'],
}

test('buildStatusFlex: pending_supervisor は顧問承認待ち・バーが1段階進行', () => {
  const flex = buildStatusFlex({ caseData: { ...caseBase, status: 'pending_supervisor' }, studentName: '山田 太郎', base: BASE })
  assert.equal(flex.type, 'flex')
  assert.equal(flex.contents.type, 'bubble')
  // ヘッダーにステータス表示
  const headerTexts = JSON.stringify(flex.contents.header)
  assert.match(headerTexts, /公欠申請の状況/)
  assert.match(headerTexts, /顧問承認待ち/)
  // 本文（body）のプログレスバー: 申請=済み(ネイビー)、顧問承認=進行中(琥珀)
  const barBoxes = flex.contents.body.contents.find(c => c.type === 'box' && c.layout === 'horizontal' && c.contents?.[0]?.contents?.[0]?.height === '4px')
  assert.ok(barBoxes, 'プログレスバーが存在すること')
  const barColors = barBoxes.contents.map(s => s.contents[0].backgroundColor)
  assert.equal(barColors[0], '#1A2744') // 申請: 済み
  assert.equal(barColors[1], '#E8A33D') // 顧問承認: 進行中
  assert.equal(barColors[2], '#EEEEE9') // 担任承認: 未
  assert.equal(barColors[3], '#EEEEE9') // 完了: 未
})

test('buildStatusFlex: pending_homeroom は担任承認待ち・バーが2段階進行', () => {
  const flex = buildStatusFlex({ caseData: { ...caseBase, status: 'pending_homeroom' }, studentName: '山田 太郎', base: BASE })
  assert.match(JSON.stringify(flex.contents.header), /担任承認待ち/)
  const barBoxes = flex.contents.body.contents.find(c => c.type === 'box' && c.layout === 'horizontal' && c.contents?.[0]?.contents?.[0]?.height === '4px')
  const barColors = barBoxes.contents.map(s => s.contents[0].backgroundColor)
  assert.equal(barColors[0], '#1A2744')
  assert.equal(barColors[1], '#1A2744')
  assert.equal(barColors[2], '#E8A33D')
  assert.equal(barColors[3], '#EEEEE9')
})

test('buildStatusFlex: approved は承認完了・バーが全段階済み', () => {
  const flex = buildStatusFlex({ caseData: { ...caseBase, status: 'approved' }, studentName: '山田 太郎', base: BASE })
  assert.match(JSON.stringify(flex.contents.header), /承認完了/)
  const barBoxes = flex.contents.body.contents.find(c => c.type === 'box' && c.layout === 'horizontal' && c.contents?.[0]?.contents?.[0]?.height === '4px')
  const barColors = barBoxes.contents.map(s => s.contents[0].backgroundColor)
  assert.ok(barColors.every(c => c === '#1A2744'), '全段階が済み色であること')
})

test('buildStatusFlex: rejected は差し戻し・差し戻し理由を表示', () => {
  const flex = buildStatusFlex({
    caseData: { ...caseBase, status: 'rejected', rejectedReason: '書類の添付がありません' },
    studentName: '山田 太郎', base: BASE,
  })
  assert.match(JSON.stringify(flex.contents.header), /差し戻し/)
  assert.match(JSON.stringify(flex.contents.body), /書類の添付がありません/)
  // 差し戻し時はプログレスバーは「済み＝申請のみ」のままにする
  const barBoxes = flex.contents.body.contents.find(c => c.type === 'box' && c.layout === 'horizontal' && c.contents?.[0]?.contents?.[0]?.height === '4px')
  const barColors = barBoxes.contents.map(s => s.contents[0].backgroundColor)
  assert.equal(barColors[0], '#1A2744')
  assert.ok(barColors.slice(1).every(c => c === '#EEEEE9'), '申請以降は未進行')
})

test('buildStatusFlex: マイページへの導線が含まれる', () => {
  const flex = buildStatusFlex({ caseData: { ...caseBase, status: 'pending_homeroom' }, studentName: '山田 太郎', base: BASE })
  assert.match(JSON.stringify(flex.contents.footer), /マイページで確認/)
  assert.match(JSON.stringify(flex.contents.footer), new RegExp(`${BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/#mypage`))
})
