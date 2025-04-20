import TeamChat from '../components/TeamChat'

export default function CollaborationPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Team Collaboration</h1>
      <div className="grid gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Team Chat</h2>
          <p className="text-muted-foreground mb-4">
            Collaborate with your team and get AI assistance for your research project.
          </p>
          <TeamChat />
        </div>
      </div>
    </div>
  )
} 