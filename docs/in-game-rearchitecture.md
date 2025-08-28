# in-game 再構築計画（クリック配置・5x5 対応）

## 概要（ビジネス要件変更による改築）
- 操作方式をドラッグから「ピース選択 → 盤面セルクリック → 配置」に変更。
- 盤面サイズを 6x6 から 5x5 に統一（総ピース数 25）。
- 本変更に伴い、ゲーム本体（in-game）に関わるバックエンドを更地化し、クリック配置に最適化して再構築する。

### スコープ
- join-game 後の初期化（game-init/state-sync 初回返却含む）〜 進行（配置/進捗/同期/タイマー）〜 終了通知まで。

### 非スコープ
- チーム待機/マッチング/REST の作成・参加フロー（接続フェーズ）。

### 主要な設計変更
- イベント契約: ドラッグ系（grab/move/release）を全廃し、place/placed/denied と state/timer/end を中核に再編。
- ストアIF: ロック機構と座標移動の責務を撤去し、pieces/score/timer/connections に集約。
- 競合: 同一ピース/セルの同時操作は先着優先（place の原子性で担保）。
- ピース表現: クリック配置前提で `Piece { id, placed, row?, col? }` に簡素化（自由座標 x,y は持たない）。

### 撤去（ドラッグ由来）
- イベント: `piece-grab` / `piece-move` / `piece-release` と対応 Out（grabbed/moved/released/denied）。
- サービス: `lockReclaimService`、`pieceService.grab/move/release`。
- ストアIF: `acquirePieceLock` / `releasePieceLock` などロック系。
- Redisキー: `match:{id}:piece:{pieceId}:lock` / `match:{id}:locks:*` 系。

### 維持/強化
- `piece-place` / `piece-placed` / `piece-place-denied`、`progress-update`、`timer-sync`、`game-end`、`state-sync`、`game-init`。
- 5x5 前提の seed/init/state、タイマーの周期送出、終了判定の一回性。

---

## 進め方（共通ポリシー）
- 実装はテスト可能な単位で分割し、各ステップでユニットテスト→（可能なら）統合テストを実施。
- 旧ドラッグ系は参照ゼロを保ちながら段階的撤去。

---

## ユニット1: 契約/型/スキーマ（土台） [x]
- 目的: 新イベント契約・型・Zodスキーマを確定し、旧ドラッグ系を全廃。
- 対象ファイル:
  - `backend/src/socket/events.ts`
  - `backend/src/model/game/types.ts`
  - `backend/src/model/game/schemas.ts`
- 実装要点:
  - In: `join-game`, `piece-place`, `request-game-init`。
  - Out: `game-init`, `state-sync`, `piece-placed`, `piece-place-denied`, `progress-update`, `timer-sync`, `game-end`。
  - `Piece { id, placed, row?, col? }`（x,y 非保持）、`board {rows:5, cols:5}`。
- テスト:
  - ユニット: Payload スキーマの parse 成否（row/col 範囲、必須/任意、型）。
- 完了基準: 旧ドラッグ系参照ゼロ、新スキーマ緑。

## ユニット2: ストアIF再設計 + Redisキー [x]
- 目的: ロック/座標移動を撤去し、pieces/score/timer/connections に集約。
- 対象ファイル:
  - `backend/src/repository/gameStore.ts`
  - `backend/src/repository/gameStore.redis.ts`
  - `backend/src/repository/redisKeys.ts`
- 実装要点:
  - pieces: `getPiece/setPiece/listPieces`
  - score: `getScore/incrTeamPlaced/setPlaced`
  - timer: `getTimer/setTimer`
  - connections: `addConnection/listConnections`
  - キー: `match:{id}:pieces` / `score` / `timer` / `team:{teamId}:connected`（lock系削除）
- テスト:
  - ユニット: pieces/score/timer/connections の往復・原子性（HINCR）。
- 完了基準: 旧ロックIF/キー参照ゼロ、ユニット緑。

## ユニット3: 初期データとスナップショット（5x5） [x]
- 目的: 初期化/同期の土台を 5x5 に統一。
- 対象ファイル:
  - `backend/src/model/game/seed.ts`
  - `backend/src/model/game/init.ts`
  - `backend/src/model/game/state.ts`
- 実装要点:
  - `seedPiecesIfEmpty(..., {rows:5, cols:5})`で25ピース生成。
  - `buildInitPayload` は board=5x5, pieces 一覧, timer? を返却。
  - `buildStateSnapshot` は board/pieces/score/timer/matchStatus を束ねる。
- テスト:
  - ユニット: 25ピース生成、スナップショット整合（空→部分配置→全配置）。
- 完了基準: 5x5 固定の初期化/同期が緑。

## ユニット4: 配置サービス（place）とガード [x]
- 目的: クリック配置のコア判定と保存を提供。
- 対象ファイル:
  - `backend/src/model/game/pieceGuards.ts`
  - `backend/src/model/game/pieceService.ts`
- 実装要点:
  - 検証: ピース存在・未配置・row/col 盤内（0..4）・セル未占有（同一座標ピースなし）。
  - 成功: `placed=true,row,col` を保存。失敗は `notFound|placed|invalidCell`。
- テスト:
  - ユニット: 正常/エラー/競合（同一セル/同一ピース）で先着のみ成功。
- 完了基準: 配置ドメインが単体で安定。

## ユニット5: 進捗/終了（completed/timeout） [x]
- 目的: スコア集計と終了判定の一回性。
- 対象ファイル:
  - `backend/src/model/game/progress.ts`
  - `backend/src/model/game/endService.ts`
  - `backend/src/model/game/timer.ts` / `timerService.ts`
- 実装要点:
  - progress: `incrTeamPlaced` 後に最新 placed 集計返却。
  - end: 25/25 到達で completed、timeout で最大スコア勝者（同点 null）。
  - timer: remainingMs 計算、5秒周期送出、timeout で停止。
- テスト:
  - ユニット: progress/incr、end（完成/同点/最大値）、timer（remaining/timeout）。
- 完了基準: 進捗/終了/タイマー単体が緑。

## ユニット6: ソケット（JOIN_GAME/REQUEST_GAME_INIT） [x]
- 目的: 初期化の往復とタイマー開始まで。
- 対象ファイル:
  - `backend/src/socket/teamSocket.ts`
  - `backend/src/socket/middleware/timerScheduler.ts` / `rateLimit.ts`
- 実装要点:
  - JOIN_GAME: 本人宛 `game-init` → 即 `state-sync`、public 参加、seed 実行、`addConnection`→全員接続で `GAME_START`+`setTimer`+スケジューラ起動。
  - REQUEST_GAME_INIT: 500ms レート制限で本人宛 `state-sync`。
- テスト:
  - 統合: join→init/state-sync→start、public 参加、タイマー設定の検証。
- 完了基準: 接続〜開始の往復が通る。

## ユニット7: ソケット（PIECE_PLACE → placed/progress/end） [x]
- 目的: 配置に伴う通知連鎖と終了の一回性。
- 対象ファイル:
  - `backend/src/socket/teamSocket.ts`
- 実装要点:
  - 成功: team へ `piece-placed`、public へ `progress-update`、成立時 `game-end`（1回）＋タイマー停止。
  - 失敗: 本人宛 `piece-place-denied`。
- テスト:
  - 統合: 正常（placed→progress）、全配置で end、一斉クリックで先着のみ成功。
- 完了基準: 配置〜進捗〜終了の往復が通る。

## ユニット8: クリーンアップ（ドラッグ系撤去） [x]
- 目的: 旧仕様参照の完全排除。
- 対象作業:
  - ソース/テストから grab/move/release/lock 関連のコード・キー参照を削除。
  - `geometry.ts` をクリック配置に不要な範囲で縮退/撤去。
- テスト:
  - 全テスト緑、旧参照ゼロを確認。
- 完了基準: 旧仕様の痕跡なし。

## ユニット9: リグレッション/安定化 [x]
- 目的: 実運用を想定した動作安定と監視性。
- 作業:
  - `timer-sync` 周期送出の安定・二重起動防止（冪等）。
  - place 連打時（100〜200ms）での安定確認。
  - 例外ログの最小化（必要な箇所のみ `error`）。

---

## リスクと対策
- 先着保証（競合）: place の「セル未占有」検証→保存を原子的に扱う。必要なら Redis Lua/CAS で強化。
- フロント移行: 旧イベント全廃のため、フロント実装の切替を同一リリース内で行う。
- タイマー多重: `timerScheduler.start` は matchId 単位で冪等。
- シード二重: `seedPiecesIfEmpty` は存在検出で no-op。

> 本計画は in-game の技術再設計に限定。仕様詳細は `docs/game-specification.md` を参照。
