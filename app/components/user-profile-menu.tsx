import { useState } from "react";

export default function UserProfileMenu({ user, onLogout }: { user: { name: string; avatar?: string }, onLogout: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 focus:outline-none"
        onClick={() => setOpen((v) => !v)}
        aria-label="User menu"
      >
        {user.avatar ? (
          <img src={user.avatar} alt="avatar" className="w-8 h-8 rounded-full" />
        ) : (
          <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-bold">
            {user.name[0]}
          </span>
        )}
        <span className="font-medium">{user.name}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-50">
          <button className="block w-full px-4 py-2 text-left hover:bg-gray-100" onClick={() => setOpen(false)}>
            Profile
          </button>
          <button className="block w-full px-4 py-2 text-left hover:bg-gray-100" onClick={() => setOpen(false)}>
            Settings
          </button>
          <button className="block w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600" onClick={() => { setOpen(false); onLogout(); }}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
