# INJA.ONLINE - AI-Powered Web Builder

A minimalist, AI-powered web development platform that transforms natural language descriptions into fully functional HTML websites. Built with SvelteKit 5 and powered by the Cerebras API for ultra-fast AI inference.


<a href="https://www.youtube.com/watch?v=XMm-aPl9zYQ">
  <img src="https://img.youtube.com/vi/XMm-aPl9zYQ/hqdefault.jpg" style="width: 100%;" alt="Watch the demo"/>
</a>




## 🌟 Overview

BUILDER.INJA.ONLINE is an innovative web builder that leverages artificial intelligence to generate complete, responsive HTML websites from simple text descriptions. Users can describe their vision in plain English, and the AI will create a fully functional website using modern web technologies like Alpine.js, Tailwind CSS, and Lucide Icons.

### Key Features

- **Natural Language to Code**: Describe your website idea and get a complete HTML implementation
- **Real-time Preview**: See your generated website live in a split-panel interface
- **Chat-based Interface**: Iterative development through conversational AI
- **Modern Tech Stack**: Generated websites use Alpine.js, Tailwind CSS, and Lucide Icons
- **Minimalist Design**: Clean, dark-themed UI following modern design principles
- **Instant Deployment**: Fast generation powered by Cerebras API

## 🚀 How It Works

1. **Describe Your Vision**: Enter a natural language description of the website you want to build
2. **AI Generation**: The Cerebras-powered AI analyzes your request and generates clean HTML code
3. **Live Preview**: View your website in real-time with a responsive preview panel
4. **Iterate & Refine**: Chat with the AI to make modifications and improvements
5. **Export**: Get the complete HTML file ready for deployment

### Technology Stack

**Frontend:**
- SvelteKit 5 with TypeScript
- Tailwind CSS 4.0 for styling
- Lucide Svelte for icons
- Vite for build tooling

**Backend:**
- SvelteKit API routes
- Cerebras API integration via OpenRouter
- Server-side rendering

**Generated Websites Use:**
- Alpine.js for interactivity
- Tailwind CSS for styling (CDN)
- Lucide Icons for iconography
- Responsive design principles

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ 
- npm, pnpm, or yarn
- Cerebras API key (via OpenRouter)

### Installation

1. Clone the repository:
```bash
git clone git@github.com:inja-online/inja-builder.git
cd inja-builder
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create a .env file with your API key
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

### Deployment

The project is configured for Cloudflare Pages deployment:

```bash
npm run deploy
```

## 🎨 Design Philosophy

The application follows a minimalist, dark-themed aesthetic emphasizing:

- **Clarity**: Clean, uncluttered interface focused on functionality
- **Modern Feel**: Contemporary design patterns and smooth interactions
- **Accessibility**: High contrast, readable typography using Inter font
- **Consistency**: Unified component styling with subtle visual feedback

### Color Palette

- Background: Dark zinc and near-black tones
- Accents: Subtle zinc variations for borders and highlights
- Text: White and muted gray for optimal readability
- Interactive elements: Smooth transitions and hover states

## 🏗️ Project Structure

```
src/
├── lib/
│   ├── components/           # Reusable Svelte components
│   │   ├── chat/            # Chat interface components
│   │   │   ├── ChatLayout.svelte
│   │   │   ├── ChatMessage.svelte
│   │   │   └── messages/    # Message type components
│   │   ├── Header.svelte
│   │   └── MainPageInput.svelte
│   ├── server/              # Server-side utilities
│   │   ├── handler/         # API handlers
│   │   └── prompts.server.ts # AI prompts and configuration
│   ├── api.ts              # Client-side API utilities
│   └── types.ts            # TypeScript type definitions
├── routes/
│   ├── +page.svelte        # Landing page
│   ├── api/chat/           # Chat API endpoint
│   └── s/[id]/             # Dynamic chat session pages
└── static/                 # Static assets
```

## 🤖 AI System

The AI system is designed to generate high-quality, production-ready HTML websites with the following capabilities:

### Core Technologies Generated
- **Alpine.js**: For client-side interactivity and state management
- **Tailwind CSS**: For responsive, utility-first styling
- **Lucide Icons**: For consistent, modern iconography
- **Single-file Architecture**: Complete, self-contained HTML documents

### AI Prompt Engineering
The system uses carefully crafted prompts that:
- Enforce minimalist, shadcn/ui-inspired design patterns
- Ensure responsive, accessible layouts
- Generate clean, semantic HTML
- Include proper CDN loading for all dependencies

### Quality Assurance
- HTML extraction and validation
- Error handling and graceful fallbacks
- Consistent component structure
- Modern web standards compliance

## 🔧 API Integration

### Chat API Endpoint (`/api/chat`)

Accepts POST requests with:
```typescript
{
  systemPrompt?: string;
  systemPromptName?: string;
  chatHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}
```

Returns:
```typescript
{
  success: boolean;
  content: string;        // Extracted HTML
  rawContent: string;     // Full AI response
  fullResponse: object;   // Complete API response
}
```

### Cerebras Integration

The application uses the Cerebras API through OpenRouter for:
- Ultra-fast inference times
- High-quality code generation
- Reliable, consistent outputs
- Cost-effective AI processing

## 🎯 Use Cases

- **Rapid Prototyping**: Quickly create website mockups and prototypes
- **Learning Tool**: Understand modern web development patterns
- **Design Exploration**: Experiment with different layouts and styles
- **Client Presentations**: Generate quick demos for client meetings
- **Educational Content**: Create examples for web development tutorials

## 🚦 Getting Started

1. **Visit the Homepage**: Start with a simple description of your website idea
2. **Be Specific**: The more detailed your description, the better the output
3. **Iterate**: Use the chat interface to refine and improve your website
4. **Export**: Copy the generated HTML for use in your projects

### Example Prompts

- "Create a landing page for a modern SaaS product with hero section, features, and pricing"
- "Build a portfolio website for a photographer with image gallery and contact form"
- "Generate a dashboard layout with sidebar navigation and data visualization cards"

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🔗 Links

- **Live Demo**: [INJA.ONLINE](https://builder.inja.online)
- **Cerebras API**: Learn more about the AI provider powering this platform
- **SvelteKit**: The full-stack framework used for development
