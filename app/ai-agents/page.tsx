import { Metadata } from "next"
import ClientAIAgentsPage from "./client-page"

export const metadata: Metadata = {
  title: "AI Agents | ThesisFlow-AI",
  description: "Intelligent AI agents to assist with your research tasks and workflows",
}

export default function AIAgentsPage() {
  return <ClientAIAgentsPage />
}
