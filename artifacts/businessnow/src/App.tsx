import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CurrentUserProvider, useCurrentUser } from "@/contexts/current-user";
import { DensityProvider } from "@/contexts/density";
import { ThemeProvider } from "@/contexts/theme";
import { ErrorBoundary } from "@/components/error-boundary";
import { queryClient } from "@/lib/queryClient";
import React from "react";
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
import Forbidden from "@/pages/forbidden";
import { RequirePermission } from "@/components/require-permission";
import { RoleSelectorModal } from "@/components/role-selector-modal";
import { AITimeAssistant } from "@/components/ai-time-assistant";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading } = useCurrentUser();
  if (isLoading) return null;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
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
                  </AuthGate>
                  <RoleSelectorModal />
                  <AITimeAssistant />
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
