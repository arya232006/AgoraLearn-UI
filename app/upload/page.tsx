
"use client"
import React from "react"

import { useState } from "react"
import Navbar from "@components/navbar"
import { Button } from "@components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@components/ui/card"
import { Alert, AlertDescription } from "@components/ui/alert"
import { CheckCircle2, Upload, X } from "lucide-react"

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileSelect = (file: File) => {
    setUploadedFile(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleUpload = async () => {
    if (!uploadedFile) return

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", uploadedFile)

      const response = await fetch("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.ok) {
        setShowSuccess(true)
        setUploadedFile(null)
        setTimeout(() => setShowSuccess(false), 5000)
      }
    } catch (error) {
      console.error("Upload failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Upload File</h1>
            <p className="text-muted-foreground">Upload a document to start asking questions</p>
          </div>

          {/* Success Alert */}
          {showSuccess && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">File uploaded successfully!</AlertDescription>
            </Alert>
          )}

          {/* Upload Card */}
          <Card>
            <CardHeader>
              <CardTitle>Choose File</CardTitle>
              <CardDescription>Drag and drop or click to select</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Drag and Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
                  isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium text-foreground mb-1">Drag and drop your file here</p>
                <p className="text-sm text-muted-foreground mb-4">or</p>
                <label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileInputChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.md"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Click to select
                  </Button>
                </label>
              </div>

              {/* Selected File */}
              {uploadedFile && (
                <div className="bg-muted p-4 rounded-lg flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{uploadedFile.name}</p>
                    <p className="text-sm text-muted-foreground">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button onClick={() => setUploadedFile(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}

              {/* Upload Button */}
              <Button onClick={handleUpload} disabled={!uploadedFile || isLoading} size="lg" className="w-full">
                {isLoading ? "Uploading..." : "Upload File"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
