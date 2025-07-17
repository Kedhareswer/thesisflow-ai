import { NextResponse } from "next/server";

// Define a basic API for web search
// In a production environment, you would integrate with a real search API like Google, Bing, or DuckDuckGo
export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ 
        error: "Search query is required",
      }, { status: 400 });
    }

    // Use Google Custom Search API or fallback to a custom implementation
    const results = await searchWeb(query);

    return NextResponse.json({
      results,
      query,
    });
  } catch (error) {
    console.error("Error performing web search:", error);
    return NextResponse.json({
      error: "Failed to perform web search",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

interface SearchResult {
  title: string;
  url: string;
  description: string;
  source: string;
}

async function searchWeb(query: string): Promise<SearchResult[]> {
  try {
    // For this implementation, we're using the Google Custom Search API
    // You can replace this with any search API of your choice
    const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const googleCseId = process.env.GOOGLE_SEARCH_CSE_ID;
    
    if (googleApiKey && googleCseId) {
      // Try using the Google Custom Search API
      try {
        return await searchWithGoogleApi(query, googleApiKey, googleCseId);
      } catch (error) {
        console.error("Error with Google Search API:", error);
        // Fall back to mock results
        return fallbackSearch(query);
      }
    } else {
      // Use fallback search if no API keys are available
      console.log("No Google Search API credentials found. Using fallback search.");
      return fallbackSearch(query);
    }
  } catch (error) {
    console.error("Search function error:", error);
    return fallbackSearch(query);
  }
}

// Function to search using the Google Custom Search API
async function searchWithGoogleApi(
  query: string, 
  apiKey: string, 
  cseId: string
): Promise<SearchResult[]> {
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(query)}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
    cache: "no-store",
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Google Search API returned ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  
  // Map Google Search API response to our standard format
  return (data.items || []).map((item: any) => ({
    title: item.title,
    url: item.link,
    description: item.snippet,
    source: new URL(item.link).hostname.replace("www.", ""),
  }));
}

// Fallback search function that simulates search results for demo purposes
function fallbackSearch(query: string): SearchResult[] {
  const normalizedQuery = query.toLowerCase();
  
  // Mock search results based on the query
  const results: SearchResult[] = [];
  
  // Technology and programming results
  if (normalizedQuery.includes('javascript') || normalizedQuery.includes('js')) {
    results.push(
      {
        title: "JavaScript | MDN",
        url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
        description: "JavaScript (JS) is a lightweight interpreted programming language with first-class functions. It is most well-known as the scripting language for Web pages but is used in many non-browser environments.",
        source: "MDN Web Docs"
      },
      {
        title: "Learn JavaScript - W3Schools",
        url: "https://www.w3schools.com/js/",
        description: "JavaScript is the world's most popular programming language. JavaScript is the programming language of the Web. JavaScript is easy to learn.",
        source: "W3Schools"
      },
      {
        title: "JavaScript Tutorial - JavaScript is Easy to Learn - W3Schools",
        url: "https://www.w3schools.com/js/js_intro.asp",
        description: "This tutorial will teach you JavaScript from basic to advanced. JavaScript is the programming language of the Web. All modern HTML pages use JavaScript.",
        source: "W3Schools"
      }
    );
  }
  
  if (normalizedQuery.includes('react')) {
    results.push(
      {
        title: "React – A JavaScript library for building user interfaces",
        url: "https://react.dev/",
        description: "React is the library for web and native user interfaces. Build user interfaces out of individual pieces called components written in JavaScript.",
        source: "react.dev"
      },
      {
        title: "Quick Start – React",
        url: "https://react.dev/learn",
        description: "This page will give you an introduction to the 80% of React concepts that you will use on a daily basis.",
        source: "react.dev"
      },
      {
        title: "Tutorial: Tic-Tac-Toe – React",
        url: "https://react.dev/learn/tutorial-tic-tac-toe",
        description: "In this tutorial, you'll build a small tic-tac-toe game in React that demonstrates many core React concepts in practice.",
        source: "react.dev"
      }
    );
  }

  if (normalizedQuery.includes('nextjs') || normalizedQuery.includes('next.js')) {
    results.push(
      {
        title: "Next.js by Vercel - The React Framework",
        url: "https://nextjs.org/",
        description: "Next.js gives you the best developer experience with all the features you need for production: hybrid static & server rendering, TypeScript support, smart bundling, route pre-fetching, and more.",
        source: "nextjs.org"
      },
      {
        title: "Getting Started | Next.js",
        url: "https://nextjs.org/docs",
        description: "Learn how to use Next.js to build full-stack web applications by extending the latest React features.",
        source: "nextjs.org"
      },
      {
        title: "Learn Next.js | Next.js",
        url: "https://nextjs.org/learn/foundations/about-nextjs",
        description: "Learn the fundamentals of Next.js by creating a full-stack web application.",
        source: "nextjs.org"
      }
    );
  }

  // AI and machine learning results
  if (normalizedQuery.includes('ai') || normalizedQuery.includes('artificial intelligence') || normalizedQuery.includes('machine learning')) {
    results.push(
      {
        title: "Artificial intelligence - Wikipedia",
        url: "https://en.wikipedia.org/wiki/Artificial_intelligence",
        description: "Artificial intelligence (AI) is the intelligence of machines or software, as opposed to the intelligence of humans or animals. It is a field of study in computer science that develops and studies intelligent machines.",
        source: "Wikipedia"
      },
      {
        title: "OpenAI",
        url: "https://openai.com/",
        description: "OpenAI is an AI research and deployment company. Our mission is to ensure that artificial general intelligence benefits all of humanity.",
        source: "openai.com"
      },
      {
        title: "Google AI",
        url: "https://ai.google/",
        description: "Google AI is advancing the state of the art in machine learning and making it accessible to everyone.",
        source: "Google AI"
      },
      {
        title: "MIT Technology Review: Artificial Intelligence",
        url: "https://www.technologyreview.com/topic/artificial-intelligence/",
        description: "The latest news and research on artificial intelligence, from machine learning to computer vision and more.",
        source: "MIT Technology Review"
      }
    );
  }
  
  // News and current events
  if (normalizedQuery.includes('news') || normalizedQuery.includes('current events')) {
    results.push(
      {
        title: "BBC News - Home",
        url: "https://www.bbc.com/news",
        description: "Visit BBC News for up-to-the-minute news, breaking news, video, audio and feature stories. BBC News provides trusted World and UK news.",
        source: "BBC News"
      },
      {
        title: "CNN - Breaking News, Latest News and Videos",
        url: "https://www.cnn.com/",
        description: "View the latest news and breaking news today for U.S., world, weather, entertainment, politics and health.",
        source: "CNN"
      },
      {
        title: "Reuters | Breaking International News & Views",
        url: "https://www.reuters.com/",
        description: "Reuters provides business, financial, national and international news to professionals, as well as general-interest content.",
        source: "Reuters"
      }
    );
  }
  
  // Research papers and academic content
  if (normalizedQuery.includes('research') || normalizedQuery.includes('paper') || normalizedQuery.includes('academic')) {
    results.push(
      {
        title: "Google Scholar",
        url: "https://scholar.google.com/",
        description: "Google Scholar provides a simple way to broadly search for scholarly literature across many disciplines and sources: articles, theses, books, abstracts and court opinions.",
        source: "Google Scholar"
      },
      {
        title: "arXiv.org",
        url: "https://arxiv.org/",
        description: "arXiv is a free distribution service and an open-access archive for scholarly articles in the fields of physics, mathematics, computer science, quantitative biology, quantitative finance, statistics, and more.",
        source: "arXiv"
      },
      {
        title: "ResearchGate | Find and share research",
        url: "https://www.researchgate.net/",
        description: "Access 130+ million publications and connect with 20+ million researchers. Join for free and gain visibility by uploading your research.",
        source: "ResearchGate"
      }
    );
  }

  // Add some default results if no specific matches or if the query is very short
  if (results.length < 3 || query.length < 4) {
    results.push(
      {
        title: `${query} - Google Search`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        description: `Comprehensive search results for ${query} from Google Search.`,
        source: "Google"
      },
      {
        title: `${query} - Latest Research and Academic Papers`,
        url: `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`,
        description: `Find academic research papers and scholarly publications related to ${query}.`,
        source: "Google Scholar"
      },
      {
        title: `${query} - Wikipedia Encyclopedia`,
        url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`,
        description: `Encyclopedia articles and comprehensive information about ${query} from Wikipedia.`,
        source: "Wikipedia"
      },
      {
        title: `${query} - Latest News and Updates`,
        url: `https://news.google.com/search?q=${encodeURIComponent(query)}`,
        description: `Recent news articles, updates, and current information about ${query}.`,
        source: "Google News"
      }
    );
  }
  
  // Return up to 10 results
  return results.slice(0, 10);

  return results;
}
