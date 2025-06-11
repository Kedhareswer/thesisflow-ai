# AI Project Planner 🤖📋

[![TypeScript](https://img.shields.io/badge/TypeScript-97.5%25-blue.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-1.5%25-yellow.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Last Updated](https://img.shields.io/badge/Last%20Updated-2025--06--11-brightgreen.svg)](https://github.com/Kedhareswer/ai-project-planner)
[![Maintainer](https://img.shields.io/badge/Maintainer-@Kedhareswer-blue.svg)](https://github.com/Kedhareswer)

A sophisticated project planning and research management platform powered by multiple AI providers (Gemini, Groq, AIML) to help streamline research projects and task management.

<div align="center">

[Getting Started](#-getting-started) · [Features](#-features) · [Documentation](#-documentation) · [Contributing](#-contributing)

</div>

## 📊 System Architecture

```mermaid
graph TB
    subgraph Frontend
        UI[User Interface]
        RC[React Components]
        HP[Project Handler]
    end
    
    subgraph AI Services
        AIP[AI Provider Service]
        GEM[Gemini]
        GRQ[Groq]
        AIML[AIML]
    end
    
    subgraph State Management
        SM[State Manager]
        WS[WebSocket]
    end
    
    UI --> RC
    RC --> HP
    HP --> SM
    SM --> WS
    HP --> AIP
    AIP --> GEM
    AIP --> GRQ
    AIP --> AIML
    
    style UI fill:#f9f,stroke:#333,stroke-width:2px
    style AIP fill:#bbf,stroke:#333,stroke-width:2px
    style SM fill:#bfb,stroke:#333,stroke-width:2px
```

## 🔄 Project Lifecycle

```mermaid
stateDiagram-v2
    [*] --> ProjectCreation: Initialize
    ProjectCreation --> ProjectPlanning: Setup
    ProjectPlanning --> TaskManagement: Define Tasks
    TaskManagement --> InProgress: Execute
    InProgress --> Review: Complete
    Review --> [*]: Finish
    Review --> TaskManagement: Revise
    
    state ProjectPlanning {
        [*] --> DefineScope
        DefineScope --> SetTimeline
        SetTimeline --> AssignResources
        AssignResources --> [*]
    }
    
    state TaskManagement {
        [*] --> CreateTasks
        CreateTasks --> AssignPriorities
        AssignPriorities --> SetDeadlines
        SetDeadlines --> [*]
    }
```

## 📈 Project Analytics

```mermaid
pie title Project Status Distribution
    "Active" : 40
    "Completed" : 30
    "Planning" : 20
    "On Hold" : 10
```

### Task Distribution

```mermaid
graph LR
    subgraph Task Status
        T[Todo]
        P[In Progress]
        C[Completed]
        B[Blocked]
    end
    
    T --> P
    P --> C
    P --> B
    B --> T
    
    style T fill:#ff9999,stroke:#333,stroke-width:2px
    style P fill:#99ff99,stroke:#333,stroke-width:2px
    style C fill:#9999ff,stroke:#333,stroke-width:2px
    style B fill:#ffff99,stroke:#333,stroke-width:2px
```

### Project Timeline

```mermaid
gantt
    title Project Timeline Overview
    dateFormat YYYY-MM-DD
    
    section Planning
    Project Setup     :a1, 2025-06-01, 7d
    Research Phase    :a2, after a1, 14d
    
    section Development
    Implementation    :a3, after a2, 21d
    Testing          :a4, after a3, 7d
    
    section Deployment
    Final Review     :a5, after a4, 7d
    Launch           :milestone, after a5, 1d
```

## 🤖 AI Integration Architecture

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as AI Service
    participant P as Providers
    
    U->>F: Request Research
    F->>A: Process Request
    A->>P: Query AI Models
    
    par Parallel Processing
        P-->>A: Gemini Response
        P-->>A: Groq Response
        P-->>A: AIML Response
    end
    
    A-->>F: Aggregated Results
    F-->>U: Display Insights
    
    Note over A,P: Multi-provider<br/>processing
```

## 🛠 Technology Stack

```mermaid
graph TD
    subgraph Frontend Layer
        N[Next.js]
        T[TypeScript]
        TW[TailwindCSS]
    end
    
    subgraph Service Layer
        AI[AI Services]
        WS[WebSocket]
        API[API Gateway]
    end
    
    subgraph State Layer
        RS[React State]
        CTX[Context API]
        RED[Reducers]
    end
    
    N --> T
    T --> TW
    N --> RS
    RS --> CTX
    CTX --> RED
    N --> API
    API --> AI
    API --> WS
    
    style N fill:#f9f,stroke:#333,stroke-width:2px
    style AI fill:#bbf,stroke:#333,stroke-width:2px
    style RS fill:#bfb,stroke:#333,stroke-width:2px
```

## 📊 Performance Metrics

```mermaid
graph TB
    subgraph Key Metrics
        PT[Project Tracking]
        TM[Task Management]
        AI[AI Performance]
    end
    
    subgraph Analytics
        CR[Completion Rate]
        TT[Time Tracking]
        AP[AI Precision]
    end
    
    PT --> CR
    TM --> TT
    AI --> AP
    
    style PT fill:#f9f,stroke:#333,stroke-width:2px
    style TM fill:#bbf,stroke:#333,stroke-width:2px
    style AI fill:#bfb,stroke:#333,stroke-width:2px
```

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

### Analytics & Insights
- **Project Analytics**
  - Project completion statistics
  - Task distribution analysis
  - Progress tracking
  - Deadline monitoring

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
```

4. **Set up environment variables**
```env
NEXT_PUBLIC_AI_PROVIDER_KEY=your_api_key
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3000
```

5. **Run the development server**
```bash
npm run dev
```

## 📐 Project Structure

```mermaid
graph TD
    subgraph Root Directory
        Root[ai-project-planner]
        App[app/]
        Comp[components/]
        Lib[lib/]
        Public[public/]
    end
    
    subgraph Application
        App --> Pages[pages/]
        Pages --> Planner[planner/page.tsx]
        Pages --> API[api/]
    end
    
    subgraph Components
        Comp --> AI[enhanced-ai-assistant.tsx]
        Comp --> Socket[socket-provider.tsx]
        Comp --> UI[ui/]
    end
    
    subgraph Libraries
        Lib --> Service[enhanced-ai-service.ts]
        Lib --> Providers[ai-providers.ts]
        Lib --> Utils[utils/]
    end
    
    Root --> App
    Root --> Comp
    Root --> Lib
    Root --> Public
    
    style Root fill:#f9f,stroke:#333,stroke-width:2px
    style App fill:#bbf,stroke:#333,stroke-width:2px
    style Comp fill:#bfb,stroke:#333,stroke-width:2px
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📈 Stats & Metrics

- **Project Status**: Active Development
- **Last Updated**: 2025-06-11 20:11:23 UTC
- **Maintained by**: @Kedhareswer
- **Version**: 1.0.0

## 🙏 Acknowledgments

- All AI providers (Gemini, Groq, AIML) for their powerful APIs
- The open-source community for various tools and libraries
- Contributors and maintainers

---

<div align="center">

**[Documentation](docs/) · [Report Bug](../../issues) · [Request Feature](../../issues)**

</div>

---

<div align="center">
<sub>Last Updated: 2025-06-11 20:11:23 UTC by @Kedhareswer</sub>
</div>
