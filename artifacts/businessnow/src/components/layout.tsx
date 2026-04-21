import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useListNotifications } from "@workspace/api-client-react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: notifications } = useListNotifications();
  const unreadCount = notifications?.filter(n => !n.read).length ?? 0;

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
          <Link href="/notifications">
            <Button variant="ghost" size="icon" className="relative rounded-full h-8 w-8">
              <Bell className="h-4 w-4 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary/10 text-primary">OP</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Ops Leader</span>
              <span className="text-xs text-muted-foreground">Admin</span>
            </div>
          </div>
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
