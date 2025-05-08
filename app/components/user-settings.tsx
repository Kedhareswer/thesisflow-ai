import { useState } from "react";

export default function UserSettings({ user, onUpdate, onLogout }: {
  user: { name: string; avatar?: string },
  onUpdate: (data: { name: string; avatar?: string }) => void,
  onLogout: () => void
}) {
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatar || "");
  const [show, setShow] = useState(false);

  const handleSave = () => {
    onUpdate({ name, avatar });
    setShow(false);
  };

  return (
    <>
      <button onClick={() => setShow(true)} className="block w-full px-4 py-2 text-left hover:bg-gray-100">Settings</button>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-20">
          <div className="bg-white rounded shadow-lg p-8 w-96">
            <h2 className="text-lg font-bold mb-4">User Settings</h2>
            <label className="block mb-2">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded px-2 py-1 mb-4" />
            <label className="block mb-2">Avatar URL</label>
            <input value={avatar} onChange={e => setAvatar(e.target.value)} className="w-full border rounded px-2 py-1 mb-4" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShow(false)} className="px-4 py-2 rounded bg-gray-200">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 rounded bg-blue-600 text-white">Save</button>
            </div>
            <button onClick={onLogout} className="mt-4 text-red-600 underline">Log out</button>
          </div>
        </div>
      )}
    </>
  );
}
