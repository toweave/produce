import React from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { SidebarInset, SidebarProvider, useSidebar } from '@/components/ui/sidebar'
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react'

function Header(): React.ReactNode {
  const { state } = useSidebar()

  return (
    <header
      data-sidebar-state={state}
      className="flex h-12 shrink-0 items-center gap-2 transition-[width,height] duration-200 ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
    >
      <div className="flex items-center gap-2 px-4">
        <SidebarToggle />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="#">Build Your Application</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Data Fetching</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}

function SidebarToggle(): React.ReactNode {
  const { state, toggleSidebar } = useSidebar()

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon-sm"
      className="-ml-1"
      onClick={toggleSidebar}
      aria-label={state === 'expanded' ? 'Collapse sidebar' : 'Expand sidebar'}
    >
      {state === 'expanded' ? <PanelLeftCloseIcon /> : <PanelLeftOpenIcon />}
    </Button>
  )
}

export default function Layout({ children }: { children: React.ReactNode }): React.ReactNode {
  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset className="h-svh">
        <Header />
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 pt-0">
          <main className="flex flex-col gap-4">{children}</main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
