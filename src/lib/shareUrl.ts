// URL-safe Base64 でエディタの内容をエンコード/デコードする。
// HashRouter の hash 内に ?share=<encoded> として埋め込み、URL で学習内容を共有するために使う。

// Uint8Array → binary string 変換。
// スプレッド演算子（String.fromCharCode(...bytes)）は大きな配列でスタックオーバーフローが起きるため
// for ループで 1 バイトずつ連結する。
function uint8ToBinaryString(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return binary
}

// テキストを URL-safe Base64（RFC 4648 §5）にエンコードする。
// + → -、/ → _、= を除去することで URL クエリパラメータに安全に埋め込める。
export function encodeShare(text: string): string {
  const bytes = new TextEncoder().encode(text)
  const binary = uint8ToBinaryString(bytes)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// URL-safe Base64 をテキストにデコードする。
// パディング（=）が除去されているため長さから補完してから atob に渡す。
export function decodeShare(encoded: string): string {
  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const paddingLen = (4 - (normalized.length % 4)) % 4
  const binary = atob(normalized + '='.repeat(paddingLen))
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

// HashRouter の hash（"#/database?share=..."）から share パラメータを取り出す。
// useSearchParams は React Router のレンダリング後に読むため、
// 初期 state の lazy initializer 内では window.location.hash を直接パースする。
export function readShareFromHash(): string | null {
  const hash = window.location.hash
  const qIdx = hash.indexOf('?')
  if (qIdx === -1) return null
  return new URLSearchParams(hash.slice(qIdx + 1)).get('share')
}
