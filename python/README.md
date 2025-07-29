# Python Backend - Literature Search Services

This directory contains the Python backend services for enhanced literature search functionality.

## Overview

The Python backend provides advanced literature search capabilities through multiple academic APIs and services.

## Files

### Core Application Files

- **`app.py`** - Main Flask application with literature search endpoints
- **`improved_app.py`** - Enhanced version with better error handling and performance
- **`improved_search.py`** - Advanced search functionality with multiple sources
- **`search_papers.py`** - Paper search implementation

### Requirements

- **`requirements.txt`** - Basic dependencies for literature search
- **`requirements-improved.txt`** - Enhanced dependencies with additional features

### Setup

- **`setup.bat`** - Windows setup script for Python environment
- **`README.md`** - This documentation file

## Features

### Literature Search

- **Multi-source search** across academic databases
- **Citation enhancement** with reference data
- **Duplicate removal** across sources
- **Real-time results** with no demo data

### API Endpoints

- `GET /search` - Search papers by query
- `GET /papers` - Get paper details by ID
- `POST /enhance` - Enhance paper with citation data

## Setup Instructions

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements-improved.txt
   ```

2. **For Windows users:**
   ```bash
   setup.bat
   ```

3. **Run the application:**
   ```bash
   python improved_app.py
   ```

## Configuration

The Python backend requires the following environment variables:

- `OPENALEX_API_KEY` - OpenAlex API key (optional)
- `SEMANTIC_SCHOLAR_API_KEY` - Semantic Scholar API key (optional)
- `ARXIV_API_KEY` - arXiv API key (optional)

## Search Sources

- **OpenAlex** - Open academic database
- **Semantic Scholar** - AI-powered research tool
- **arXiv** - Preprint repository
- **White Rose eTheses** - UK thesis repository
- **Manchester Phrasebank** - Academic writing resource

## Output

Search results are stored in `search_output/` directory with JSON format for analysis and debugging.
