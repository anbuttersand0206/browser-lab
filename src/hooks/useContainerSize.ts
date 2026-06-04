// コンテナ要素のサイズを ResizeObserver で追跡するカスタムフック。
// 各ビジュアライザーで同じ Observer 登録パターンが 6 回以上繰り返されていたため、
// DRY 原則に従って抽出した（同一知識の重複）。
// ref を返すことでコンポーネント側が div への割り当てを宣言的に行える。

import { useState, useEffect, useRef } from 'react'

export function useContainerSize(defaultWidth = 600, defaultHeight = 300) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      // 0x0 は要素が非表示または DOM 外にある状態なので無視する
      if (width > 0 && height > 0) setSize({ width, height })
    })

    observer.observe(el)
    return () => observer.disconnect()
    // ref.current は初回マウント後に変わらないため依存配列に含めない
  }, [])

  return { ref, width: size.width, height: size.height }
}
