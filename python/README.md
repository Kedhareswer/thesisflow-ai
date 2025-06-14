# pygetpapers Integration for Literature Review

This directory contains the Python backend service that integrates pygetpapers for literature review functionality in the AI Project Planner.

## Setup Instructions

1. Make sure you have Python 3.7+ installed on your system
2. Run the setup script:
   \`\`\`
   setup.bat
   \`\`\`
   This will install all required dependencies.

## Running the Service

1. Start the Python backend service:
   \`\`\`
   python app.py
   \`\`\`
   This will start the Flask server on port 5000.

2. Keep this service running while using the Literature Review functionality in the AI Project Planner.

## How It Works

The Python service uses pygetpapers to search for academic papers based on your query. The results are then formatted and returned to the Next.js frontend for display.

## Troubleshooting

If you encounter any issues:
- Make sure Python is installed and in your PATH
- Check that all dependencies were installed correctly
- Verify that port 5000 is not being used by another application
