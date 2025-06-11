from flask import Flask, jsonify, request
from flask_cors import CORS
import subprocess
import json
import os
import tempfile
import shutil

app = Flask(__name__)
CORS(app)

@app.route('/api/search/papers', methods=['GET'])
def search_papers():
    query = request.args.get('query')
    if not query:
        return jsonify({"error": "Query parameter is required"}), 400
    
    try:
        # Create a temporary directory for pygetpapers output
        with tempfile.TemporaryDirectory() as temp_dir:
            # Run pygetpapers command
            cmd = [
                "pygetpapers",
                "-q", query,
                "-o", temp_dir,
                "-k", "10",  # Limit to 10 papers
                "-x", "xml",  # Get XML for metadata
                "--noexecute",  # Don't download full papers
                "-j"  # Output JSON
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                return jsonify({"error": f"pygetpapers error: {result.stderr}"}), 500
            
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
            
            return jsonify(papers)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
