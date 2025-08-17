import React from 'react';

interface SummarizerSEOContentProps {
  className?: string;
}

export default function SummarizerSEOContent({ className = "" }: SummarizerSEOContentProps) {
  return (
    <div className={`prose prose-slate max-w-none ${className}`}>
      {/* Main heading for SEO */}
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        AI Document Summarizer - Advanced Research Tool
      </h1>
      
      {/* Introduction section */}
      <section className="mb-8">
        <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
          Transform lengthy documents into concise, intelligent summaries with Bolt Research Hub's 
          AI-powered summarization tool. Our advanced platform supports multiple file formats, 
          AI providers, and summary styles to meet your research and professional needs.
        </p>
      </section>

      {/* Key Features section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Key Features & Capabilities
        </h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">
              Multi-Format Support
            </h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li>• PDF document processing</li>
              <li>• DOCX file analysis</li>
              <li>• URL content extraction</li>
              <li>• Plain text summarization</li>
              <li>• Smart web search integration</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">
              AI Provider Options
            </h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li>• OpenAI GPT-4o (highest accuracy)</li>
              <li>• Google Gemini (multimodal capabilities)</li>
              <li>• Anthropic Claude (analytical reasoning)</li>
              <li>• Groq (fastest processing)</li>
              <li>• Mistral AI (efficient performance)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Summary Styles section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Summary Styles & Formats
        </h2>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Academic</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Formal, structured summaries perfect for research papers and scholarly content.
            </p>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Executive</h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              Concise, business-focused summaries highlighting key insights and decisions.
            </p>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">Bullet Points</h3>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Quick, scannable summaries organized as easy-to-read bullet points.
            </p>
          </div>
        </div>
      </section>

      {/* How it works section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          How It Works
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
              1
            </div>
            <div>
              <h3 className="font-medium text-gray-800 dark:text-gray-200">Upload or Input Content</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Upload documents (PDF, DOCX), paste URLs, or use our smart web search to find content.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
              2
            </div>
            <div>
              <h3 className="font-medium text-gray-800 dark:text-gray-200">Configure Settings</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose your preferred AI provider, summary style, and length for optimal results.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
              3
            </div>
            <div>
              <h3 className="font-medium text-gray-800 dark:text-gray-200">Generate & Export</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Get your intelligent summary with sentiment analysis, key points, and export options.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Frequently Asked Questions
        </h2>
        
        <div className="space-y-4">
          <details className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <summary className="font-medium text-gray-800 dark:text-gray-200 cursor-pointer">
              What file formats are supported?
            </summary>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              We support PDF, DOCX, TXT files, and URL content extraction. Files up to 10MB are processed efficiently.
            </p>
          </details>
          
          <details className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <summary className="font-medium text-gray-800 dark:text-gray-200 cursor-pointer">
              Which AI provider should I choose?
            </summary>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              GPT-4o offers the highest accuracy, Groq provides fastest processing, Claude excels at analytical content, 
              and Gemini handles multimodal content well. Choose based on your specific needs.
            </p>
          </details>
          
          <details className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <summary className="font-medium text-gray-800 dark:text-gray-200 cursor-pointer">
              How does the sentiment analysis work?
            </summary>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Our AI analyzes the emotional tone and sentiment of your content, providing insights into positive, 
              negative, or neutral themes throughout the document.
            </p>
          </details>
          
          <details className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <summary className="font-medium text-gray-800 dark:text-gray-200 cursor-pointer">
              Can I export summaries in different formats?
            </summary>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Yes! Export your summaries as PDF, DOCX, Markdown, or plain text. Perfect for integration 
              into your research workflow or sharing with team members.
            </p>
          </details>
        </div>
      </section>

      {/* Integration section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Research Platform Integration
        </h2>
        
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          The AI Summarizer seamlessly integrates with other Bolt Research Hub tools:
        </p>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Literature Explorer</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Summarize research papers found through our multi-source academic search engine.
            </p>
          </div>
          
          <div className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Academic Writer</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Use summaries as source material for your academic writing and citation management.
            </p>
          </div>
          
          <div className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Team Collaboration</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Share summaries with team members and collaborate on research projects in real-time.
            </p>
          </div>
          
          <div className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Project Planner</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Organize summaries within your research projects and track progress efficiently.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
