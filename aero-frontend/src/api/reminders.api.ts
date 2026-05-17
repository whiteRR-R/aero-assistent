import { apiClient } from './client'
import type { ReminderResponse,ReminderRequest,NotificationPrefResponse,PageResponse } from '@/types'
export const remindersApi = {
  list:(p?:Record<string,unknown>)=>apiClient.get<PageResponse<ReminderResponse>>('/reminders',{params:p}).then(r=>r.data),
  create:(d:ReminderRequest)=>apiClient.post<ReminderResponse>('/reminders',d).then(r=>r.data),
  update:(id:number,d:ReminderRequest)=>apiClient.put<ReminderResponse>(`/reminders/${id}`,d).then(r=>r.data),
  cancel:(id:number)=>apiClient.post(`/reminders/${id}/cancel`),
  delete:(id:number)=>apiClient.delete(`/reminders/${id}`),
  preferences:()=>apiClient.get<NotificationPrefResponse>('/reminders/preferences').then(r=>r.data),
  updatePreferences:(d:Partial<NotificationPrefResponse>)=>apiClient.patch<NotificationPrefResponse>('/reminders/preferences',d).then(r=>r.data),
}
