// Inline SVG icons: unicode media symbols (▶ ⏸ 🔊) render as colored emoji on mobile
type IconProps = { size?: number }

function Svg({ size = 16, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {children}
    </svg>
  )
}

export function PlayIcon(props: IconProps) {
  return <Svg {...props}><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.6-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z" /></Svg>
}

export function PauseIcon(props: IconProps) {
  return <Svg {...props}><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></Svg>
}

export function PrevIcon(props: IconProps) {
  return <Svg {...props}><rect x="5" y="5" width="2.5" height="14" rx="1" /><path d="M19 6.13v11.74a1 1 0 0 1-1.54.84L9.3 12.84a1 1 0 0 1 0-1.68l8.16-5.87A1 1 0 0 1 19 6.13z" /></Svg>
}

export function NextIcon(props: IconProps) {
  return <Svg {...props}><rect x="16.5" y="5" width="2.5" height="14" rx="1" /><path d="M5 6.13v11.74a1 1 0 0 0 1.54.84l8.16-5.87a1 1 0 0 0 0-1.68L6.54 5.29A1 1 0 0 0 5 6.13z" /></Svg>
}

function Speaker() {
  return <path d="M4 9.5v5a1 1 0 0 0 1 1h3l4.3 3.6a1 1 0 0 0 1.7-.77V5.67a1 1 0 0 0-1.7-.77L8 8.5H5a1 1 0 0 0-1 1z" />
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const }

export function VolumeHighIcon(props: IconProps) {
  return <Svg {...props}><Speaker /><path {...stroke} d="M16 9a4 4 0 0 1 0 6" /><path {...stroke} d="M18.5 6.5a7.5 7.5 0 0 1 0 11" /></Svg>
}

export function VolumeLowIcon(props: IconProps) {
  return <Svg {...props}><Speaker /><path {...stroke} d="M16 9a4 4 0 0 1 0 6" /></Svg>
}

export function VolumeMuteIcon(props: IconProps) {
  return <Svg {...props}><Speaker /><path {...stroke} d="M16.5 9.5l5 5M21.5 9.5l-5 5" /></Svg>
}

export function MenuIcon(props: IconProps) {
  return <Svg {...props}><path {...stroke} d="M4 7h16M4 12h16M4 17h16" /></Svg>
}

export function CloseIcon(props: IconProps) {
  return <Svg {...props}><path {...stroke} d="M6 6l12 12M18 6L6 18" /></Svg>
}
