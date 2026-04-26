import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CurrentUserProvider, useCurrentUser } from "@/contexts/current-user";
import { DensityProvider } from "@/contexts/density";
import { ThemeProvider } from "@/contexts/theme";
import { ErrorBoundary } from "@/components/error-boundary";
import { queryClient } from "@/lib/queryClient";
import React, { useEffect } from "react";
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
import CommandCenter from "@/pages/command-center";
import Notifications from "@/pages/notifications";
import Prospects from "@/pages/prospects";
import Opportunities from "@/pages/opportunities";
import Login from "@/pages/login";
import Forbidden from "@/pages/forbidden";
import { RequirePermission } from "@/components/require-permission";
import { RoleSelectorModal } from "@/components/role-selector-modal";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useCurrentUser();
  const [location, navigate] = useLocation();
  const onLogin = location === "/login";

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && !onLogin) {
      navigate("/login");
    }
  }, [isLoading, isAuthenticated, onLogin, navigate]);

  if (isLoading) return null;
  // /login is rendered by the Router below so it can mount even when
  // unauthenticated. For everything else, hold rendering until the user
  // is authenticated (the effect above will have started the redirect).
  if (!isAuthenticated && !onLogin) return null;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Dashboard} />
      <Route path="/projects" component={Projects} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/accounts" component={Accounts} />
      <Route path="/prospects" component={Prospects} />
      <Route path="/opportunities" component={Opportunities} />
      <Route path="/time" component={TimeTracking} />
      <Route path="/time-tracking"><Redirect to="/time" /></Route>
      <Route path="/resources" component={Resources} />
      <Route path="/finance">
        <RequirePermission permission="invoicing.view">
          <Finance />
        </RequirePermission>
      </Route>
      <Route path="/reports">
        <RequirePermission permission="reports.viewStandard">
          <Reports />
        </RequirePermission>
      </Route>
      <Route path="/admin">
        <RequirePermission permission="settings.manageTeam">
          <Admin />
        </RequirePermission>
      </Route>
      <Route path="/command-center">
        <RequirePermission permission="settings.manageTeam">
          <CommandCenter />
        </RequirePermission>
      </Route>
      <Route path="/admin/portfolio"><Redirect to="/command-center" /></Route>
      <Route path="/rate-cards"><Redirect to="/admin?tab=ratecards" /></Route>
      <Route path="/admin/rate-cards"><Redirect to="/admin?tab=ratecards" /></Route>
      <Route path="/notifications" component={Notifications} />
      <Route path="/forbidden"><Forbidden /></Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <DensityProvider>
            <CurrentUserProvider>
              <TooltipProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <AuthGate>
                    <ErrorBoundary>
                      <Router />
                    </ErrorBoundary>
                    <RoleSelectorModal />
                  </AuthGate>
                </WouterRouter>
                <Toaster />
              </TooltipProvider>
            </CurrentUserProvider>
          </DensityProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
