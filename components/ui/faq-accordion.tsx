'use client';

import * as React from 'react';
import { HelpCircle, MessageCircle, ChevronDown } from 'lucide-react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { cn } from '@/lib/utils';

const CustomAccordion = AccordionPrimitive.Root;

const CustomAccordionItem = React.forwardRef<
	React.ElementRef<typeof AccordionPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
	<AccordionPrimitive.Item
		ref={ref}
		className={cn('', className)}
		{...props}
	/>
));
CustomAccordionItem.displayName = 'CustomAccordionItem';

const CustomAccordionTrigger = React.forwardRef<
	React.ElementRef<typeof AccordionPrimitive.Trigger>,
	React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
	<AccordionPrimitive.Header className="flex">
		<AccordionPrimitive.Trigger
			ref={ref}
			className={cn(
				'group flex flex-1 items-center justify-between gap-4 rounded-2xl p-4 text-left',
				'bg-[#ffff] dark:bg-zinc-800 dark:text-white transition-all hover:bg-gray-50/70 hover:shadow-md',
				'dark:hover:bg-zinc-700/60 focus-visible:outline-none focus-visible:ring-2',
				'dark:data-[state=open]:bg-zinc-700 data-[state=open]:shadow-md',
				className
			)}
			{...props}
		>
			<div className="flex items-center gap-4">
				<HelpCircle className="h-5 w-5 text-gray-600 dark:text-white" />
				<span className="text-lg font-medium dark:text-zinc-50 text-zinc-700 tracking-wide">
					{children}
				</span>
			</div>
			<div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-zinc-600/70 transition-transform group-hover:scale-105 group-data-[state=open]:rotate-180">
				<ChevronDown className="h-4 w-4 text-gray-800 dark:text-white" />
			</div>
		</AccordionPrimitive.Trigger>
	</AccordionPrimitive.Header>
));
CustomAccordionTrigger.displayName = 'CustomAccordionTrigger';

const CustomAccordionContent = React.forwardRef<
	React.ElementRef<typeof AccordionPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
	<AccordionPrimitive.Content
		ref={ref}
		className={cn(
			'overflow-hidden dark:text-white',
			'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down pb-2',
			className
		)}
		{...props}
	>
		<div className="mt-4 ml-14">
			<div className="flex items-start gap-4 rounded-2xl bg-[#ffff] dark:bg-zinc-700 p-4 shadow-md transition-all">
				<span className="flex-1 text-md leading-relaxed">{children}</span>
				<div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-300/70 dark:bg-zinc-600 transition-transform hover:scale-105">
					<MessageCircle className="h-5 w-5 text-gray-700 dark:text-white" />
				</div>
			</div>
		</div>
	</AccordionPrimitive.Content>
));
CustomAccordionContent.displayName = 'CustomAccordionContent';

export {
	CustomAccordion,
	CustomAccordionItem,
	CustomAccordionTrigger,
	CustomAccordionContent,
};

export const faqs = [
  {
    question: 'What is ThesisFlow-AI?',
    answer:
      'ThesisFlow-AI is an end‑to‑end research workspace that helps you discover papers (Explorer), summarize documents and links (Smart Summarizer), plan work (Planner with Calendar/Gantt/Kanban), and collaborate with your team — all in one place.',
  },
  {
    question: 'Which file formats and sources can I summarize?',
    answer:
      'You can summarize PDFs, DOCX/DOC, TXT, CSV tables, PowerPoint slides, images (with OCR), and web URLs. The extraction system pulls text, tables, and metadata where available and supports multiple export formats (JSON, CSV, Markdown, Text).',
  },
  {
    question: 'Which AI providers and models are supported?',
    answer:
      'We support multiple providers including OpenAI (e.g., GPT‑4o, GPT‑4o‑mini), Anthropic (Claude 3.5), Google Gemini (1.5/2.5), Groq (Llama 3.1/3.3, Gemma), and Mistral (small/medium/large). Model availability depends on your configured keys.',
  },
  {
    question: 'Do I need my own API keys?',
    answer:
      'You can use your own provider keys for full control and model choice. Keys are stored securely and can be validated via the built‑in “Test API Key” function. Some deployments may include default keys for trial usage.',
  },
  {
    question: 'Is my data private and secure?',
    answer:
      'Yes. We use secure server‑side APIs, do not train models on your data, and integrate with Supabase for authentication and storage. Uploaded files are processed for extraction and summarization; you control what is saved to your workspace.',
  },
  {
    question: 'Does chat and summarization stream in real time?',
    answer:
      'Yes. The AI chat and plan‑and‑execute routes use Server‑Sent Events (SSE) for token‑by‑token streaming with heartbeat and abort handling for reliability.',
  },
  {
    question: 'Are there any rate limits?',
    answer:
      'Reasonable limits apply to protect service stability (e.g., AI chat streaming ~50 requests/hour by default). Project owners can tune limits in the backend configuration or database RPC policies.',
  },
  {
    question: 'How does the Planner help with research projects?',
    answer:
      'Planner lets you create projects, tasks, and subtasks, visualize schedules on Calendar and Gantt, manage work on Kanban, and track analytics like progress and task status — all synced with your workspace.',
  },
  {
    question: 'Can I export results?',
    answer:
      'Yes. Summaries and extractions can be exported to JSON, CSV, Markdown, or Text. You can also copy rich text from the UI where supported.',
  }
];

export function AccordionComponent() {
  // Build JSON-LD that reflects the visible Q&A content
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }

  return (
    <div className="max-w-3xl w-full mx-auto">
      <script
        type="application/ld+json"
        // Static strings defined in this file; safe to stringify directly
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <CustomAccordion
        type="single"
        collapsible
        defaultValue="item-0"
        className="space-y-6"
      >
        {faqs.map((faq, index) => (
          <CustomAccordionItem
            key={index}
            value={`item-${index}`}
          >
            <CustomAccordionTrigger>{faq.question}</CustomAccordionTrigger>
            <CustomAccordionContent>{faq.answer}</CustomAccordionContent>
          </CustomAccordionItem>
        ))}
      </CustomAccordion>
    </div>
  );
}
