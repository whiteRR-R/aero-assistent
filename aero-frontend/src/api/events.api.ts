import { apiClient } from './client'
import type { EventResponse,EventRequest,PageResponse } from '@/types'
export const eventsApi = {
  list:(p?:Record<string,unknown>)=>apiClient.get<PageResponse<EventResponse>>('/events',{params:p}).then(r=>r.data),
  get:(id:number)=>apiClient.get<EventResponse>(`/events/${id}`).then(r=>r.data),
  calendar:(from:string,to:string)=>apiClient.get<EventResponse[]>('/events/calendar',{params:{from,to}}).then(r=>r.data),
  create:(d:EventRequest)=>apiClient.post<EventResponse>('/events',d).then(r=>r.data),
  update:(id:number,d:EventRequest)=>apiClient.put<EventResponse>(`/events/${id}`,d).then(r=>r.data),
  delete:(id:number)=>apiClient.delete(`/events/${id}`),
  exportIcal:()=>apiClient.get('/calendar/export.ics',{responseType:'blob'}).then(r=>r.data),
}
