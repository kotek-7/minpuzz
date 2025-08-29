# フロント in-game つなぎ込み計画（チェックリスト）

> バックエンド仕様を知らなくても、ここに記載のイベント契約・手順どおり実装すれば in-game のフロント接続が完成するように分割しています。

- [x] ユニット1: イベント定数の拡張（features/game/events.ts）
  - 追加: `PIECE_PLACE`, `PIECE_PLACED`, `PIECE_PLACE_DENIED`, `PROGRESS_UPDATE`, `TIMER_SYNC`, `GAME_END`
- [x] ユニット2: ゲームストアAPIの拡張（features/game/store.ts）
  - 追加: `markPlaced`, `setScore`, `applyTimer`, `finish(…)+ended`
- [x] ユニット3: 受信ハンドラのマウント（Game.tsx or handlers.ts）
  - on `PIECE_PLACED/PIECE_PLACE_DENIED/PROGRESS_UPDATE/TIMER_SYNC/GAME_END`
- [x] ユニット4: サーバ pieceId マッピングの用意
  - `game-init/state-sync` から id対応を保持（UIの選択→serverId へ変換）
- [x] ユニット5: 送信導線の実装（Puzzle→emit）
  - セルクリックで `emit(PIECE_PLACE, { matchId, teamId, userId, pieceId, row, col })`
- [x] ユニット6: 進捗とタイマーのUI反映
  - `placedByTeam` 表示、`timer-sync` 反映、終了遷移の冪等
- [x] ユニット7: 再同期リカバリ
  - 500ms デバウンスで `request-game-init`、`state-sync` で全量復元
- [ ] ユニット9: 仕上げ（UXと堅牢化）
  - deniedメッセージ、占有セル無効、on/offのクリーンアップ

※ ユニット8（環境変数の統一）は今回不要につき省略

---

## 実装メモ（送受信の最小要約）
- 送信: `piece-place { matchId, teamId, userId, pieceId, row, col }`
- 受信（team）: `piece-placed { pieceId, row, col, byUserId }`
- 受信（self）: `piece-place-denied { pieceId, reason }`
- 受信（public）: `progress-update { placedByTeam }`, `timer-sync { … }`, `game-end { … }`
- 再同期: `request-game-init { matchId, teamId, userId }` → `state-sync { … }`
