import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

export const apiClient = axios.create({ baseURL: '/api', headers: { 'Content-Type': 'application/json' } })

apiClient.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('aero_access')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

let refreshing = false
let queue: { resolve:(v:string)=>void; reject:(e:unknown)=>void }[] = []
const flush = (err:unknown, token:string|null) => { queue.forEach(p => err ? p.reject(err) : p.resolve(token!)); queue = [] }

apiClient.interceptors.response.use(
  r => r,
  async (error: AxiosError) => {
    const orig = error.config as InternalAxiosRequestConfig & { _retry?:boolean }
    if (error.response?.status === 401 && !orig._retry) {
      if (refreshing) return new Promise((res, rej) => queue.push({resolve:res,reject:rej})).then(t => { orig.headers.Authorization = `Bearer ${t}`; return apiClient(orig) })
      orig._retry = true; refreshing = true
      try {
        const rt = localStorage.getItem('aero_refresh')
        if (!rt) throw new Error('no refresh token')
        const { data } = await axios.post('/api/auth/refresh', { refreshToken: rt })
        localStorage.setItem('aero_access', data.accessToken)
        localStorage.setItem('aero_refresh', data.refreshToken)
        flush(null, data.accessToken)
        orig.headers.Authorization = `Bearer ${data.accessToken}`
        return apiClient(orig)
      } catch (e) { flush(e, null); clearTokens(); window.location.href = '/login'; return Promise.reject(e) }
      finally { refreshing = false }
    }
    const detail = (error.response?.data as {detail?:string})?.detail
    const method  = error.config?.method?.toUpperCase() ?? '?'
    const url     = error.config?.url ?? '?'
    const status  = error.response?.status ?? 'NETWORK ERROR'
    console.group(`%c[API Error] ${method} ${url}`, 'color:#F87171;font-weight:bold')
    console.error('Status :', status)
    console.error('Response:', error.response?.data ?? '(no response — сервер недоступен?)')
    console.error('Message :', detail || error.message)
    console.groupEnd()
    return Promise.reject(new Error(detail || error.message || 'Request failed'))
  }
)

export const clearTokens = () => { localStorage.removeItem('aero_access'); localStorage.removeItem('aero_refresh') }
export const setTokens = (a:string, r:string) => { localStorage.setItem('aero_access',a); localStorage.setItem('aero_refresh',r) }
