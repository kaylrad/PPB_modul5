import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { listCatalogArchives } from '../services/catalogArchiveService'
export function useCatalogArchives(){
 const user=useAuth()
 return useQuery({queryKey:['catalogArchives',user?.id],queryFn:()=>listCatalogArchives(user.id),enabled:!!user})
}
