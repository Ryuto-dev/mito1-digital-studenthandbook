/**
 * workers/test/line-webhook.test.mjs
 *
 * LINE Webhook（Reply API による時間割の問い合わせ応答）の回帰テスト。
 *
 * ■ なぜこのテストが必要か
 *   - 署名検証の誤りは「正規のLINEイベントを403で捨てる」か
 *     「第三者の偽造リクエストでReply APIを悪用される」のどちらかに直結する。
 *     本番でしか気づけない類の不具合のため、HMAC-SHA256の正系・誤系を固定する。
 *   - キーワード判定の変更（例：正規表現の編集ミス）で「時間割」と送っても
 *     無反応になると、ユーザーからは原因不明の沈黙に見える。境界例を固定する。
 *   - Reply上限（5件/回）を超える構成だとAPIが400を返し、replyTokenを
 *     使い捨てる（再送不可）。件数上限の回帰を防ぐ。
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
  'verifyLineSignature',
  'buildTimetableReplyMessages',
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
const { isTimetableQuery, verifyLineSignature, buildTimetableReplyMessages } =
  await import(tmpFile)
fs.unlinkSync(tmpFile)

// --------------------------------------------------------------------------
// キーワード判定
// --------------------------------------------------------------------------
test('isTimetableQuery: 時間割の問い合わせを検出する', () => {
  assert.equal(isTimetableQuery('時間割'), true)
  assert.equal(isTimetableQuery('今日の時間割教えて'), true)
  assert.equal(isTimetableQuery('じかんわり'), true)
  assert.equal(isTimetableQuery('timetable'), true)
  assert.equal(isTimetableQuery('TimeTable'), true)
})

test('isTimetableQuery: 無関係な文には反応しない', () => {
  assert.equal(isTimetableQuery('こんにちは'), false)
  assert.equal(isTimetableQuery('公欠申請したい'), false)
  assert.equal(isTimetableQuery(''), false)
  assert.equal(isTimetableQuery(null), false)
  assert.equal(isTimetableQuery(undefined), false)
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
