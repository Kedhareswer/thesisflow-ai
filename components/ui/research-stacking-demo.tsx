import React from 'react';
import ResearchStackingCards from '@/components/ui/research-stacking-cards';
import { Search, FileText, Brain, Users, Calendar } from 'lucide-react';

const researchFeatures = [
  {
    title: 'AI Research Chat',
    description:
      'Ask research questions and get grounded answers with inline citations. Streaming responses, abort/resume, and model fallbacks are built‑in.',
    image: '/ai_research_chat.png',
    color: '#06B6D4',
    icon: <Brain className="w-6 h-6 text-white" />,
  },
  {
    title: 'Collaborate with Your Team',
    description:
      'Integrate with your favorite collaboration tools to streamline research collaboration. Share your workspace with team members, assign tasks, and track progress.',
    image: '/collabrate_with_team.png',
    color: '#F59E0B',
    icon: <Users className="w-6 h-6 text-white" />,
  },
  {
    title: 'Literature Explorer',
    description:
      'Explore topics and surface high‑quality papers with AI‑assisted search and ranking. Save sources into collections and hand off to the summarizer in one click.',
    image: '/literature_explorer.png',
    color: '#FF6B2C',
    icon: <Search className="w-6 h-6 text-white" />,
  },
  {
    title: 'Planner: Calendar · Gantt · Kanban',
    description:
      'Plan work, assign tasks and track progress across Calendar, Gantt and Kanban views. Lightweight analytics keep individuals and teams aligned.',
    image: '/planner.png',
    color: '#10B981',
    icon: <Calendar className="w-6 h-6 text-white" />,
  },
  {
    title: 'Summarize & Extract',
    description:
      'Upload PDFs, DOCX, PPT, images (OCR) or paste URLs. We extract text, tables and metadata and generate structured summaries you can export to JSON/CSV/Markdown.',
    image: '/summarize_extract.png',
    color: '#8B5CF6',
    icon: <FileText className="w-6 h-6 text-white" />,
  },
];

function ResearchStackingDemo() {
  return (
    <ResearchStackingCards features={researchFeatures} />
  );
}

export { ResearchStackingDemo };
