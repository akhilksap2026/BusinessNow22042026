import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CurrentUserProvider, useCurrentUser } from "@/contexts/current-user";
import { DensityProvider } from "@/contexts/density";
import { queryClient } from "@/lib/queryClient";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Accounts from "@/pages/accounts";
import TimeTracking from "@/pages/time";
import Resources from "@/pages/resources";
import Finance from "@/pages/finance";
import Reports from "@/pages/reports";
import Admin from "@/pages/admin";
import Notifications from "@/pages/notifications";
import Prospects from "@/pages/prospects";
import Opportunities from "@/pages/opportunities";
import PortalPage from "@/pages/portal";
import PortalDashboard from "@/pages/portal-dashboard";
import PortalProject from "@/pages/portal-project";

function Router() {
  const { activeRole } = useCurrentUser();
  const [location] = useLocation();
  const isCustomer = activeRole === "Customer";
  const isPortalRoute = location.startsWith("/portal/dashboard") || location.startsWith("/portal/projects");

  if (isCustomer && !isPortalRoute && !location.startsWith("/portal/")) {
    return <Redirect to="/portal/dashboard" />;
  }
  if (!isCustomer && isPortalRoute) {
    return <Redirect to="/" />;
  }

  return (
    <Switch>
      <Route path="/portal/:token" component={PortalPage} />
      <Route path="/portal/dashboard" component={PortalDashboard} />
      <Route path="/portal/projects/:id" component={PortalProject} />
      <Route path="/" component={Dashboard} />
      <Route path="/projects" component={Projects} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/accounts" component={Accounts} />
      <Route path="/prospects" component={Prospects} />
      <Route path="/opportunities" component={Opportunities} />
      <Route path="/time" component={TimeTracking} />
      <Route path="/time-tracking"><Redirect to="/time" /></Route>
      <Route path="/resources" component={Resources} />
      <Route path="/finance" component={Finance} />
      <Route path="/reports" component={Reports} />
      <Route path="/admin" component={Admin} />
      <Route path="/notifications" component={Notifications} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DensityProvider>
        <CurrentUserProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </CurrentUserProvider>
      </DensityProvider>
    </QueryClientProvider>
  );
}

export default App;
