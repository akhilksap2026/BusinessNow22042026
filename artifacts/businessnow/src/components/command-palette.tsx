import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Briefcase,
  Building2,
  UserSearch,
  TrendingUp,
  Clock,
  CalendarDays,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  Bell,
  Gauge,
  Plus,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

type Cmd = { label: string; href: string; icon: typeof LayoutDashboard; group: string };

const COMMANDS: Cmd[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, group: "Navigate" },
  { label: "Projects", href: "/projects", icon: Briefcase, group: "Navigate" },
  { label: "Accounts", href: "/accounts", icon: Building2, group: "Navigate" },
  { label: "Prospects", href: "/prospects", icon: UserSearch, group: "Navigate" },
  { label: "Opportunities", href: "/opportunities", icon: TrendingUp, group: "Navigate" },
  { label: "Time Tracking", href: "/time-tracking", icon: Clock, group: "Navigate" },
  { label: "Resources", href: "/resources", icon: Users, group: "Navigate" },
  { label: "Finance", href: "/finance", icon: DollarSign, group: "Navigate" },
  { label: "Reports", href: "/reports", icon: BarChart3, group: "Navigate" },
  { label: "Notifications", href: "/notifications", icon: Bell, group: "Navigate" },
  { label: "Command Center", href: "/command-center", icon: Gauge, group: "Navigate" },
  { label: "Admin", href: "/admin", icon: Settings, group: "Navigate" },
  { label: "New Project", href: "/projects?new=1", icon: Plus, group: "Quick actions" },
  { label: "Log Time", href: "/time-tracking?log=1", icon: Plus, group: "Quick actions" },
  { label: "New Invoice", href: "/finance?new=invoice", icon: Plus, group: "Quick actions" },
  { label: "Day off / Time off", href: "/time-tracking?tab=time-off", icon: CalendarDays, group: "Quick actions" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(href: string) {
    setOpen(false);
    setLocation(BASE + href);
  }

  const groups = Array.from(new Set(COMMANDS.map(c => c.group)));

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        {groups.map((g, i) => (
          <div key={g}>
            {i > 0 && <CommandSeparator />}
            <CommandGroup heading={g}>
              {COMMANDS.filter(c => c.group === g).map(c => {
                const Icon = c.icon;
                return (
                  <CommandItem key={c.href + c.label} onSelect={() => go(c.href)}>
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{c.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
