# ゲーム中/終了 イベント仕様

ゲーム接続完了後（`game-start` 受信以降）のイベントプロトコル。サーバ権威で盤面/タイマー/スコアを管理し、クライアントはイベント駆動でUIを更新する。

## ルームと可視性
- `room:team:{teamId}`: 自チーム向けの詳細イベント（配置確定など）
- `room:match:{matchId}:public`: 両チーム向けの共通イベント（スコア、タイマー、終了通知）

## サーバ → クライアント

- `game-init` (to team)
  - 用途: 初期盤面/ピース配列/開始時刻を配布（再接続/同期ずれ時にも使用）
  - 例: `{ matchId, team:{id,members}, board:{rows,cols}, pieces:[{id,x,y,placed,row?,col?}], startedAt, duration, myUserId }`

- `piece-placed` (to team)
  - 用途: 設置確定（スナップ/正解判定）
  - 例: `{ pieceId, row, col, byUserId }`

- `piece-place-denied` (to requester)
  - 用途: 設置拒否（既配置/不正セル/未登録など）
  - 例: `{ pieceId, reason:'notFound'|'placed'|'invalidCell' }`

- `progress-update` (to public)
  - 用途: スコア更新通知（相手側は数のみ表示）
  - 例: `{ placedByTeam: { [teamId]: number } }`

- `timer-sync` (to public, 5s程度/重要イベント時)
  - 用途: 残り時間表示のドリフト補正
  - 例: `{ serverNow, startedAt, duration }`

- `state-sync` (to team)
  - 用途: 部分/全体の再同期（再接続時/ズレ検出時）
  - 例: `game-init` と同形（差分可）

- `game-end` (to public)
  - 用途: ゲーム終了と結果通知
  - 例: `{ reason:'completed'|'timeout'|'forfeit', winnerTeamId:string|null, scores:Record<teamId,number>, finishedAt }`

## クライアント → サーバ

- `request-game-init`
  - 用途: 初期状態/再同期の要求
  - 例: `{ matchId, teamId, userId }`

- `piece-place`
  - 用途: 設置要求（クリック配置）
  - 例: `{ matchId, teamId, userId, pieceId, row, col }`
- `request-game-init`
  - 用途: 状態の再同期要求（初期化と同形のスナップショット）
  - 例: `{ matchId, teamId, userId }`

## サーバ側ロジック（要点）
- サーバ権威: 盤面/スコア/タイマーを一元管理、検証に合格した操作を採用
- 競合処理: `piece-place` は「未配置」「盤内」「セル未占有」を同時に満たした先着のみ成功（原子的検証→保存）
- 検証: `piece-place` は 未配置/盤内(0..4)/（任意）正解セル一致 を満たすこと
- スコア: 設置確定でチームの placed を +1、`progress-update` を public に送出
- タイマー: サーバで終了時刻を監視、`timer-sync` で補正、終了時に `game-end`
- 終了判定: 全ピース配置 or タイムアップ（同点は引き分け）
- 切断時: 特別なロック回収は不要（ドラッグを廃止）

## バリデーション/パフォーマンス
- Zodで型/範囲を検証（IDs、行列の境界）
- ルーム粒度: 自チームには詳細、相手には進捗のみで帯域最適化
