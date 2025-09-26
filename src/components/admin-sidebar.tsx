"use client";
import * as React from "react";
import {
  File,
  Settings,
  CircleUser,
  InfoIcon,
  CirclePlay,
  ChevronsUpDown,
  LayoutDashboard,
  Building2,
  Component,
} from "lucide-react";
import { NavMain } from "@/components/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePathname } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { LogOut } from 'lucide-react'

const data = {
  NavMain: [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: LayoutDashboard,
      
    },
    {
      title: "Company Info",
      url: "#",
      icon: Building2,
      items: [
        {
          title: "Create Company",
          url: "/admin/companyform",
        },
        {
          title: "Company Record",
          url: "/admin/companyrecord",
        },
        {
          title: "Create Contact",
          url: "/admin/contactform",
        },
        {
          title: "Contact Record",
          url: "/admin/contactrecord",
        },
      ],
    },
    {
      title: "User",
      url: "#",
      icon: CircleUser,
      items: [
        {
          title: "Create User",
          url: "/admin/userform",
        },
        {
          title: "User Record",
          url: "/admin/userrecord",
        },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: File,
      items: [
        {
          title: "Create Certificate",
          url: "/admin/certificateform",
        },
        {
          title: "Certificate Record",
          url: "/admin/certificaterecord",
        },
        {
          title: "Create Service",
          url: "/admin/serviceform",
        },
        {
          title: "Service Record",
          url: "/admin/servicerecord",
        },
      ],
    },
    {
      title: "Create Model",
      url: "#",
      icon: Component,
      items: [
        {
          title: "Create Model",
          url: "/admin/addmodel",
        },
      ],
    },
  ],
};

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [isClient, setIsClient] = React.useState(false);
  const [activePath, setActivePath] = React.useState("");
  const sidebarRef = React.useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = React.useState(false);


  const [admin, setAdmin] = React.useState({
    name: "Admin",
    email: "admin@example.com",
  });

  // Load admin info from localStorage
  React.useEffect(() => {
    const name = localStorage.getItem("adminName") || "Admin";
    const email = localStorage.getItem("adminEmail") || "admin@example.com";
    setAdmin({ name, email });
  }, []);

  React.useEffect(() => {
    if (!sidebarRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setIsCollapsed(width < 80);
      }
    });
    observer.observe(sidebarRef.current);
    return () => observer.disconnect();
  }, []);

  const updatedNavMain = React.useMemo(
    () =>
      data.NavMain.map((item) => ({
        ...item,
        isActive: isClient && activePath === item.url,
        items: item.items?.map((subItem) => ({
          ...subItem,
          isActive: isClient && activePath === subItem.url,
        })),
      })),
    [isClient, activePath]
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarContent>
        <NavMain items={updatedNavMain} />
      </SidebarContent>
      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 px-4 py-2 w-full text-left focus:outline-none">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg">
                  {admin.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{admin.name}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="min-w-56 rounded-lg shadow-md bg-white border"
            side="right"
            align="end"
            sideOffset={4}
          >
            {/* Logout */}
            <DropdownMenuItem
              onClick={() => {
                localStorage.removeItem("adminName");
                localStorage.removeItem("adminEmail");
                localStorage.removeItem("token");
                window.location.href = "/login";
              }}
              className="text-red-600 cursor-pointer hover:bg-red-50 hover:text-red-700"
            >
              <span className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Log out
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}