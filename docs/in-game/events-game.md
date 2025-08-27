# ゲーム中/終了 イベント仕様

ゲーム接続完了後（`game-start` 受信以降）のイベントプロトコル。サーバ権威で盤面/タイマー/スコアを管理し、クライアントはイベント駆動でUIを更新する。

## ルームと可視性
- `room:team:{teamId}`: 自チーム向けの詳細イベント（ピース座標/ドラッグ/設置など）
- `room:match:{matchId}:public`: 両チーム向けの共通イベント（スコア、タイマー、終了通知）

## サーバ → クライアント

- `game-init` (to team)
  - 用途: 初期盤面/ピース配列/開始時刻を配布（再接続/同期ずれ時にも使用）
  - 例: `{ matchId, team:{id,members}, board:{rows,cols}, pieces:[{id,x,y,placed,row?,col?}], startedAt, duration, myUserId }`

- `piece-grabbed` (to team)
  - 用途: ピースが誰かに掴まれた（ロック成功）
  - 例: `{ pieceId, byUserId }`

- `piece-grab-denied` (to requester)
  - 用途: 掴み不可（他者が保持/既に配置）
  - 例: `{ pieceId, reason:'locked'|'placed'|'notFound' }`

- `piece-moved` (to team, 15–30Hz程度)
  - 用途: ドラッグ中の位置更新（ロック保有者のみ送出）
  - 例: `{ pieceId, x, y, byUserId, ts }`

- `piece-released` (to team)
  - 用途: 設置失敗/離した際の最終位置
  - 例: `{ pieceId, x, y, byUserId }`

- `piece-placed` (to team)
  - 用途: 設置確定（スナップ/正解判定）
  - 例: `{ pieceId, row, col, byUserId }`

- `progress-update` (to public)
  - 用途: スコア更新通知（相手側は数のみ表示）
  - 例: `{ teamA:{placed}, teamB:{placed} }`

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

- `piece-grab`
  - 用途: 掴み要求（ロック獲得）
  - 例: `{ matchId, teamId, userId, pieceId }`

- `piece-move`
  - 用途: ドラッグ中の位置更新（スロットリング必須）
  - 例: `{ matchId, teamId, userId, pieceId, x, y, ts }`

- `piece-release`
  - 用途: 掴み解除（設置失敗など）
  - 例: `{ matchId, teamId, userId, pieceId, x, y }`

- `piece-place`
  - 用途: 設置要求（セル候補へスナップ）
  - 例: `{ matchId, teamId, userId, pieceId, row, col, x, y }`

- `cursor-move`（任意）
  - 用途: 手/カーソル表示用の軽量ブロードキャスト
  - 例: `{ matchId, teamId, userId, x, y, ts }`

- `request-state-sync`
  - 用途: 状態の再同期要求
  - 例: `{ matchId, teamId, userId }`

## サーバ側ロジック（要点）
- サーバ権威: 盤面/スコア/タイマーを一元管理、検証に合格した操作を採用
- 相互排他: `piece-grab` は `SETNX lock:piece:{id}` + TTL、保持者のみ `piece-move`/`piece-place` を許可
- 検証: `piece-place` は holder/未配置/正解/スナップ域を満たすこと
- スコア: 設置確定でチームの placed を +1、`progress-update` を public に送出
- タイマー: サーバで終了時刻を監視、`timer-sync` で補正、終了時に `game-end`
- 終了判定: 全ピース配置 or タイムアップ（同点は引き分け）
- 切断時: 保持ロックを解除、必要に応じて位置を復元

## バリデーション/パフォーマンス
- Zodで型/範囲を検証（IDs、座標、行列の境界）
- スロットリング/デバウンス: `piece-move`/`cursor-move` は 15–30Hz、量子化（1px 等）推奨
- ルーム粒度: 自チームには詳細、相手には進捗のみで帯域最適化

