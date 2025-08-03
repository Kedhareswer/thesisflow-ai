import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Info, Brain, BookOpen, Lightbulb, Settings } from 'lucide-react'
import { useResearchSession, useResearchContext } from '@/components/research-session-provider'
import { UserProfileAvatar } from '@/components/user-profile-avatar'
import { ToggleGroup, ToggleGroupItem } from '@/components/animate-ui/base/toggle-group'
import { IconButton } from '@/components/animate-ui/buttons/icon'
import { Smile, User as UserIcon, Zap, MessageCircle } from 'lucide-react'
import { EnhancedChat } from '@/components/ui/enhanced-chat'
import { ChatMessage } from '@/components/ui/chat-bubble'

interface Personality {
  key: string;
  name: string;
  description: string;
  icon: any;
  color: [number, number, number];
  systemPrompt: string;
}

interface ResearchChatbotProps {
  topic?: string
  papers?: any[]
  ideas?: string
  context?: string
  personality?: Personality
}

// Personalities definition
const PERSONALITIES: Personality[] = [
  {
    key: 'friendly',
    name: 'Friendly',
    description: 'Warm, supportive, and encouraging.',
    icon: Smile,
    color: [34,197,94],
    systemPrompt: 'You are a warm, supportive, and encouraging assistant. Use friendly language and positive reinforcement.'
  },
  {
    key: 'formal',
    name: 'Formal',
    description: 'Professional, precise, and neutral.',
    icon: UserIcon,
    color: [59,130,246],
    systemPrompt: 'You are a professional, precise, and neutral assistant. Use formal language and maintain objectivity.'
  },
  {
    key: 'motivational',
    name: 'Motivational',
    description: 'Energetic, inspiring, and positive.',
    icon: Zap,
    color: [245,158,11],
    systemPrompt: 'You are an energetic, inspiring, and positive assistant. Motivate the user and encourage progress.'
  },
  {
    key: 'critical',
    name: 'Critical',
    description: 'Analytical, direct, and honest.',
    icon: Brain,
    color: [239,68,68],
    systemPrompt: 'You are an analytical, direct, and honest assistant. Provide critical feedback and point out flaws constructively.'
  },
  {
    key: 'playful',
    name: 'Playful',
    description: 'Fun, witty, and creative.',
    icon: MessageCircle,
    color: [168,85,247],
    systemPrompt: 'You are a fun, witty, and creative assistant. Use playful language and humor when appropriate.'
  },
]

export function ResearchChatbot({ topic, papers, ideas, context, personality: initialPersonality }: ResearchChatbotProps) {
  const { 
    session, 
    addChatMessage, 
    buildResearchContext
  } = useResearchSession()
  const { hasContext, contextSummary, currentTopic } = useResearchContext()
  
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Initialize with session chat history or default message
    if (session.chatHistory.length > 0) {
      return session.chatHistory.map((msg, index) => ({
        id: `msg-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        status: 'sent' as const
      }))
    }
    
    return [{
      id: `msg-${Date.now()}-welcome-${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant' as const,
      content: "Hello! I'm your AI research assistant. I can help you with your research questions, analyze papers and provide insights. What would you like to explore today?",
      timestamp: new Date(),
      status: 'sent' as const
    }]
  })

  const [selectedPersonality, setSelectedPersonality] = useState<string>(initialPersonality?.key || 'friendly')
  const [isLoading, setIsLoading] = useState(false)
  const [useFullContext, setUseFullContext] = useState(true)

  const selectedPersonalityData = PERSONALITIES.find(p => p.key === selectedPersonality) || PERSONALITIES[0]

  // Enhanced response generation function
  const generateEnhancedResponse = (userMessage: string, context: string, personality: Personality): string => {
    const message = userMessage.toLowerCase()
    
    // Research-specific responses
    if (message.includes('explore') || message.includes('further') || message.includes('more')) {
      return `Great! Let's dive deeper into your research on deep learning in medical imaging. Based on your selected papers, here are some key areas we can explore:

**1. Technical Approaches**
- Convolutional Neural Networks (CNNs) for image classification
- Transfer learning from pre-trained models
- Attention mechanisms for better feature extraction

**2. Medical Applications**
- MRI analysis and interpretation
- CT scan processing
- X-ray image enhancement
- Pathology slide analysis

**3. Current Challenges**
- Limited annotated medical datasets
- Model interpretability in clinical settings
- Real-time processing requirements
- Regulatory compliance for medical AI

**4. Research Opportunities**
- Multi-modal fusion (combining different imaging types)
- Federated learning for privacy-preserving collaboration
- Explainable AI for clinical decision support

Would you like me to elaborate on any of these areas or help you formulate specific research questions?`
    }
    
    if (message.includes('method') || message.includes('approach') || message.includes('technique')) {
      return `Based on your research context, here are the key methodological approaches in deep learning for medical imaging:

**Convolutional Neural Networks (CNNs)**
- 2D CNNs for slice-based analysis
- 3D CNNs for volumetric data processing
- ResNet, DenseNet, and EfficientNet architectures

**Transfer Learning**
- Pre-training on large datasets (ImageNet)
- Fine-tuning on medical datasets
- Domain adaptation techniques

**Attention Mechanisms**
- Self-attention for capturing long-range dependencies
- Cross-attention for multi-modal fusion
- Vision transformers (ViT) for medical images

**Data Augmentation**
- Geometric transformations
- Intensity variations
- Synthetic data generation

**Evaluation Metrics**
- Dice coefficient for segmentation
- AUC-ROC for classification
- Hausdorff distance for boundary accuracy

Which methodological aspect would you like to explore further?`
    }
    
    if (message.includes('challenge') || message.includes('problem') || message.includes('issue')) {
      return `Excellent question! Here are the major challenges in deep learning for medical imaging:

**Data-Related Challenges**
- Limited annotated datasets
- Class imbalance in medical conditions
- Privacy and regulatory constraints
- Multi-institutional data sharing

**Technical Challenges**
- Model interpretability for clinical use
- Real-time processing requirements
- Robustness to image quality variations
- Generalization across different populations

**Clinical Integration Challenges**
- Regulatory approval (FDA, CE marking)
- Clinical workflow integration
- Physician acceptance and trust
- Cost-effectiveness validation

**Research Gaps**
- Long-term model performance
- Multi-modal data fusion
- Causal inference in medical AI
- Ethical considerations

Would you like to focus on any specific challenge for your research?`
    }
    
    if (message.includes('future') || message.includes('trend') || message.includes('direction')) {
      return `Here are the emerging trends and future directions in deep learning for medical imaging:

**Emerging Technologies**
- Vision Transformers (ViT) for medical images
- Contrastive learning for self-supervised training
- Federated learning for privacy-preserving collaboration
- Neural architecture search (NAS) for optimal models

**Clinical Applications**
- Point-of-care diagnostics
- Personalized medicine
- Predictive analytics for disease progression
- Automated treatment planning

**Research Frontiers**
- Multi-modal fusion (imaging + clinical data)
- Causal inference in medical AI
- Explainable AI for clinical decision support
- Real-time processing for emergency care

**Industry Trends**
- AI-powered medical devices
- Cloud-based diagnostic platforms
- Mobile health applications
- Integration with electronic health records

What specific future direction interests you most?`
    }
    
    // Default response with personality
    const personalityResponses = {
      friendly: `Thank you for your question about "${userMessage}"! I'm excited to help you explore this topic. Based on your research context, I can see you're working on deep learning in medical imaging, which is such a fascinating and impactful area. Let me share some insights that might be helpful for your research journey.`,
      formal: `I've analyzed your query regarding "${userMessage}" in the context of your research on deep learning in medical imaging. Based on the available literature and your current research focus, I can provide the following insights.`,
      motivational: `What an excellent question about "${userMessage}"! Your research in deep learning for medical imaging has incredible potential to transform healthcare. Let me share some inspiring insights that could help advance your work.`,
      critical: `Your question about "${userMessage}" raises important considerations for deep learning in medical imaging. Let me provide a critical analysis of the current state and identify key areas that need attention.`,
      playful: `Oh, "${userMessage}" - that's a fun one to explore! Your deep learning medical imaging research is like solving a really cool puzzle. Let me share some interesting insights that might spark some creative ideas!`
    }
    
    return personalityResponses[personality.key as keyof typeof personalityResponses] || personalityResponses.friendly
  }

  const buildPromptContext = () => {
    const contextParts: string[] = []
    
    if (useFullContext && hasContext) {
      contextParts.push(`Research Context: ${contextSummary}`)
      
      if (session.selectedPapers.length > 0) {
        const selectedPaperObjects = session.papers.filter(p => session.selectedPapers.includes(p.id))
        const paperTitles = selectedPaperObjects.map(p => p.title || 'Untitled').join(', ')
        contextParts.push(`Selected Papers: ${paperTitles}`)
      }
      
      if (session.selectedIdeas.length > 0) {
        const selectedIdeaObjects = session.ideas.filter(i => session.selectedIdeas.includes(i.id))
        const ideaTitles = selectedIdeaObjects.map(i => i.title || 'Untitled').join(', ')
        contextParts.push(`Research Ideas: ${ideaTitles}`)
      }
    }
    
    if (topic) {
      contextParts.push(`Current Topic: ${topic}`)
    }
    
    return contextParts.join('\n')
  }

  const handleSendMessage = async (message: string) => {
    setIsLoading(true)
    
    try {
             // Add user message to chat
       const userMessage: ChatMessage = {
         id: `msg-${Date.now()}-user-${Math.random().toString(36).substr(2, 9)}`,
         role: 'user',
         content: message,
         timestamp: new Date(),
         status: 'sent'
       }
      
      setMessages(prev => [...prev, userMessage])
      
      // Add to research session
      addChatMessage('user', message)
      
      // Build context for AI
      const context = buildPromptContext()
      const personalityPrompt = selectedPersonalityData.systemPrompt
      
             // Enhanced AI response generation
       setTimeout(() => {
         const aiResponse = generateEnhancedResponse(message, context, selectedPersonalityData)
         
         const aiMessage: ChatMessage = {
           id: `msg-${Date.now()}-ai-${Math.random().toString(36).substr(2, 9)}`,
           role: 'assistant',
           content: aiResponse,
           timestamp: new Date(),
           status: 'sent'
         }
         
         setMessages(prev => [...prev, aiMessage])
         addChatMessage('assistant', aiResponse)
         setIsLoading(false)
       }, 2000)
      
    } catch (error) {
      console.error('Error sending message:', error)
      setIsLoading(false)
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="flex-1 p-0 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Brain className="h-5 w-5 text-primary" />
              </div>
    <div>
                <h3 className="font-semibold">Research Assistant</h3>
                <p className="text-sm text-muted-foreground">
                  Get AI-powered assistance for your research questions
                </p>
              </div>
            </div>
            
      {/* Personality Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Personality:</span>
        <ToggleGroup
          value={[selectedPersonality]}
                 onValueChange={(value) => {
                   if (value && value.length > 0) setSelectedPersonality(value[0])
                 }}
                 className="bg-background border rounded-lg p-1"
        >
          {PERSONALITIES.map(p => (
            <ToggleGroupItem key={p.key} value={p.key}>
                    <div className="relative group">
                      <p.icon 
                        className="h-4 w-4" 
                        style={{ color: `rgb(${p.color.join(',')})` }}
                      />
                      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {p.name}
                      </div>
                    </div>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
          </div>
        </div>

        {/* Context Banner */}
      {hasContext && (
          <div className="p-4 border-b bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Brain className="h-4 w-4 text-green-600" />
                </div>
              <div>
                  <p className="text-sm font-medium text-green-800">
                    Enhanced Context Available: {contextSummary}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="use-context"
                  checked={useFullContext}
                  onCheckedChange={(checked) => setUseFullContext(checked as boolean)}
                />
                <label htmlFor="use-context" className="text-sm text-green-700">
                  Use full context
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Chat Interface */}
        <div className="flex-1">
          <EnhancedChat
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
              placeholder="Ask a question about your research..."
            showAgentPlan={true}
            />
        </div>
      </CardContent>
    </Card>
  )
}
