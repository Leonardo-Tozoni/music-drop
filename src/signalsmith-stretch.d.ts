declare module 'signalsmith-stretch' {
  interface StretchSchedule {
    output?: number
    active?: boolean
    input?: number
    rate?: number
    semitones?: number
    tonalityHz?: number
    formantSemitones?: number
    formantCompensation?: boolean
    formantBaseHz?: number
    loopStart?: number
    loopEnd?: number
  }

  export interface StretchNode extends AudioWorkletNode {
    schedule(changes: StretchSchedule): Promise<void>
    start(when?: number): Promise<void>
    stop(when?: number): Promise<void>
    latency(): Promise<number>
    configure(config: { blockMs?: number; intervalMs?: number; splitComputation?: boolean; preset?: 'default' | 'cheaper' }): Promise<void>
  }

  export default function SignalsmithStretch(
    audioContext: BaseAudioContext,
    options?: AudioWorkletNodeOptions,
  ): Promise<StretchNode>
}
