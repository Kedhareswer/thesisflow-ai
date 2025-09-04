'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useChatSocket } from '@/hooks/use-chat-socket';

export default function TestChatPage() {
  const [user, setUser] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');

  const {
    isConnected,
    connectionError,
    sendTeamMessage,
    joinTeam,
    getTeamMessages
  } = useChatSocket({
    onInitialData: (data) => {
      console.log('Initial data received:', data);
      setTeams(data.teams || []);
    },
    onTeamMessage: (message) => {
      console.log('Team message received:', message);
      setMessages(prev => [...prev, message]);
    },
    onTeamData: (teamId, teamMessages) => {
      console.log('Team messages received:', teamId, teamMessages);
      setMessages(teamMessages);
    }
  });

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleSendMessage = () => {
    if (selectedTeam && newMessage.trim()) {
      sendTeamMessage(selectedTeam, newMessage.trim());
      setNewMessage('');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Chat System Test</h1>
      
      {/* Connection Status */}
      <div className="mb-4 p-3 rounded-lg bg-gray-100">
        <p>Socket Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
        {connectionError && <p className="text-red-600">Error: {connectionError}</p>}
      </div>

      {/* User Info */}
      <div className="mb-4 p-3 rounded-lg bg-blue-50">
        <h2 className="font-semibold mb-2">Current User</h2>
        <p>{user?.email || 'Not logged in'}</p>
      </div>

      {/* Teams */}
      <div className="mb-4 p-3 rounded-lg bg-green-50">
        <h2 className="font-semibold mb-2">Teams ({teams.length})</h2>
        {teams.map((team) => (
          <div key={team.id} className="mb-2">
            <button
              onClick={() => setSelectedTeam(team.id)}
              className={`p-2 rounded ${selectedTeam === team.id ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              {team.name}
            </button>
          </div>
        ))}
      </div>

      {/* Messages */}
      <div className="mb-4 p-3 rounded-lg bg-yellow-50">
        <h2 className="font-semibold mb-2">Messages ({messages.length})</h2>
        <div className="max-h-40 overflow-y-auto mb-2">
          {messages.map((msg, i) => (
            <div key={i} className="p-2 border-b">
              <strong>{msg.sender?.full_name || 'Unknown'}:</strong> {msg.content}
            </div>
          ))}
        </div>
      </div>

      {/* Send Message */}
      <div className="p-3 rounded-lg bg-purple-50">
        <h2 className="font-semibold mb-2">Send Message</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button
            onClick={handleSendMessage}
            disabled={!selectedTeam || !newMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}