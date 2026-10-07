const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
})
const dayFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' })
const monthFmt = new Intl.DateTimeFormat('pt-BR', { month: 'short' })

export const formatEventDate = (iso: string) => dateFmt.format(new Date(iso))
export const formatDay = (iso: string) => dayFmt.format(new Date(iso))
export const formatMonth = (iso: string) => monthFmt.format(new Date(iso)).replace('.', '')

/** ISO timestamp → value for <input type="datetime-local"> in the viewer's timezone */
export function toLocalInput(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
