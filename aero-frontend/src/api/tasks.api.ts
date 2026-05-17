import { apiClient } from './client'
import type { TaskResponse,TaskRequest,TaskStatsResponse,PageResponse } from '@/types'
export const tasksApi = {
  list:(p?:Record<string,unknown>)=>apiClient.get<PageResponse<TaskResponse>>('/tasks',{params:p}).then(r=>r.data),
  get:(id:number)=>apiClient.get<TaskResponse>(`/tasks/${id}`).then(r=>r.data),
  upcoming:(days=7)=>apiClient.get<TaskResponse[]>('/tasks/upcoming',{params:{days}}).then(r=>r.data),
  stats:()=>apiClient.get<TaskStatsResponse>('/tasks/stats').then(r=>r.data),
  create:(d:TaskRequest)=>apiClient.post<TaskResponse>('/tasks',d).then(r=>r.data),
  update:(id:number,d:TaskRequest)=>apiClient.put<TaskResponse>(`/tasks/${id}`,d).then(r=>r.data),
  delete:(id:number)=>apiClient.delete(`/tasks/${id}`),
  uploadImage:(id:number,file:File)=>{const fd=new FormData();fd.append('file',file);return apiClient.post<TaskResponse>(`/tasks/${id}/image`,fd,{headers:{'Content-Type':'multipart/form-data'}}).then(r=>r.data)},
}
