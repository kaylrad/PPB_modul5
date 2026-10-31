import { useSyncExternalStore } from 'react'
import { accountClient } from '../config/accountClient'
import { queryClient } from '../config/queryClient'
let user = null
const listeners = new Set()
accountClient?.auth.onAuthStateChange((_event, session) => {
  const next = session?.user ?? null
  if (user?.id !== next?.id) queryClient.clear()
  user = next
  listeners.forEach(fn => fn())
})
export const currentUser = () => user
export function useAuth() {
  return useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn) }, () => user)
}
