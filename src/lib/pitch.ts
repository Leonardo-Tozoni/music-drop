import type { StretchNode } from 'signalsmith-stretch'
// Served byte-for-byte: the library rebuilds its AudioWorklet from its own source text,
// which breaks once a bundler rewrites that source
import stretchWorkletUrl from 'signalsmith-stretch?url'

// createMediaElementSource can only be called once per <audio>, so the graph is kept module-wide.
// The element is routed through Web Audio lazily, the first time the pitch changes, so plain
// playback never depends on the AudioContext being unlocked.
//
// Signalsmith Stretch is a frequency-domain shifter: the whole mix moves coherently in both
// directions (a granular shifter smears bass notes when lowering the pitch).
let ctx: AudioContext | null = null
let source: MediaElementAudioSourceNode | null = null
let stretch: StretchNode | null = null
let stretchPromise: Promise<StretchNode> | null = null
let attached: HTMLMediaElement | null = null

let libPromise: Promise<typeof import('signalsmith-stretch')> | null = null
const loadLib = () => (libPromise ??= import('signalsmith-stretch'))

/** Fetch the library ahead of time so the first pitch click still runs inside the user gesture. */
export const preloadPitch = () => { loadLib() }

// Keeps the singer's timbre natural instead of sounding "chipmunk" or "giant".
// formantBaseHz is fixed: the default (0) pitch-tracks, which on a full mix locks onto the bass
// and models an envelope fine enough to follow individual harmonics. Shifted vocal harmonics
// then land in that envelope's valleys and get attenuated, so the voice sinks into the mix.
// A high base smooths the envelope down to just the formants.
const FORMANT = { formantCompensation: true, formantBaseHz: 400 }

async function createStretch(context: AudioContext) {
  const [{ default: SignalsmithStretch }] = await Promise.all([
    loadLib(),
    context.audioWorklet.addModule(stretchWorkletUrl),
  ])
  const node = await SignalsmithStretch(context)
  await node.schedule(FORMANT)
  return node
}

/** Must be called from a user gesture (click) the first time. */
export async function setPitch(audio: HTMLMediaElement, semitones: number) {
  if (semitones === 0 && attached !== audio) return

  if (attached !== audio) {
    ctx ??= new AudioContext()
    // resume() must start inside the click, before any other await
    await ctx.resume()
    // Without a user gesture the context stays suspended; attaching then would mute the audio
    if (ctx.state !== 'running') return
    stretch = await (stretchPromise ??= createStretch(ctx))
    // A concurrent call may have attached while we awaited; attaching twice throws
    if (attached !== audio) {
      source?.disconnect()
      source = ctx.createMediaElementSource(audio)
      stretch.connect(ctx.destination)
      attached = audio
    }
  }
  if (!ctx || !source || !stretch) return

  source.disconnect()
  if (semitones === 0) {
    // Bypass at 0 so the original sound has no processing or latency
    source.connect(ctx.destination)
    stretch.schedule({ active: false })
  } else {
    source.connect(stretch)
    stretch.schedule({ active: true, semitones, ...FORMANT })
  }
}
