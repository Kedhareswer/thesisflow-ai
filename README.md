# Collaborative Research Hub

A real-time collaborative workspace for research teams. Chat with team members, share documents, and leverage AI assistance for your research projects.

## Features

- Real-time team chat with AI assistance
- Document sharing and collaboration
- Team member management
- Modern, responsive UI
- OpenAI integration for intelligent responses
- Supabase backend for data storage and real-time updates

## Prerequisites

- Node.js 18.x or later
- npm or yarn
- Supabase account
- OpenAI API key

## Environment Setup

Create a `.env.local` file in the root directory with the following variables:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
\`\`\`

## Database Setup

Create the following tables in your Supabase database:

### Team Members Table
\`\`\`sql
create table team_members (
  id uuid default uuid_generate_v4() primary key,
  email text not null unique,
  name text,
  role text not null check (role in ('owner', 'editor')),
  avatar_url text,
  status text not null check (status in ('active', 'invited')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
\`\`\`

### Documents Table
\`\`\`sql
create table documents (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  content text not null,
  author text not null,
  type text not null check (type in ('literature_review', 'methodology', 'research_questions', 'summary', 'framework')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
\`\`\`

## Installation

1. Clone the repository
2. Install dependencies:
   \`\`\`bash
   npm install
   # or
   yarn install
   \`\`\`

3. Run the development server:
   \`\`\`bash
   npm run dev
   # or
   yarn dev
   \`\`\`

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Set up your research team by inviting members via email
2. Create and share documents with your team
3. Use the AI assistant to help with research tasks
4. Collaborate in real-time through the team chat

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
