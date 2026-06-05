import type { AlgorithmStep, CryptoState, CryptoStepEntry } from '../types'

// ディフィー・ヘルマン鍵共有: 盗聴者がいる通信路でも安全に共通秘密鍵を共有できる方式。
// 「離散対数問題の困難性」を利用する。g^ab mod p を共通鍵とすることで
// お互いの秘密鍵（a, b）を交換せずに共通鍵を導出できる。
export function* diffieHellman(): Generator<AlgorithmStep<CryptoState>, void, never> {
  // 教育用の小さな値（実運用では 2048bit 以上の素数 p と適切な生成元 g を使う）
  const p = 23     // 公開の素数（全員が知っている）
  const g = 5      // 公開の生成元（g は p の原始根）
  const a = 6      // Alice の秘密鍵（Alice だけが知っている）
  const b = 15     // Bob の秘密鍵（Bob だけが知っている）

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

  const A = modPow(g, a, p)   // Alice が公開する値 A = g^a mod p
  const B = modPow(g, b, p)   // Bob が公開する値 B = g^b mod p
  const keyAlice = modPow(B, a, p)  // Alice が計算する共通鍵 = B^a mod p = g^(ab) mod p
  const keyBob = modPow(A, b, p)    // Bob が計算する共通鍵 = A^b mod p = g^(ab) mod p

  const steps: CryptoStepEntry[] = []

  function pushStep(label: { ja: string; en: string }, value: string, highlight = false) {
    steps.push({ label, value, highlight })
  }

  pushStep(
    { ja: '公開パラメーター（全員が知る）', en: 'Public parameters (known to all)' },
    `素数 p = ${p}, 生成元 g = ${g}`, true
  )
  pushStep(
    { ja: 'Alice の秘密鍵 a（Aliceのみ知る）', en: "Alice's private key a (Alice only)" },
    `a = ${a}`
  )
  pushStep(
    { ja: 'Bob の秘密鍵 b（Bobのみ知る）', en: "Bob's private key b (Bob only)" },
    `b = ${b}`
  )
  pushStep(
    { ja: 'Alice が公開値 A を計算して送信', en: 'Alice computes & sends public value A' },
    `A = g^a mod p = ${g}^${a} mod ${p} = ${A}`, true
  )
  pushStep(
    { ja: 'Bob が公開値 B を計算して送信', en: 'Bob computes & sends public value B' },
    `B = g^b mod p = ${g}^${b} mod ${p} = ${B}`, true
  )
  pushStep(
    { ja: 'Alice が共通鍵を計算（B^a mod p）', en: 'Alice computes shared key (B^a mod p)' },
    `K = B^a mod p = ${B}^${a} mod ${p} = ${keyAlice}`, true
  )
  pushStep(
    { ja: 'Bob が共通鍵を計算（A^b mod p）', en: 'Bob computes shared key (A^b mod p)' },
    `K = A^b mod p = ${A}^${b} mod ${p} = ${keyBob}`, true
  )
  pushStep(
    { ja: '✓ 共通秘密鍵が一致！', en: '✓ Shared secret matches!' },
    `K = ${keyAlice} = ${keyBob}（= g^(a×b) mod p = ${g}^${a * b} mod ${p}）`
  )
  pushStep(
    { ja: '盗聴者には？', en: 'What does an eavesdropper see?' },
    `p=${p}, g=${g}, A=${A}, B=${B} のみ公開。a, b, K を逆算するには離散対数を解く必要がある。`
  )

  for (let i = 0; i <= steps.length; i++) {
    const visibleSteps = steps.slice(0, i)
    if (i === 0) {
      yield {
        state: { steps: visibleSteps, currentIndex: 0, done: false },
        log: {
          ja: `ディフィー・ヘルマン鍵共有のアルゴリズムを可視化します。`,
          en: `Visualizing Diffie-Hellman key exchange step by step.`,
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
