import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Collaborate from "./pages/Collaborate";
import Summarizer from "./pages/Summarizer";
import Explorer from "./pages/Explorer";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { ActivityProvider } from "./context/ActivityContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ActivityProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
            <Route path="/collaborate" element={<MainLayout><Collaborate /></MainLayout>} />
            <Route path="/summarizer" element={<MainLayout><Summarizer /></MainLayout>} />
            <Route path="/explorer" element={<MainLayout><Explorer /></MainLayout>} />
            <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ActivityProvider>
  </QueryClientProvider>
);

export default App;
