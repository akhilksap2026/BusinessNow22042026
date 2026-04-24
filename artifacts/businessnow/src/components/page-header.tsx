import { ReactNode, Fragment } from "react";
import { Link, useLocation } from "wouter";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItemDef {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItemDef[];
  /** When true (default) and `breadcrumbs` not provided, derive from current route. */
  autoBreadcrumbs?: boolean;
  className?: string;
}

const ROUTE_LABELS: Record<string, string> = {
  "": "Dashboard",
  projects: "Projects",
  accounts: "Accounts",
  prospects: "Prospects",
  opportunities: "Opportunities",
  time: "Time Tracking",
  resources: "Resources",
  finance: "Finance",
  reports: "Reports",
  admin: "Admin",
  notifications: "Notifications",
  dashboard: "Dashboard",
};

function deriveBreadcrumbs(pathname: string): BreadcrumbItemDef[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Dashboard" }];

  const crumbs: BreadcrumbItemDef[] = [];
  let acc = "";
  segments.forEach((seg, idx) => {
    acc += `/${seg}`;
    const label = ROUTE_LABELS[seg] ?? prettify(seg);
    if (idx === segments.length - 1) {
      crumbs.push({ label });
    } else {
      crumbs.push({ label, href: acc });
    }
  });
  return crumbs;
}

function prettify(seg: string): string {
  // numeric ID → "Detail"; otherwise titlecase the slug
  if (/^\d+$/.test(seg)) return "Detail";
  return seg
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  autoBreadcrumbs = true,
  className,
}: PageHeaderProps) {
  const [location] = useLocation();
  const crumbs = breadcrumbs ?? (autoBreadcrumbs ? deriveBreadcrumbs(location) : null);
  const isHome = location === "/" || location === "";

  return (
    <div className={cn("space-y-2", className)}>
      {crumbs && !isHome && (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1">
              <Link
                href="/"
                className="flex items-center gap-1 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                <Home className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">Home</span>
              </Link>
            </li>
            {crumbs.map((c, i) => (
              <Fragment key={`${c.label}-${i}`}>
                <li aria-hidden="true" className="flex items-center">
                  <ChevronRight className="h-3 w-3" />
                </li>
                <li>
                  {c.href ? (
                    <Link
                      href={c.href}
                      className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-0.5"
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-foreground font-medium">
                      {c.label}
                    </span>
                  )}
                </li>
              </Fragment>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight truncate">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}
