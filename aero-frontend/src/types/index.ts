export interface AuthResponse { accessToken:string; refreshToken:string; tokenType:string; expiresIn:number; user:UserResponse }
export interface UserResponse { id:number; email:string; fullName:string; avatarUrl:string|null; bio:string|null; timezone:string; locale:string; provider:string; createdAt:string }
export type TaskStatus = 'TODO'|'IN_PROGRESS'|'DONE'|'CANCELLED'
export type TaskPriority = 'LOW'|'MEDIUM'|'HIGH'|'URGENT'
export interface TaskResponse { id:number; title:string; description:string|null; status:TaskStatus; priority:TaskPriority; deadline:string|null; imageUrl:string|null; tags:string[]; completedAt:string|null; createdAt:string; updatedAt:string }
export interface TaskRequest { title:string; description?:string; status?:TaskStatus; priority?:TaskPriority; deadline?:string; tags?:string[] }
export interface TaskStatsResponse { total:number; todo:number; inProgress:number; done:number; cancelled:number; overdue:number }
export interface EventResponse { id:number; title:string; description:string|null; location:string|null; startTime:string; endTime:string|null; allDay:boolean; imageUrl:string|null; color:string|null; recurrence:string|null; externalId:string|null; createdAt:string; updatedAt:string }
export interface EventRequest { title:string; description?:string; location?:string; startTime:string; endTime?:string; allDay?:boolean; color?:string; recurrence?:string }
export interface NoteCategoryResponse { id:number; name:string; color:string|null; createdAt:string }
export interface NoteResponse { id:number; title:string; content:string|null; category:NoteCategoryResponse|null; pinned:boolean; tags:string[]; createdAt:string; updatedAt:string }
export interface NoteRequest { title:string; content?:string; categoryId?:number; pinned?:boolean; tags?:string[] }
export type HabitFrequency = 'DAILY'|'WEEKLY'|'CUSTOM'
export interface HabitResponse { id:number; name:string; description:string|null; frequency:HabitFrequency; targetPerWeek:number; color:string|null; icon:string|null; active:boolean; currentStreak:number; longestStreak:number; totalCompletions:number; createdAt:string }
export interface HabitRequest { name:string; description?:string; frequency?:HabitFrequency; targetPerWeek?:number; color?:string; icon?:string }
export interface HabitStatsResponse { habitId:number; habitName:string; currentStreak:number; longestStreak:number; totalCompletions:number; completionRateThisWeek:number; completionRateThisMonth:number; completedDatesThisMonth:string[]; checkedToday:boolean }
export interface HabitCompletionResponse { id:number; completedOn:string; note:string|null }
export type ReminderStatus = 'PENDING'|'SENT'|'FAILED'|'CANCELLED'
export type ReminderRefType = 'TASK'|'EVENT'|'HABIT'|'CUSTOM'
export interface ReminderResponse { id:number; title:string; message:string|null; refType:ReminderRefType; refId:number|null; remindAt:string; status:ReminderStatus; sentAt:string|null; createdAt:string }
export interface ReminderRequest { title:string; message?:string; refType:ReminderRefType; refId?:number; remindAt:string }
export interface NotificationPrefResponse { emailEnabled:boolean; pushEnabled:boolean; reminderMinutes:number[]; dailyDigest:boolean; digestTime:string }
export interface PageResponse<T> { content:T[]; page:number; size:number; totalElements:number; totalPages:number; last:boolean }
export interface ProfileHistoryResponse { id:number; fieldName:string; oldValue:string|null; newValue:string|null; changedAt:string }
export interface UpdateProfileRequest { fullName?:string; bio?:string; timezone?:string; locale?:string }
