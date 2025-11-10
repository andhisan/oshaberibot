# oshaberibot

GeminiとVCできるDiscord bot

> [!WARNING]
> このリポジトリはDiscord.jsにおける生成AIの利用サンプルです。
> 作者はbotをデプロイ・運用したことによる損害の責任を負いません。

## 解説

まずは解説動画をご覧ください。

[![解説のYouTube動画](https://github.com/andhisan/oshaberibot/raw/main/assets/thumb.png?raw=true)](https://youtu.be/8QOVrRTFWFQ)

以下の参考記事を基に、クリーンな構成になるようアーキテクチャを工夫したもの。

- [【スレッド返信対応版】ChatGPTのDiscordBotを作ってデプロイまでやっちゃうの巻(discord.js & ChatGPT API & fly.io)](https://qiita.com/Keichan_15/items/70907ff47c5e531f0462)
- [discordjs-japan/om](https://github.com/discordjs-japan/om)
- [discord v14でGPTと音声通話が出来るBOTを作成した](https://zenn.dev/ss_2013/articles/ab3dfd73513afb)
- [DiscordでAIと音声対話できるBOTを作ってみる](https://qiita.com/TanakaTakeshikun/items/141ab84b91f33d21f03c)

## 技術スタック

Nest.jsを使った[前回のサンプル](https://github.com/andhisan/necord-bullmq-example)よりも前に作ったものなので、アーキテクチャが我流になっており、保守性が悪いです。

- Discord.js
- Redis
- @google/genai
  - OpenAIのように前のIDを指定する機能がないため、Redisに会話履歴JSONを保存している
  - 一応、会話プロバイダをOpenAIに切り替えることもできる(画像生成は非対応)
- なんちゃってクリーンアーキテクチャ
  - コンストラクタで依存を注入しているが、Nest.jsのようなデコレータによる注入ができておらず、結局密結合になってしまっている
- Rollup + nodemonで開発サーバー立ち上げ

## 依存サービス

- GCP
  - Gemini (応答・画像生成)
  - Text to Speech (文字起し)
- Replicate
  - Minimax (AI音声生成)
- インフラ
  - Fly.io (botデプロイ先, Redis)

## 開発

```sh
make up
npm run dev
```

## デプロイ

Fly.ioで下記のようなコマンドでデプロイします。アプリ名はグローバルで一意なので注意してください。

複数インスタンスの運用に対応していないため、必ず `ha=false` を指定してマシンを1つに制約してください。

```sh
flyctl redis create \
  -r nrt \
  --enable-eviction \
  -n andhisan-oshaberibot-redis
flyctl launch --copy-config --ha=false
```

## GitHub Actions

`FLY_API_TOKEN` にデプロイ用トークンを設定してください。
