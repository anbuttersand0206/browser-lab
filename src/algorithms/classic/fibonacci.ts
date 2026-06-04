import type { AlgorithmStep, FibState } from '../types'

// フィボナッチ数列: F(n) = F(n-1) + F(n-2)、F(0)=0、F(1)=1。
// メモ化あり（ボトムアップ）と なし（再帰的トップダウン）の 2 モードで可視化する。
// どちらのモードもテーブル表示を基本とし、ステップごとに「使われた値」を強調する。
export function* fibonacci(n: number, useMemo: boolean): Generator<AlgorithmStep<FibState>, void, never> {
  // values[i] が null のときはまだ計算されていないことを示す
  const values: (number | null)[] = Array(n + 1).fill(null)

  const mkState = (current: number, using: [number, number] | null = null): FibState => ({
    values: [...values],
    current,
    using,
    done: false,
    useMemo,
  })

  yield {
    state: mkState(-1),
    log: {
      ja: `フィボナッチ数列 F(${n}) を${useMemo ? 'メモ化' : '通常'}再帰で計算します`,
      en: `Computing Fibonacci F(${n}) with ${useMemo ? 'memoization' : 'plain'} recursion`,
    },
  }

  if (useMemo) {
    // メモ化版: ボトムアップで F(0) から順に計算する。
    // 各 F(i) を計算するとき、F(i-1) と F(i-2) はすでに表に存在する。
    values[0] = 0
    yield {
      state: mkState(0),
      log: { ja: 'F(0) = 0（基底ケース）', en: 'F(0) = 0 (base case)' },
    }

    if (n >= 1) {
      values[1] = 1
      yield {
        state: mkState(1),
        log: { ja: 'F(1) = 1（基底ケース）', en: 'F(1) = 1 (base case)' },
      }
    }

    for (let i = 2; i <= n; i++) {
      yield {
        state: mkState(i, [i - 1, i - 2]),
        log: {
          ja: `F(${i}) を計算中: F(${i - 1}) + F(${i - 2}) = ${values[i - 1]!} + ${values[i - 2]!}`,
          en: `Computing F(${i}): F(${i - 1}) + F(${i - 2}) = ${values[i - 1]!} + ${values[i - 2]!}`,
        },
      }

      values[i] = values[i - 1]! + values[i - 2]!

      yield {
        state: mkState(i),
        log: {
          ja: `F(${i}) = ${values[i]}（メモに保存）`,
          en: `F(${i}) = ${values[i]} (stored in memo)`,
        },
      }
    }
  } else {
    // 非メモ化版: 再帰コール順にテーブルを埋めていく。
    // callDepth は「再帰の深さ」として表示するためだけに使うログ用変数。
    // ネストされたジェネレーターを yield* でつなぐことで、再帰コールのステップが
    // フラットなシーケンスとして外部に流れる。
    let callDepth = 0

    function* computeFib(i: number): Generator<AlgorithmStep<FibState>, number, never> {
      callDepth++

      yield {
        state: mkState(i),
        log: {
          ja: `fib(${i}) を呼び出し（再帰深さ: ${callDepth}）`,
          en: `Calling fib(${i}) (recursion depth: ${callDepth})`,
        },
      }

      if (i <= 0) {
        values[0] = 0
        callDepth--
        yield {
          state: mkState(0),
          log: { ja: 'F(0) = 0（基底ケース）', en: 'F(0) = 0 (base case)' },
        }
        return 0
      }

      if (i === 1) {
        values[1] = 1
        callDepth--
        yield {
          state: mkState(1),
          log: { ja: 'F(1) = 1（基底ケース）', en: 'F(1) = 1 (base case)' },
        }
        return 1
      }

      const resultA = yield* computeFib(i - 1)
      const resultB = yield* computeFib(i - 2)

      values[i] = resultA + resultB
      callDepth--

      yield {
        state: mkState(i, [i - 1, i - 2]),
        log: {
          ja: `F(${i}) = ${resultA} + ${resultB} = ${values[i]}`,
          en: `F(${i}) = ${resultA} + ${resultB} = ${values[i]}`,
        },
      }

      return values[i]!
    }

    yield* computeFib(n)
  }

  yield {
    state: { values: [...values], current: n, using: null, done: true, useMemo },
    log: {
      ja: `完了！F(${n}) = ${values[n]}`,
      en: `Done! F(${n}) = ${values[n]}`,
    },
  }
}
