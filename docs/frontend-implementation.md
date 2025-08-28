# フロントエンド実装ガイド（みんパズ）

本ドキュメントは、`docs/implementation-plan.md`（M1〜M6 完了、M7 保留）および各シーケンス図（@docs/*.mmd）に準拠し、フロントエンド側での実装方針・構成・実装手順を段階的にまとめたものです。バックエンドの内部実装を知らなくても、イベント契約とペイロード仕様に基づき実装できるよう、必要な前提・契約・サンプル・チェックリストを網羅します。

- 参照:
  - バックエンド仕様: `docs/specification.md`, `docs/implementation-plan.md`
  - シーケンス図: `docs/sequence-home-to-team.mmd`, `docs/sequence-matching-to-game.mmd`, `docs/sequence-game-connection.mmd`, `docs/in-game/*`, `docs/sequence-game-end.mmd`
  - 契約（イベント定義）: `backend/src/socket/events.ts`

---

## 全体ステップ（目次）
1. 前提と環境準備
2. 接続ライフサイクルとルーム（M1）
3. マッチングからゲーム接続（M1）
4. ドメイン状態と型共有（M2）
5. ピース操作（M3）grab/move/release
6. 配置/進捗/終了（M4）
7. タイマー（M5）timer-sync と補正
8. 再接続/同期ずれ対策（M6）
9. エラー/冪等/セキュリティ（共通）
10. パフォーマンス/描画最適化
11. テスト戦略
12. 実装ガイド付録（イベント一覧・Payload・送出先）

以降、順に詳細化していきます（本コミットではステップ1〜2を詳細化）。

---

## クイックスタート（最短手順）

- 前提
  - Node.js 18+
  - Next.js 14+（App Router推奨）
  - `socket.io-client` を依存に追加
- 接続先設定
  - `.env.local` に `NEXT_PUBLIC_BACKEND_URL=http://localhost:3001`（例）を定義
- 最小実装
  - `getSocket()` シングルトンを作成
  - 画面マウントで必要イベントを `on` 登録し `off` で解除
  - `join-team` → `join-matching-queue` → `match-found` → `join-game` → `game-init/state-sync` → `game-start`

この後は各ステップの指示に従って、イベントごとのハンドラ・ストア反映・UI更新を追加していけば動作します。

---

## イベント仕様リファレンス（バックエンド契約の要約）

以下はフロントが送受信するイベントとペイロードの参照です。型名は説明用であり、実装ではこの形に一致するオブジェクトを扱います。

- ルーム/チーム（M1）
  - In（送信）
    - `join-team { teamId: string, userId: string }`
    - `leave-team { teamId: string, userId: string }`
  - Out（受信）
    - `member-joined { teamId: string, userId: string, socketId: string, timestamp: string }`
    - `member-left { teamId: string, userId: string, timestamp: string }`
    - `team-updated { teamId: string, memberCount: number, timestamp: string }`

- マッチング→接続（M1）
  - In
    - `join-matching-queue { teamId: string, userId: string }`
    - `join-game { matchId: string, teamId: string, userId: string }`
  - Out
    - `navigate-to-matching { teamId: string, timestamp: string }`
    - `match-found { matchId: string, self: { teamId, memberCount }, partner: { teamId, memberCount }, timestamp: string }`
    - `game-init { matchId, teamId, userId, board: {rows,cols}, pieces: Piece[], startedAt?: string|null, durationMs?: number|null }`
    - `game-start { matchId: string, timestamp: string }`

- ゲーム中（M3/4）
  - In
    - `piece-grab { matchId, teamId, userId, pieceId }`
    - `piece-move { matchId, teamId, userId, pieceId, x:number, y:number, ts:number }`
    - `piece-release { matchId, teamId, userId, pieceId, x:number, y:number }`
    - `piece-place { matchId, teamId, userId, pieceId, row:int, col:int, x:number, y:number }`
  - Out
    - `piece-grabbed { pieceId, byUserId }`／`piece-grab-denied { pieceId, reason: 'locked'|'placed'|'notFound' }`
    - `piece-moved { pieceId, x, y, byUserId, ts }`
    - `piece-released { pieceId, x, y, byUserId }`
    - `piece-placed { pieceId, row, col, byUserId }`
    - `piece-place-denied { pieceId, reason: 'notFound'|'placed'|'notHolder'|'invalidCell' }`
    - `progress-update { placedByTeam: Record<string,number> }`（public）
    - `game-end { reason:'completed'|'timeout'|'forfeit', winnerTeamId: string|null, scores: Record<string,number>, finishedAt: string }`（public）

- タイマー（M5）
  - Out（public）
    - `timer-sync { nowIso: string, startedAt: string|null, durationMs: number|null, remainingMs: number }`

- 再接続/同期ずれ（M6）
  - In（本人向け）
    - `request-game-init { matchId, teamId, userId }`
  - Out（本人宛）
    - `state-sync { board, pieces: Piece[], score: {placedByTeam}, timer: {startedAt,durationMs}|null, matchStatus: string }`

送出先の原則: 本人（denied/state-sync）、チームroom（grab/move/release/placed）、public room（progress/timer-sync/game-end）。

## 1. 前提と環境準備

- 背景: フロントは Next.js + React + `socket.io-client` を用い、バックエンドのリアルタイム契約（events/payloads）に沿って状態を同期します。型安全・冪等性・軽量スロットリングが重要です。
- バックエンド契約（全体把握）:
  - ルーム系: `join-team`/`leave-team` → `member-joined`/`member-left`/`team-updated`
  - マッチング系: `join-matching-queue` → `navigate-to-matching` → `match-found`
  - ゲーム接続系: `join-game` → `game-init`（+直後の`state-sync`）→ 全員接続で`game-start`
  - ゲーム中（M3/4/5/6）: `piece-*`（grab/move/release/place）と `piece-*-denied`、`progress-update`、`timer-sync`、`game-end`、`request-game-init`→`state-sync`
  - 送出先の整理: 本人宛（denied/state-sync）、チームroom（grab/move/release/placed）、public room（progress-update/timer-sync/game-end）
- 推奨ディレクトリ構成:
  - `frontend/src/lib/socket`（socket生成・共通ハンドラ登録）
  - `frontend/src/features/game/state`（board/pieces/score/timer/matchStatus の単一ソース）
  - `frontend/src/features/game/handlers`（イベント別ハンドラ群）
  - `frontend/src/features/team`（チーム待機UIとイベント連携）
  - `frontend/src/features/matching`（マッチングUIとイベント連携）
  - `frontend/src/features/game/ui`（キャンバス/ピース描画、進捗/タイマー/結果表示）
- 実装ポイント:
  - ソケット初期化はシングルトン: `io(backendUrl, { transports: ['websocket'], reconnection: true })`
  - ハンドラ登録/解除: マウント時 `socket.on(...)`、アンマウント時 `socket.off(...)`（重複受信防止）
  - イベント冪等化: 再接続・重複送信に備え、受信側で最新優先・重複排除（例: 同一`pieceId`の最新`ts`で上書き）
  - 軽量スロットリング: `piece-move`送信は40ms程度、`request-game-init` は500ms程度（サーバ側も制限あり）
  - 型: 共通パッケージでの型共有が理想。難しければ Zod に沿うローカル型を定義して parse（開発時のみでも可）
- 最小スニペット（概念）:

```ts
// frontend/src/lib/socket/client.ts
import { io, Socket } from 'socket.io-client';
let sock: Socket | null = null;
export function getSocket(): Socket {
  if (!sock) {
    sock = io(process.env.NEXT_PUBLIC_BACKEND_URL!, {
      transports: ['websocket'],
      reconnection: true,
    });
  }
  return sock;
}
```

```ts
// frontend/src/lib/socket/lifecycle.ts
import type { Socket } from 'socket.io-client';
export function registerCoreHandlers(s: Socket, { onError, onDisconnect }: {
  onError?: (m: any) => void,
  onDisconnect?: () => void,
}) {
  if (onError) s.on('error', onError);
  if (onDisconnect) s.on('disconnect', onDisconnect);
  return () => {
    if (onError) s.off('error', onError);
    if (onDisconnect) s.off('disconnect', onDisconnect);
  };
}
```

- チェックリスト:
  - ソケット多重接続がない（シングルトン保証）
  - すべての `on` に対応する `off` を実装
  - 送受信payloadのキー名・型がバックエンドと一致

---

## 2. 接続ライフサイクルとルーム（M1）

- 背景: チーム待機画面でのメンバー入退室・人数更新、チームroom参加/離脱の一連。以後のマッチング/ゲーム接続の土台となります。
- バックエンド契約（イベントとPayload抜粋）:
  - In: `join-team {teamId, userId}`, `leave-team {teamId, userId}`
  - Out: `member-joined {teamId, userId, socketId, timestamp}`, `member-left {teamId, userId, timestamp}`, `team-updated {teamId, memberCount, timestamp}`
  - 振る舞い: `join-team` 成功でサーバがteamルームに参加させ、既存メンバーに`member-joined`、全員に`team-updated`。`leave-team`/切断時は逆の通知。
- 推奨UI/状態:
  - `TeamStore`: `members: Map<userId, { socketId, joinedAt }>`、`memberCount: number`
  - 待機UI: チーム番号、メンバーリスト、参加/離脱ボタン、マッチング開始ボタン（条件成立時のみ活性）
- 実装ポイント:
  - チーム入室（マウント時）:
    - `emit('join-team', {teamId, userId})`
    - 受信: `member-joined` でメンバー追加（重複時は上書き）、`team-updated` で人数更新
  - チーム離室（アンマウント時 or 明示操作）:
    - `emit('leave-team', {teamId, userId})`
    - 切断イベントでも UI 側で state リセットできるようにしておく
  - 冪等性:
    - `member-joined` に本人が含まれない場合もあるため、人数は `team-updated` を信頼
    - リスト更新は `userId` キーで上書き（重複通知に強く）
  - エラー/例外:
    - `error { message }` 受信時は通知＋ロールバック
    - 画面遷移で `off` し忘れがないよう、クリーンアップを共通化

- ハンドラ例（概念）:

```ts
// frontend/src/features/team/handlers.ts
import { getSocket } from '@/lib/socket/client';
import { SOCKET_EVENTS } from './events'; // フロント側の定数（backendと同名）

export function mountTeamHandlers(teamId: string, store: TeamStore, userId: string) {
  const s = getSocket();
  const onJoined = (p: { teamId: string; userId: string; socketId: string; timestamp: string }) => {
    if (p.teamId !== teamId) return;
    store.addMember(p.userId, { socketId: p.socketId, joinedAt: p.timestamp });
  };
  const onLeft = (p: { teamId: string; userId: string }) => {
    if (p.teamId !== teamId) return;
    store.removeMember(p.userId);
  };
  const onUpdated = (p: { teamId: string; memberCount: number }) => {
    if (p.teamId !== teamId) return;
    store.setMemberCount(p.memberCount);
  };

  s.on(SOCKET_EVENTS.MEMBER_JOINED, onJoined);
  s.on(SOCKET_EVENTS.MEMBER_LEFT, onLeft);
  s.on(SOCKET_EVENTS.TEAM_UPDATED, onUpdated);

  s.emit(SOCKET_EVENTS.JOIN_TEAM, { teamId, userId });

  return () => {
    s.emit(SOCKET_EVENTS.LEAVE_TEAM, { teamId, userId });
    s.off(SOCKET_EVENTS.MEMBER_JOINED, onJoined);
    s.off(SOCKET_EVENTS.MEMBER_LEFT, onLeft);
    s.off(SOCKET_EVENTS.TEAM_UPDATED, onUpdated);
  };
}
```

- チェックリスト:
  - 入室→既存メンバーに `member-joined`、全員に `team-updated` が届く
  - 離室/切断→`member-left` と `team-updated` の整合が取れている
  - 連続入室/離室でメモリリークやハンドラ多重がない
  - 異常系（チーム未存在/満員）でメッセージ表示と状態復元ができる

---

以降のステップ（3. マッチング→ゲーム接続、4. 型/状態共有、5. ピース操作、6. 配置/進捗/終了、7. タイマー、8. 再接続/同期ずれ、9〜12. 共通/最適化/テスト/付録）はこのテンプレート（背景→契約→構成→実装ポイント→サンプル→チェックリスト）で順次追記します。

---

## 3. マッチングからゲーム接続（M1）

- 背景: 待機→マッチング→対戦確定→ゲーム接続→初期化→開始 までの画面遷移とイベント連携。
- バックエンド契約:
  - In: `join-matching-queue {teamId, userId}`、`join-game {matchId, teamId, userId}`
  - Out: `navigate-to-matching`、`match-found {matchId,self,partner}`、`game-init {board,pieces,startedAt?,durationMs?}`、`game-start {matchId}`
  - 備考: `join-game` 直後に本人宛 `state-sync` が追加で届く（M6）。
- 推奨構成:
  - `features/matching/page.tsx`: マッチング画面。`navigate-to-matching`受信で表示。
  - `features/game/connection.ts`: `match-found` 受信→ `join-game` 送信→ `game-init/state-sync` 受信処理。
- 実装ポイント:
  - マッチング開始: 待機UIから `join-matching-queue` を送信し、`navigate-to-matching` 受信で画面遷移。
  - 対戦確定: `match-found` 受信で `matchId` をストアに保存し、ゲーム画面へプッシュ遷移。
  - ゲーム接続: `join-game` 送信→ 直後に `game-init`（+ `state-sync`）を受信。`game-start` は全員接続後にチームroomへ届く。
  - 初期描画: `game-init/state-sync` で `board/pieces/score/timer/matchStatus` を初期化描画し、`game-start` で操作可能UIに切り替え。
- 例（概念）:

```ts
// features/matching/flow.ts
export function startMatching(teamId: string, userId: string) {
  const s = getSocket();
  s.emit(SOCKET_EVENTS.JOIN_MATCHING_QUEUE, { teamId, userId });
}

export function mountMatchingHandlers(navigate: (path: string) => void) {
  const s = getSocket();
  const onNav = (p: { teamId: string }) => navigate('/matching');
  const onFound = (p: MatchFoundPayload) => {
    gameStore.setMatch(p.matchId, p.self, p.partner);
    navigate(`/game/${p.matchId}`);
  };
  s.on(SOCKET_EVENTS.NAVIGATE_TO_MATCHING, onNav);
  s.on(SOCKET_EVENTS.MATCH_FOUND, onFound);
  return () => { s.off(SOCKET_EVENTS.NAVIGATE_TO_MATCHING, onNav); s.off(SOCKET_EVENTS.MATCH_FOUND, onFound); };
}

export function connectToGame(matchId: string, teamId: string, userId: string) {
  const s = getSocket();
  const onInit = (p: GameInitPayload) => gameStore.hydrateFromInit(p);
  const onState = (p: StateSyncPayload) => gameStore.applyStateSync(p);
  const onStart = (_: { matchId: string }) => gameStore.markStarted();
  s.on(SOCKET_EVENTS.GAME_INIT, onInit);
  s.on(SOCKET_EVENTS.STATE_SYNC, onState);
  s.on(SOCKET_EVENTS.GAME_START, onStart);
  s.emit(SOCKET_EVENTS.JOIN_GAME, { matchId, teamId, userId });
  return () => {
    s.off(SOCKET_EVENTS.GAME_INIT, onInit);
    s.off(SOCKET_EVENTS.STATE_SYNC, onState);
    s.off(SOCKET_EVENTS.GAME_START, onStart);
  };
}
```

- チェックリスト:
  - `join-matching-queue` → `navigate-to-matching` の遷移が起きる
  - `match-found` 受信で `matchId` を保持しゲーム画面へ遷移
  - `join-game` 後に `game-init`（+ `state-sync`）を受け初期描画、`game-start` で操作開放

---

## 4. ドメイン状態と型共有（M2）

- 背景: フロントで一貫した単一ソース（store）を持ち、受信イベントで安全に更新する。
- 状態モデル（推奨）:

```ts
type GameState = {
  matchId: string | null;
  board: { rows: number; cols: number };
  pieces: Record<string, { id: string; x: number; y: number; placed: boolean; row?: number; col?: number; holder?: string }>;
  score: { placedByTeam: Record<string, number> };
  timer: { startedAt: string; durationMs: number } | null;
  matchStatus: 'PREPARING' | 'READY' | 'IN_GAME' | 'COMPLETED' | 'UNKNOWN';
  started: boolean;
};

// ストアAPI契約（推奨）
type GameStore = {
  hydrateFromInit(p: GameInitPayload): void; // 全量初期化
  applyStateSync(p: StateSyncPayload): void; // 全量上書き
  updatePiece(id: string, fn: (cur: Piece) => Piece): void; // 差分反映
  setScore(s: { placedByTeam: Record<string, number> }): void;
  markStarted(): void;
  setEnded(p: GameEndPayload): void;
};
```

- 実装ポイント:
  - 受信整合性: `game-init/state-sync` は全量。`piece-*` は差分反映。`progress-update` は `score` のみ更新。
  - マップ構造: `pieces` を辞書（id→piece）で保持し描画は `Object.values()`。
  - 派生: 選択子で配置済/未配置のフィルタ、保持中pieceの強調などを算出。
  - 型共有: できれば backend の Zod 型を型レベルで共有。難しい場合でもフィールド名/型を合わせる。
- サンプル更新:

```ts
function onPieceMoved(p: { pieceId: string; x: number; y: number }) {
  gameStore.updatePiece(p.pieceId, (cur) => ({ ...cur, x: p.x, y: p.y }));
}

function onProgress(p: { placedByTeam: Record<string, number> }) {
  gameStore.setScore({ placedByTeam: p.placedByTeam });
}
```

- チェックリスト:
  - 全量イベントで欠損が残らない（初期化時の完全上書き）
  - 差分イベントは対象idの存在検証と防御（存在しないid受信時は無視/後続state-syncで回復）

---

## 5. ピース操作（M3）：grab / move / release

- 背景: サーバ権威でロック/位置/保持者を管理。フロントは入力→送信→受信反映。
- 契約:
  - In: `piece-grab {matchId,teamId,userId,pieceId}`、`piece-move {matchId,teamId,userId,pieceId,x,y,ts}`、`piece-release {matchId,teamId,userId,pieceId,x,y}`
  - Out: `piece-grabbed {pieceId,byUserId}` / `piece-grab-denied {pieceId,reason}`、`piece-moved {pieceId,x,y,byUserId,ts}`、`piece-released {pieceId,x,y,byUserId}`
- 実装ポイント:
  - grab: 押下時に送信。成功イベントで保持者が自分ならドラッグ継続可能に。
  - move: 40msスロットリングで送信し、受信 `piece-moved` で最終位置にスナップ（自分の送信でもサーバ反映を信頼）。
  - release: ドロップ時に送信。受信で保持解除・位置最終化。
  - denied: grab失敗時はUIで「他ユーザーが保持中/配置済」などの表示。
- 例（概念）:

```ts
const sendMove = throttle(40, (payload: PieceMovePayload) => s.emit(SOCKET_EVENTS.PIECE_MOVE, payload));

function onDrag(pieceId: string, x: number, y: number, ts: number) {
  const { matchId, teamId, userId } = session;
  sendMove({ matchId, teamId, userId, pieceId, x, y, ts });
}
```

ユーティリティ例:

```ts
// lib/util/timing.ts
export function throttle<T extends (...args:any[])=>void>(intervalMs: number, fn: T): T {
  let last = 0; let timer: any;
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - last >= intervalMs) { last = now; fn(...args); }
    else if (!timer) {
      const wait = intervalMs - (now - last);
      timer = setTimeout(() => { last = Date.now(); timer = null; fn(...args); }, wait);
    }
  }) as T;
}

export function debounce<T extends (...args:any[])=>void>(waitMs: number, fn: T): T {
  let t: any; return ((...a:any[]) => { clearTimeout(t); t = setTimeout(() => fn(...a), waitMs); }) as T;
}
```

- チェックリスト:
  - 自分のmoveもサーバ受信で上書き（視覚ジャンプが最小になるよう補間/アニメ任意）
  - grab-denied を確実にハンドル（UIの誤状態を回避）

---

## 6. 配置/進捗/終了（M4）

- 背景: サーバが正解・スナップ誤差・保持者一致を検証し、確定→スコア加算→進捗公開→全配置で終了。
- 契約:
  - In: `piece-place {matchId,teamId,userId,pieceId,row,col,x,y}`
  - Out: `piece-placed {pieceId,row,col,byUserId}`（team）、`piece-place-denied {pieceId,reason}`（本人）、`progress-update {placedByTeam}`（public）、`game-end {reason,winnerTeamId,scores,finishedAt}`（public）
- 実装ポイント:
  - 配置候補セルの可視化とスナップ演出（誤差はサーバで再検証される）
  - `piece-placed` で配置済に更新、配置済ピースは掴めない表示。
  - `progress-update` は最小描画（スコアバーのみ）。
  - `game-end` は一度だけ処理（重複受信に備えガード）。
- 例（概念）:

```ts
function onPlaceResult(ok: boolean, reason?: string) {
  if (!ok) toast.error(reason === 'invalidCell' ? '位置が不正です' : '配置できません');
}

function onGameEnd(p: GameEndPayload) {
  if (gameStore.ended) return; // 冪等
  gameStore.setEnded(p);
  navigate(`/result/${gameStore.matchId}`);
}
```

- チェックリスト:
  - denied理由のUX（誤セル/非ホルダー/配置済）
  - 終了画面は一回のみ遷移

---

## 7. タイマー（M5）：timer-sync と補正

- 背景: `game-init` に `startedAt/durationMs`、`timer-sync` で 5s 周期の補正情報。
- 契約:
  - Out: `timer-sync { nowIso, startedAt, durationMs, remainingMs }`（public）
- 実装ポイント:
  - 初期化: `game-init` の `startedAt/durationMs` でローカルタイマー開始。
  - 補正: `timer-sync.remainingMs` と自前カウントとの差を滑らかに補正（いきなり飛ばさない）。
  - 表示: 残り 0 → 中断/操作不可＋終了待ち（または即時`request-game-init`で最終状態補完）。
- 例（概念）:

```ts
function applyTimerSync(p: TimerSyncPayload) {
  const skew = p.remainingMs - localTimer.remainingMs();
  localTimer.adjust(skew); // 小刻みに追従させる実装にする
}
```

補正の指針:
- いきなり `remainingMs = p.remainingMs` に置き換えず、誤差を 200–400ms/秒程度で漸近させると視覚的に自然。
- `startedAt/durationMs` が null の場合はタイマー非表示（未開始/終了間際の一時的不整合）。

- チェックリスト:
  - タブ復帰時にズレがあれば次 sync で追従
  - 終了間際の視覚が不自然にならない補正手法

---

## 8. 再接続/同期ずれ対策（M6）

- 背景: 一時断やタブ復帰でのズレを本人リクエストで回復。JOIN直後にもサーバが `state-sync` を送る。
- 契約:
  - In: `request-game-init {matchId,teamId,userId}`（本人向け）
  - Out: `state-sync { board,pieces,score,timer?,matchStatus }`（本人宛）
- 実装ポイント:
  - UI: 「再同期」アクションや自動検知（長時間非アクティブ→復帰時に送る）。
  - レート制限: クライアント側でも500ms程度のデバウンス。
  - 反映: 全量上書きが安全。ローカル変更はサーバ権威を優先。
- 例（概念）:

```ts
const requestSync = debounce(500, (matchId: string, teamId: string, userId: string) => {
  getSocket().emit(SOCKET_EVENTS.REQUEST_GAME_INIT, { matchId, teamId, userId });
});
```

- チェックリスト:
  - JOIN直後に `state-sync` を受け取り初期差異が解消される
  - 明示/自動の再同期いずれでも破綻しない

---

## 9. エラー/冪等/セキュリティ（共通）

- 背景: 再送・重複・順序入れ替わり・ネットワーク断に強いクライアントを目指す。
- 方針:
  - 受信冪等: `game-end` や `piece-placed` は重複受信に備えてガード（状態が既に反映済なら無視）。
  - 最新優先: `piece-moved` は `ts` を比較し新しいもののみ反映。
  - 送信再試行: `grab/place` 再試行はサーバ権威のため、UI側は状態楽観ではなく結果イベントを待って反映。
  - セキュリティ: 重要状態をフロントで決めない（配置可否・勝敗などはサーバ決定）。
- 実装ポイント:
  - 共通ヘルパ: `applyIfNewer(pieceId, ts, updater)`、`once(event, guard)` のユーティリティ。
  - 例外処理: `socket.on('error', ...)` を集中処理しユーザ向けトースト＋開発時ログ。
- チェックリスト:
  - 重複/順序入替のテストに耐える
  - 失敗通知時のUI復元が定義されている

---

## 10. パフォーマンス/描画最適化

- 背景: moveやtimer-syncにより高頻度の更新が発生。描画を最小に抑える。
- 方針:
  - バッチ更新: 同フレーム内で複数イベントをまとめてstateに適用（requestAnimationFrameやbatchedUpdates）。
  - メモ化: ピースを独立したメモ化コンポーネントにし、id/座標/placedが変わらない限り再描画しない。
  - スロットリング: 送信側だけでなく、受信描画も一定間隔に抑える（視覚的自然さ優先）。
  - Canvas/WebGL検討: DOM限界を超える場合はキャンバス化を検討。
- チェックリスト:
  - 大人数/高頻度でもフレーム落ちが許容範囲
  - 無駄な再描画が発生していない（プロファイラで確認）

---

## 11. テスト戦略

- 単体テスト:
  - reducers/ストア更新ロジック、派生選択子、タイマー補正ロジックを主対象。
  - 例: `applyStateSync` が既存stateを正しく上書きする。
- 統合テスト（モックソケット）:
  - grab→move→place→progress→end の代表フロー、timer-sync補正、request-game-init/state-sync の復元を検証。
  - 受信冪等/順序入替/重複に対する堅牢性を検証。
- E2E（任意）:
  - 2ブラウザで相互整合（grabの相互排他、progressの一致、終了の一回性）
- チェックリスト:
  - CIで安定して緑（フレーク対策としてtimer系は余裕を持った検証）

---

## 12. 実装ガイド付録（イベント一覧・Payload・送出先）

- 送出先の原則:
  - 本人宛: denied/state-sync
  - チームroom: grab/move/release/placed
  - public room: progress-update/timer-sync/game-end
- 主なイベントと簡易Payload（抜粋）:
  - join-team/leave-team → member-joined/member-left/team-updated
  - join-matching-queue → navigate-to-matching → match-found {matchId,self,partner}
  - join-game → game-init {board,pieces,startedAt?,durationMs?} (+ state-sync)
  - piece-grab/move/release/place → grabbed/moved/released/placed/denied
  - progress-update {placedByTeam}
  - timer-sync { nowIso, startedAt, durationMs, remainingMs }
  - game-end { reason, winnerTeamId, scores, finishedAt }
- 参考リンク: docsの各シーケンス図と backend の `src/socket/events.ts`

### 付録A: 環境変数一覧
- `NEXT_PUBLIC_BACKEND_URL`: フロントから接続するソケットサーバURL（例: `http://localhost:3001`）

### 付録B: ルームセマンティクス
- チームroom: `team:{teamId}`。チーム内同期イベント（grab/move/release/placed）を受信。
- パブリックroom: `room:match:{matchId}:public`。観戦/進捗共有（progress/timer-sync/game-end）を受信。

### 付録C: ステータスと画面遷移
- `PREPARING` → `READY` → `IN_GAME` → `COMPLETED`（終了後）
- 画面: 待機 → マッチング → 接続（init/sync）→ ゲーム → 結果
