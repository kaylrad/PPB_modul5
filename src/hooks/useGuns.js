import { useQuery } from '@tanstack/react-query'
import gunService from '../services/gunService'
async function checked(request){const result=await request;if(!result.success)throw new Error(result.message||'Data gagal dimuat.');return result}
export function useGuns(params={}){
 const q=useQuery({queryKey:['products',params],queryFn:()=>checked(gunService.getGuns(params))})
 return {guns:q.data?.data||[],loading:q.isLoading,error:q.error?.message,pagination:q.data?.pagination,refetch:q.refetch}
}
export function useGunById(id){
 const q=useQuery({queryKey:['products','detail',id],queryFn:()=>checked(gunService.getGunById(id)),enabled:!!id})
 return {gun:q.data?.data,loading:q.isLoading,error:q.error?.message,refetch:q.refetch}
}
