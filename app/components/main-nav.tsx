import Link from "next/link";
import UserProfileMenu from "./user-profile-menu";
import { useState } from "react";

export default function MainNav() {
  // For demo: in-memory user state
  const [user, setUser] = useState({ name: "Guest", avatar: "" });

  const handleLogout = () => {
    // TODO: Add logout logic (e.g., clear session, redirect)
    window.location.href = "/login";
  };

  return (
    <nav className="flex items-center justify-between py-4 px-6 bg-white border-b">
      <div className="flex items-center gap-8">
        <Link href="/dashboard" className="text-xl font-bold text-blue-700">AI Project Planner</Link>
        <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        <Link href="/projects" className="hover:underline">Projects</Link>
        <Link href="/summarizer" className="hover:underline">Summarizer</Link>
        <Link href="/writing-assistant" className="hover:underline">Writing</Link>
        <Link href="/collaborate" className="hover:underline">Collaborate</Link>
      </div>
      <div>
        <UserProfileMenu user={user} onLogout={handleLogout} />
      </div>
    </nav>
  );
}
