
import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { RealTimeNotification } from "../RealTimeNotification";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
      <RealTimeNotification />
    </div>
  );
};

export default MainLayout;
