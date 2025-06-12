import sys
import json
import requests
import traceback
import time
import socket
from datetime import datetime
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import concurrent.futures
from collections import OrderedDict

class TimeoutError(Exception):
    pass

def search_papers(query, max_results=10):
    """Search for academic papers using multiple APIs in parallel.
    
    Args:
        query (str): Search query string
        max_results (int): Maximum number of results to return
        
    Returns:
        str: JSON string containing papers or error message
    """
    try:
        # Define search functions to run in parallel
        search_functions = [
            (search_arxiv, query, max_results),
            (search_crossref, query, max_results)
        ]
        
        papers = []
        
        # Use ThreadPoolExecutor to run searches in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(search_functions)) as executor:
            # Start the search operations and mark each future with its search function
            future_to_search = {
                executor.submit(func, query, max_results): func.__name__ 
                for func, query, max_results in search_functions
            }
            
            for future in concurrent.futures.as_completed(future_to_search):
                search_name = future_to_search[future]
                try:
                    result = future.result()
                    if result:
                        papers.extend(result)
                        print(f"Successfully retrieved {len(result)} papers from {search_name}", file=sys.stderr)
                except Exception as e:
                    print(f"Error in {search_name}: {str(e)}", file=sys.stderr)
        
        # Deduplicate papers based on title and first author
        unique_papers = OrderedDict()
        for paper in papers:
            # Create a unique key using title and first author (if available)
            title = paper.get('title', '').lower().strip()
            first_author = paper.get('authors', [''])[0].lower() if paper.get('authors') else ''
            key = f"{title}:{first_author}"
            
            # Only keep the first occurrence of each paper
            if key not in unique_papers:
                unique_papers[key] = paper
        
        # Convert back to list and limit to max_results
        unique_papers_list = list(unique_papers.values())[:max_results]
        
        # Sort by date (newest first)
        # For papers without a date, put them at the end
        unique_papers_list.sort(
            key=lambda x: (
                x.get('published_date', '') or x.get('year', ''),  # Try to use published_date first, then fall back to year
                x.get('title', '')  # For papers with same date, sort by title
            ),
            reverse=True
        )
        
        # Ensure we don't exceed max_results after sorting
        unique_papers_list = unique_papers_list[:max_results]
        
        print(f"Total unique papers found: {len(unique_papers_list)}", file=sys.stderr)
        return json.dumps(unique_papers_list)

    except Exception as e:
        # Catch any unexpected errors
        error_msg = f"ERROR in search_papers: {str(e)}"
        print(error_msg, file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return json.dumps({"error": error_msg})

def create_http_session(retries=3, backoff_factor=0.3):
    """Create a requests session with retry logic."""
    session = requests.Session()
    retry = Retry(
        total=retries,
        backoff_factor=backoff_factor,
        status_forcelist=[500, 502, 503, 504],
        allowed_methods=["GET"]
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session

def search_crossref(query, max_results=10, timeout_seconds=15):
    """Search academic papers using Crossref API with a timeout and retries."""
    try:
        print(f"Searching Crossref for '{query}'...", file=sys.stderr)
        
        # Parameters for Crossref API
        params = {
            'query': query,
            'rows': max_results,
            'sort': 'relevance',
            'order': 'desc'
        }
        
        print(f"Sending request to Crossref API with timeout={timeout_seconds}s...", file=sys.stderr)
        
        # Create a session with retry logic
        session = create_http_session()
        
        # Make the request with a timeout (both connect and read timeouts)
        response = session.get(
            'https://api.crossref.org/works',
            params=params,
            headers={
                'User-Agent': 'ResearchAssistant/1.0 (mailto:research@example.com)',
                'Accept': 'application/json'
            },
            timeout=(5, timeout_seconds)  # 5s connect timeout, timeout_seconds read timeout
        )
        
        print(f"Received response with status code: {response.status_code}", file=sys.stderr)
        
        # Check if request was successful
        if response.status_code == 200:
            try:
                data = response.json()
                items = data.get('message', {}).get('items', [])
                
                if not items:
                    print("No results found in Crossref", file=sys.stderr)
                    return []
                    
                # Process results
                papers = []
                for item in items:
                    try:
                        # Extract authors
                        authors = []
                        for author in item.get('author', []):
                            name_parts = []
                            if 'given' in author:
                                name_parts.append(author['given'])
                            if 'family' in author:
                                name_parts.append(author['family'])
                            if name_parts:
                                authors.append(' '.join(name_parts))
                        
                        # Extract year
                        year = ""
                        if 'published-print' in item and 'date-parts' in item['published-print']:
                            if item['published-print']['date-parts'] and item['published-print']['date-parts'][0]:
                                year = str(item['published-print']['date-parts'][0][0])
                        
                        # Create paper object
                        paper = {
                            "id": item.get('DOI', ''),
                            "title": item.get('title', [''])[0] if item.get('title') else "",
                            "authors": authors,
                            "abstract": item.get('abstract', ''),
                            "year": year,
                            "url": f"https://doi.org/{item.get('DOI')}" if item.get('DOI') else "",
                            "citations": item.get('is-referenced-by-count', 0),
                            "journal": item.get('container-title', [''])[0] if item.get('container-title') else ""
                        }
                        papers.append(paper)
                        print(f"Processed paper: {paper.get('title', 'Untitled')}", file=sys.stderr)
                        
                    except Exception as e:
                        print(f"Error processing paper: {str(e)}", file=sys.stderr)
                        continue
                
                print(f"Successfully processed {len(papers)} papers from Crossref", file=sys.stderr)
                return papers
                
            except Exception as e:
                print(f"Error parsing Crossref response: {str(e)}", file=sys.stderr)
                print(f"Response content: {response.text[:500]}...", file=sys.stderr)  # Print first 500 chars of response
                return []
        else:
            print(f"Crossref API returned status code {response.status_code}", file=sys.stderr)
            print(f"Response content: {response.text}", file=sys.stderr)
            return []
            
    except (requests.exceptions.Timeout, socket.timeout) as e:
        error_msg = f"Crossref search timed out after {timeout_seconds}s: {str(e)}"
        print(error_msg, file=sys.stderr)
        return []
    except (requests.exceptions.RequestException, socket.gaierror) as e:
        error_msg = f"Network error searching Crossref: {str(e)}"
        print(error_msg, file=sys.stderr)
        return []
    except Exception as e:
        error_msg = f"Unexpected error in Crossref search: {str(e)}"
        print(error_msg, file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return []

def search_arxiv(query, max_results=10, timeout_seconds=15):
    """Search academic papers using arXiv API with improved query handling and error recovery.
    
    Args:
        query (str): Search query string
        max_results (int): Maximum number of results to return
        timeout_seconds (int): Request timeout in seconds
        
    Returns:
        list: List of paper dictionaries or empty list on error
    """
    try:
        print(f"Searching arXiv for '{query}'...", file=sys.stderr)
        
        # Clean and prepare the query
        query = query.strip()
        if not query:
            print("Empty query provided", file=sys.stderr)
            return []
            
        # Try multiple arXiv domains in case of DNS issues
        arxiv_domains = [
            'export.arxiv.org',
            'arxiv.org',
            'export.arxiv.org'  # Try again in case of temporary issues
        ]
        
        last_error = None
        
        for domain in arxiv_domains:
            try:
                # Construct the API URL with the current domain and better query handling
                query_terms = [f"all:{term}" for term in query.split() if term.strip() and term != 'sort:date']
                search_query = '+AND+'.join(query_terms)
                
                # Always sort by last updated date in descending order
                url = (
                    f"https://{domain}/api/query?"
                    f"search_query={search_query}&"
                    f"start=0&"
                    f"max_results={max_results}&"
                    "sortBy=lastUpdatedDate&"
                    "sortOrder=descending"
                )
                print(f"Trying arXiv API at: {url}", file=sys.stderr)
                
                # Create a session with retry logic
                session = create_http_session()
                
                # Make the request with timeout
                print("Sending request to arXiv API...", file=sys.stderr)
                response = session.get(
                    url,
                    headers={'User-Agent': 'ResearchAssistant/1.0 (mailto:research@example.com)'},
                    timeout=timeout_seconds
                )
                print(f"Received response with status code: {response.status_code}", file=sys.stderr)
                
                # If we got a successful response, break out of the retry loop
                if response.status_code == 200:
                    break
                    
            except (requests.exceptions.RequestException, socket.gaierror) as e:
                last_error = e
                print(f"Error with {domain}: {str(e)}", file=sys.stderr)
                continue
        else:
            # If we've exhausted all domains and still have an error, raise it
            if last_error:
                raise last_error
            else:
                raise Exception("All arXiv API endpoints failed")
        
        if response.status_code != 200:
            print(f"arXiv API returned status code {response.status_code}", file=sys.stderr)
            return []
            
        # arXiv returns XML, but we can extract what we need using string operations to avoid XML parsing issues
        content = response.text
        print(f"Received content length: {len(content)} characters", file=sys.stderr)
        
        entries = content.split('<entry>')
        print(f"Found {len(entries)-1} entries in response", file=sys.stderr)
        
        if len(entries) <= 1:
            print("No results found in arXiv", file=sys.stderr)
            return []
        
        papers = []
        for i in range(1, min(len(entries), max_results + 1)):  # Limit to max_results
            try:
                entry = entries[i]
                
                # Extract paper details using simple string operations
                title = extract_between_tags(entry, '<title>', '</title>')
                summary = extract_between_tags(entry, '<summary>', '</summary>')
                published = extract_between_tags(entry, '<published>', '</published>')
                id_url = extract_between_tags(entry, '<id>', '</id>')
                
                # Extract authors
                authors = []
                author_sections = entry.split('<author>')
                for j in range(1, len(author_sections)):
                    author_name = extract_between_tags(author_sections[j], '<name>', '</name>')
                    if author_name:
                        authors.append(author_name)
                
                # Extract and store full published date and year
                published_date = ""
                year = ""
                if published:
                    published_date = published  # Full ISO format date
                    if len(published) >= 4:
                        year = published[:4]  # Extract first 4 characters (the year)
                
                # Extract PDF link if available
                pdf_url = ""
                if id_url:
                    # Convert arXiv ID to PDF URL
                    # Example: http://arxiv.org/abs/2103.00001 -> http://arxiv.org/pdf/2103.00001v1
                    if 'abs/' in id_url:
                        pdf_url = id_url.replace('abs/', 'pdf/') + '.pdf'
                
                # Create paper object
                paper = {
                    "id": id_url.split('/')[-1] if id_url else f"arxiv-{i}",
                    "title": title or "",
                    "authors": authors,
                    "abstract": summary or "",
                    "year": year,
                    "url": id_url or "",
                    "pdf_url": pdf_url,
                    "citations": 0,  # arXiv doesn't provide citation count
                    "journal": "arXiv"
                }
                papers.append(paper)
                print(f"Processed paper {i}: {paper.get('title', 'No title')}", file=sys.stderr)
                
            except Exception as e:
                print(f"Error processing paper {i}: {str(e)}", file=sys.stderr)
                continue
        
        print(f"Successfully processed {len(papers)} papers from arXiv", file=sys.stderr)
        return papers
        
    except (requests.exceptions.Timeout, socket.timeout) as e:
        error_msg = f"arXiv search timed out after {timeout_seconds}s: {str(e)}"
        print(error_msg, file=sys.stderr)
        return []
    except (requests.exceptions.RequestException, socket.gaierror) as e:
        error_msg = f"Network error searching arXiv: {str(e)}"
        print(error_msg, file=sys.stderr)
        return []
    except Exception as e:
        error_msg = f"Unexpected error in arXiv search: {str(e)}"
        print(error_msg, file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return []

def extract_between_tags(text, start_tag, end_tag):
    """Extract content between XML tags."""
    try:
        start = text.index(start_tag) + len(start_tag)
        end = text.index(end_tag, start)
        return text[start:end].strip()
    except (ValueError, IndexError):
        return ""

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python search_papers.py <query>")
        sys.exit(1)
        
    query = ' '.join(sys.argv[1:])
    print(f"Running search for '{query}'...", file=sys.stderr)
    
    start_time = time.time()
    
    try:
        # First try Crossref with a timeout
        print("\n=== TRYING CROSSREF ===", file=sys.stderr)
        crossref_start = time.time()
        papers = search_crossref(query)
        crossref_time = time.time() - crossref_start
        print(f"Crossref search completed in {crossref_time:.2f} seconds", file=sys.stderr)
        
        # If no results from Crossref, try arXiv
        if not papers:
            print("\nNo results from Crossref, trying arXiv...", file=sys.stderr)
            arxiv_start = time.time()
            papers = search_arxiv(query)
            arxiv_time = time.time() - arxiv_start
            print(f"ArXiv search completed in {arxiv_time:.2f} seconds", file=sys.stderr)
        
        # Print results as JSON to stdout
        print("\n=== SEARCH RESULTS ===", file=sys.stderr)
        print(json.dumps(papers, indent=2))
        
    except Exception as e:
        error_msg = f"Error in main search: {str(e)}"
        print(error_msg, file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({"error": error_msg}))
    
    end_time = time.time()
    print(f"\nTotal execution time: {end_time - start_time:.2f} seconds", file=sys.stderr)
