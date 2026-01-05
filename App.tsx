import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout/Layout";
import { Home } from "@/pages/Home";
import { Tournaments } from "@/pages/Tournaments";
import { TournamentDetail } from "@/pages/TournamentDetail";
import { Register } from "@/pages/Register";
import { Participants } from "@/pages/Participants";
import { CheckIn } from "@/pages/CheckIn";
import { Bracket } from "@/pages/Bracket";
import { MatchDetail } from "@/pages/MatchDetail";
import { Rules } from "@/pages/Rules";
import { Admin } from "@/pages/Admin";
import AdminLogin from "@/pages/AdminLogin";
import { Community } from "@/pages/Community";
import { Profile } from "@/pages/Profile";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/tournaments" component={Tournaments} />
        <Route path="/tournament/:id" component={TournamentDetail} />
        <Route path="/tournament/:id/register" component={Register} />
        <Route path="/tournament/:id/participants" component={Participants} />
        <Route path="/tournament/:id/check-in" component={CheckIn} />
        <Route path="/tournament/:id/bracket" component={Bracket} />
        <Route path="/match/:id" component={MatchDetail} />
        <Route path="/community" component={Community} />
        <Route path="/rules" component={Rules} />
        <Route path="/profile" component={Profile} />
        <Route path="/profile/:id" component={Profile} />
        <Route path="/admin" component={Admin} />
        <Route path="/admin-login" component={AdminLogin} />
        <Route path="/login-admin" component={AdminLogin} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
