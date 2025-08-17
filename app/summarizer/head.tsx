export default function Head() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const url = `${baseUrl}/summarizer`;
  const title = "AI Summarizer - Bolt Research Hub | Smart Document Summarization";
  const description =
    "Transform lengthy content into intelligent summaries with Bolt Research Hub's AI Summarizer. Supports PDF, DOCX, URLs, and text with multiple AI providers including GPT-4, Gemini, and Claude.";

  const ogImage = `${baseUrl}/og-image.png`;

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta
        name="keywords"
        content="AI summarizer, research summarization, academic document summary, PDF summarizer, DOCX summarizer, URL content extraction, literature review, research paper summary, Bolt Research Hub, GPT-4 summarizer, academic writing tools"
      />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Bolt Research Hub" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content="Bolt Research Hub AI Summarizer - Transform documents into intelligent summaries" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@BoltResearchHub" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Additional SEO Meta Tags */}
      <meta name="author" content="Bolt Research Hub" />
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />
      <meta name="application-name" content="Bolt Research Hub" />
      <meta name="theme-color" content="#2563eb" />

      {/* Structured Data - Enhanced for Research Tool */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Bolt Research Hub - AI Summarizer",
            alternateName: "AI Document Summarizer",
            description: "Advanced AI-powered document summarization tool for researchers, academics, and professionals. Supports multiple file formats and AI providers for intelligent content analysis.",
            applicationCategory: "ResearchApplication",
            applicationSubCategory: "DocumentProcessing",
            operatingSystem: "All",
            browserRequirements: "Modern web browser with JavaScript enabled",
            softwareVersion: "1.0",
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
              "Multi-format document processing (PDF, DOCX, TXT)",
              "URL content extraction and summarization",
              "Multiple AI providers (OpenAI, Google Gemini, Anthropic Claude, Groq)",
              "Academic, executive, and bullet-point summary styles",
              "Sentiment analysis and key points extraction",
              "Export options (PDF, DOCX, Markdown)",
              "Real-time processing with progress tracking",
            ],
            url,
            screenshot: ogImage,
          }),
        }}
      />

      {/* Research-specific Structured Data */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "AI Research Summarizer",
            description: "Professional research tool for academic document summarization and literature review assistance",
            applicationCategory: "AcademicApplication",
            audience: {
              "@type": "Audience",
              audienceType: ["Researchers", "Academics", "Students", "Professionals"],
            },
            serviceType: "Document Analysis",
            areaServed: "Worldwide",
            availableLanguage: "English",
            isAccessibleForFree: true,
            url,
          }),
        }}
      />
    </>
  );
}
