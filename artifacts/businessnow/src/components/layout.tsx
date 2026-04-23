import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useListNotifications, useMarkNotificationRead, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/contexts/current-user";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Clock,
  CalendarDays,
  DollarSign,
  BarChart3,
  Settings,
  Bell,
  Menu,
  UserSearch,
  TrendingUp,
  LogOut,
  X,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: Briefcase },
  { href: "/accounts", label: "Accounts", icon: Users },
  { href: "/prospects", label: "Prospects", icon: UserSearch },
  { href: "/opportunities", label: "Opportunities", icon: TrendingUp },
  { href: "/time", label: "Time Tracking", icon: Clock },
  { href: "/resources", label: "Resources", icon: CalendarDays },
  { href: "/finance", label: "Finance", icon: DollarSign },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin", label: "Admin", icon: Settings },
];

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function notificationLink(n: { projectId?: number | null; type: string }): string | null {
  if (n.projectId) return `/projects/${n.projectId}`;
  if (n.type === "invoice_paid" || n.type === "invoice_overdue") return "/finance";
  if (n.type === "timesheet_reminder") return "/time";
  return null;
}

export function Layout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { currentUser, activeRole, availableRoles, switchRole } = useCurrentUser();
  const { data: notifications } = useListNotifications();
  const markRead = useMarkNotificationRead();
  const unreadCount = notifications?.filter(n => !n.read).length ?? 0;
  const recentNotifs = notifications?.slice(0, 6) ?? [];

  const dismissNotification = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`${BASE}/api/notifications/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
  });

  async function markAllRead() {
    const unread = notifications?.filter(n => !n.read) ?? [];
    await Promise.all(unread.map(n => markRead.mutateAsync({ id: n.id })));
    queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
  }

  function handleNotifClick(n: { id: number; read: boolean; projectId?: number | null; type: string }) {
    if (!n.read) markRead.mutateAsync({ id: n.id }).then(() => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() }));
    const link = notificationLink(n);
    if (link) navigate(link);
  }

  function handleLogout() {
    window.location.href = "/";
  }

  function handleSwitchRole(role: string) {
    switchRole(role);
    if (role === "Customer") {
      navigate("/portal/dashboard");
    } else if (location.startsWith("/portal/")) {
      navigate("/");
    }
  }

  const NavLinks = () => (
    <>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href}>
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer",
                isActive
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </div>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden absolute top-4 left-4 z-50">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex flex-col h-full bg-card">
            <div className="p-6 border-b">
              <Link href="/">
                <div className="flex items-center gap-2 cursor-pointer font-bold text-xl tracking-tight text-primary">
                  <Briefcase className="h-6 w-6" />
                  BusinessNow
                </div>
              </Link>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              <NavLinks />
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border h-full">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer font-bold text-xl tracking-tight text-primary">
              <Briefcase className="h-6 w-6" />
              BusinessNow
            </div>
          </Link>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative rounded-full h-8 w-8">
                <Bell className="h-4 w-4 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="font-semibold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={markAllRead}>
                    Mark all read
                  </Button>
                )}
              </div>
              <ScrollArea className="max-h-80">
                {recentNotifs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No notifications</div>
                ) : (
                  recentNotifs.map(n => (
                    <div
                      key={n.id}
                      className={`group flex gap-3 px-4 py-3 border-b last:border-0 text-sm cursor-pointer hover:bg-muted/50 ${!n.read ? "bg-blue-50/60 dark:bg-blue-950/20" : ""}`}
                      onClick={() => handleNotifClick(n)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`truncate ${!n.read ? "font-medium" : "text-muted-foreground"}`}>{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.timestamp as unknown as string)}</p>
                      </div>
                      <div className="flex items-start gap-1 flex-shrink-0 mt-0.5">
                        {!n.read && <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />}
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-red-500 rounded"
                          onClick={e => { e.stopPropagation(); dismissNotification.mutate(n.id); }}
                          title="Dismiss"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
              <div className="border-t px-4 py-2">
                <Link href="/notifications">
                  <span className="text-xs text-primary hover:underline cursor-pointer">View all notifications</span>
                </Link>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>

        {/* User chip with logout */}
        <div className="p-4 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 px-3 py-2 w-full rounded-md hover:bg-muted transition-colors text-left group">
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarImage src={currentUser?.avatarUrl ?? ""} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {currentUser?.initials ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">{currentUser?.name ?? "Loading…"}</span>
                  <span className="text-xs text-muted-foreground">{activeRole}</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56 mb-1">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{currentUser?.name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{currentUser?.email ?? ""}</p>
              </div>
              <DropdownMenuSeparator />
              {availableRoles.length > 1 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2 cursor-pointer">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    Switch Role
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {availableRoles.map(role => (
                      <DropdownMenuItem
                        key={role}
                        className={`cursor-pointer gap-2 ${role === activeRole ? "font-semibold text-primary" : ""}`}
                        onClick={() => handleSwitchRole(role)}
                      >
                        {role === activeRole && <span className="text-primary">✓</span>}
                        {role}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 cursor-pointer gap-2"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
