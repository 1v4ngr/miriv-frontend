import { apiRequest } from '../../../services/api-client'
export interface AdminZone { code:string; name:string; centerCode:string; centerName?:string }
export const adminZonesApi={list:()=>apiRequest<AdminZone[]>('/api/admin/zones'),create:(x:AdminZone)=>apiRequest<AdminZone>('/api/admin/zones',{method:'POST',body:JSON.stringify(x)}),update:(code:string,x:AdminZone)=>apiRequest<void>(`/api/admin/zones/${encodeURIComponent(code)}`,{method:'PUT',body:JSON.stringify(x)}),remove:(code:string)=>apiRequest<void>(`/api/admin/zones/${encodeURIComponent(code)}`,{method:'DELETE'})}
