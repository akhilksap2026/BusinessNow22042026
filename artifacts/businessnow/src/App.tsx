import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setDefaultHeaders } from "@workspace/api-client-react";
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

const queryClient = new QueryClient();

setDefaultHeaders({ "x-user-role": "Admin" });

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
      <Route path="/resources" component={Resources} />
      <Route path="/finance" component={Finance} />
      <Route path="/reports" component={Reports} />
      <Route path="/admin" component={Admin} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/portal/:token" component={PortalPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
