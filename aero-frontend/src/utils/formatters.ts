import {
  format, formatDistanceToNow, isToday, isTomorrow, isThisWeek,
  parseISO, differenceInCalendarDays, type Locale,
} from 'date-fns'
import { enUS, ru } from 'date-fns/locale'


function getLocale(): Locale {
  const lang = localStorage.getItem('aero_lang') ?? 'en'
  return (lang === 'ru' || lang === 'kk') ? ru : enUS
}


const DATE_LABELS: Record<string, Record<string, string>> = {
  todayAt:     { en: 'Today at',      ru: 'Сегодня в',      kk: 'Бүгін' },
  tomorrowAt:  { en: 'Tomorrow at',   ru: 'Завтра в',       kk: 'Ертең'  },
  dueToday:    { en: 'Due today',     ru: 'Срок сегодня',   kk: 'Бүгін мерзімі' },
  dueTomorrow: { en: 'Due tomorrow',  ru: 'Завтра',         kk: 'Ертең мерзімі' },
  overdue:     { en: 'overdue',       ru: 'просрочено',     kk: 'мерзімі өтті' },
  daysLeft:    { en: 'left',          ru: 'осталось',       kk: 'қалды'  },
}

function tl(key: string): string {
  const lang = localStorage.getItem('aero_lang') ?? 'en'
  return DATE_LABELS[key]?.[lang] ?? DATE_LABELS[key]?.['en'] ?? key
}



export function formatDate(d: string) {
  const locale = getLocale()
  const date = parseISO(d)
  if (isToday(date))     return `${tl('todayAt')} ${format(date, 'HH:mm', { locale })}`
  if (isTomorrow(date))  return `${tl('tomorrowAt')} ${format(date, 'HH:mm', { locale })}`
  if (isThisWeek(date))  return format(date, 'EEE, HH:mm', { locale })
  return format(date, 'd MMM yyyy', { locale })
}

export function formatTimeAgo(d: string) {
  return formatDistanceToNow(parseISO(d), { addSuffix: true, locale: getLocale() })
}

export function formatDeadline(d: string): { label: string; urgent: boolean } {
  const date = parseISO(d)
  const now = new Date()
  const diff = differenceInCalendarDays(date, now)
  if (date.getTime() < now.getTime() && diff <= 0) {
    if (diff < 0) return { label: `${Math.abs(diff)}d ${tl('overdue')}`, urgent: true }
    return { label: tl('overdue'), urgent: true }
  }
  if (diff === 0) return { label: tl('dueToday'), urgent: true }
  if (diff === 1) return { label: tl('dueTomorrow'), urgent: true }
  return { label: `${diff}d ${tl('daysLeft')}`, urgent: false }
}

export function formatMonoDate(d: string) {
  return format(parseISO(d), 'd MMM · HH:mm', { locale: getLocale() })
}

export function formatCalendarDate(d: string) {
  return format(parseISO(d), 'HH:mm')
}


export function weekdayInitial(date: Date): string {
  return format(date, 'EEEEE', { locale: getLocale() })
}
