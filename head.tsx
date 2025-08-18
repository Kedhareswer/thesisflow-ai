interface HeadProps {
  documentTitle?: string;
  documentType?: string;
  summaryStyle?: string;
  customDescription?: string;
}

export default function SummarizerSEOHead({ 
  documentTitle, 
  documentType, 
  summaryStyle, 
  customDescription 
}: HeadProps = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bolt-research-hub.vercel.app";
  const url = `${baseUrl}/summarizer`;
  
  // Dynamic title generation
  const dynamicTitle = documentTitle 
    ? `${documentTitle} - AI Summarizer | Bolt Research Hub`
    : summaryStyle 
    ? `${summaryStyle} Summary - AI Summarizer | Bolt Research Hub`
    : "AI Summarizer - Bolt Research Hub | Comprehensive Research Platform";
  
  // Dynamic description generation
  const dynamicDescription = customDescription || 
    (documentTitle 
      ? `AI-powered summary of "${documentTitle}" using Bolt Research Hub's advanced document analysis. ${documentType ? `Specialized ${documentType} processing` : 'Multi-format support'} with sentiment analysis and key insights extraction.`
      : "Advanced document summarization tool within Bolt Research Hub's comprehensive AI-powered research platform. Features multi-format support (PDF, DOCX, URLs), sentiment analysis, and multiple AI providers for academic and professional research workflows.");
  
  const title = dynamicTitle;
  const description = dynamicDescription;

  const ogImage = `${baseUrl}/og-image-1200x630.png`;
const ogImageSmall = `${baseUrl}/og-image-600x315.png`; // Fallback for Twitter Lite or small clients
const imageAlt = "Bolt Research Hub AI Summarizer - Transform documents into intelligent summaries";

  // Structured Data Objects
  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Bolt Research Hub - AI Summarizer",
    alternateName: "Research Document Summarization Tool",
    description: "Part of Bolt Research Hub's comprehensive AI-powered research platform. Advanced document summarization with multi-format support, sentiment analysis, and integration with literature discovery, academic writing, and team collaboration features.",
    applicationCategory: "ResearchApplication",
    applicationSubCategory: "DocumentProcessing",
    operatingSystem: "All",
    browserRequirements: "Modern web browser with JavaScript enabled",
    softwareVersion: "1.0.14",
    author: {
      "@type": "Organization",
      name: "Bolt Research Hub",
      url: baseUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Bolt Research Hub",
      url: baseUrl,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      category: "Free Tier Available",
    },
    featureList: [
      "Multi-format document processing (PDF, DOCX, TXT, URLs)",
      "Smart web search integration for content discovery",
      "Multiple AI providers (OpenAI GPT-4o, Google Gemini, Anthropic Claude, Groq, Mistral)",
      "Academic, executive, and bullet-point summary styles",
      "Sentiment analysis and key points extraction",
      "Export options (PDF, DOCX, Markdown)",
      "Integration with literature search and academic writing tools",
      "Real-time processing with progress tracking",
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "127",
      bestRating: "5",
      worstRating: "1"
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/summarizer?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    },
    sameAs: [
      "https://github.com/Kedhareswer/ai-project-planner",
      "https://twitter.com/BoltResearchHub",
      "https://linkedin.com/company/bolt-research-hub",
      "https://discord.gg/bolt-research-hub"
    ],
    url,
    screenshot: ogImage,
  };

  const webApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Bolt Research Hub - Document Summarizer",
    description: "Advanced document summarization module within Bolt Research Hub's comprehensive research platform. Integrates with literature discovery, academic writing, team collaboration, and AI-powered research tools for complete research workflow management.",
    applicationCategory: "AcademicApplication",
    audience: {
      "@type": "Audience",
      audienceType: ["Researchers", "Academics", "Students", "Professionals", "Research Teams"],
    },
    serviceType: "Research Platform - Document Analysis",
    areaServed: "Worldwide",
    availableLanguage: "English",
    isAccessibleForFree: true,
    url,
  };

  // FAQ Structured Data
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What formats does the AI Summarizer support?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "It supports PDF, DOCX, TXT files and web URLs with automatic detection."
        }
      },
      {
        "@type": "Question",
        name: "Is Bolt Research Hub free to use?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, the AI Summarizer offers a free tier with generous limits."
        }
      }
    ]
  };

  // Breadcrumb Structured Data
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "AI Summarizer",
        item: url
      }
    ]
  };

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta
        name="keywords"
        content="AI summarizer, research platform, academic document summary, PDF summarizer, DOCX summarizer, URL content extraction, literature discovery, research collaboration, academic writing, Bolt Research Hub, GPT-4o, Gemini, Claude, research workflow, team collaboration, citation management"
      />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Bolt Research Hub" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image" content={ogImageSmall} />
      <meta property="og:image:width" content="600" />
      <meta property="og:image:height" content="315" />
      <meta property="og:image:alt" content={imageAlt} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@BoltResearchHub" />
      <meta name="twitter:creator" content="@BoltResearchHub" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={imageAlt} />

      {/* International/Language Support */}
      <link rel="alternate" hrefLang="en" href={url} />
      <link rel="alternate" hrefLang="en-US" href={url} />
      <link rel="alternate" hrefLang="en-GB" href={url} />
      <link rel="alternate" hrefLang="x-default" href={url} />

      {/* Performance and Core Web Vitals */}
      <link rel="dns-prefetch" href="//api.openai.com" />
      <link rel="dns-prefetch" href="//api.anthropic.com" />
      <link rel="dns-prefetch" href="//generativelanguage.googleapis.com" />

      {/* Additional SEO Meta Tags */}
      <meta name="author" content="Bolt Research Hub" />
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />
      <meta name="application-name" content="Bolt Research Hub" />
      <meta name="theme-color" content="#2563eb" />

      {/* Structured Data - Enhanced for Research Tool */}
      <script type="application/ld+json">
        {JSON.stringify(softwareApplicationSchema)}
      </script>

      {/* Research-specific Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(webApplicationSchema)}
      </script>

      {/* FAQ Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </script>

      {/* Breadcrumb Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
    </>
  );
}
