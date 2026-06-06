/**
 * Browser Lab Service Worker
 *
 * 役割が2つある:
 *   1. COI ヘッダー付与:
 *      GitHub Pages はレスポンスヘッダーをカスタマイズできないため、
 *      SW がすべてのレスポンスに COOP/COEP/CORP ヘッダーを付与して
 *      SharedArrayBuffer（WebContainers に必須）を有効化する。
 *
 *   2. PWA オフラインキャッシュ:
 *      HTML シェル・JS/CSS アセットをキャッシュし、
 *      ネットワーク障害時でもアプリを起動できるようにする。
 *
 * 2つの役割を1つの SW に統合している理由:
 * ブラウザはページごとに1つの SW しか制御できないため、
 * coi-serviceworker と PWA キャッシュ SW を別々に登録できない。
 */

const CACHE_NAME = 'browser-lab-v2'

// キャッシュ対象の拡張子。
// .wasm / .data（PostgreSQL バイナリ）は合計 13MB 以上あり、
// SW キャッシュに入れるとストレージ超過の恐れがあるため除外する。
const CACHEABLE_EXTENSIONS = new Set(['.html', '.js', '.css', '.json', '.svg', '.ico'])

// Vite はビルドごとにアセット名にコンテンツハッシュを埋め込む（例: index-CPGhimg3.js）。
// ハッシュ付きアセットはコンテンツが変わらないため、キャッシュヒット時に即返してよい（Cache-First）。
// このパターンは Vite のデフォルトハッシュ長（8文字）に対応している。
const HASHED_ASSET_PATTERN = /\/assets\/.*\.[0-9a-f]{8}\.(js|css)$/

/**
 * レスポンスに Cross-Origin Isolation ヘッダーを付与して返す。
 *
 * - COOP: same-origin  … 別オリジンのポップアップとのブラウジングコンテキスト共有を防ぐ
 * - COEP: require-corp … 各サブリソースが CORP ヘッダーを持つことを要求する
 * - CORP: cross-origin … このレスポンス自体を別オリジンからの埋め込みに許可する
 *
 * status=0 は opaque response（リダイレクト失敗など）のため変更せずそのまま返す。
 */
function withCrossOriginIsolationHeaders(response) {
  if (response.status === 0) return response

  const headers = new Headers(response.headers)
  headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

/** リクエスト URL のパス拡張子が CACHEABLE_EXTENSIONS に含まれるか判定する */
function isCacheableRequest(request) {
  try {
    const url = new URL(request.url)
    const ext = url.pathname.slice(url.pathname.lastIndexOf('.'))
    // 拡張子なし（ルートや SPA のパス）も HTML として扱いキャッシュ対象にする
    return ext === '' || CACHEABLE_EXTENSIONS.has(ext)
  } catch {
    return false
  }
}

/** Vite のハッシュ付きアセット（不変ファイル）かどうかを判定する */
function isHashedAsset(request) {
  try {
    const url = new URL(request.url)
    return HASHED_ASSET_PATTERN.test(url.pathname)
  } catch {
    return false
  }
}

// --- SW ライフサイクル ---

self.addEventListener('install', (event) => {
  // skipWaiting で古い SW の waiting 状態をスキップし、即座に activate に進む
  self.skipWaiting()

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // インストール時にアプリシェルを先読みキャッシュする
      cache.addAll(['./', './index.html', './manifest.json'])
    )
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // claim() でリロードなしに現在開いているタブをこの SW の管理下に置く
      self.clients.claim(),

      // キャッシュ名が変わった古いキャッシュを削除してストレージを解放する
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      ),
    ])
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // only-if-cached モードは same-origin でしか意味を持たないため、
  // クロスオリジンリクエストはスキップして SW を素通りさせる
  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return

  // ハッシュ付きアセットはキャッシュファースト戦略を使う（コンテンツ不変のため安全）
  if (isHashedAsset(request)) {
    event.respondWith(handleCacheFirst(request))
  } else {
    event.respondWith(handleNetworkFirst(request))
  }
})

// --- フェッチ処理 ---

/**
 * キャッシュファースト戦略（ハッシュ付き不変アセット用）。
 *
 * キャッシュヒット時: キャッシュから即返す（ネットワーク往復なしでオフライン高速化）。
 * キャッシュミス時: ネットワークから取得してキャッシュに保存する。
 */
async function handleCacheFirst(request) {
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return withCrossOriginIsolationHeaders(cachedResponse)
  }

  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    return withCrossOriginIsolationHeaders(networkResponse)
  } catch {
    return Response.error()
  }
}

/**
 * ネットワーク優先・キャッシュフォールバック戦略（HTML・manifest など更新があるリソース用）。
 *
 * ネットワーク成功時: キャッシュに保存してから COI ヘッダー付きで返す。
 * ネットワーク失敗時: キャッシュヒットなら COI ヘッダー付きで返す。
 *                   ナビゲーションリクエストは index.html で SPA フォールバックする。
 */
async function handleNetworkFirst(request) {
  try {
    const networkResponse = await fetch(request)

    if (networkResponse.ok && isCacheableRequest(request)) {
      const cache = await caches.open(CACHE_NAME)
      // clone() が必要な理由: Response の body は一度しか読めない Stream のため、
      // キャッシュ保存用と返却用に2つのコピーを作る
      cache.put(request, networkResponse.clone())
    }

    return withCrossOriginIsolationHeaders(networkResponse)
  } catch {
    // オフライン・ネットワークエラー時のフォールバック
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return withCrossOriginIsolationHeaders(cachedResponse)
    }

    // SPA のナビゲーション（ページ遷移）はルートの index.html で処理する
    if (request.mode === 'navigate') {
      const indexFallback = await caches.match('./index.html')
      if (indexFallback) return withCrossOriginIsolationHeaders(indexFallback)
    }

    return Response.error()
  }
}
