import { apiClient } from './client'
import type { HabitResponse,HabitRequest,HabitStatsResponse,HabitCompletionResponse } from '@/types'
export const habitsApi = {
  list:(activeOnly=true)=>apiClient.get<HabitResponse[]>('/habits',{params:{activeOnly}}).then(r=>r.data),
  get:(id:number)=>apiClient.get<HabitResponse>(`/habits/${id}`).then(r=>r.data),
  stats:(id:number)=>apiClient.get<HabitStatsResponse>(`/habits/${id}/stats`).then(r=>r.data),
  create:(d:HabitRequest)=>apiClient.post<HabitResponse>('/habits',d).then(r=>r.data),
  update:(id:number,d:HabitRequest)=>apiClient.put<HabitResponse>(`/habits/${id}`,d).then(r=>r.data),
  archive:(id:number)=>apiClient.post(`/habits/${id}/archive`),
  delete:(id:number)=>apiClient.delete(`/habits/${id}`),
  checkIn:(id:number,date:string,note?:string)=>apiClient.post<HabitCompletionResponse>(`/habits/${id}/check`,{date,note}).then(r=>r.data),
  uncheck:(id:number,date:string)=>apiClient.delete(`/habits/${id}/check`,{params:{date}}),
}
