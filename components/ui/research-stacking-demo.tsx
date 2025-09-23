import React from 'react';
import ResearchStackingCards from '@/components/ui/research-stacking-cards';
import { Search, FileText, Brain, Users, Zap } from 'lucide-react';

const researchFeatures = [
  {
    title: 'Smart Literature Discovery',
    description: 'Find relevant papers across multiple databases with AI-powered search and ranking. Our intelligent algorithms surface the most impactful research for your field, saving hours of manual searching.',
    image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&auto=format&fit=crop&q=80',
    color: '#FF6B2C',
    icon: <Search className="w-6 h-6 text-white" />,
  },
  {
    title: 'Intelligent Summarization',
    description: 'Transform dense academic papers into structured summaries with key findings, methodologies, and limitations. Get the essence of any research in minutes, not hours.',
    image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80',
    color: '#8B5CF6',
    icon: <FileText className="w-6 h-6 text-white" />,
  },
  {
    title: 'AI Research Assistant',
    description: 'Ask complex research questions in plain English and get evidence-based answers with proper citations. Your personal research companion that understands context and methodology.',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&auto=format&fit=crop&q=80',
    color: '#06B6D4',
    icon: <Brain className="w-6 h-6 text-white" />,
  },
  {
    title: 'Collaborative Workspace',
    description: 'Share research findings, collaborate on projects, and maintain version control across your team. Keep everyone aligned with real-time updates and shared knowledge bases.',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=80',
    color: '#10B981',
    icon: <Users className="w-6 h-6 text-white" />,
  },
  {
    title: 'Automated Workflows',
    description: 'Set up intelligent research pipelines that automatically organize papers, extract key insights, and generate progress reports. Focus on thinking, not busy work.',
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
