from scholarly import scholarly
from typing import List, Dict, Any
import json

class ScholarlyService:
    @staticmethod
    def search_papers(query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search for papers on Google Scholar
        """
        try:
            search_query = scholarly.search_pubs(query)
            results = []
            
            for i, paper in enumerate(search_query):
                if i >= limit:
                    break
                    
                # Get detailed information about the paper
                paper_details = scholarly.fill(paper)
                
                result = {
                    'id': paper_details.get('bib', {}).get('title', '').replace(' ', '-').lower(),
                    'title': paper_details.get('bib', {}).get('title', ''),
                    'authors': paper_details.get('bib', {}).get('author', []),
                    'abstract': paper_details.get('bib', {}).get('abstract', ''),
                    'year': paper_details.get('bib', {}).get('pub_year', ''),
                    'url': paper_details.get('pub_url', ''),
                    'citations': paper_details.get('num_citations', 0),
                    'journal': paper_details.get('bib', {}).get('venue', '')
                }
                results.append(result)
            
            return results
        except Exception as e:
            print(f"Error searching papers: {str(e)}")
            return []

    @staticmethod
    def get_author_info(author_name: str) -> Dict[str, Any]:
        """
        Get information about an author
        """
        try:
            search_query = scholarly.search_author(author_name)
            author = next(search_query)
            author_details = scholarly.fill(author)
            
            return {
                'name': author_details.get('name', ''),
                'affiliation': author_details.get('affiliation', ''),
                'interests': author_details.get('interests', []),
                'citations': author_details.get('citedby', 0),
                'publications': len(author_details.get('publications', []))
            }
        except Exception as e:
            print(f"Error getting author info: {str(e)}")
            return {}

if __name__ == "__main__":
    # Example usage
    papers = ScholarlyService.search_papers("machine learning")
    print(json.dumps(papers, indent=2))
    
    author = ScholarlyService.get_author_info("Geoffrey Hinton")
    print(json.dumps(author, indent=2)) 