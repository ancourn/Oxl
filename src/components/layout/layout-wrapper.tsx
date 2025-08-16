'use client'

import { ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'

interface LayoutWrapperProps {
  children: ReactNode
  title?: string
  actions?: React.ReactNode
}

export function LayoutWrapper({ children, title, actions }: LayoutWrapperProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="lg:pl-64">
        <Header title={title} actions={actions} />
        
        <main className="container mx-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}