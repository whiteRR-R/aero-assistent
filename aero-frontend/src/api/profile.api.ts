import { apiClient } from './client'
import type { UserResponse,UpdateProfileRequest,ProfileHistoryResponse } from '@/types'
export const profileApi = {
  get:()=>apiClient.get<UserResponse>('/profile').then(r=>r.data),
  update:(d:UpdateProfileRequest)=>apiClient.patch<UserResponse>('/profile',d).then(r=>r.data),
  uploadAvatar:(file:File)=>{const fd=new FormData();fd.append('file',file);return apiClient.post<UserResponse>('/profile/avatar',fd,{headers:{'Content-Type':'multipart/form-data'}}).then(r=>r.data)},
  history:()=>apiClient.get<ProfileHistoryResponse[]>('/profile/history').then(r=>r.data),
}
