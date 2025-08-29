/**
 * Audioオブジェクトをキャッシュして、再生成を防ぎパフォーマンスを向上させます。
 */
const audioCache: { [src:string]: HTMLAudioElement } = {};

let sfxVolume = 1.0;

/**
 * すべての効果音のグローバル音量を設定します。
 * @param volume - 音量レベル (0.0 から 1.0)
 */
export const setSfxVolume = (volume: number) => {
  // 音量を0と1の間にクランプします
  sfxVolume = Math.max(0, Math.min(1, volume));
};

/**
 * 指定された音声ファイルを事前に読み込み、キャッシュに保存します。
 * @param sources - 事前に読み込む音声ファイルのパスの配列
 */
export const preloadSounds = (sources: string[]) => {
  if (typeof window === 'undefined') return;
  for (const src of sources) {
    if (!audioCache[src]) {
      const sound = new Audio(src);
      sound.preload = 'auto';
      audioCache[src] = sound;
    }
  }
}

/**
 * 指定された音源のサウンドエフェクトを再生します。
 * パフォーマンス向上のため、一度再生した音声はキャッシュして再利用します。
 * @param src - 再生する音声ファイルのパス (例: '/sounds/click.mp3')
 */ 
export const playSound = (src: string) => {
  // ブラウザ環境でのみ動作するようにチェック
  if (typeof window === 'undefined') return;

  let sound = audioCache[src];
  if (!sound) {
    sound = new Audio(src);
    audioCache[src] = sound;
  }

  sound.volume = sfxVolume;
  sound.currentTime = 0; // 連続で再生された場合に備えて、再生位置を最初に戻す
  sound.play().catch(error => console.error(`Sound playback failed for ${src}:`, error));
};