
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  SearchIcon, 
  Settings 
} from "lucide-react";

const navItems = [
  {
    name: "Dashboard",
    path: "/",
    icon: <LayoutDashboard className="w-5 h-5" />
  },
  {
    name: "Collaborate",
    path: "/collaborate",
    icon: <Users className="w-5 h-5" />
  },
  {
    name: "Paper Summarizer",
    path: "/summarizer",
    icon: <FileText className="w-5 h-5" />
  },
  {
    name: "Research Explorer",
    path: "/explorer",
    icon: <SearchIcon className="w-5 h-5" />
  },
  {
    name: "Settings",
    path: "/settings",
    icon: <Settings className="w-5 h-5" />
  }
];

const Sidebar = () => {
  const location = useLocation();
  
  return (
    <div className="h-screen bg-sidebar w-64 p-5 border-r border-sidebar-border flex flex-col">
      <div className="mb-8 mt-2">
        <h1 className="text-xl font-bold text-research-500">
          ResearchHub
        </h1>
      </div>
      
      <nav className="flex-1">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location.pathname === item.path
                    ? "bg-sidebar-accent text-research-400"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-research-400"
                )}
              >
                {item.icon}
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="border-t border-sidebar-border pt-4 mt-4">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-research-300 flex items-center justify-center text-white font-medium">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">John Doe</p>
            <p className="text-xs text-muted-foreground truncate">john@example.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
