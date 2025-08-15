'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
// import { ScrollArea } from '@/components/ui/scroll-area' // Temporarily disabled
import { Upload, Send, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  imageUrl?: string
  lineItems?: LineItem[]
  status?: 'processing' | 'completed' | 'error'
}

interface LineItem {
  description: string
  amount: number
  category: string
  confidence: number
}

export default function ReceiptChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I can help you categorize your receipts. Upload a receipt image and I&apos;ll analyze it line by line, categorizing each item for you.',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  // Temporarily removed auth for testing

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
      imageUrl: previewUrl || undefined
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsProcessing(true)

    try {
      if (selectedFile) {
        // Upload the receipt
        const formData = new FormData()
        formData.append('file', selectedFile)

        const uploadResponse = await fetch('/api/receipts/chat-upload', {
          method: 'POST',
          body: formData
        })

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload receipt')
        }

        const { imageUrl, jobId } = await uploadResponse.json()

        // Add processing message
        const processingMessage: Message = {
          id: `${Date.now()}-processing`,
          role: 'assistant',
          content: 'I\'m analyzing your receipt...',
          timestamp: new Date(),
          status: 'processing'
        }
        setMessages(prev => [...prev, processingMessage])

        // Process the receipt
        const processResponse = await fetch('/api/receipts/chat-process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, imageUrl, userInput: input })
        })

        if (!processResponse.ok) {
          throw new Error('Failed to process receipt')
        }

        const result = await processResponse.json()

        // Update with results
        const resultMessage: Message = {
          id: `${Date.now()}-result`,
          role: 'assistant',
          content: result.summary,
          timestamp: new Date(),
          lineItems: result.lineItems,
          status: 'completed'
        }

        setMessages(prev => prev.filter(m => m.id !== processingMessage.id).concat(resultMessage))

        // Clear file selection
        setSelectedFile(null)
        setPreviewUrl(null)
      } else {
        // Text-only message
        const response: Message = {
          id: `${Date.now()}-response`,
          role: 'assistant',
          content: 'Please upload a receipt image for me to analyze.',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, response])
      }
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = {
        id: `${Date.now()}-error`,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your receipt. Please try again.',
        timestamp: new Date(),
        status: 'error'
      }
      setMessages(prev => [...prev, errorMessage])
      toast.error('Failed to process receipt')
    } finally {
      setIsProcessing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <Card className="flex-1 flex flex-col m-4">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold">Receipt Parser Chat</h1>
          <p className="text-sm text-muted-foreground">Upload receipts and I'll categorize each item</p>
        </div>

        <div className="flex-1 p-4 overflow-y-auto max-h-[calc(100vh-12rem)]">
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
                    "max-w-[70%] rounded-lg p-3",
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                  
                  {message.imageUrl && (
                    <Image
                      src={message.imageUrl}
                      alt="Receipt"
                      width={300}
                      height={200}
                      className="mt-2 rounded max-w-xs"
                    />
                  )}

                  {message.status === 'processing' && (
                    <div className="flex items-center gap-2 mt-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">Processing...</span>
                    </div>
                  )}

                  {message.lineItems && (
                    <div className="mt-3 space-y-2">
                      <div className="text-xs font-semibold">Categorized Items:</div>
                      {message.lineItems.map((item, idx) => (
                        <div key={idx} className="bg-background/50 rounded p-2 text-xs">
                          <div className="flex justify-between">
                            <span className="font-medium">{item.description}</span>
                            <span>{formatCurrency(item.amount)}</span>
                          </div>
                          <div className="flex justify-between mt-1 text-muted-foreground">
                            <span>{item.category}</span>
                            <span className="flex items-center gap-1">
                              {item.confidence >= 80 ? (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              ) : (
                                <XCircle className="w-3 h-3 text-yellow-500" />
                              )}
                              {item.confidence}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t">
          {previewUrl && (
            <div className="mb-2 relative inline-block">
              <Image src={previewUrl} alt="Preview" width={80} height={80} className="h-20 rounded" />
              <button
                onClick={() => {
                  setSelectedFile(null)
                  setPreviewUrl(null)
                }}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <div className="relative">
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="receipt-upload"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => document.getElementById('receipt-upload')?.click()}
                disabled={isProcessing}
              >
                <Upload className="w-4 h-4" />
              </Button>
            </div>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isProcessing && handleSendMessage()}
              placeholder="Add notes about this receipt..."
              disabled={isProcessing}
              className="flex-1"
            />

            <Button
              onClick={handleSendMessage}
              disabled={isProcessing || (!input.trim() && !selectedFile)}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}