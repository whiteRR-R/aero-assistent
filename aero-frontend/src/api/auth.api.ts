import { apiClient, setTokens, clearTokens } from './client'
import type { AuthResponse } from '@/types'
type MessageResponse = { message: string }
export const authApi = {
  register:(d:{email:string;password:string;fullName:string})=>apiClient.post<MessageResponse>('/auth/register',d).then(r=>r.data),
  login:(d:{email:string;password:string})=>apiClient.post<AuthResponse>('/auth/login',d).then(r=>{setTokens(r.data.accessToken,r.data.refreshToken);return r.data}),
  logout:()=>apiClient.post('/auth/logout').finally(clearTokens),
}
