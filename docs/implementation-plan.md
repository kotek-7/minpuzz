# みんパズ バックエンド実装計画（マイルストーン方式）

本ドキュメントは、ゲームバックエンドを大きなマイルストーン（M）と、その中の独立した実装単位（U）で管理し、順次Uを追加・完了していくための進行表です。実装の分割は「テスト可能」「副作用の少ない境界」「将来差し替えやすい抽象」を基準にしています。

## マイルストーン概要
- M1: セッション/ルーム最小実装（join-game登録、game-init返却、全員接続でgame-start）
- M2: ストア/ロック層の抽象化（GameStore IF、InMemory/Redis実装、キー設計確立）
- M3: ピースエンジン（grab/move/releaseの検証とブロードキャスト）
- M4: 配置/スコア/進捗（place→確定→progress-update、全配置でgame-end）
- M5: タイムキーパー（timer-sync、timeoutでgame-end）
- M6: 再接続/同期ずれ対策（request-game-init/state-sync、ロック回収）
- M7: 運用補助（メトリクス、管理操作、レート制限）

---

## M1 セッション/ルーム最小実装
目的: マッチング後のゲーム接続を最小限に成立させ、画面遷移と開始トリガーを実現する。

- U1: イベント/コントラクト定義
  - 概要: M1で扱うイベント名とpayloadスキーマの確定
  - I/O: In `join-game` / Out `game-init`, `game-start`
  - 受入基準: Zodでバリデーション可能、型が共有される
  - 実装状況: [x] done
  - 参照: `backend/src/socket/events.ts`（GAME_INIT追加）

- U2: InMemorySessionStore（M2へ移管）
  - 概要: セッション状態のInMemory保持（抽象化の足場）
  - 備考: 本コードベースは既にRedis中心のモデルが存在するため、M1では未着手。M2のGameStore抽象で扱う。
  - 実装状況: [ ] deferred（M2で対応）

- U3: Publisherインターフェース
  - 概要: 送出面の抽象化（toTeam/toPublic/toUser）でサービス層を疎結合に
  - 受入基準: Noop実装で単体テスト可能
  - 実装状況: [ ] pending（M2以降で導入）

- U4: SessionService（コアロジック）
  - 概要: join登録/開始判定のサービス化
  - 備考: 既存の `model/game/session.ts`（recordPlayerConnected）が実質担っているため、M1では新規サービスは作成せず流用。
  - 実装状況: [x] covered by existing model（流用）
  - 参照: `backend/src/model/game/session.ts`（READY/IN_GAME遷移）

- U5: SocketGateway（最小エンドポイント）
  - 概要: `join-game`の受け口、検証、ルームjoin、サービス呼び出し、`game-init`送出
  - 受入基準: 参加直後に`game-init`が本人に届く。全員接続で両チームに`game-start`が1回だけ届く。
  - 実装状況: [x] done（`game-init`追加実装含む）
  - 参照: `backend/src/socket/teamSocket.ts`

- U6: Disconnectクリーンアップ（M1簡易）
  - 概要: 切断時の接続カウント/ルーム/マッピングのクリーンアップ
  - 受入基準: 切断で人数が減る。再参加で回復。
  - 実装状況: [x] done（既存ハンドラあり）
  - 参照: `backend/src/socket/teamSocket.ts`（DISCONNECT）

- U7: Dummy game-init Payload Generator
  - 概要: ダミーの初期化データ生成（5x7、空pieces）
  - 受入基準: Zodスキーマに合致。`join-game`時に送出される。
  - 実装状況: [x] done（単体テスト済）
  - 参照: `backend/src/model/game/init.ts`, `backend/src/__tests__/model/game/init.test.ts`

### M1 受け入れチェックリスト
- [x] join-gameで参加直後に`game-init`が受信できる
- [x] 両チームの必要人数に達すると`game-start`が各チームルームに1回だけ届く
- [x] 片側のみの参加では`game-start`は発火しない
- [x] 切断で接続カウントが減る（M1範囲）
- [x] 単体テストが存在（init）/既存セッションテストでREADY/IN_GAME遷移確認

---

## M2 ストア/ロック層の抽象化（予定）
- 目的: Redisに依存しないポート（GameStore IF）を定義し、InMemory/Redis実装を差し替え可能にする。
- 想定U:
  - U2-1: GameStore IF定義（セッション/ピース/スコア/タイマーのCRUD）
  - U2-2: InMemory実装と単体テスト
  - U2-3: Redis実装（既存キー設計を整理・統合）
  - U2-4: Publisher IF導入（U3移管）

## M3 ピースエンジン（予定）
- 想定U: grab/move/releaseの検証、ロック、team roomへの増分同期、エラーコード整備

## M4 配置/スコア/進捗（予定）
- 想定U: place検証→確定→`piece-placed`/`progress-update`、全配置で`game-end`

## M5 タイムキーパー（予定）
- 想定U: startedAt/duration管理、timer-sync送出、timeoutで`game-end`

## M6 再接続/同期ずれ対策（予定）
- 想定U: `request-game-init`/`state-sync`、切断ロック回収、TTL調整

## M7 運用補助（予定）
- 想定U: メトリクス、管理者コマンド、レート制限

---

## 更新ルール
- 新たなUを本ファイルに追記し、行頭に `[ ]`/`[x]` で進捗を管理します。
- 実装/テスト完了時は `参照` にコミット対象のファイル/テストを追加します。
- 仕様変更が生じた場合は、該当Mの目的・受け入れ基準を先に更新してからUを調整します。

