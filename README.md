# 茨城県立水戸第一高等学校・附属中学校 デジタル生徒手帳

茨城県立水戸第一高等学校および附属中学校のための、モダンでアクセシブルなデジタル生徒手帳プラットフォームです。

## 概要

このプロジェクトは、紙の生徒手帳をデジタル化し、生徒・教職員双方の利便性を向上させることを目的としています。校則や行事予定の閲覧だけでなく、AIによる質問回答、オンラインでの公欠申請システム、LINE連携による通知機能、およびデジタル身分証表示機能などを統合しています。

## 主な機能

- **デジタル生徒手帳コンテンツ**: 校則（諸規定）、沿革、歴代校長、校歌・応援歌歌詞、年間主要行事予定、教育課程、知道生徒会憲章・関係諸規定、生徒会活動、就学の目標などを網羅。
- **デジタル身分証**: 承認済みの生徒に対してデジタル身分証を表示。学年・クラス・出席番号やデジタル発行情報を一目で確認可能。
- **AI アシスタント**: Google Gemini 2.5 Flash を活用し、手帳の内容（校則・行事等）に基づいた質問に回答。複雑な規定の中から必要な情報を素早く検索・要約します。
- **全文検索**: 手帳内の全コンテンツ（各条文、前文、説明文など）を対象としたリアルタイムインデックス検索。
- **公欠申請システム**:
  - 生徒によるオンライン申請作成およびリアルタイム進捗追跡（顧問承認前の取り下げも可）。
  - 顧問・担任への2段階メール自動通知と、メール内ワンクリックリンクによる承認/差し戻し。
  - 承認完了時、生徒へメール通知および LINE Flex Message による自動プッシュ通知を送信。
  - 承認済み生徒に対する先生のメールアドレス自動サジェスト機能。
- **LINE連携機能**:
  - LINE Login（OAuth 2.0）によるアカウント連携。
  - LINE Messaging API を活用した、公欠申請承認完了時のカード型（Flex Message）プッシュ通知。
- **お問い合わせ・回答機能**:
  - ユーザーからのお問い合わせフォーム送信および Firestore での管理。
  - 管理者パネルでの AI 下書き作成支援と、ワンクリックメール返信機能。
- **教職員用ダッシュボード**: 担当生徒の公欠申請一覧の管理、ワンクリック承認・差し戻し。
- **管理者パネル (RBAC)**:
  - 6段階のロール（生徒、先生、モデレーター、管理者（生徒）、管理者（先生）、オーナー）による細分化されたアクセス制御。
  - 生徒アカウントの承認/未承認切り替え、ユーザー情報・ロールの管理。
  - 手帳コンテンツ（条文、行事、沿革、校長、歌詞等）の動的更新。
  - お問い合わせの確認および AI を活用した回答送信。

## 技術スタック

- **フロントエンド**: Vite, JavaScript (Vanilla ES Modules), CSS3 (Custom Properties)
- **バックエンド / データベース**: Firebase (Firestore, Authentication)
- **サーバーレス関数 / プロキシ**: Cloudflare Workers (ES Module Worker)
- **AI**: Google Gemini 2.5 Flash
- **メール配信**: Resend API
- **LINE連携**: LINE Login API, LINE Messaging API (Flex Messages)
- **アクセス解析**: Google Analytics (gtag.js)
- **ホスティング**: GitHub Pages / ホスティングサービス (Frontend), Cloudflare Workers (Backend)

## セットアップと開発

### ローカル開発環境の構築

1. リポジトリをクローンします。
2. 依存関係をインストールします。
   ```bash
   npm install
   ```
3. 環境変数ファイル `.env` をルートディレクトリに作成し、Firebase の設定を記述します。
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

`workers/index.js` を Cloudflare Workers にデプロイし、以下の環境変数・シークレットを設定します。

- `GEMINI_API_KEY`: Google AI Studio から取得した Gemini API キー（Secret）。
- `RESEND_API_KEY`: Resend から取得した API キー（Secret）。
- `RESEND_FROM`: 送信元メールアドレス（例: `mito1-handbook <noreply@yourdomain.com>`）。※Resendでドメイン認証済みである必要があります。
- `APP_BASE_URL`: アプリケーションのベースURL（例: `https://mito1-tetyo.tech`）。
- `FIREBASE_PROJECT_ID`: Firebase プロジェクト ID（Firestore REST API用）。
- `FIREBASE_API_KEY`: Firebase Web API キー（Firestore REST API用）。
- `LINE_client_id`: LINE Login チャネル ID（Secret）。
- `LINE_client_secret`: LINE Login チャネルシークレット（Secret）。
- `LINE_Channel_ID`: LINE Messaging API チャネル ID（Secret）。
- `LINE_Channel_secret`: LINE Messaging API チャネルシークレット（Secret）。
- `LINE_CHANNEL_ACCESS_TOKEN`: LINE Messaging API チャネルアクセストークン（Secret、任意）。

※ LINE Developers Console にて、コールバック URL として `https://yourdomain.com/line-callback.html` （開発用: `http://localhost:5173/line-callback.html`）を登録してください。

## デプロイ

- **フロントエンド**: `npm run build` を実行し、生成された `dist` ディレクトリの内容をホスティング環境にデプロイします。
- **Firestore**: `firestore.rules` を Firebase Console に適用してください。
- **Workers**: Wrangler を使用するか、Cloudflare ダッシュボードから `workers/index.js` をデプロイします。

## ディレクトリ・ファイル構成

- `index.html`: メインアプリケーション（手帳閲覧、AI検索、マイページ、デジタル身分証、公欠申請、お問い合わせ）。
- `auth.html`: ログイン・新規会員登録画面（生徒・教職員）。
- `teacher.html`: 教職員専用ダッシュボード。
- `approve.html`: メールリンクからの公欠申請承認・差し戻し専用ページ。
- `line-callback.html`: LINE Login 認可コード処理・アカウント連携専用ページ。
- `privacy.html`: プライバシーポリシーページ。
- `terms.html`: サービス利用規約ページ。
- `admin/index.html`: 管理者パネル（コンテンツ編集、ユーザー管理、お問い合わせ回答）。
- `src/`: フロントエンドロジック（Firebase連携、認証、公欠申請、LINE連携、ロール制御、UI制御等）。
- `workers/index.js`: Cloudflare Workers バックエンド処理（Gemini APIプロキシ、Resendメール送信、LINE認証・通知、Firestore REST連携等）。

---
© 2026 Mito First High School Digital Student Handbook Project.
