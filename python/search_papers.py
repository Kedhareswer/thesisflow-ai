#!/usr/bin/env python
import sys
import json
import subprocess
import tempfile
import os
import shutil

def search_papers(query):
    try:
        # Create a temporary directory for pygetpapers output
        with tempfile.TemporaryDirectory() as temp_dir:
            # Run pygetpapers command
            cmd = [
                "pygetpapers",
                "-q", query,
                "-o", temp_dir,
                "-k", "10",  # Limit to 10 papers
                "-x",  # Get XML for metadata
                "--noexecute"  # Don't download full papers
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                return json.dumps({"error": f"pygetpapers error: {result.stderr}"})
            
            # Process the results
            papers = []
            for folder in os.listdir(temp_dir):
                folder_path = os.path.join(temp_dir, folder)
                if os.path.isdir(folder_path):
                    # Look for the JSON metadata file
                    json_file = os.path.join(folder_path, "eupmc_result.json")
                    if os.path.exists(json_file):
                        with open(json_file, 'r', encoding='utf-8') as f:
                            paper_data = json.load(f)
                            if paper_data:
                                paper = {
                                    "id": paper_data.get("id", ""),
                                    "title": paper_data.get("title", ""),
                                    "authors": [author.get("name", "") for author in paper_data.get("authors", [])],
                                    "abstract": paper_data.get("abstract", ""),
                                    "year": paper_data.get("pubYear", ""),
                                    "url": paper_data.get("doi", ""),
                                    "citations": paper_data.get("citedByCount", 0),
                                    "journal": paper_data.get("journalTitle", "")
                                }
                                papers.append(paper)
            
            return json.dumps(papers)
    
    except Exception as e:
        return json.dumps({"error": str(e)})

if __name__ == "__main__":
    if len(sys.argv) > 1:
        query = sys.argv[1]
        result = search_papers(query)
        print(result)
    else:
        print(json.dumps({"error": "No query provided"}))
