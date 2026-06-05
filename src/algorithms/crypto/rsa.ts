import type { AlgorithmStep, CryptoState, CryptoStepEntry } from '../types'

// RSA暗号: 「大きな数の素因数分解は困難」という性質を利用した公開鍵暗号方式。
// 教育用に小さな素数を使ってアルゴリズムの流れを可視化する。
export function* rsa(): Generator<AlgorithmStep<CryptoState>, void, never> {
  // 教育用の小さな素数（実運用では 2048bit 以上の巨大な素数を使う）
  const p = 61
  const q = 53
  const n = p * q                    // モジュラス
  const phi = (p - 1) * (q - 1)     // オイラーのトーシェント関数 φ(n) = (p-1)(q-1)

  // e: 1 < e < φ(n) かつ gcd(e, φ(n)) = 1 を満たす公開指数
  const e = 17

  // d: e*d ≡ 1 (mod φ(n)) を満たす秘密指数（モジュラー逆数）
  // 拡張ユークリッド互除法で計算する
  function modInverse(a: number, m: number): number {
    let [old_r, r] = [a, m]
    let [old_s, s] = [1, 0]
    while (r !== 0) {
      const q = Math.floor(old_r / r)
      ;[old_r, r] = [r, old_r - q * r]
      ;[old_s, s] = [s, old_s - q * s]
    }
    return ((old_s % m) + m) % m
  }

  // モジュラー冪乗: base^exp mod mod を効率的に計算（繰り返し二乗法）
  function modPow(base: number, exp: number, mod: number): number {
    let result = 1
    base = base % mod
    while (exp > 0) {
      if (exp % 2 === 1) result = (result * base) % mod
      exp = Math.floor(exp / 2)
      base = (base * base) % mod
    }
    return result
  }

  const d = modInverse(e, phi)
  const message = 42  // 暗号化するメッセージ（0 < m < n）
  const ciphertext = modPow(message, e, n)
  const decrypted = modPow(ciphertext, d, n)

  const steps: CryptoStepEntry[] = []

  function pushStep(label: { ja: string; en: string }, value: string, highlight = false) {
    steps.push({ label, value, highlight })
  }

  // 鍵生成フェーズ
  pushStep({ ja: '1. 2 つの素数を選ぶ', en: '1. Choose two primes' }, `p = ${p}, q = ${q}`, true)
  pushStep({ ja: '2. モジュラス n = p × q', en: '2. Compute modulus n = p × q' }, `n = ${p} × ${q} = ${n}`)
  pushStep({ ja: '3. φ(n) = (p−1)(q−1)', en: '3. Compute φ(n) = (p−1)(q−1)' }, `φ(n) = ${p - 1} × ${q - 1} = ${phi}`)
  pushStep({ ja: '4. 公開指数 e（gcd(e,φ)=1）', en: '4. Public exponent e (gcd(e,φ)=1)' }, `e = ${e}`)
  pushStep({ ja: '5. 秘密指数 d（e×d≡1 mod φ）', en: '5. Secret exponent d (e×d≡1 mod φ)' }, `d = ${d}`)
  pushStep({ ja: '--- 公開鍵 (n, e) ---', en: '--- Public key (n, e) ---' }, `(${n}, ${e})`)
  pushStep({ ja: '--- 秘密鍵 (n, d) ---', en: '--- Private key (n, d) ---' }, `(${n}, ${d})`)
  // 暗号化フェーズ
  pushStep({ ja: `6. 暗号化: c = m^e mod n`, en: `6. Encrypt: c = m^e mod n` }, `${message}^${e} mod ${n} = ${ciphertext}`, true)
  // 復号フェーズ
  pushStep({ ja: `7. 復号: m = c^d mod n`, en: `7. Decrypt: m = c^d mod n` }, `${ciphertext}^${d} mod ${n} = ${decrypted}`, true)
  pushStep({ ja: '✓ 復号結果', en: '✓ Decrypted result' }, `${decrypted} （元のメッセージ: ${message}）`)

  // 各ステップをひとつずつ yield して可視化する
  for (let i = 0; i <= steps.length; i++) {
    const visibleSteps = steps.slice(0, i)

    if (i === 0) {
      yield {
        state: { steps: visibleSteps, currentIndex: 0, done: false },
        log: {
          ja: `RSA暗号のアルゴリズムを順に可視化します。`,
          en: `Visualizing RSA algorithm step by step.`,
        },
      }
    } else {
      const current = steps[i - 1]
      yield {
        state: { steps: visibleSteps, currentIndex: i - 1, done: i === steps.length },
        log: {
          ja: `${current.label.ja}: ${current.value}`,
          en: `${current.label.en}: ${current.value}`,
        },
      }
    }
  }
}
