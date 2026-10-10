'use client'
import { createContext, useContext, useState, type ReactNode } from 'react'
const Context = createContext<{ cinematic: boolean; setCinematic: (value: boolean) => void }>({ cinematic: false, setCinematic: () => {} })
export function OpeningPresentationProvider({ children }: { children: ReactNode }) {
  const [cinematic, setCinematic] = useState(false)
  return <Context.Provider value={{ cinematic, setCinematic }}>{children}</Context.Provider>
}
export const useOpeningPresentation = () => useContext(Context)
