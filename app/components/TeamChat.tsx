import { use client } from 'react'

interface Message {
  id: string
  text: string
  sender: string
  timestamp: Date
  isAI?: boolean
}

export default function TeamChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'You',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')

    // Only trigger AI response if message starts with @ai
    if (input.toLowerCase().trim().startsWith('@ai')) {
      setIsLoading(true)
      try {
        const aiQuery = input.substring(3).trim() // Remove @ai prefix
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message: aiQuery })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to get response')
        }

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.response,
          sender: 'AI Assistant',
          timestamp: new Date(),
          isAI: true
        }

        setMessages(prev => [...prev, aiMessage])
      } catch (error) {
        console.error('Error sending message:', error)
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Sorry, I encountered an error. Please try again.',
          sender: 'AI Assistant',
          timestamp: new Date(),
          isAI: true
        }
        setMessages(prev => [...prev, errorMessage])
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-lg">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex justify-center items-center h-full text-gray-500">
            <p>Start chatting! Use @ai to get AI assistance.</p>
          </div>
        )}
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${
              message.isAI ? 'justify-start' : 'justify-end'
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.isAI
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-blue-500 text-white'
              }`}
            >
              <p className="text-sm font-semibold">{message.sender}</p>
              <p className="mt-1 whitespace-pre-wrap">{message.text}</p>
              <p className="text-xs mt-1 opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <p className="text-gray-500">AI is typing...</p>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type @ai followed by your question..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
} 
