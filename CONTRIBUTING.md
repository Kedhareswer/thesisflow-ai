# Contributing to AI Project Planner

Thank you for your interest in contributing to **Bolt Research Hub**! 🎉  
We welcome contributions from everyone—whether you're a seasoned developer, researcher, or new to open source.

Please read this guide to make your contribution process smooth and effective.

---

## Table of Contents

- [How to Contribute](#how-to-contribute)
- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Code Standards](#code-standards)
- [Project Architecture](#project-architecture)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Community and Support](#community-and-support)
- [Acknowledgements](#acknowledgements)

---

## How to Contribute

1. **Fork** the repository.
2. **Clone** your fork:
   ```bash
   git clone https://github.com/<your-username>/ai-project-planner.git
   cd ai-project-planner
   ```
3. **Create a branch** for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** and commit them.
5. **Push** your branch to your fork.
6. **Open a Pull Request** against the `master` branch of this repo.

---

## Code of Conduct

This project adheres to the [Contributor Covenant](https://www.contributor-covenant.org/).  
By participating, you are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Ways to Contribute

### Core Development Areas

- **AI Integration:** Enhance AI provider support, improve prompt engineering, add new AI features
- **Literature Search:** Improve multi-source search, add new academic databases, enhance citation handling
- **Collaboration Features:** Real-time editing, team management, file sharing improvements
- **UI/UX:** Component improvements, accessibility enhancements, responsive design
- **Backend Services:** API optimization, database schema improvements, performance enhancements

### Documentation & Testing

- **Documentation:** Improve guides, fix typos, write tutorials, update API docs
- **Testing:** Write unit tests, integration tests, end-to-end tests
- **Bug Reports:** Report bugs with detailed reproduction steps
- **Feature Requests:** Suggest new features with clear use cases

### Research & Academic

- **Research Tools:** Suggest new academic sources, improve literature search algorithms
- **Citation Management:** Enhance citation formats, add new academic styles
- **Writing Tools:** Improve academic writing assistance, add new templates

---

## Development Setup

### Prerequisites

- **Node.js** 18.0+ (required for Next.js 15.2.4)
- **Python** 3.7+ (for literature search backend)
- **pnpm** (package manager - preferred over npm)
- **Supabase** account (for database & authentication)
- **Git** (for version control)

### Quick Start

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/Kedhareswer/ai-project-planner.git
   cd ai-project-planner
   pnpm install
   ```

2. **Configure environment:**
   ```bash
   cp env.template .env.local
   ```
   Edit `.env.local` with your configuration (see [Environment Setup](#environment-setup))

3. **Set up database:**
   ```bash
   node scripts/run-migration.js
   ```

4. **Start development servers:**
   ```bash
   node start-dev.js
   # or individually:
   # pnpm dev (Next.js frontend)
   # node server.js (WebSocket server)
   ```

### Environment Setup

#### Required Environment Variables

**Supabase (Required):**
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**AI Providers (At least one required):**
```bash
# OpenAI (Recommended)
OPENAI_API_KEY=your_openai_api_key

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key

# Groq (Fast and cost-effective)
GROQ_API_KEY=your_groq_api_key

# Anthropic (High-quality reasoning)
ANTHROPIC_API_KEY=your_anthropic_api_key

# Mistral AI (Fast and efficient)
MISTRAL_API_KEY=your_mistral_api_key

# AIML API (Additional provider)
AIML_API_KEY=your_aiml_api_key
```

**Real-time Features:**
```bash
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
WEBSOCKET_PORT=3001
```

### Python Backend Setup

For literature search features:

```bash
cd python
# Install dependencies
pip install -r requirements-improved.txt

# For Windows users
setup.bat

# Run the backend
python improved_app.py
```

### Database Setup

Run the database migration script to set up all required tables:

```bash
node scripts/run-migration.js
```

This will create:
- User authentication tables
- Team collaboration tables
- API key management tables
- Research session tables
- File storage tables

---

## Code Standards

### Technology Stack

- **Frontend:** Next.js 15.2.4 (App Router), React 19, TypeScript 5
- **Styling:** TailwindCSS 3.4, Radix UI components
- **State Management:** Zustand, React Context
- **Forms:** React Hook Form, Zod validation
- **Backend:** Next.js API Routes, Supabase (PostgreSQL)
- **Real-time:** Socket.io 4.8.1
- **AI Integration:** Multiple providers (OpenAI, Gemini, Groq, Anthropic, Mistral)
- **File Processing:** PDF, DOCX, TXT support with Mammoth and pdf-parse

### Code Style Guidelines

- **TypeScript:** Strict mode enabled, proper type definitions
- **Components:** Functional components with hooks, proper prop types
- **Styling:** TailwindCSS classes, component variants with CVA
- **State:** Zustand for global state, React Context for theme/auth
- **Error Handling:** Try-catch blocks, error boundaries, user-friendly messages
- **Performance:** Lazy loading, code splitting, proper memoization

### File Structure Conventions

```
app/                    # Next.js App Router pages
  api/                  # API routes
  [feature]/            # Feature-specific pages
components/             # Reusable UI components
  ui/                   # Base UI components (Radix)
  animate-ui/           # Animated components
  auth/                 # Authentication components
  forms/                # Form components
lib/                    # Core utilities and services
  services/             # Business logic services
  utils/                # Utility functions
  hooks/                # Custom React hooks
  types/                # TypeScript type definitions
scripts/                # Database and setup scripts
python/                 # Python backend services
```

### Linting and Formatting

```bash
# Lint code
pnpm lint

# Format code (if Prettier is configured)
pnpm format

# Type checking
pnpm type-check
```

---

## Project Architecture

### Core Features

1. **Enhanced Literature Search**
   - Multi-source academic search (OpenAlex, Semantic Scholar, arXiv, White Rose, Manchester)
   - Sci-Hub integration for paper access
   - Citation enhancement and duplicate removal
   - Real-time results with no demo data

2. **AI-Powered Tools**
   - Multi-provider AI support (OpenAI, Gemini, Groq, Anthropic, Mistral)
   - Document summarization with multiple styles
   - AI writing assistant with academic templates
   - Grammar and style checking

3. **Collaboration Features**
   - Real-time team collaboration
   - File sharing and version control
   - Role-based permissions
   - Cloud integrations (Google Drive, GitHub, etc.)

4. **Research Management**
   - Project planning and task management
   - Research session tracking
   - Citation management
   - Academic writing tools

### Key Components

- **`lib/enhanced-ai-service.ts`** - Multi-provider AI service
- **`lib/ai-providers.ts`** - AI provider configurations
- **`app/explorer/enhanced-search.ts`** - Literature search engine
- **`components/enhanced-ai-assistant.tsx`** - AI assistant interface
- **`app/api/`** - API routes for all features
- **`server.js`** - WebSocket server for real-time features

### Database Schema

- **User Management:** Authentication, profiles, settings
- **Team Collaboration:** Teams, members, permissions, chat
- **Research Data:** Sessions, papers, citations, files
- **AI Integration:** API keys, provider configurations
- **Real-time:** Presence, notifications, live updates

---

## Pull Request Process

1. **Keep PRs focused**: One feature/fix per PR
2. **Describe your changes**: Use the PR template to explain what and why
3. **Link related issues**: Mention relevant issues (e.g., `Closes #123`)
4. **Update docs/tests**: If your change affects docs or code behavior, update them
5. **Request review**: Tag relevant maintainers or contributors for review
6. **CI/CD**: Ensure your PR passes all automated checks

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Refactoring

## Testing
- [ ] Tested locally
- [ ] Added/updated tests
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

---

## Issue Reporting

### Bug Reports

- **Search first**: Avoid duplicates by searching [existing issues](https://github.com/Kedhareswer/ai-project-planner/issues)
- **Be descriptive**: Include steps to reproduce, expected vs. actual behavior
- **Include details**: Browser, OS, error messages, screenshots
- **Use labels**: Suggest appropriate labels (bug, enhancement, question, etc.)

### Feature Requests

- **Clear description**: Explain the desired feature and its use case
- **Research context**: How does it fit into the research workflow?
- **Implementation ideas**: Suggest possible approaches if you have ideas
- **Priority**: Indicate if it's a nice-to-have or critical feature

### Issue Template

```markdown
## Summary
Brief description of the issue

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., Windows 11]
- Browser: [e.g., Chrome 120]
- Node.js: [e.g., 18.17.0]

## Additional Context
Any other context, logs, or screenshots
```

---

## Commit Message Guidelines

### Format
```
type(scope): description

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples
```
feat(ai): add Mistral AI provider support
fix(explorer): handle empty search results properly
docs(readme): update getting started section
refactor(components): split Chat and ChatList components
test(api): add tests for literature search endpoints
chore(deps): update dependencies to latest versions
```

### Scope Examples
- `ai`: AI-related features
- `explorer`: Literature search features
- `collaboration`: Team collaboration features
- `writer`: Writing tools
- `summarizer`: Document summarization
- `api`: API routes
- `components`: UI components
- `docs`: Documentation

---

## Community and Support

### Getting Help

- **GitHub Issues**: [Report bugs and request features](https://github.com/Kedhareswer/ai-project-planner/issues)
- **GitHub Discussions**: [Ask questions and share ideas](https://github.com/Kedhareswer/ai-project-planner/discussions)
- **Documentation**: Check the [README.md](README.md) for setup and usage guides

### Contributing Guidelines

- **Be respectful**: Follow the Code of Conduct
- **Help others**: Answer questions, review PRs, share knowledge
- **Stay updated**: Watch the repository for new issues and discussions
- **Share feedback**: Let us know what works and what doesn't

### Development Workflow

1. **Fork and clone** the repository
2. **Create a feature branch** from master
3. **Make your changes** following the code standards
4. **Test thoroughly** before submitting
5. **Submit a PR** with clear description
6. **Respond to feedback** and iterate if needed

---

## Acknowledgements

### Core Technologies

- [Next.js](https://nextjs.org/) - The React Framework for Production
- [Supabase](https://supabase.io/) - The Open Source Firebase Alternative
- [Radix UI](https://www.radix-ui.com/) - Low-level UI Primitives
- [TailwindCSS](https://tailwindcss.com/) - Utility-First CSS Framework
- [Socket.io](https://socket.io/) - Real-time Communication Engine

### AI Providers

- [OpenAI](https://openai.com/) - GPT models for text generation
- [Google Gemini](https://ai.google.dev/) - Multimodal AI capabilities
- [Groq](https://groq.com/) - Fast inference API
- [Anthropic](https://www.anthropic.com/) - Claude models for reasoning
- [Mistral AI](https://mistral.ai/) - Efficient AI models

### Literature Search Sources

- [OpenAlex](https://openalex.org/) - Open academic database
- [Semantic Scholar](https://www.semanticscholar.org/) - AI-powered research tool
- [arXiv](https://arxiv.org/) - Preprint repository
- [White Rose eTheses](https://etheses.whiterose.ac.uk/) - UK thesis repository
- [Manchester Phrasebank](https://www.phrasebank.manchester.ac.uk/) - Academic writing resource

### Special Thanks

- Research community for feedback and testing
- Open source contributors and maintainers
- AI provider communities for API access
- Academic institutions for research resources

---

*Happy coding! 🚀*  
— The Bolt Research Hub Team
