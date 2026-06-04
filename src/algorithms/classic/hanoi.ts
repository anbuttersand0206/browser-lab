import type { AlgorithmStep, HanoiState } from '../types'

export function* hanoi(numDisks: number): Generator<AlgorithmStep<HanoiState>, void, never> {
  // 円盤は大きい数字ほど大きい。ポール0がスタート
  const poles: number[][] = [
    Array.from({ length: numDisks }, (_, i) => numDisks - i),
    [],
    [],
  ]

  const mkState = (moving: HanoiState['moving'] = null): HanoiState => ({
    poles: poles.map(p => [...p]),
    moving,
    totalDisks: numDisks,
  })

  const poleNames = ['A', 'B', 'C']

  yield {
    state: mkState(),
    log: {
      ja: `${numDisks}枚のハノイの塔を開始。全円盤をポールAからポールCへ移動します`,
      en: `Starting Tower of Hanoi with ${numDisks} disks. Move all from pole A to pole C`,
    },
  }

  function* move(n: number, from: number, to: number, via: number): Generator<AlgorithmStep<HanoiState>, void, never> {
    if (n === 0) return

    yield* move(n - 1, from, via, to)

    const disk = poles[from].pop()!
    const diskSize = disk

    yield {
      state: mkState({ from, to, disk: diskSize }),
      log: {
        ja: `円盤${diskSize}をポール${poleNames[from]}からポール${poleNames[to]}へ移動`,
        en: `Moving disk ${diskSize} from pole ${poleNames[from]} to pole ${poleNames[to]}`,
      },
    }

    poles[to].push(disk)

    yield {
      state: mkState(null),
      log: {
        ja: `円盤${diskSize}をポール${poleNames[to]}に配置完了`,
        en: `Disk ${diskSize} placed on pole ${poleNames[to]}`,
      },
    }

    yield* move(n - 1, via, to, from)
  }

  yield* move(numDisks, 0, 2, 1)

  yield {
    state: mkState(),
    log: {
      ja: '完了！全円盤をポールCへ移動しました',
      en: 'Complete! All disks moved to pole C',
    },
  }
}
