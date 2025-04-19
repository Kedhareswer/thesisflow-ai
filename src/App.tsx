
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import Index from "@/pages/Index";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";
import Settings from "@/pages/Settings";
import Explorer from "@/pages/Explorer";
import Summarizer from "@/pages/Summarizer";
import Collaborate from "@/pages/Collaborate";
import { ActivityProvider } from "@/context/ActivityContext";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <ActivityProvider>
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout><Index /></MainLayout>} />
          <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
          <Route path="/explorer" element={<MainLayout><Explorer /></MainLayout>} />
          <Route path="/summarizer" element={<MainLayout><Summarizer /></MainLayout>} />
          <Route path="/collaborate" element={<MainLayout><Collaborate /></MainLayout>} />
          <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      <Toaster />
    </ActivityProvider>
  );
}

export default App;
