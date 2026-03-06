# 茨城県立水戸第一高等学校・附属中学校 デジタル生徒手帳

茨城県立水戸第一高等学校および附属中学校のための、モダンでアクセシブルなデジタル生徒手帳プラットフォームです。

## 概要

このプロジェクトは、紙の生徒手帳をデジタル化し、生徒・教職員双方の利便性を向上させることを目的としています。校則や行事予定の閲覧だけでなく、AIによる質問回答や、オンラインでの公欠・欠席申請システムを統合しています。

## 主な機能

- **デジタル生徒手帳コンテンツ**: 校則（諸規定）、沿革、歴代校長、校歌、年間行事予定、教育課程などを網羅。
- **AI アシスタント**: Google Gemini API を活用し、手帳の内容に基づいた質問に回答。複雑な校則の中から必要な情報を素早く見つけ出せます。
- **公欠申請システム**:
  - 生徒によるオンライン申請。
  - 顧問・担任への自動メール通知と、メール内リンクによるワンクリック承認/差し戻し。
  - 承認プロセスのリアルタイム追跡。
- **教職員用ダッシュボード**: 申請の管理、承認状況の確認。
- **管理者パネル**: 手帳コンテンツ（行事や校則など）の動的な更新・管理。
- **全文検索**: 手帳内の全コンテンツを対象とした高速な検索機能。

## 技術スタック

- **フロントエンド**: Vite, JavaScript (Vanilla), CSS3 (Custom Properties)
- **バックエンド/データベース**: Firebase (Firestore, Authentication)
- **サーバーレス関数**: Cloudflare Workers
- **AI**: Google Gemini 1.5 Flash
- **メール配信**: Resend API
- **ホスティング**: GitHub Pages (Frontend), Cloudflare (Workers)

## セットアップと開発

### ローカル開発環境の構築

1. リポジトリをクローンします。
2. 依存関係をインストールします。
   ```bash
   npm install
   ```
3. 環境変数ファイル `.env` をルートディレクトリに作成し、Firebaseの設定を記述します。
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```
4. 開発サーバーを起動します。
   ```bash
   npm run dev
   ```

### Cloudflare Workers の設定

`workers/index.js` を Cloudflare Workers にデプロイし、以下の環境変数を設定する必要があります。

- `GEMINI_API_KEY`: Google AI Studio から取得した API キー。
- `RESEND_API_KEY`: Resend から取得した API キー。
- `RESEND_FROM`: 送信元メールアドレス（例: `handbook@yourdomain.com`）。※Resendでドメイン認証済みである必要があります。
- `APP_BASE_URL`: アプリケーションのベースURL（例: `https://ryuto-devs.github.io/mito1-digital-studenthandbook`）。

## デプロイ

- **フロントエンド**: `npm run build` を実行し、生成された `dist` ディレクトリの内容を GitHub Pages 等にホストします。
- **Firestore**: `firestore.rules` を Firebase Console に適用してください。
- **Workers**: Wrangler を使用するか、Cloudflare ダッシュボードから `workers/index.js` をデプロイします。

## 構成

- `index.html`: メインアプリケーション（手帳閲覧・AI検索）。
- `auth.html`: ログイン・会員登録画面。
- `teacher.html`: 教職員専用ダッシュボード。
- `approve.html`: メールリンクからの承認専用ページ。
- `admin/`: 管理者用コンテンツ編集画面。
- `src/`: アプリケーションロジック（Firebase連携、UI制御）。
- `workers/`: バックエンド処理（AIプロキシ、メール送信）。

---
© 2024 Mito First High School Digital Student Handbook Project.
