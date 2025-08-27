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
  - 概要: ダミーの初期化データ生成（6x6、空pieces）
  - 受入基準: Zodスキーマに合致。`join-game`時に送出される。
  - 実装状況: [x] done（単体テスト済）
  - 参照: `backend/src/model/game/init.ts`, `backend/src/__tests__/model/game/init.test.ts`

### M1 受け入れチェックリスト
- [x] join-gameで参加直後に`game-init`が受信できる
- [x] 両チームの必要人数に達すると`game-start`が各チームルームに1回だけ届く
- [x] 片側のみの参加では`game-start`は発火しない
- [x] 切断で接続カウントが減る（M1範囲）
- [x] 単体テストが存在（init）/既存セッションテストでREADY/IN_GAME遷移確認

### 補足: マッチングポリシー（要件反映）
- 優先: メンバー数が同じチーム同士の対戦を優先
- 例外: 同数不在の場合は人数差ありでも許容（FIFOの先着順）

---

## M2 ストア/ロック層の抽象化（確定）
目的: 盤面/スコア/ロック/タイマーを一貫管理する GameStore 抽象を定義し、InMemory/Redis 実装の差し替えを可能にする。M3以降（ピースエンジン）の土台。

- U2-1: ドメイン型/Zodスキーマ定義
  - 概要: Piece/Score/Timer/Lockの最小型とZodスキーマを定義し共有
  - I/F: `Piece { id, x, y, placed, row?, col?, holder? }`, `Score { placedByTeam: Record<teamId, number> }`, `Timer { startedAt, durationMs }`
  - 受入基準: Zod parse成功、型がサーバ/クライアント共有可能
  - 実装状況: [x] done
  - 参照: `backend/src/model/game/types.ts`, `backend/src/model/game/schemas.ts`

- U2-2: GameStore IF定義（契約）
  - 概要: セッション/ピース/ロック/スコア/タイマーの境界I/F
  - I/F（例）:
    - match: `getMatch(id)`, `setMatch(id, record, ttlSec?)`
    - connections: `addConnection(matchId, teamId, userId)`, `listConnections(matchId, teamId)`
    - pieces: `getPiece(matchId, pieceId)`, `setPiece(matchId, piece)`, `listPieces(matchId)`
    - piece-lock: `acquirePieceLock(matchId, pieceId, userId, ttlSec)`, `releasePieceLock(matchId, pieceId, userId)`
    - score: `getScore(matchId)`, `incrTeamPlaced(matchId, teamId)`, `setPlaced(matchId, teamId, n)`
    - timer: `getTimer(matchId)`, `setTimer(matchId, { startedAt, durationMs })`
  - 受入基準: `neverthrow`のResult戻り、strict TS通過
  - 実装状況: [x] done
  - 参照: `backend/src/repository/gameStore.ts`

- U2-3: InMemory 実装（骨組み）
  - 概要: Map/Setベースの最小実装（無ロック環境での排他保証はロジック側で検証）
  - 受入基準: すべてのメソッドが存在し単体テスト可能
  - 実装状況: [x] done
  - 参照: `backend/src/repository/gameStore.memory.ts`

- U2-4: InMemory: connections 機能＋テスト
  - 概要: `addConnection`/`listConnections`
  - テスト: 同一ユーザー重複登録の無害化、接続数カウントの正確性
  - 受入基準: ユニットテスト緑
  - 実装状況: [x] done
  - 参照: `backend/src/__tests__/store/memory.connections.test.ts`

- U2-5: InMemory: pieces CRUD＋一覧＋テスト
  - 概要: `setPiece`/`getPiece`/`listPieces`
  - テスト: 未登録→undefined、上書き保存、一覧の安定性
  - 受入基準: ユニットテスト緑
  - 実装状況: [x] done
  - 参照: `backend/src/__tests__/store/memory.pieces.test.ts`

- U2-6: InMemory: ロック（acquire/release/TTL模擬）＋並行テスト
  - 概要: `acquirePieceLock`（保持者設定・TTL模擬）/`releasePieceLock`
  - テスト: `Promise.all`同時grabで勝者が一意、非保持者releaseで拒否、TTL経過で再取得可
  - 受入基準: 競合テスト安定（>100回で一意性保持）
  - 実装状況: [x] done
  - 参照: `backend/src/__tests__/store/memory.locks.test.ts`

- U2-7: InMemory: スコア＋テスト
  - 概要: `setPlaced`/`incrTeamPlaced`/`getScore`
  - テスト: 増分の正確性、未初期化時のデフォルト0、並行インクリメントでの整合
  - 受入基準: ユニットテスト緑
  - 実装状況: [x] done
  - 参照: `backend/src/__tests__/store/memory.score.test.ts`

- U2-8: InMemory: タイマー＋テスト
  - 概要: `setTimer`/`getTimer`
  - テスト: startedAt/durationMsの保持、上書き時の整合
  - 受入基準: ユニットテスト緑
  - 実装状況: [x] done
  - 参照: `backend/src/__tests__/store/memory.timer.test.ts`

- U2-9: Redis キー設計の確定（仕様化）
  - 概要: 既存キーと整合を取りつつ各機能のキー確定
  - キー:
    - pieces: `match:{id}:pieces`（Hash: `pieceId` -> JSON）
    - locks: `match:{id}:piece:{pieceId}:lock`（String, TTL）+ `match:{id}:locks:pieces`（Set）
    - score: `match:{id}:score`（Hash: `teamId` -> placed数）
    - timer: `match:{id}:timer`（String JSON: `{startedAt,durationMs}`）
    - connections: `match:{id}:team:{teamId}:connected`（Set）
  - 受入基準: docs更新、既存 `redisKeys` と矛盾なし
  - 実装状況: [x] done
  - 参照: `backend/src/repository/redisKeys.ts`

- U2-10: Redis 実装: connections＋テスト
  - 概要: SADD/SMEMBERS実装
  - テスト: `MockRedisClient`で往復、重複SADDの無害化
  - 受入基準: ユニットテスト緑
  - 実装状況: [x] done
  - 参照: `backend/src/repository/gameStore.redis.ts`, `backend/src/__tests__/store/redis.connections.test.ts`

- U2-11: Redis 実装: pieces（Hash JSON）＋テスト
  - 概要: HSET/HGET/HVALS
  - テスト: JSON直列化/逆直列化の整合、一覧の件数・内容一致
  - 受入基準: ユニットテスト緑
  - 実装状況: [x] done
  - 参照: `backend/src/__tests__/store/redis.pieces.test.ts`

- U2-12: Redis 実装: ロック（SET NX PX）＋テスト
  - 概要: `SET key value NX PX ttl`でロック取得、DELで解放（保持者一致チェック）
  - テスト: 同時grabで一意性、保持者不一致release拒否、TTL後再取得可
  - 受入基準: 競合テスト安定
  - 実装状況: [x] done
  - 参照: `backend/src/__tests__/store/redis.locks.test.ts`

- U2-13: Redis 実装: スコア（Hash）＋テスト
  - 概要: HINCRBY/HSET/HGETALL
  - テスト: 原子的加算、未初期化→0
  - 受入基準: ユニットテスト緑
  - 実装状況: [x] done
  - 参照: `backend/src/__tests__/store/redis.score_timer.test.ts`

- U2-14: Redis 実装: タイマー（String JSON）＋テスト
  - 概要: SET/GETで `{startedAt,durationMs}` を保存
  - テスト: 再読込の整合、上書き
  - 受入基準: ユニットテスト緑
  - 実装状況: [x] done
  - 参照: `backend/src/__tests__/store/redis.score_timer.test.ts`

- U2-15: Publisher IF（送出抽象）＋Spy/Noop
  - 概要: `toTeam(teamId)`/`toPublic(matchId)`/`toUser(socketId)` のFacade
  - テスト: Spyで呼び出し回数/ペイロード検証、Noopで単体テスト容易化
  - 受入基準: サービス層をPublisherに依存させても既存M1が動作継続（導入はM3で実施）
  - 実装状況: [x] done
  - 参照予定: `backend/src/socket/publisher.ts`, `backend/src/__tests__/socket/publisher.test.ts`

- U2-16: 既存コードとの整合・段階的適用準備
  - 概要: 既存M1コードを壊さず徐々にGameStoreに差し替えられるよう準備
  - 方針: Feature flag/DIポイントを用意（M2では未適用、M3で差し替え）
  - テスト: 既存シナリオテストがグリーンのまま維持（smoke）
  - 受入: M1のテストがすべて通過、ビルド/型チェックOK
  - 実装状況: [x] done
  - 参照予定: `backend/src/model/game/session.ts`（適用検討のみ）
  - 参照: `backend/src/config/di.ts`, `backend/src/__tests__/config/di.test.ts`

- U2-17: エラーハンドリングポリシーとResultマッピング
  - 概要: `Result<Ok,Err>`のErr文字列ユニオン（'notFound'|'conflict'|'invalid'|'io' など）と、HTTP/Socketエラー変換の指針
  - テスト: 単体でErr分岐が網羅されること（Zodエラー→'invalid'等）
  - 受入基準: サービス層で `isErr()` 分岐が一貫して扱える
  - 実装状況: [x] done
  - 参照: `backend/src/shared/errors.ts`, `backend/src/__tests__/shared/errors.test.ts`

- U2-18: 型共有・スキーマ単一ソース化
  - 概要: Zodスキーマを単一ソースにし、型を`infer`で共有（必要なら型のみフロントへエクスポート）
  - テスト: `GameInitPayload`等と矛盾がない（型レベルで検出）
  - 受入基準: ビルド時に循環依存なし、クライアント型と一致
  - 実装状況: [x] done（`events.ts` の `GameInitPayload` を `model/game/init.ts` に一本化）

- U2-19: ドキュメント・キー設計更新
  - 概要: 本章と `backend/src/repository/redisKeys.ts` のキー追記、必要に応じ `docs/in-game/events-game.md` を調整
  - 受入基準: 追加キーが既存キーと衝突しない、命名規則が一貫
  - 実装状況: [x] done

- U2-20: CI統合・テストマトリクス
  - 概要: InMemory/Redisテストのタグ分離（RedisはMockでOK）。並行テストはシリアライズ/リトライ設定
  - 受入基準: `pnpm test` 全緑、競合テストのフレーク率が許容範囲（<1%）
  - 実装状況: [ ] pending

- U2-21: 負荷/並行性ミニベンチ（任意）
  - 概要: InMemory実装でgrab競合・move擬似頻度（15–30Hz）を短時間ベンチ
  - 受入基準: 目視で遅延/一意性に問題なし（M3の実装目安）
  - 実装状況: [ ] pending

### M2 受け入れチェックリスト（最終）
- [x] GameStore IFとZodスキーマが確定（型/契約がコンパイル通過）
- [x] InMemory実装＋ユニットテストが緑（connections/pieces/locks/score/timer）
- [x] Redis実装のキー設計が文書化・整合（`redisKeys` 追記）
- [x] Redis実装ユニットテストが緑（MockでOK）
- [x] Publisher IF＋Spy/Noopで送出抽象のテストが可能
- [x] 既存M1シナリオがグリーン（非導入で回帰なし）

---

## M3 ピースエンジン（grab/move/release）
目的: サーバ権威でピース保持・移動・解放を管理し、チーム内同期を実現する。

- U3-1: ドメイン/型の定義
  - Piece: `{ id, x, y, placed, row?, col?, holder?: userId }`
  - バリデーション: ZodでID/座標/行列境界
  - 受入基準: `docs/in-game/events-game.md` 準拠のpayload
  - 進捗: [ ] pending

- U3-2: 掴み（piece-grab）
  - ロック: `SETNX match:{id}:piece:{pid}:lock = userId (TTL)` + heal用Set
  - 成功: `piece-grabbed` を team に送出／失敗: `piece-grab-denied`
  - 受入基準: 同時grab競合で一意に勝者が決まる（conflict図）
  - 進捗: [ ] pending

- U3-3: 移動（piece-move）
  - 条件: holderのみ受理。軽量スロットリング（受信側）
  - 更新: 位置保存 + `piece-moved` を team に送出
  - 受入基準: 継続移動で整合、非ホルダーmove拒否
  - 進捗: [ ] pending

- U3-4: 解放（piece-release）
  - 処理: 最終位置保存、必要に応じロック解除
  - 受入基準: 解放直後に他ユーザーがgrab可能
  - 進捗: [ ] pending

- U3-5: テスト
  - 単体: grab競合、非ホルダーmove拒否、解放→即grab可
  - 負荷: 15–30Hz move想定で遅延・不整合なし
  - 進捗: [ ] pending

### M3 受け入れチェックリスト
- [ ] piece-grabの相互排他が保証
- [ ] 非ホルダー操作が拒否される
- [ ] moveイベントが滑らかに同期

---

## M4 配置/スコア/進捗
目的: 正解配置の検証・確定・進捗公開を行い、全配置で終了をトリガーする。

- U4-1: 配置検証（piece-place）
  - 条件: holder一致・未配置・正解セル・スナップ域内
  - 成功: `placed=true`, `row/col` 確定、ロック解除、`piece-placed` を team へ
  - 失敗: `piece-released` を返し復元
  - 受入基準: 境界条件（端/誤差）をテストで網羅
  - 進捗: [ ] pending

- U4-2: スコア更新/公開
  - 更新: `score[teamId].placed++`
  - 公開: `progress-update` を public に送出（相手は数のみ）
  - 受入基準: 自/相手の可視性が仕様通り
  - 進捗: [ ] pending

- U4-3: 完了判定
  - 条件: 全ピース配置で `game-end {reason:'completed'}`
  - 受入基準: 重複送出なし（idempotent）
  - 進捗: [ ] pending

### M4 受け入れチェックリスト
- [ ] 正解判定とスナップが安定
- [ ] progressの公開が最小限で最適
- [ ] 完了時に確実に終了通知

---

## M5 タイムキーパー
目的: 開始時刻/制限時間をサーバで管理し、timer-syncとタイムアップ終了を提供する。

- U5-1: 開始/設定
  - `game-start` 決定時に `{ startedAt, durationMs }` を保存
  - 受入基準: 途中参加の `game-init` が正しい時間情報を返す
  - 進捗: [ ] pending

- U5-2: 同期
  - 5秒ごと（または重要イベント時）に `timer-sync` を public に送出
  - 受入基準: クライアント側表示がドリフト補正される
  - 進捗: [ ] pending

- U5-3: タイムアップ
  - 残り0でスコア比較し `game-end {reason:'timeout'}`
  - 同点は `winnerTeamId:null`
  - 進捗: [ ] pending

### M5 受け入れチェックリスト
- [ ] timer-syncで視覚上のズレが収束
- [ ] timeout終了が一貫・重複なし

---

## M6 再接続/同期ずれ対策
目的: 再接続やネットワーク不安定時に安全に復旧できるようにする。

- U6-1: `request-game-init`/`state-sync`
  - 最新盤面/スコア/タイマーを再送（差分または全量）
  - 受入基準: 再同期後に視覚/内部状態の差異がない
  - 進捗: [ ] pending

- U6-2: ロック回収
  - 切断で孤立したholderのロックはTTLで自動解放、必要に応じ早期回収
  - 受入基準: 放置ロックがゲーム継続を阻害しない
  - 進捗: [ ] pending

- U6-3: ポジション復元
  - 直近move/positionを保持し、解放時に復元
  - 受入基準: ズレ検出時も安全に復元
  - 進捗: [ ] pending

### M6 受け入れチェックリスト
- [ ] 再接続後の `game-init` で完全復旧
- [ ] ロックのスタックが自動回復

---

## M7 運用補助
目的: 可観測性・保守性・悪用対策を整える。

- U7-1: メトリクス/ログ
  - grab/move/place 成否、競合率、遅延などを記録
  - 受入基準: ダッシュボード/ログで異常検知可能
  - 進捗: [ ] pending

- U7-2: 管理操作
  - 管理API: マッチ強制終了、ロック強制解放、state dump
  - 受入基準: 本番事故時の復旧手順が具体的
  - 進捗: [ ] pending

- U7-3: レート制限
  - Socket名前空間単位で軽量レート制限（特にmove）
  - 受入基準: 悪用/スパムで帯域逼迫を抑制
  - 進捗: [ ] pending

### M7 受け入れチェックリスト
- [ ] 主要KPIの可視化
- [ ] 緊急時の復旧手段が用意されている

---

## 更新ルール
- 新たなUを本ファイルに追記し、行頭に `[ ]`/`[x]` で進捗を管理します。
- 実装/テスト完了時は `参照` にコミット対象のファイル/テストを追加します。
- 仕様変更が生じた場合は、該当Mの目的・受け入れ基準を先に更新してからUを調整します。
