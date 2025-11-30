"use client";

import React, { useEffect, useRef, useState } from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import DarkVeil from "@components/ui/DarkVeil";
import Navbar from "@components/navbar";
import { Button } from "@components/ui/button";
import { Card, CardContent } from "@components/ui/card";
import { Input } from "@components/ui/input";
import { Send } from "lucide-react";

/**
 * Types
 */
type Role = "user" | "assistant";
type Message = { id: string; role: Role; content: string; createdAt?: string };
type RagChunk = { id?: string; text?: string; score?: number; source?: string };

/**
 * Helpers
 */
function makeId(prefix = "") {
  try {
    return prefix + (crypto as any).randomUUID();
  } catch {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
}

function renderMathInline(content: string) {
  const elements: React.ReactNode[] = [];
  if (typeof content !== "string") return content;
  let lastIndex = 0;
  const regex = /\$\$(.*?)\$\$|\$(.*?)\$/gs;
  let match: RegExpExecArray | null;
  let mathIndex = 0;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      elements.push(<span key={`text-${mathIndex}`}>{content.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      elements.push(<BlockMath key={`block-${mathIndex}`} math={match[1]} errorColor="#cc0000" />);
    } else if (match[2]) {
      elements.push(<InlineMath key={`inline-${mathIndex}`} math={match[2]} errorColor="#cc0000" />);
    }
    lastIndex = regex.lastIndex;
    mathIndex++;
  }
  if (lastIndex < content.length) {
    elements.push(<span key="text-end">{content.slice(lastIndex)}</span>);
  }
  return <>{elements}</>;
}

/**
 * Upload helper with progress (XHR)
 */
function uploadWithProgress(file: File, onProgress: (p: number) => void) {
  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("file", file, file.name);

    xhr.open("POST", "http://localhost:3000/api/upload", true);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const pct = Math.round((ev.loaded / ev.total) * 100);
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve(xhr.responseText);
        }
      } else {
        reject(new Error("Upload failed: " + xhr.status));
      }
    };

    xhr.onerror = () => reject(new Error("Upload network error"));
    xhr.send(fd);
  });
}

/**
 * Component
 */
export default function ChatPage() {
  // messages and input
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm here to help you with your documents. Ask me any questions.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // single uploaded doc (only one at a time)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null); // selected before upload
  const [uploadedDoc, setUploadedDoc] = useState<{ id: string; name: string } | null>(null); // stored doc from server
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // voice recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // UI / popups
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referencePopup, setReferencePopup] = useState(false);
  const [referenceText, setReferenceText] = useState("");
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);

  // conversation id (auto-generated)
  const [conversationId, setConversationId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("agoralearn:conversationId");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!conversationId) {
      const id = makeId("conv-");
      setConversationId(id);
      try {
        localStorage.setItem("agoralearn:conversationId", id);
      } catch {}
    }
  }, [conversationId]);

  // auto-scroll
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, uploadProgress]);

  // helpers
  function pushMessage(m: Message) {
    setMessages((p) => [...p, m]);
  }

  // file selection
  function handleFileSelect(file: File) {
    setUploadedFile(file);
  }
  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.currentTarget.files?.[0];
    if (f) handleFileSelect(f);
  }

  // upload using XHR to show progress; result should contain file.id
  async function handleUpload() {
    if (!uploadedFile) return;
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const data = await uploadWithProgress(uploadedFile, (p) => setUploadProgress(p));
      const id = data?.file?.id ?? data?.docId ?? data?.id;
      const name = data?.file?.name ?? uploadedFile.name;
      if (!id) throw new Error("Upload response missing id");

      // store single doc (replace old)
      setUploadedDoc({ id, name });
      setUploadedFile(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3500);
    } catch (err: any) {
      console.error("upload error", err);
      setError(String(err?.message ?? "Upload failed"));
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }

  // voice input: record -> send to /api/voice-query -> gets transcript -> sendQuery
  async function handleVoiceInput() {
    if (!isRecording) {
      setIsRecording(true);
      audioChunksRef.current = [];
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        mediaRecorderRef.current = mr;
        mr.ondataavailable = (ev) => {
          if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
        };
        mr.onstop = async () => {
          setIsRecording(false);
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const fd = new FormData();
          fd.append("audio", blob, "audio.webm");
          if (uploadedDoc) fd.append("docId", uploadedDoc.id);
          try {
            const rsp = await fetch("http://localhost:3000/api/voice-query", { method: "POST", body: fd });
            if (!rsp.ok) throw new Error("STT failed");
            const j = await rsp.json();
            const question = j?.question ?? j?.transcript;
            if (typeof question === "string" && question.trim()) {
              await sendQuery(question);
            } else {
              pushMessage({ id: makeId("a-"), role: "assistant", content: "I couldn't hear a question." });
            }
          } catch (err: any) {
            console.error(err);
            pushMessage({ id: makeId("a-"), role: "assistant", content: "Voice processing failed." });
          }
        };
        mr.start();
        setTimeout(() => {
          if (mr.state !== "inactive") mr.stop();
        }, 25_000);
      } catch (err) {
        console.error("mic error", err);
        setIsRecording(false);
        setError("Microphone access denied or unavailable.");
      }
    } else {
      mediaRecorderRef.current?.stop();
    }
  }

  // selection popup
  function handleMouseUp(e?: React.MouseEvent) {
    const sel = window.getSelection();
    if (!sel || sel.toString().trim() === "") {
      setPopupPosition(null);
      setSelectedText(null);
      return;
    }
    const text = sel.toString();
    setSelectedText(text);
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    setPopupPosition({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
  }

  async function handleAskAgoraLearn() {
    if (!selectedText) return;
    setReferencePopup(false);
    await sendQuery(selectedText);
  }

  // main send query -> converse
  async function sendQuery(queryText: string) {
    if (!queryText.trim()) return;
    setIsLoading(true);
    setError(null);

    const userMsg: Message = { id: makeId("u-"), role: "user", content: queryText, createdAt: new Date().toISOString() };
    pushMessage(userMsg);

    const payload: any = { query: queryText };
    if (uploadedDoc) payload.docId = uploadedDoc.id;
    if (conversationId) payload.conversationId = conversationId;

    try {
      const res = await fetch("http://localhost:3000/api/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Server error ${res.status}`);
      } else {
        const body = await res.json();
        const answer = body?.answer ?? body?.assistantText ?? (typeof body === "string" ? body : "");
        pushMessage({ id: makeId("a-"), role: "assistant", content: String(answer) });
      }
    } catch (err: any) {
      console.error("converse error", err);
      pushMessage({ id: makeId("a-"), role: "assistant", content: "Sorry — something went wrong." });
      setError(String(err?.message ?? "Error"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSendMessage() {
    if (!inputValue.trim()) return;
    await sendQuery(inputValue);
    setInputValue("");
  }

  // export conversation
  function exportConversation() {
    try {
      const payload = { conversationId, messages, uploadedDoc, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conversation-${conversationId ?? "local"}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("Export failed");
    }
  }

  // UI
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="max-w-4xl w-full mx-auto p-4 flex-1 flex flex-col">
          <header className="flex items-center gap-4 mb-4">
            <h1 className="text-2xl font-semibold">AgoraLearn — Chat</h1>
            <div className="ml-auto flex items-center gap-2 text-sm">
              <div className="text-gray-600">conv:</div>
              <div className="px-2 py-1 bg-white border rounded text-xs">{conversationId ?? "not-set"}</div>
              <Button onClick={exportConversation} className="px-2 py-1">Export</Button>
            </div>
          </header>

          <Card className="flex-1 flex flex-col">
            <CardContent className="flex-1 overflow-auto p-4" onMouseUp={handleMouseUp}>
              {messages.length === 0 ? (
                <div className="text-gray-500">No messages yet — ask something.</div>
              ) : (
                <div className="space-y-4">
                  {messages.map((m) => (
                    <div key={m.id} className={`max-w-full ${m.role === "user" ? "text-right" : "text-left"}`}>
                      <div className={`inline-block p-3 rounded-lg ${m.role === "user" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-900"}`} style={{ whiteSpace: "pre-wrap" }}>
                        {renderMathInline(m.content)}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{m.role} • {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}</div>
                    </div>
                  ))}
                </div>
              )}

              {popupPosition && selectedText && (
                <div style={{ position: "absolute", top: popupPosition.top, left: popupPosition.left, background: "#fff", border: "1px solid #ccc", borderRadius: 6, padding: "6px 10px", zIndex: 1000 }}>
                  <Button size="sm" onClick={handleAskAgoraLearn}>Ask AgoraLearn</Button>
                </div>
              )}

              {isLoading && (
                <div className="flex justify-start mt-2">
                  <div className="bg-muted text-foreground max-w-xs px-4 py-3 rounded-lg rounded-bl-none">
                    <p className="text-sm">Thinking...</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </CardContent>

            <div className="border-t border-border p-4 relative">
              {referencePopup && (
                <div style={{ position: "absolute", left: "50%", top: -70, transform: "translateX(-50%)", background: "#fff", border: "1px solid #ccc", borderRadius: 8, padding: 12, zIndex: 1000 }}>
                  <div className="mb-2 font-semibold">Reference:</div>
                  <textarea className="w-full border rounded p-2 mb-2 text-sm" value={referenceText} onChange={e => setReferenceText(e.target.value)} rows={2} />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" onClick={() => { setInputValue(`Reference: "${referenceText}"\n`); setReferencePopup(false); }}>Use in chat</Button>
                    <Button size="sm" variant="outline" onClick={() => setReferencePopup(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 items-center">
                <Button type="button" variant="outline" size="icon" onClick={() => setShowUploadModal(true)}>Upload</Button>
                <Button type="button" variant={isRecording ? "default" : "outline"} size="icon" onClick={handleVoiceInput} className={isRecording ? "bg-red-600 text-white" : ""}>
                  {isRecording ? "Stop" : "Voice"}
                </Button>
                <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !isLoading) handleSendMessage(); }} placeholder="Ask a question..." className="flex-1" disabled={isLoading} />
                <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isLoading} size="icon"><Send className="h-4 w-4" /></Button>
              </div>

              {uploadedDoc && (
                <div className="mt-4 flex items-center gap-3">
                  <div className="font-semibold">Uploaded File:</div>
                  <div className="bg-muted px-3 py-2 rounded text-foreground text-sm">{uploadedDoc.name}</div>
                  <Button size="sm" variant="outline" onClick={() => setUploadedDoc(null)}>Remove</Button>
                  <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()}>Replace</Button>
                </div>
              )}

              {showSuccess && <div className="mt-2 text-green-600">File uploaded successfully!</div>}
              {error && <div className="mt-2 text-red-600">{error}</div>}
              {uploadProgress !== null && <div className="mt-2 text-sm">Upload: {uploadProgress}%</div>}
            </div>
          </Card>
        </div>
      </div>

      {/* Upload modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowUploadModal(false)} />
          <div className="bg-white rounded-lg shadow-lg p-6 z-10 w-full max-w-lg">
            <div className="mb-4 font-semibold">Upload Document</div>
            <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]); }} className={`border-2 border-dashed rounded-lg p-8 text-center ${isDragging ? "border-primary" : "border-border"}`}>
              <p className="mb-2">Drag and drop a file here</p>
              <div className="mb-3">
                <input ref={fileInputRef} type="file" onChange={handleFileInputChange} className="hidden" accept=".pdf,.doc,.docx,.txt,image/*" />
                <Button onClick={() => fileInputRef.current?.click()}>Choose file</Button>
              </div>
              {uploadedFile && <div className="mt-4 bg-muted p-3 rounded">{uploadedFile.name} <Button onClick={() => setUploadedFile(null)} size="sm" variant="ghost">Remove</Button></div>}
              {uploadedFile && <div className="mt-4"><Button onClick={handleUpload} disabled={isUploading}>{isUploading ? `Uploading${uploadProgress !== null ? ` (${uploadProgress}%)` : "..."}` : "Upload"}</Button></div>}
            </div>
            <div className="mt-4 text-right"><Button onClick={() => setShowUploadModal(false)} variant="outline">Close</Button></div>
          </div>
        </div>
      )}
    </>
  );
}
