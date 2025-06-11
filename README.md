# 🚀 AI Project Planner

[![Next.js](https://img.shields.io/badge/Built%20with-Next.js-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Database-Supabase-green?style=flat-square&logo=supabase)](https://supabase.com)
[![OpenAI](https://img.shields.io/badge/AI-OpenAI-lightgrey?style=flat-square&logo=openai)](https://openai.com)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A modern, collaborative research workspace powered by AI that helps teams plan, organize, and execute research projects efficiently. Real-time collaboration meets intelligent assistance to streamline your research workflow.

<p align="center">
  <img src="https://user-images.githubusercontent.com/yourusername/ai-project-planner/assets/project-dashboard.png" alt="AI Project Planner Dashboard" width="800">
</p>

## 🌟 Features

### Core Functionality
- 📊 **Project Management**
  - Kanban-style task boards
  - Progress tracking
  - Deadline management
  - Priority-based task organization

- 🤖 **AI Integration**
  - Automated research planning
  - Literature review assistance
  - Methodology framework generation
  - Mind map creation
  - Note-taking suggestions

- 👥 **Team Collaboration**
  - Real-time document sharing
  - Team chat with AI assistance
  - Multi-user editing
  - Research team management

### Research Tools
- 📝 **Writing Assistant**
  - Research paper structuring
  - Citation management
  - Content suggestions
  - Style improvements

- 📚 **Research Planning**
  - Literature review organization
  - Methodology framework
  - Timeline generation
  - Resource allocation

## 🛠️ Tech Stack

- **Frontend**: Next.js, TypeScript, Tailwind CSS
- **Backend**: Supabase
- **AI Integration**: OpenAI API
- **Real-time**: WebSocket
- **Authentication**: Supabase Auth

## 📋 Prerequisites

- Node.js 18.x or later
- npm or yarn
- Supabase account
- OpenAI API key

## ⚙️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Kedhareswer/ai-project-planner.git
   cd ai-project-planner
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000) in your browser**

## 🔍 Project Structure

```
ai-project-planner/
├── app/
│   ├── components/
│   │   ├── main-nav.tsx
│   │   └── ...
├── components/
│   ├── ai-integration.tsx
│   ├── collaborative-workspace.tsx
│   ├── project-planner.tsx
│   └── projects-overview.tsx
├── public/
├── styles/
├── types/
└── ...
```

## 🎯 Core Features Breakdown

### Project Management
```mermaid
graph TD
    A[Project Creation] --> B[Task Management]
    B --> C[Progress Tracking]
    B --> D[Priority Setting]
    C --> E[Timeline View]
    D --> F[Task Board]
```

### AI Integration
```mermaid
graph LR
    A[User Input] --> B[AI Processing]
    B --> C[Research Planning]
    B --> D[Literature Analysis]
    B --> E[Writing Assistance]
    B --> F[Methodology Generation]
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. Commit your changes
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. Push to the branch
   ```bash
   git push origin feature/amazing-feature
   ```
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org) for the amazing React framework
- [Supabase](https://supabase.com) for the backend infrastructure
- [OpenAI](https://openai.com) for AI capabilities
- [Tailwind CSS](https://tailwindcss.com) for styling

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Kedhareswer">Kedhareswer</a>
</p>
