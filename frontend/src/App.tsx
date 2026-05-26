// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import PolicySimulation from "@/pages/PolicySimulation";
import UC2Dashboard from "@/pages/UC2Dashboard";
import UC3Dashboard from "@/pages/UC3Dashboard";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DashboardLayout>
          <Routes>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/simulation" element={<PolicySimulation />} />
            <Route path="/workforce"  element={<UC2Dashboard />} />
            <Route path="/scenarios"  element={<div className="p-6 text-text-muted">Scenario Analysis — Coming Soon</div>} />
            <Route path="/risk"       element={<UC3Dashboard />} />
            <Route path="/reports"    element={<Reports />} />
            <Route path="/settings"   element={<Settings />} />
            <Route path="*"           element={<NotFound />} />
          </Routes>
        </DashboardLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
