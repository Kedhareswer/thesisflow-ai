# Contributing to AI Project Planner

Thank you for your interest in contributing to **AI Project Planner**! 🎉  
We welcome contributions from everyone—whether you're a seasoned developer, researcher, or new to open source.

Please read this guide to make your contribution process smooth and effective.

---

## Table of Contents

- [How to Contribute](#how-to-contribute)
- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Code Standards](#code-standards)
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

- **Code Improvements:** Bug fixes, new features, performance improvements.
- **Documentation:** Improve guides, fix typos, write tutorials.
- **Testing:** Report bugs, write tests, verify fixes.
- **Design:** UI/UX improvements, mockups, accessibility.
- **Community:** Answer questions, share feedback, help triage issues.
- **Research:** Suggest new AI features, research integrations, or academic sources.

---

## Development Setup

### Prerequisites

- **Node.js** 18.0+
- **Python** 3.7+ (for literature search backend)
- **pnpm** (package manager)
- **Supabase** account (for database & auth)
- **JRE** (for pygetpapers)

### Install Dependencies

```bash
pnpm install
```

### Configure Environment

Copy the template and adjust as needed:
```bash
cp env.template .env.local
```

### Python Backend

```bash
cd python
./setup.sh       # or setup.bat for Windows
```

### Database Migration

```bash
node scripts/run-migration.js
```

### Run Development Environment

```bash
pnpm dev:all
# Or run frontend/backend individually as needed
```

---

## Code Standards

- **Languages:** TypeScript (main), Python (backend), SQL (Supabase)
- **Linting:** Use ESLint and Prettier (`pnpm lint` and `pnpm format`)
- **Framework:** Next.js (App Router), React 19, TailwindCSS, Zustand, Radix UI
- **Testing:** Add or update tests as needed
- **Docs:** Use JSDoc for functions and add meaningful comments
- **Error Handling:** Always include proper error boundaries and messages
- **Naming:** Use descriptive variable and function names

---

## Pull Request Process

1. **Keep PRs focused**: One feature/fix per PR.
2. **Describe your changes**: Use the PR template to explain what and why.
3. **Link related issues**: Mention relevant issues (e.g., `Closes #123`).
4. **Update docs/tests**: If your change affects docs or code behavior, update them.
5. **Request review**: Tag relevant maintainers or contributors for review.
6. **CI/CD**: Ensure your PR passes all automated checks.

---

## Issue Reporting

- **Search first**: Avoid duplicates by searching [existing issues](https://github.com/Kedhareswer/ai-project-planner/issues).
- **Be descriptive**: Include steps to reproduce, expected vs. actual behavior, screenshots/logs if possible.
- **Use labels**: Suggest appropriate labels (bug, enhancement, question, etc.)
- **Feature requests**: Clearly describe the desired feature and its use case.

---

## Commit Message Guidelines

- Use present tense (e.g., "Add feature", not "Added feature")
- Be concise but descriptive
- Format example:
  ```
  fix(planner): handle empty project names
  feat(ai): add Gemini provider for summarization
  docs(readme): update getting started section
  refactor(components): split Chat and ChatList
  ```

---

## Community and Support

- **Bugs / Features:** [GitHub Issues](https://github.com/Kedhareswer/ai-project-planner/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Kedhareswer/ai-project-planner/discussions)
- **Contact Maintainers:** See repository profile or open an issue

---

## Acknowledgements

- Inspired by the open-source community and research collaborators.
- Special thanks to all contributors, reviewers, and users!

---

*Happy coding! 🚀*  
— The Bolt Research Hub Team
