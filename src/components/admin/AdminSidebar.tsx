import { LayoutDashboard, Users, BookOpen, Tag, ArrowLeft, Bell, Webhook } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { role } = useAuth();

  const allItems = [
    { title: t("admin_nav_dashboard"), url: "/admin", icon: LayoutDashboard, roles: ["admin"] },
    { title: t("admin_nav_users"), url: "/admin/users", icon: Users, roles: ["admin"] },
    { title: t("admin_nav_courses"), url: "/admin/courses", icon: BookOpen, roles: ["admin", "instructor"] },
    { title: t("admin_nav_categories"), url: "/admin/categories", icon: Tag, roles: ["admin", "instructor"] },
    { title: t("admin_nav_notifications"), url: "/admin/notifications", icon: Bell, roles: ["admin"], indicator: false },
    { title: t("admin_nav_webhooks"), url: "/admin/webhooks", icon: Webhook, roles: ["admin", "developer"], indicator: true },
  ];

  const menuItems = allItems.filter((item) => item.roles.includes(role || ""));

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {!collapsed && <span>{t("admin_back_to_site")}</span>}
          </Button>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>{t("admin_section_label")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
