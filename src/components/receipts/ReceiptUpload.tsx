'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, FileImage, Loader2 } from 'lucide-react'
import imageCompression from 'browser-image-compression'

interface ReceiptUploadProps {
  profileId: string
  onUploadComplete: (jobId: string) => void
}

export default function ReceiptUpload({ profileId, onUploadComplete }: ReceiptUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // If it's an image and larger than 3MB, compress it
      if (selectedFile.type.startsWith('image/') && selectedFile.size > 3 * 1024 * 1024) {
        try {
          console.log('Compressing large image...')
          const options = {
            maxSizeMB: 3,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: 'image/jpeg'
          }
          const compressedFile = await imageCompression(selectedFile, options)
          setFile(compressedFile)
          console.log('Image compressed:', { 
            original: selectedFile.size, 
            compressed: compressedFile.size 
          })
        } catch (compressionError) {
          console.error('Compression failed:', compressionError)
          setFile(selectedFile) // Use original if compression fails
        }
      } else {
        setFile(selectedFile)
      }
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a receipt image')
      return
    }

    // Client-side file size check
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setError('File too large. Please choose an image smaller than 5MB.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('receipt', file)
      formData.append('profileId', profileId)

      const response = await fetch('/api/receipts/upload', {
        method: 'POST',
        body: formData
      })

      let result
      try {
        result = await response.json()
      } catch (parseError) {
        // Handle cases where response is not JSON (like 413 errors)
        if (response.status === 413) {
          throw new Error('File too large. Please choose an image smaller than 5MB.')
        }
        throw new Error(`Server error: ${response.status} ${response.statusText}`)
      }

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      // Start processing
      const processResponse = await fetch('/api/receipts/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jobId: result.jobId })
      })

      if (!processResponse.ok) {
        throw new Error('Processing failed')
      }

      onUploadComplete(result.jobId)
      setFile(null)
      
      // Reset file input
      const fileInput = document.getElementById('receipt-file') as HTMLInputElement
      if (fileInput) fileInput.value = ''

    } catch (error) {
      console.error('Upload error:', error)
      setError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile)
      setError(null)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium mb-4">Upload Receipt</h3>
      
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <FileImage className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-600 mb-4">
          Drag and drop a receipt image here, or click to select
        </p>
        
        <Input
          id="receipt-file"
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileChange}
          className="mb-4"
        />
        
        {file && (
          <div className="bg-gray-50 rounded p-3 mb-4">
            <p className="text-sm text-gray-700">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        
        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing Receipt...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload & Process Receipt
            </>
          )}
        </Button>
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        <p>• Supported formats: JPEG, PNG, WebP, PDF</p>
        <p>• Maximum file size: 5MB</p>
        <p>• Processing typically takes 10-30 seconds</p>
      </div>
    </div>
  )
}