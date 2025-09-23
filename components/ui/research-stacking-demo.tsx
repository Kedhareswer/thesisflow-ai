import React from 'react';
import ResearchStackingCards from '@/components/ui/research-stacking-cards';
import { Search, FileText, Brain, Users, Zap } from 'lucide-react';

const researchFeatures = [
  {
    title: 'Literature Explorer',
    description:
      'Explore topics and surface high‑quality papers with AI‑assisted search and ranking. Save sources into collections and hand off to the summarizer in one click.',
    image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&auto=format&fit=crop&q=80',
    color: '#FF6B2C',
    icon: <Search className="w-6 h-6 text-white" />,
  },
  {
    title: 'Summarize & Extract',
    description:
      'Upload PDFs, DOCX, PPT, images (OCR) or paste URLs. We extract text, tables and metadata and generate structured summaries you can export to JSON/CSV/Markdown.',
    image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80',
    color: '#8B5CF6',
    icon: <FileText className="w-6 h-6 text-white" />,
  },
  {
    title: 'AI Research Chat',
    description:
      'Ask research questions and get grounded answers with inline citations. Streaming responses, abort/resume, and model fallbacks are built‑in.',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&auto=format&fit=crop&q=80',
    color: '#06B6D4',
    icon: <Brain className="w-6 h-6 text-white" />,
  },
  {
    title: 'Planner: Calendar · Gantt · Kanban',
    description:
      'Plan work, assign tasks and track progress across Calendar, Gantt and Kanban views. Lightweight analytics keep individuals and teams aligned.',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=80',
    color: '#10B981',
    icon: <Users className="w-6 h-6 text-white" />,
  },
  {
    title: 'Automated Pipelines',
    description:
      'Automate repetitive steps—ingest, summarize, tag and export—using reusable workflows that run on your data, not ours.',
    image: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&auto=format&fit=crop&q=80',
    color: '#F59E0B',
    icon: <Zap className="w-6 h-6 text-white" />,
  },
];

function ResearchStackingDemo() {
  return (
    <ResearchStackingCards features={researchFeatures} />
  );
}

export { ResearchStackingDemo };
