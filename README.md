# AI Project Planner 🤖📋

[![TypeScript](https://img.shields.io/badge/TypeScript-97.5%25-blue.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-1.5%25-yellow.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A sophisticated project planning and research management platform powered by multiple AI providers (Gemini, Groq, AIML) to help streamline research projects and task management.

## 🌟 Features

### Project Management
- **Project Organization**
  - Create and manage multiple research projects
  - Track project progress and deadlines
  - Set project start and end dates
  - Monitor project completion status

### Task Management
- **Comprehensive Task Tracking**
  - Create and assign tasks within projects
  - Set task priorities and deadlines
  - Track estimated hours for tasks
  - Monitor task status (Todo, In Progress, Completed)
  - Visual progress indicators

### AI-Powered Research Assistant
- **Multi-Provider AI Integration**
  - Support for multiple AI providers (Gemini, Groq, AIML)
  - Compare responses across different AI models
  - Advanced AI configuration options

- **Research Tools**
  - Generate research suggestions
  - Analyze research gaps
  - Generate methodology advice
  - Text summarization
  - Research idea generation

### Analytics & Insights
- **Project Analytics**
  - Project completion statistics
  - Task distribution analysis
  - Progress tracking
  - Deadline monitoring

## 📊 Dashboard Overview

```
Project Statistics
├── Total Projects
├── Active Projects
├── Completed Projects
└── Average Completion Rate

Task Metrics
├── Total Tasks
├── Task Status Distribution
├── Priority Distribution
└── Upcoming Deadlines
```

## 🛠 Technology Stack

- **Frontend**: Next.js, TypeScript, TailwindCSS
- **AI Integration**: Multiple AI Provider Support
- **State Management**: React Hooks
- **Real-time Updates**: WebSocket Integration
- **UI Components**: Custom Components with Tailwind

## 🚀 Getting Started

1. **Clone the repository**
```bash
git clone https://github.com/Kedhareswer/ai-project-planner.git
cd ai-project-planner
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env.local
# Add your AI provider API keys and other configuration
```

4. **Run the development server**
```bash
npm run dev
```

## 📐 Project Structure

```
ai-project-planner/
├── app/
│   └── planner/
│       └── page.tsx       # Main planner interface
├── components/
│   ├── enhanced-ai-assistant.tsx
│   └── socket-provider.tsx
├── lib/
│   ├── enhanced-ai-service.ts
│   └── ai-providers.ts
└── public/
```

## 🎯 Key Features in Detail

### Project Management
- Create and manage research projects with detailed information
- Track project progress with visual indicators
- Set project timelines and deadlines
- Monitor project status and completion rates

### Task Management
- Create tasks with priorities and deadlines
- Track task status and progress
- Estimate task duration
- Monitor task dependencies
- View upcoming deadlines

### AI Research Assistant
- Generate research suggestions
- Analyze research gaps
- Provide methodology advice
- Compare results across AI providers
- Generate research ideas
- Summarize research content

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- All AI providers (Gemini, Groq, AIML) for their powerful APIs
- The open-source community for various tools and libraries used in this project

---

<div align="center">

**[Documentation](docs/) · [Report Bug](../../issues) · [Request Feature](../../issues)**

</div>
