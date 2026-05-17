import { apiClient } from './client'

export interface HeatmapEntry {
  date: string   
  count: number
}

export interface DailyBriefStats {
  tasksDueToday: number
  overdueCount: number
  habitsAtRisk: number
  eventsToday: number
  yesterdayCompletionPct: number
}

export interface DailyBriefResponse {
  brief: string
  generatedAt: string
  stats: DailyBriefStats
}

export interface WeeklyReviewStats {
  tasksCompleted: number
  tasksCreated: number
  completionRate: number
  habitsCheckedIn: number
  mostProductiveDay: string
  vsLastWeekPct: number
}

export interface WeeklyReviewResponse {
  review: string
  generatedAt: string
  stats: WeeklyReviewStats
}

export interface QuickCaptureResponse {
  action: 'task' | 'habit' | 'event' | 'unknown'
  summary: string
  created: unknown
}

export const briefApi = {
  heatmap: (days = 365) =>
    apiClient.get<HeatmapEntry[]>('/ai/heatmap', { params: { days } }).then(r => r.data),

  dailyBrief: () =>
    apiClient.get<DailyBriefResponse>('/ai/daily-brief').then(r => r.data),

  weeklyReview: () =>
    apiClient.get<WeeklyReviewResponse>('/ai/weekly-review').then(r => r.data),

  quickCapture: (text: string) =>
    apiClient.post<QuickCaptureResponse>('/ai/quick-capture', { text }).then(r => r.data),
}
