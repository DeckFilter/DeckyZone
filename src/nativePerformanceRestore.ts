export type NativeSelection = {
  profile: string
  enabled: boolean
  watts: number
}

export type NativePerformanceSnapshot = NativeSelection & {
  available: boolean
  minimum: number
  maximum: number
}

type RestoreOptions = {
  selection: () => NativeSelection | null
  bridgeReady: () => Promise<'ready' | 'starting' | 'unavailable'>
  replay: (selection: NativeSelection) => Promise<unknown>
}

const sameSelection = (a: NativeSelection | null, b: NativeSelection) =>
  a?.profile === b.profile && a.enabled === b.enabled && a.watts === b.watts

// Steam applies the saved TDP before the saved profile. When coming from a
// preset, TdpLimit1 does not exist yet. Replay once after Custom is available;
// ordinary slider updates and external hardware changes are not watched.
export class NativePerformanceRestore {
  private previous: NativePerformanceSnapshot | null = null
  private revision = 0
  private pending = false
  private stopped = false

  constructor(private readonly options: RestoreOptions) {}

  get waiting() { return this.pending && !this.stopped }

  invalidate() { this.revision++ }

  stop() {
    this.stopped = true
    this.pending = false
    this.invalidate()
  }

  abandon() {
    this.pending = false
    this.invalidate()
  }

  async observe(next: NativePerformanceSnapshot) {
    if (this.stopped) return
    const previous = this.previous
    this.previous = next
    const revision = ++this.revision
    if (next.profile !== 'custom') {
      this.pending = false
      return
    }
    this.pending ||= !previous || previous.profile !== 'custom' ||
      !previous.available || !next.available
    if (!this.pending || !next.available) return
    // Accept the previous bridge until its installed payload is repaired.
    // Never clamp malformed/stale values or invent a different user selection.
    if (next.minimum !== 8 || (next.maximum !== 28 && next.maximum !== 30) ||
      (next.enabled && (!Number.isInteger(next.watts) || next.watts < next.minimum || next.watts > next.maximum))) {
      this.pending = false
      return
    }
    try {
      const ready = await this.options.bridgeReady()
      if (this.stopped || revision !== this.revision || !this.pending) return
      if (!sameSelection(this.options.selection(), next)) return
      if (ready === 'unavailable') {
        this.pending = false
        return
      }
      if (ready === 'starting') return // Readiness polling is bounded by the caller.
      this.pending = false // Reentrant notifications must not replay this write.
      await this.options.replay(next)
    } catch (error) {
      // A failed/uncertain write is never retried. A new profile transition can
      // start a new transaction after the user resolves the underlying fault.
      if (revision === this.revision) this.pending = false
      throw error
    }
  }
}
