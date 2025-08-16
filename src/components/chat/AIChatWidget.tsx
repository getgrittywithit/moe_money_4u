'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  MessageSquare, 
  Upload, 
  Send, 
  Loader2, 
  X, 
  Receipt, 
  Calendar, 
  TrendingUp, 
  DollarSign,
  Minimize2,
  Maximize2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  imageUrl?: string
  draftTransactions?: DraftTransaction[]
  taskMode?: ChatTaskMode
}

interface LineItem {
  description: string
  amount: number
  category: string
  confidence: number
}

interface DraftTransaction {
  id: string
  description: string
  amount: number
  category: string
  confidence: number
  date: string
  merchant?: string
}

type ChatTaskMode = 'receipt' | 'calendar' | 'budget' | 'general'

interface AIChatWidgetProps {
  profileId: string
  onDraftTransactions?: (transactions: DraftTransaction[]) => void
}

const TASK_MODES = [
  {
    id: 'receipt' as ChatTaskMode,
    name: 'Receipt Processing',
    icon: Receipt,
    description: 'Upload receipts to create draft transactions',
    color: 'bg-blue-500'
  },
  {
    id: 'calendar' as ChatTaskMode,
    name: 'Financial Calendar',
    icon: Calendar,
    description: 'Discuss upcoming bills and autopays',
    color: 'bg-green-500'
  },
  {
    id: 'budget' as ChatTaskMode,
    name: 'Budget Analysis',
    icon: TrendingUp,
    description: 'Spending insights and recommendations',
    color: 'bg-purple-500'
  },
  {
    id: 'general' as ChatTaskMode,
    name: 'General Finance',
    icon: DollarSign,
    description: 'Open-ended financial planning',
    color: 'bg-orange-500'
  }
]

export default function AIChatWidget({ onDraftTransactions }: AIChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [currentTaskMode, setCurrentTaskMode] = useState<ChatTaskMode>('general')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I\'m your AI finance assistant. Choose a task mode above to get started, or ask me anything about your finances!',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleTaskModeChange = (mode: ChatTaskMode) => {
    setCurrentTaskMode(mode)
    const taskMode = TASK_MODES.find(t => t.id === mode)
    
    const modeMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Switched to ${taskMode?.name} mode. ${taskMode?.description}`,
      timestamp: new Date(),
      taskMode: mode
    }
    
    setMessages(prev => [...prev, modeMessage])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file')
        return
      }
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() && !selectedFile) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input || 'Receipt uploaded',
      timestamp: new Date(),
      imageUrl: previewUrl || undefined,
      taskMode: currentTaskMode
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsProcessing(true)

    try {
      if (selectedFile && currentTaskMode === 'receipt') {
        await handleReceiptProcessing(selectedFile, input)
      } else {
        await handleGeneralChat(input)
      }
    } catch (error) {
      console.error('Error processing message:', error)
      toast.error('Failed to process message')
    } finally {
      setIsProcessing(false)
      setSelectedFile(null)
      setPreviewUrl(null)
    }
  }

  const handleReceiptProcessing = async (file: File, userNotes: string) => {
    // Upload receipt
    const formData = new FormData()
    formData.append('file', file)

    const uploadResponse = await fetch('/api/receipts/chat-upload', {
      method: 'POST',
      body: formData
    })

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload receipt')
    }

    const { imageUrl, jobId } = await uploadResponse.json()

    // Process with AI
    const processResponse = await fetch('/api/receipts/chat-process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, imageUrl, userInput: userNotes, taskMode: 'receipt' })
    })

    if (!processResponse.ok) {
      throw new Error('Failed to process receipt')
    }

    const result = await processResponse.json()

    // Create draft transactions
    const draftTransactions: DraftTransaction[] = result.lineItems?.map((item: LineItem, index: number) => ({
      id: `draft-${Date.now()}-${index}`,
      description: item.description,
      amount: item.amount,
      category: item.category,
      confidence: item.confidence,
      date: result.date || new Date().toISOString().split('T')[0],
      merchant: result.merchantName
    })) || []

    const assistantMessage: Message = {
      id: `${Date.now()}-response`,
      role: 'assistant',
      content: `I've analyzed your receipt and created ${draftTransactions.length} draft transactions. They're now in the pending approval section for you to review!`,
      timestamp: new Date(),
      draftTransactions,
      taskMode: 'receipt'
    }

    setMessages(prev => [...prev, assistantMessage])

    // Notify parent component
    if (onDraftTransactions && draftTransactions.length > 0) {
      onDraftTransactions(draftTransactions)
    }
  }

  const handleGeneralChat = async (message: string) => {
    // For now, create a simple response based on task mode
    let response = ''

    switch (currentTaskMode) {
      case 'calendar':
        response = `I'd be happy to help with your financial calendar. Based on your message about "${message}", I can help you track upcoming bills, autopays, and financial deadlines. This feature is coming soon!`
        break
      case 'budget':
        response = `Great question about budgeting! Regarding "${message}", I can analyze your spending patterns and provide insights. Full budget analysis features are being developed!`
        break
      case 'general':
        response = `Thanks for your question about "${message}". I'm here to help with all your financial planning needs. How can I assist you further?`
        break
      default:
        response = `I understand you're asking about "${message}". How can I help you with this?`
    }

    const assistantMessage: Message = {
      id: `${Date.now()}-response`,
      role: 'assistant',
      content: response,
      timestamp: new Date(),
      taskMode: currentTaskMode
    }

    setMessages(prev => [...prev, assistantMessage])
  }

  const currentMode = TASK_MODES.find(mode => mode.id === currentTaskMode)

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg z-50"
        size="icon"
      >
        <MessageSquare className="w-6 h-6 text-white" />
      </Button>
    )
  }

  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 bg-white rounded-lg shadow-2xl border",
      isMinimized ? "w-80 h-16" : "w-96 h-[600px]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <span className="font-semibold">AI Finance Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Task Mode Selector */}
          <div className="p-3 border-b bg-gray-50">
            <div className="grid grid-cols-2 gap-2">
              {TASK_MODES.map((mode) => (
                <Button
                  key={mode.id}
                  variant={currentTaskMode === mode.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTaskModeChange(mode.id)}
                  className="flex items-center gap-1 text-xs h-8"
                >
                  <mode.icon className="w-3 h-3" />
                  {mode.name}
                </Button>
              ))}
            </div>
            {currentMode && (
              <p className="text-xs text-gray-600 mt-2">{currentMode.description}</p>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 h-[400px]">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg p-3 text-sm",
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100'
                    )}
                  >
                    <p>{message.content}</p>
                    
                    {message.imageUrl && (
                      <Image
                        src={message.imageUrl}
                        alt="Receipt"
                        width={200}
                        height={128}
                        className="mt-2 rounded max-w-full h-32 object-cover"
                      />
                    )}

                    {message.draftTransactions && message.draftTransactions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium">Draft Transactions Created:</p>
                        {message.draftTransactions.map((transaction, idx) => (
                          <div key={idx} className="bg-white/10 rounded p-2 text-xs">
                            <div className="flex justify-between">
                              <span>{transaction.description}</span>
                              <span>${transaction.amount.toFixed(2)}</span>
                            </div>
                            <div className="text-xs opacity-75">
                              {transaction.category} • {transaction.confidence}% confidence
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {message.taskMode && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {TASK_MODES.find(t => t.id === message.taskMode)?.name}
                      </Badge>
                    )}

                    <div className="text-xs opacity-75 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Processing...</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="p-3 border-t">
            {previewUrl && (
              <div className="mb-2 relative inline-block">
                <Image src={previewUrl} alt="Preview" width={64} height={64} className="h-16 rounded" />
                <button
                  onClick={() => {
                    setSelectedFile(null)
                    setPreviewUrl(null)
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </div>
            )}

            <div className="flex gap-2">
              {currentTaskMode === 'receipt' && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </>
              )}

              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isProcessing && handleSendMessage()}
                placeholder={
                  currentTaskMode === 'receipt' 
                    ? "Upload receipt or add notes..." 
                    : "Ask me about your finances..."
                }
                disabled={isProcessing}
                className="flex-1 text-sm"
              />

              <Button
                onClick={handleSendMessage}
                disabled={isProcessing || (!input.trim() && !selectedFile)}
                size="sm"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}