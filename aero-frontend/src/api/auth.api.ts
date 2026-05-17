import { apiClient, setTokens, clearTokens } from './client'
import type { AuthResponse } from '@/types'
export const authApi = {
  register:(d:{email:string;password:string;fullName:string})=>apiClient.post<AuthResponse>('/auth/register',d).then(r=>{setTokens(r.data.accessToken,r.data.refreshToken);return r.data}),
  login:(d:{email:string;password:string})=>apiClient.post<AuthResponse>('/auth/login',d).then(r=>{setTokens(r.data.accessToken,r.data.refreshToken);return r.data}),
  logout:()=>apiClient.post('/auth/logout').finally(clearTokens),
}
