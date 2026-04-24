import { ReactNode, useState } from "react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentUser } from "@/contexts/current-user";
import { useAccountPermissions, type AccountPermission } from "@/lib/permissions";
import { useDensity } from "@/contexts/density";
import { useTheme, type Theme } from "@/contexts/theme";
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
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

/* ---- Nav groups (VH-8: Workspace / Admin section labels) ---------- */

type NavItemDef = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /**
   * Account-level permission required to see this nav entry.  When omitted
   * the entry is always visible.  Hiding the entry is a UX guard only —
   * destination routes still enforce access on the backend.
   */
  requires?: AccountPermission;
};

const WORKSPACE_NAV: NavItemDef[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, requires: "dashboards.view" },
  { href: "/projects", label: "Projects", icon: Briefcase },
  { href: "/accounts", label: "Accounts", icon: Users },
  { href: "/prospects", label: "Prospects", icon: UserSearch },
  { href: "/opportunities", label: "Opportunities", icon: TrendingUp },
  { href: "/time", label: "Time Tracking", icon: Clock },
  { href: "/resources", label: "Resources", icon: CalendarDays },
];

const ADMIN_NAV: NavItemDef[] = [
  { href: "/finance", label: "Finance", icon: DollarSign },
  { href: "/reports", label: "Reports", icon: BarChart3, requires: "reports.viewStandard" },
  { href: "/admin", label: "Admin", icon: Settings, requires: "settings.manageTeam" },
];

const ALL_NAV = [...WORKSPACE_NAV, ...ADMIN_NAV];

/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Notifications bell — reused in desktop sidebar + mobile top bar.   */
/* ------------------------------------------------------------------ */

function NotificationsBell() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
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
    if (!n.read) {
      markRead.mutateAsync({ id: n.id }).then(() => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() }));
    }
    const link = notificationLink(n);
    if (link) navigate(link);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full h-9 w-9"
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[11px] font-semibold flex items-center justify-center leading-none"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
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
                role="button"
                tabIndex={0}
                onClick={() => handleNotifClick(n)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleNotifClick(n);
                  }
                }}
                className={cn(
                  "group flex gap-3 px-4 py-3 border-b last:border-0 text-sm cursor-pointer hover:bg-muted/50 border-l-2 outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  !n.read ? "bg-blue-50/60 dark:bg-blue-950/20 border-l-blue-500" : "border-l-transparent",
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className={cn("truncate", !n.read ? "font-medium" : "text-muted-foreground")}>{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.timestamp as unknown as string)}</p>
                </div>
                <div className="flex items-start gap-1 flex-shrink-0 mt-0.5">
                  {!n.read && <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" aria-hidden="true" />}
                  <button
                    type="button"
                    aria-label="Dismiss notification"
                    title="Dismiss"
                    className={cn(
                      "h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-red-500 rounded transition-opacity",
                      "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                    onClick={e => {
                      e.stopPropagation();
                      dismissNotification.mutate(n.id);
                    }}
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
  );
}

/* ------------------------------------------------------------------ */
/*  User chip — reused in desktop sidebar footer + mobile top bar.     */
/* ------------------------------------------------------------------ */

interface UserChipProps {
  variant?: "sidebar" | "compact" | "icon";
}

function UserChip({ variant = "sidebar" }: UserChipProps) {
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { currentUser, activeRole, availableRoles, switchRole, logout } = useCurrentUser();
  const { density, setDensity } = useDensity();
  const { theme, setTheme } = useTheme();

  const THEME_OPTIONS: Array<{ value: Theme; label: string; Icon: typeof Sun }> = [
    { value: "light", label: "Light", Icon: Sun },
    { value: "dark", label: "Dark", Icon: Moon },
    { value: "system", label: "System", Icon: Monitor },
  ];

  function handleSwitchRole(role: string) {
    switchRole(role);
  }

  async function handleLogout() {
    await logout();
    queryClient.clear();
    navigate("/");
  }

  const Trigger =
    variant === "icon" ? (
      <button
        className="flex items-center justify-center rounded-full hover:bg-muted transition-colors p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Account menu"
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={currentUser?.avatarUrl ?? ""} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {currentUser?.initials ?? "?"}
          </AvatarFallback>
        </Avatar>
      </button>
    ) : variant === "compact" ? (
      <button
        className="flex items-center gap-1 rounded-full hover:bg-muted transition-colors p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Account menu"
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={currentUser?.avatarUrl ?? ""} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {currentUser?.initials ?? "?"}
          </AvatarFallback>
        </Avatar>
      </button>
    ) : (
      <button
        className="flex items-center gap-3 px-3 py-2 w-full rounded-md hover:bg-muted transition-colors text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Account menu"
      >
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
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground opacity-60 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity flex-shrink-0" />
      </button>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{Trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" side={variant === "compact" || variant === "icon" ? "bottom" : "top"} className="w-56 mb-1">
        <div className="px-3 py-2">
          <p className="text-sm font-medium">{currentUser?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{currentUser?.email ?? ""}</p>
        </div>
        <DropdownMenuSeparator />
        {availableRoles.length > 1 && (
          <>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2 cursor-pointer">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                Switch Role
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {availableRoles.map(role => (
                  <DropdownMenuItem
                    key={role}
                    className={cn("cursor-pointer gap-2", role === activeRole && "font-semibold text-primary")}
                    onClick={() => handleSwitchRole(role)}
                  >
                    {role === activeRole && <span className="text-primary">✓</span>}
                    {role}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2 cursor-pointer">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            Density
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              className={cn("cursor-pointer gap-2", density === "comfortable" && "font-semibold text-primary")}
              onClick={() => setDensity("comfortable")}
            >
              {density === "comfortable" && <span className="text-primary">✓</span>}
              Comfortable
            </DropdownMenuItem>
            <DropdownMenuItem
              className={cn("cursor-pointer gap-2", density === "compact" && "font-semibold text-primary")}
              onClick={() => setDensity("compact")}
            >
              {density === "compact" && <span className="text-primary">✓</span>}
              Compact
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2 cursor-pointer">
            {theme === "dark" ? (
              <Moon className="h-4 w-4 text-muted-foreground" />
            ) : theme === "light" ? (
              <Sun className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Monitor className="h-4 w-4 text-muted-foreground" />
            )}
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {THEME_OPTIONS.map(({ value, label, Icon }) => (
              <DropdownMenuItem
                key={value}
                className={cn("cursor-pointer gap-2", theme === value && "font-semibold text-primary")}
                onClick={() => setTheme(value)}
              >
                <Icon className="h-4 w-4" />
                {theme === value && <span className="text-primary">✓</span>}
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
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
  );
}

/* ------------------------------------------------------------------ */
/*  Layout                                                             */
/* ------------------------------------------------------------------ */

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { activeRole } = useCurrentUser();
  const checkPerm = useAccountPermissions(activeRole);
  const visibleWorkspaceNav = WORKSPACE_NAV.filter(item => !item.requires || checkPerm(item.requires));
  const visibleAdminNav = ADMIN_NAV.filter(item => !item.requires || checkPerm(item.requires));

  /* US-14: sidebar collapse ---------------------------------------- */
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("sidebarCollapsed") === "true"; }
    catch { return false; }
  });

  function toggleCollapsed() {
    setCollapsed(v => {
      const next = !v;
      try { localStorage.setItem("sidebarCollapsed", String(next)); } catch {}
      return next;
    });
  }

  /* Nav item helpers ----------------------------------------------- */
  function isActive(href: string) {
    return location === href || (href !== "/" && location.startsWith(href));
  }

  function NavItem({ item, onNavigate }: { item: NavItemDef; onNavigate?: () => void }) {
    const Icon = item.icon;
    const active = isActive(item.href);
    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={item.href}>
              <div
                role="link"
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={cn(
                  "flex items-center justify-center h-9 w-9 mx-auto rounded-md transition-colors cursor-pointer outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                data-testid={`nav-${item.label.toLowerCase().replace(/ /g, "-")}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>{item.label}</TooltipContent>
        </Tooltip>
      );
    }
    return (
      <Link href={item.href}>
        <div
          role="link"
          aria-current={active ? "page" : undefined}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring",
            active ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          data-testid={`nav-${item.label.toLowerCase().replace(/ /g, "-")}`}
        >
          <Icon className="h-4 w-4" />
          {item.label}
        </div>
      </Link>
    );
  }

  const MobileNavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">Workspace</p>
      {WORKSPACE_NAV.map(item => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <SheetClose asChild key={item.href}>
            <Link href={item.href}>
              <div
                role="link"
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                data-testid={`nav-mobile-${item.label.toLowerCase().replace(/ /g, "-")}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </div>
            </Link>
          </SheetClose>
        );
      })}
      <div className="my-1 border-t border-border" />
      <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">Admin</p>
      {ADMIN_NAV.map(item => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <SheetClose asChild key={item.href}>
            <Link href={item.href}>
              <div
                role="link"
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                data-testid={`nav-mobile-${item.label.toLowerCase().replace(/ /g, "-")}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </div>
            </Link>
          </SheetClose>
        );
      })}
    </>
  );

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Skip-to-content for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-md focus:bg-background focus:border focus:border-border focus:shadow-md focus:text-sm"
      >
        Skip to content
      </a>

      {/* Desktop Sidebar (US-14: collapsible) */}
      <aside
        className={cn(
          "relative hidden md:flex flex-col bg-card border-r border-border h-full transition-all duration-200 ease-in-out",
          collapsed ? "w-14" : "w-56",
        )}
      >
        {/* Header */}
        <div className={cn("border-b border-border flex items-center h-14 flex-shrink-0", collapsed ? "px-2 justify-center" : "px-4 justify-between")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/">
                  <div className="cursor-pointer text-primary flex items-center justify-center h-9 w-9 rounded-md hover:bg-muted">
                    <Briefcase className="h-5 w-5" />
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">BusinessNow</TooltipContent>
            </Tooltip>
          ) : (
            <>
              <Link href="/">
                <div className="flex items-center gap-2 cursor-pointer font-bold text-lg tracking-tight text-primary">
                  <Briefcase className="h-5 w-5" />
                  BusinessNow
                </div>
              </Link>
              <NotificationsBell />
            </>
          )}
        </div>

        {/* Navigation */}
        <nav
          className={cn("flex-1 overflow-y-auto", collapsed ? "p-1.5 space-y-0.5" : "p-3 space-y-0.5")}
          aria-label="Primary"
        >
          {/* VH-8: Workspace group */}
          {!collapsed && (
            <p className="px-2 pt-1 pb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">Workspace</p>
          )}
          {visibleWorkspaceNav.map(item => <NavItem key={item.href} item={item} />)}

          {visibleAdminNav.length > 0 && (
            <>
              <div className="my-1 border-t border-border" />

              {/* VH-8: Admin group */}
              {!collapsed && (
                <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">Admin</p>
              )}
              {visibleAdminNav.map(item => <NavItem key={item.href} item={item} />)}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-border flex-shrink-0">
          {collapsed ? (
            <div className="flex flex-col items-center gap-1 py-2">
              <NotificationsBell />
              <UserChip variant="icon" />
            </div>
          ) : (
            <div className="p-3">
              <UserChip variant="sidebar" />
            </div>
          )}
        </div>

        {/* Collapse toggle button */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "absolute top-[3.75rem] -right-3 z-20 h-6 w-6 rounded-full border border-border bg-card shadow-sm",
            "flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors",
          )}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* Main column */}
      <main id="main-content" className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
        {/* Mobile Top Bar */}
        <header className="md:hidden sticky top-0 z-30 flex items-center gap-2 h-14 px-3 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex flex-col h-full bg-card">
                <div className="p-4 border-b border-border">
                  <SheetClose asChild>
                    <Link href="/">
                      <div className="flex items-center gap-2 cursor-pointer font-bold text-lg tracking-tight text-primary">
                        <Briefcase className="h-5 w-5" />
                        BusinessNow
                      </div>
                    </Link>
                  </SheetClose>
                </div>
                <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto" aria-label="Primary">
                  <MobileNavLinks />
                </nav>
                <div className="p-3 border-t border-border">
                  <UserChip variant="sidebar" />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer font-bold text-base tracking-tight text-primary">
              <Briefcase className="h-5 w-5" />
              BusinessNow
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-1">
            <NotificationsBell />
            <UserChip variant="compact" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          <div className="mx-auto max-w-7xl w-full">{children}</div>
        </div>
      </main>
    </div>
  );
}

/* Keep backward compat: re-export NAV_ITEMS for any consumers */
export const NAV_ITEMS = ALL_NAV;
