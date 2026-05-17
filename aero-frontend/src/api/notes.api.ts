import { apiClient } from './client'
import type { NoteResponse,NoteRequest,NoteCategoryResponse,PageResponse } from '@/types'
export const notesApi = {
  list:(p?:Record<string,unknown>)=>apiClient.get<PageResponse<NoteResponse>>('/notes',{params:p}).then(r=>r.data),
  search:(q:string,page=0)=>apiClient.get<PageResponse<NoteResponse>>('/notes/search',{params:{q,page}}).then(r=>r.data),
  create:(d:NoteRequest)=>apiClient.post<NoteResponse>('/notes',d).then(r=>r.data),
  update:(id:number,d:NoteRequest)=>apiClient.put<NoteResponse>(`/notes/${id}`,d).then(r=>r.data),
  togglePin:(id:number)=>apiClient.post<NoteResponse>(`/notes/${id}/pin`).then(r=>r.data),
  delete:(id:number)=>apiClient.delete(`/notes/${id}`),
  categories:{
    list:()=>apiClient.get<NoteCategoryResponse[]>('/notes/categories').then(r=>r.data),
    create:(d:{name:string;color?:string})=>apiClient.post<NoteCategoryResponse>('/notes/categories',d).then(r=>r.data),
    delete:(id:number)=>apiClient.delete(`/notes/categories/${id}`),
  },
}
