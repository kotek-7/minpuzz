# みんパズ バックエンド実装計画（マイルストーン方式）

本ドキュメントは、ゲームバックエンドを大きなマイルストーン（M）と、その中の独立した実装単位（U）で管理し、順次Uを追加・完了していくための進行表です。実装の分割は「テスト可能」「副作用の少ない境界」「将来差し替えやすい抽象」を基準にしています。

## マイルストーン概要
- M1: セッション/ルーム最小実装（join-game登録、game-init返却、全員接続でgame-start）
- M2: ストア/ロック層の抽象化（GameStore IF、Redis実装、キー設計確立）
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
目的: 盤面/スコア/ロック/タイマーを一貫管理する GameStore 抽象を定義し、Redis 実装を土台として提供する（方針変更により InMemory 実装は採用しない）。M3以降（ピースエンジン）の土台。

方針（2025-08 反映）
- ストア実装は Redis のみとする。
- InMemory 実装（およびそのテスト項目）は削除。ユニットテストは MockRedisClient により Redis 実装前提で実施する。

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
  - 概要: 方針変更により削除（Redis のみを採用）
  - 受入基準: なし（当該Uは廃止）
  - 実装状況: [x] removed (policy change)
  - 参照: なし

- U2-4: InMemory: connections 機能＋テスト
  - 概要: 方針変更により削除（Redis のみを採用）
  - テスト: なし（当該Uは廃止）
  - 受入基準: なし（当該Uは廃止）
  - 実装状況: [x] removed (policy change)
  - 参照: なし

- U2-5: InMemory: pieces CRUD＋一覧＋テスト
  - 概要: 方針変更により削除（Redis のみを採用）
  - テスト: なし（当該Uは廃止）
  - 受入基準: なし（当該Uは廃止）
  - 実装状況: [x] removed (policy change)
  - 参照: なし

- U2-6: InMemory: ロック（acquire/release/TTL模擬）＋並行テスト
  - 概要: 方針変更により削除（Redis のみを採用）
  - テスト: なし（当該Uは廃止）
  - 受入基準: なし（当該Uは廃止）
  - 実装状況: [x] removed (policy change)
  - 参照: なし

- U2-7: InMemory: スコア＋テスト
  - 概要: 方針変更により削除（Redis のみを採用）
  - テスト: なし（当該Uは廃止）
  - 受入基準: なし（当該Uは廃止）
  - 実装状況: [x] removed (policy change)
  - 参照: なし

- U2-8: InMemory: タイマー＋テスト
  - 概要: 方針変更により削除（Redis のみを採用）
  - テスト: なし（当該Uは廃止）
  - 受入基準: なし（当該Uは廃止）
  - 実装状況: [x] removed (policy change)
  - 参照: なし

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
  - 概要: Redis(Mock) テストの安定実行。競合テストはシリアライズ/リトライ設定
  - 受入基準: `pnpm test` 全緑、競合テストのフレーク率が許容範囲（<1%）
  - 実装状況: [ ] pending

- U2-21: 負荷/並行性ミニベンチ（任意）
  - 概要: MockRedis/Redis 前提で grab 競合・move 擬似頻度（15–30Hz）を短時間ベンチ
  - 受入基準: 目視で遅延/一意性に問題なし（M3の実装目安）
  - 実装状況: [ ] pending

### M2 受け入れチェックリスト（最終）
- [x] GameStore IFとZodスキーマが確定（型/契約がコンパイル通過）
- [x] Redis実装のキー設計が文書化・整合（`redisKeys` 追記）
- [x] Redis実装ユニットテストが緑（MockRedisClientでOK）
- [x] Publisher IF＋Spy/Noopで送出抽象のテストが可能
- [x] 既存M1シナリオがグリーン（非導入で回帰なし）
- 注記: InMemory実装は採用しない（方針: Redisのみ）。

---

## M3 ピースエンジン（grab/move/release）
目的: サーバ権威でピースの保持（ロック）・移動・解放を管理し、チーム内同期を実現する。

- U3-1: イベント型/スキーマ（grab/move/release）
  - 概要: `piece-grab`/`piece-move`/`piece-release` のPayload型とZodスキーマを定義・共有
  - 受入基準: スキーマparse成功、型はサーバ/フロント共有
  - 実装状況: [x] done
  - 参照: `backend/src/model/game/schemas.ts`, `backend/src/socket/events.ts`, `backend/src/__tests__/model/game/piece.events.schema.test.ts`

- U3-2: ガード/ユーティリティ（保持者検証・状態取得）
  - 概要: ホルダー一致検証、ピース取得・更新の純粋関数群
  - 受入基準: 未保持/未登録/配置済などのガード条件が単体テストで網羅
  - 実装状況: [x] done
  - 参照: `backend/src/model/game/pieceGuards.ts`

- U3-3: 掴み（piece-grab）サービス
  - 概要: `GameStore.acquirePieceLock`でロック獲得→`piece-grabbed`送出、失敗は`piece-grab-denied`
  - 受入基準: 同時grab競合で勝者一意、配置済/未登録はdeny
  - 実装状況: [x] done
  - 参照: `backend/src/model/game/pieceService.ts`, `backend/src/__tests__/model/game/piece.service.test.ts`

- U3-4: 移動（piece-move）サービス
  - 概要: ホルダーのみ受理、位置保存、`piece-moved`をチームへ送出（サーバは軽量ガード）
  - 受入基準: 非ホルダー拒否、連続moveで最新位置が一貫
  - 実装状況: [x] done
  - 参照: `backend/src/model/game/pieceService.ts`, `backend/src/__tests__/model/game/piece.service.test.ts`

- U3-5: 解放（piece-release）サービス
  - 概要: 最終位置保存、ロック解除（未配置前提）、`piece-released`送出
  - 受入基準: 解放直後に他ユーザーがgrab可能、非ホルダーreleaseは拒否
  - 実装状況: [x] done
  - 参照: `backend/src/model/game/pieceService.ts`, `backend/src/__tests__/model/game/piece.service.test.ts`

- U3-6: Socketゲートウェイ配線
  - 概要: `piece-grab`/`piece-move`/`piece-release` の受け口追加、Zod検証→サービス呼び出し→Publisher送出
  - 受入基準: SpyPublisherでイベント送出回数/ペイロード検証、バリデーションエラー時の応答
  - 実装状況: [x] done
  - 参照: `backend/src/socket/teamSocket.ts`

- U3-7: 競合/異常系シナリオテスト
  - 概要: InMemoryStore＋SpyPublisherで、同時grab/非ホルダーmove/解放→再grab のシナリオを通す
  - 受入基準: 期待イベントシーケンスと件数が一致、例外や重複送出なし
  - 実装状況: [x] done（イベントはサービス層の結果で検証）
  - 参照: `backend/src/__tests__/scenario/in-game.pieces.scenario.test.ts`

- U3-8: 軽量スロットリング/ガード（最小）
  - 概要: サーバ側でmove頻度の基本ガード（例: ソケットIDごとの直近tsで粗く抑制）
  - 受入基準: しきい値超の連打で一部ドロップ（件数が上限近辺に収束）
  - 実装状況: [x] done
  - 参照: `backend/src/socket/middleware/rateLimit.ts`, `backend/src/__tests__/socket/middleware/rateLimit.test.ts`, `backend/src/socket/teamSocket.ts`

### M3 受け入れチェックリスト
- [x] piece-grabの相互排他が保証
- [x] 非ホルダー操作が拒否される
- [x] moveイベントが仕様どおりに同期（過剰送出は抑制）
  - 参照: `backend/src/__tests__/model/game/piece.service.test.ts`, `backend/src/__tests__/scenario/in-game.pieces.scenario.test.ts`, `backend/src/socket/middleware/rateLimit.ts`

---

## M4 配置/スコア/進捗
目的: 正解配置の検証・確定・進捗公開を行い、全配置で終了をトリガーする。

### 実装目標（全体像）
- サーバ権威の配置確定: `piece-place` を受け、保持者・未配置・正解セル・スナップ許容誤差を検証して確定。
- 進捗とスコアの即時反映: 配置成功でチームの placed を加算し、public に最小情報の `progress-update` を送出。
- 完了判定と終了通知: 全ピース配置で一度だけ `game-end {reason:'completed'}` を送出し、冪等に終了状態へ遷移。
- 安定性と冪等性: 重複 place や非ホルダー操作を安全に拒否／無視し、重複通知や整合性崩壊を防止。

実現要件（達成条件）
- 検証要件: holder 一致、未配置、正解(row,col)、スナップ誤差内をZod＋純粋関数で判定できる。
- 成功時の状態遷移: `placed=true`、`row/col` 確定、holder解除、ロック解放、score++ が一貫して行われる。
- 送出要件: 成功時は teamへ `piece-placed`、publicへ `progress-update`。失敗時は requesterへ `piece-place-denied {reason}`。完了時は一度だけ `game-end`。
- 併用要件: M3ロックと整合（同時placeはロックで抑止）。再試行・重複placeは冪等に無害。
- 型/契約: `piece-place` 系イベント型/スキーマを定義・共有し、Zod検証を通過。
- テスト: 単体（バリデータ境界/誤差/誤セル・保持者/既配置拒否・score加算）とシナリオ（成功→進捗→全配置で終了）がグリーン。
- 帯域最適化: progress は成功時のみ・public最小情報。過剰ブロードキャスト無し。

- U4-0: イベント/スキーマ定義（piece-place）
  - 目的: `piece-place` 入力のZodスキーマとイベント定数を追加
  - 入力: `{ matchId, teamId, userId, pieceId, row, col, x, y }`
  - 受入基準: スキーマparse成功、型推論がTSで共有可能
  - 対象: `backend/src/model/game/schemas.ts`, `backend/src/socket/events.ts`
  - テスト: `backend/src/__tests__/model/game/piece.events.schema.test.ts`
  - 進捗: [x] done
  - 参照: `backend/src/model/game/schemas.ts`, `backend/src/socket/events.ts`

- U4-1: 配置ガード（純粋関数）
  - 目的: holder一致・未配置・正解セル・スナップ誤差内の検証
  - 入出力: ピース状態/候補(row,col,x,y)/許容誤差 → OK/NG理由タグ
  - 受入基準: 誤差境界・不正セル・非ホルダー・既配置の網羅テストが緑
  - 対象: `backend/src/model/game/pieceGuards.ts`
  - テスト: `backend/src/__tests__/socket/teamSocket.place.denied.test.ts`, `backend/src/__tests__/scenario/in-game.place.flow.test.ts`
  - 進捗: [x] done
  - 参照: `backend/src/model/game/pieceGuards.ts`, `backend/src/model/game/geometry.ts`

- U4-2: 配置サービス（place）
  - 目的: ガード通過時に `placed=true`/`row,col` 確定/位置確定/ロック解放
  - 処理: `store.getPiece`→ガード→`store.setPiece`→`store.releasePieceLock`
  - 受入基準: 成功で確定、失敗で状態不変、非ホルダー/既配置はErr
  - 対象: `backend/src/model/game/pieceService.ts`（`place()`追加）
  - テスト: `backend/src/__tests__/scenario/in-game.place.flow.test.ts`, `backend/src/__tests__/socket/teamSocket.place.test.ts`
  - 進捗: [x] done
  - 参照: `backend/src/model/game/pieceService.ts#place`

- U4-3: スコア更新＋progress公開
  - 目的: 成功時に `incrTeamPlaced()` し、publicへ `progress-update` を送出
  - 処理: `store.incrTeamPlaced`→`store.getScore`→`publisher.toPublic(matchId).emit('progress-update', {...})`
  - 受入基準: スコア加算が正、publicに1回送出、ペイロードが仕様形
  - 対象: `backend/src/model/game/pieceService.ts`（place内から呼出）
  - テスト: `backend/src/__tests__/socket/teamSocket.place.test.ts`
  - 進捗: [x] done
  - 参照: `backend/src/model/game/progress.ts`, `backend/src/socket/teamSocket.ts`

- U4-4: 完了判定＋game-end（冪等）
  - 目的: 全ピース配置で一度だけ `game-end {reason:'completed'}` を送出
  - 判定: `listPieces()` で全件 `placed` 確認（単純方式）
  - 冪等化: `MatchRecord.status` を `IN_GAME→COMPLETED` に遷移させ多重送出を防止
  - 受入基準: 同時place/重複placeでも多重送出なし
  - 対象: `backend/src/model/game/pieceService.ts` または小さな `endService.ts`
  - テスト: `backend/src/__tests__/socket/teamSocket.place.test.ts`, `backend/src/__tests__/scenario/in-game.place.flow.test.ts`
  - 進捗: [x] done
  - 参照: `backend/src/model/game/endService.ts`, `backend/src/socket/teamSocket.ts`

- U4-5: Socket配線（piece-place）
  - 目的: `teamSocket` に `PIECE_PLACE` を追加し、Zod検証→サービス呼出→送出
  - 送出: 成功→`piece-placed {pieceId,row,col,byUserId}`（to team）、失敗→`piece-released` or エラー
  - 受入基準: Publisherでイベント回数/内容検証
  - 対象: `backend/src/socket/teamSocket.ts`
  - テスト: `backend/src/__tests__/socket/teamSocket.place.test.ts`, `backend/src/__tests__/socket/teamSocket.place.denied.test.ts`
  - 進捗: [x] done
  - 参照: `backend/src/socket/teamSocket.ts`

- U4-6: シナリオテスト（進捗→完了）
  - 目的: grab→move→place成功→progress→全配置で `game-end` の一連を検証
  - 受入基準: イベント順序/回数が期待通り、冪等性OK、重複送出なし
  - 対象: `backend/src/__tests__/scenario/in-game.place.flow.test.ts`
  - 進捗: [x] done

- U4-7: publicルーム参加（必要時）
  - 目的: `JOIN_GAME` 時に `room:match:{id}:public` へ join して publicイベント受信を可能化
  - 受入基準: `progress-update`/`game-end` を受信できる
  - 対象: `backend/src/socket/teamSocket.ts`
  - テスト: 軽量ユニット/手動確認（統合テストはオプション）
  - 進捗: [x] done
  - 参照: `backend/src/socket/teamSocket.ts`（`JOIN_GAME`時に `room:match:{id}:public` へjoin）

#### 技術詳細
- スナップ誤差: `epsilonPx`（例: 8px）をガード引数/定数として管理
- 終了判定の冪等化: `getMatch`→状態確認→`setMatch`で`COMPLETED`に遷移し多重送出防止
- ペイロード: `events-game.md`の`piece-placed`/`progress-update`/`game-end`に準拠
- エラー: neverthrowのErr文字列（'invalid'|'conflict'|'notFound'等）で扱う

#### 対象ファイル
- 追加/変更: `backend/src/model/game/schemas.ts`, `backend/src/socket/events.ts`, `backend/src/model/game/pieceGuards.ts`, `backend/src/model/game/pieceService.ts`, （任意）`backend/src/model/game/endService.ts`, `backend/src/socket/teamSocket.ts`
- テスト: `backend/src/__tests__/model/game/piece.events.schema.test.ts`, `backend/src/__tests__/socket/teamSocket.place.denied.test.ts`, `backend/src/__tests__/socket/teamSocket.place.test.ts`, `backend/src/__tests__/scenario/in-game.place.flow.test.ts`

#### 段階的実装順序
1) U4-0 スキーマ/イベント → 2) U4-1 ガード → 3) U4-2 サービス → 4) U4-3 スコア/進捗 → 5) U4-4 完了判定/終了 → 6) U4-5 配線 → 7) U4-6 シナリオ → 8) U4-7 public参加

#### 品質保証/テスト戦略
- 単体: ガード境界・サービスの成功/失敗/冪等。SpyPublisherで送出観測
- シナリオ: 代表フローでイベント順序/回数検証
- 回帰: 既存M1/M3テストが緑であること

### M4 受け入れチェックリスト
- [x] 正解判定とスナップが安定
- [x] progressの公開が最小限で最適
- [x] 完了時に確実に終了通知
  - 参照: `backend/src/__tests__/socket/teamSocket.place.test.ts`, `backend/src/__tests__/socket/teamSocket.place.denied.test.ts`, `backend/src/__tests__/scenario/in-game.place.flow.test.ts`

---

## M5 タイムキーパー
目的: 開始時刻/制限時間をサーバで管理し、定期同期（timer-sync）とタイムアップ終了を提供する。途中参加でも正しい残り時間を初期化できる。

- U5-0: イベント/スキーマ定義
  - 概要: `timer-sync` イベントを追加。`set-timer`は用意せずサーバ主導。
  - I/O: Out `timer-sync { nowIso, startedAt, durationMs, remainingMs }`
  - 受入基準: Zod parse成功、型共有可能
  - 対象: `backend/src/model/game/schemas.ts`, `backend/src/socket/events.ts`
  - テスト: `backend/src/__tests__/model/game/piece.events.schema.test.ts` にtimer系ケース追加
  - 進捗: [ ] pending

- U5-1: GameInit拡充（途中参加者向け）
  - 概要: `buildInitPayload` で `startedAt`/`durationMs` をストアから読み取り埋め込み
  - 受入基準: 開始済みなら非null、未開始ならnull
  - 対象: `backend/src/model/game/init.ts`
  - テスト: 新規 `backend/src/__tests__/model/game/init.timer.test.ts` または既存シナリオへ追加
  - 進捗: [ ] pending

- U5-2: ゲーム開始でタイマー保存
  - 概要: `GAME_START` 決定時に `setTimer({ startedAt: nowISO, durationMs })` を保存
  - 受入基準: `getTimer` 再取得で一致
  - 対象: `backend/src/socket/teamSocket.ts`
  - テスト: 既存 `backend/src/__tests__/store/redis.score_timer.test.ts` に加え、ソケット統合の簡易検証
  - 進捗: [ ] pending

- U5-3: タイマー計算ユーティリティ
  - 概要: `remainingMs(now, timer)` 純粋関数（負値→0）
  - 受入基準: 時刻境界の単体テストが緑
  - 対象: 新規 `backend/src/model/game/timer.ts`
  - テスト: 新規 `backend/src/__tests__/model/game/timer.test.ts`
  - 進捗: [ ] pending

- U5-4: 同期送出サービス
  - 概要: `TimerSyncService.tick(matchId, now)` で1回分の `timer-sync` を送出（store/ioは注入）。`remainingMs` を用いて算出。
  - 受入基準: Spy IOで送出回数/内容検証可能
  - 対象: 新規 `backend/src/model/game/timerService.ts`
  - テスト: 新規 `backend/src/__tests__/model/game/timer.service.test.ts`
  - 進捗: [ ] pending

- U5-5: スケジューラ（インターバル制御）
  - 概要: `TimerScheduler.start(matchId)`/`stop(matchId)` を提供。内部で5秒間隔tick。テストでは手動tick可能な抽象を注入。
  - 受入基準: start重複の冪等性、stop後に送出なし
  - 対象: 新規 `backend/src/socket/middleware/timerScheduler.ts`
  - テスト: 新規 `backend/src/__tests__/socket/middleware/timerScheduler.test.ts`
  - 進捗: [ ] pending

- U5-6: ソケット配線（スケジューラ連携）
  - 概要: `GAME_START` で `TimerScheduler.start(matchId)`、`GAME_END` で `stop(matchId)`。`JOIN_GAME` はpublic joinのみ。
  - 受入基準: start→syncが定期送出、endで停止
  - 対象: `backend/src/socket/teamSocket.ts`
  - テスト: 新規 `backend/src/__tests__/socket/teamSocket.timer.test.ts`
  - 進捗: [ ] pending

- U5-7: タイムアップ判定と終了
  - 概要: `TimerSyncService.tick` で `remainingMs<=0` を検知し `completeMatchIfNeeded` を呼び、`GAME_END {reason:'timeout'}` をpublicへ1回だけ送出（同点はwinner null）。
  - 受入基準: タイムアップが一度だけ発火、以降送出されない
  - 対象: `backend/src/model/game/timerService.ts`, `backend/src/socket/teamSocket.ts`
  - テスト: 新規 `backend/src/__tests__/scenario/in-game.timeout.flow.test.ts`
  - 進捗: [ ] pending

- U5-8: エラー/回復ポリシー
  - 概要: `getTimer`未設定/invalidは安全にskip（ログのみ）。`setTimer`失敗時もソケット側でクラッシュしない。
  - 受入基準: 例外で落ちず、再試行で回復可能
  - 対象: 関連各所
  - テスト: サービス単体でErr分岐網羅
  - 進捗: [ ] pending

### M5 受け入れチェックリスト
- [ ] `GAME_START`時にtimerが保存される
- [ ] `game-init`に正しいtimer情報が入る
- [ ] `timer-sync`が定期送出（5秒間隔）される
- [ ] 途中参加でも残り時間が正しく表示できる
- [ ] 残り0で一度だけ`GAME_END {reason:'timeout'}`を送出
- [ ] 終了後はsync送出が停止する
- [ ] 異常時も落ちずにskip（ログのみ）

---

## M6 再接続/同期ずれ対策
目的: 再接続や同期ずれ時に最新状態へ安全に復旧し、切断で孤立したロックを回収してゲーム継続性を確保する。

- U6-0: イベント/スキーマ定義
  - 概要: `request-game-init`（入力）と `state-sync`（出力）イベントのPayload定義
  - I/O: In `{ matchId, teamId, userId }` / Out `{ board, pieces[], score, timer|null, matchStatus }`
  - 受入基準: Zod parse成功、型共有可能
  - 対象: `backend/src/model/game/schemas.ts`, `backend/src/socket/events.ts`
  - テスト: `backend/src/__tests__/model/game/state.events.schema.test.ts`
  - 進捗: [x] done

- U6-1: スナップショット生成（純粋ユースケース）
  - 概要: `buildStateSnapshot(store, matchId)` → `{ board, pieces, score, timer|null, matchStatus }` を合成
  - 受入基準: storeの値から矛盾なく合成。タイマー未設定時は `timer:null`
  - 対象: 新規 `backend/src/model/game/state.ts`
  - テスト: `backend/src/__tests__/model/game/state.snapshot.test.ts`
  - 進捗: [x] done

- U6-2: リクエスト同期ハンドラ
  - 概要: `REQUEST_GAME_INIT` を受理し、最新スナップショットをリクエスト元に `STATE_SYNC` で返す
  - 受入基準: 有効マッチで最新全量を返却。無効時はエラー通知
  - 対象: `backend/src/socket/teamSocket.ts`
  - テスト: `backend/src/__tests__/socket/teamSocket.stateSync.test.ts`
  - 進捗: [x] done

- U6-3: JOIN直後の即時同期（オプション）
  - 概要: `JOIN_GAME` 直後に `GAME_INIT` の後続として `STATE_SYNC` を本人宛に送出し、ズレを最小化
  - 受入基準: 既存挙動を壊さず、pieces/score/timer が即時一致
  - 対象: `backend/src/socket/teamSocket.ts`
  - テスト: `backend/src/__tests__/socket/teamSocket.stateSync.test.ts`（JOIN直後ケース）
  - 進捗: [x] done

- U6-4: ロック回収サービス（切断トリガ）
  - 概要: 切断ユーザーが保持中のピース（holder===userId）を検出し、位置保存→holder解除→`releasePieceLock()` で即時回収
  - 受入基準: 切断直後に他ユーザーが `grab` 可能になる
  - 対象: 新規 `backend/src/model/game/lockReclaimService.ts`
  - テスト: `backend/src/__tests__/model/game/lockReclaim.service.test.ts`
  - 進捗: [x] done

- U6-5: 切断ハンドラ連携
  - 概要: `DISCONNECT` 時に U6-4 を呼び出す（既存のチーム離脱処理に追加）
  - 受入基準: 切断→保持ロックが即座に解放。既存の人数/チーム通知は維持
  - 対象: `backend/src/socket/teamSocket.ts`
  - テスト: `backend/src/__tests__/socket/teamSocket.disconnect.reclaim.test.ts`
  - 進捗: [x] done

- U6-6: 冪等性・安全性
  - 概要: ロック回収は何度呼んでも安全（状態遷移で保護）。途中エラーでも他件に波及しない
  - 受入基準: 二重実行・部分失敗でも破綻しない
  - テスト: サービス単体で二重実行の無害性確認
  - 進捗: [x] done

- U6-7: 追加考慮（任意）
  - 概要: TTLベースの定期回収スケジューラの導入検討、`state-sync` の軽量レート制限
  - 受入基準: 帯域/安定性への悪影響なし
  - 進捗: [x] 部分完了（`state-sync`レート制限）。TTLスキャンはM7で検討。

### M6 受け入れチェックリスト
- [ ] `request-game-init` に対して最新スナップショットを返却
- [ ] `JOIN_GAME` 直後に状態が同期（任意実装時）
- [ ] 切断ユーザーの保持ロックが即時回収される
- [ ] 回収後に他ユーザーが同ピースを `grab` 可能
- [ ] 冪等性（重複回収・再同期）で破綻しない
- [ ] 異常時でも落ちずにスキップ/ログで回復可能

---

## M7 運用補助
目的: 可観測性（メトリクス/ログ）を強化し、管理操作と健全なレート制御で運用性・耐障害性を高める。

- U7-0: メトリクス基盤（IF＋集計）
  - 概要: `Metrics` IF（counter増分・ゲージ設定）とInMemory実装。集計対象を一元管理。
  - 計測対象: grab/move/release/place 成否、progress送出、game-start/end、timer-sync送出数、state-sync送出数、rate-limit drop数
  - 受入基準: Spy実装でイベント呼び出しに応じたカウントが正確に増える
  - 対象: 新規 `backend/src/shared/metrics.ts`
  - テスト: `backend/src/__tests__/shared/metrics.test.ts`
  - 進捗: [ ] pending

- U7-1: メトリクス送出フック
  - 概要: 主要イベントの結果確定点に `metrics.inc()` を追加（成功/拒否で差分）
  - 受入基準: 該当イベントの成功/拒否でカウンタが正しく反映
  - 対象: `backend/src/socket/teamSocket.ts`, `backend/src/model/game/pieceService.ts`, `backend/src/model/game/timerService.ts` ほか
  - テスト: `backend/src/__tests__/socket/metrics.integration.test.ts`
  - 進捗: [ ] pending

- U7-2: メトリクスエクスポート
  - 概要: `GET /admin/metrics` で `{ counters: Record<string, number> }` を返す（JSON）。Prometheus互換は任意。
  - 受入基準: イベント発火後に期待値が取得できる
  - 対象: 新規 `backend/src/routes/v1/admin.ts`（`/metrics` 追加）, 既存 `routes/v1/index.ts` にマウント
  - テスト: `backend/src/__tests__/routes/admin.metrics.test.ts`
  - 進捗: [ ] pending

- U7-3: 構造化ロギングユーティリティ
  - 概要: `logger.info({ event, matchId, ... })` 形式の薄いラッパを導入（依存追加なし）
  - 受入基準: 期待キーが出力に含まれる（formatter単体テスト）
  - 対象: 新規 `backend/src/shared/logger.ts`、軽微に使用箇所を置換
  - テスト: `backend/src/__tests__/shared/logger.test.ts`
  - 進捗: [ ] pending

- U7-4: 管理API（運用操作）
  - 概要:
    - `POST /admin/matches/:matchId/end` → `COMPLETED`へ遷移＋`GAME_END{reason:'forfeit'}`送出（冪等）
    - `POST /admin/matches/:matchId/release-locks` → ピースロック強制回収
    - `GET /admin/matches/:matchId/state` → スナップショット返却
  - 認証: ヘッダ `x-admin-token`（`.env ADMIN_TOKEN`）
  - 受入基準: 各操作が冪等で、無効ID/不正トークンは適切なHTTPコード
  - 対象: `backend/src/routes/v1/admin.ts`（追加）, `model/game/endService.ts`/`lockReclaimService.ts` 再利用
  - テスト: `backend/src/__tests__/routes/admin.ops.test.ts`
  - 進捗: [ ] pending

- U7-5: レート制限（強化）
  - 概要: 名前空間/イベント別の簡易トークンバケット（ソケットID単位）で帯域保護
  - 例: `move` 40ms、`state-sync` 500ms、`request-game-init` 500ms（既存）、管理APIも低頻度で制限
  - 受入基準: 連打で一定割合がドロップし、窓を空けると再度通る
  - 対象: `socket/middleware/rateLimit.ts` 強化 or 新規 `rateBucket.ts`、`teamSocket.ts` 適用
  - テスト: `backend/src/__tests__/socket/middleware/rateBucket.test.ts`
  - 進捗: [ ] pending

- U7-6: 設定値の外部化
  - 概要: タイマー長・スケジューラ間隔・各レート制限値・ADMIN_TOKEN を `.env` から取得（`env.ts`拡張）
  - 受入基準: `.env` 未設定時はデフォルト、設定時は反映
  - 対象: `backend/src/env.ts`、使用箇所（teamSocket/timerScheduler等）
  - テスト: `backend/src/__tests__/config/env.test.ts`
  - 進捗: [ ] pending

- U7-7: ヘルスチェック
  - 概要: `GET /health`（プロセス稼働）/ `GET /ready`（Redis疎通）
  - 受入基準: RedisモックOKで`/ready` 200、エラー時 503
  - 対象: `backend/src/routes/index.ts` or 新規 `routes/v1/health.ts`
  - テスト: `backend/src/__tests__/routes/health.test.ts`
  - 進捗: [ ] pending

- U7-8: 遅延計測（簡易）
  - 概要: 代表イベントで処理時間msを測り、閾値超をカウント（例: `latency.grab.gt50ms`）
  - 受入基準: 疑似遅延でカウンタ増加
  - 対象: メトリクス＋軽量 `measure()` ユーティリティ
  - テスト: `backend/src/__tests__/shared/metrics.latency.test.ts`
  - 進捗: [ ] pending

### M7 受け入れチェックリスト
- [ ] 主要イベントのメトリクスが集計され、`/admin/metrics` で確認可能
- [ ] 管理API（end/release/state）が冪等に動作し、適切にログ/メトリクス記録
- [ ] レート制限がイベント別に適用され、スパムによる帯域逼迫が抑制
- [ ] 環境変数による設定が反映され、未設定時は安全なデフォルト
- [ ] `/health`/`/ready` が正しく稼働状況を示す
- [ ] 簡易遅延計測で異常時検知の足掛かりが得られる

---

## 更新ルール
- 新たなUを本ファイルに追記し、行頭に `[ ]`/`[x]` で進捗を管理します。
- 実装/テスト完了時は `参照` にコミット対象のファイル/テストを追加します。
- 仕様変更が生じた場合は、該当Mの目的・受け入れ基準を先に更新してからUを調整します。
