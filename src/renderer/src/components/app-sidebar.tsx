"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { GalleryVerticalEndIcon, AudioLinesIcon, TerminalIcon, HomeIcon, TerminalSquareIcon, BotIcon, BookOpenIcon, Settings2Icon, FrameIcon, PieChartIcon, MapIcon } from "lucide-react"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: (
        <GalleryVerticalEndIcon
        />
      ),
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: (
        <AudioLinesIcon
        />
      ),
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: (
        <TerminalIcon
        />
      ),
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "首页",
      url: "/home",
      icon: (
        <HomeIcon
        />
      ),
    },
    {
      title: "实验室",
      url: "/playground",
      icon: (
        <TerminalSquareIcon
        />
      ),
      items: [
        {
          title: "历史记录",
          url: "/playground/history",
        },
        {
          title: "星标",
          url: "/playground/starred",
        },
        {
          title: "设置",
          url: "/playground/settings",
        },
      ],
    },
    {
      title: "模型",
      url: "/models",
      icon: (
        <BotIcon
        />
      ),
      items: [
        {
          title: "创世纪",
          url: "/models/genesis",
        },
        {
          title: "探索者",
          url: "/models/explorer",
        },
        {
          title: "量子",
          url: "/models/quantum",
        },
      ],
    },
    {
      title: "文档",
      url: "/docs",
      icon: (
        <BookOpenIcon
        />
      ),
      items: [
        {
          title: "简介",
          url: "/docs/introduction",
        },
        {
          title: "快速开始",
          url: "/docs/get-started",
        },
        {
          title: "教程",
          url: "/docs/tutorials",
        },
        {
          title: "更新日志",
          url: "/docs/changelog",
        },
      ],
    },
    {
      title: "设置",
      url: "/settings",
      icon: (
        <Settings2Icon
        />
      ),
      items: [
        {
          title: "通用",
          url: "/settings/general",
        },
        {
          title: "团队",
          url: "/settings/team",
        },
        {
          title: "账单",
          url: "/settings/billing",
        },
        {
          title: "限额",
          url: "/settings/limits",
        },
      ],
    },
  ],
  projects: [
    {
      name: "设计工程",
      url: "/projects/design-engineering",
      icon: (
        <FrameIcon
        />
      ),
    },
    {
      name: "销售与市场",
      url: "/projects/sales-marketing",
      icon: (
        <PieChartIcon
        />
      ),
    },
    {
      name: "旅行",
      url: "/projects/travel",
      icon: (
        <MapIcon
        />
      ),
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <ThemeToggle />
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
