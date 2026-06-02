import { useEffect, useState } from 'react'

// 値の変化を遅延させ、高頻度の更新（テキスト入力など）が落ち着いてから
// 後続処理（LocalStorage 保存など）を実行するためのフック。
// コードエディタの入力中に毎文字 localStorage.setItem が走ることを防ぐ。
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timerId = setTimeout(() => setDebouncedValue(value), delayMs)
    // 次の変化が来る前にタイマーをリセットし、連続入力中は保存しない
    return () => clearTimeout(timerId)
  }, [value, delayMs])

  return debouncedValue
}
