"use client"

import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import Navbar from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import DarkVeil from '@/components/ui/DarkVeil';


interface FileItem {
  id: string;
  name: string;
  uploadedAt: string;
  size: string;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
export default function Dashboard() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFiles() {
      try {
        if (!supabase) {
          console.error('[DASHBOARD] Supabase client is not initialized!');
          setLoading(false);
          return;
        }
        // Fetch from files table
        const { data, error } = await supabase
          .from('files')
          .select('id, name, size, uploaded_at, doc_id')
          .order('uploaded_at', { ascending: false });
        if (error) {
          console.error('[DASHBOARD] Error fetching files:', error, JSON.stringify(error), Object.keys(error));
          setLoading(false);
          return;
        }
        if (!data || !Array.isArray(data)) {
          console.warn('[DASHBOARD] Supabase returned no data or data is not an array:', data);
          setLoading(false);
          return;
        }
        if (data.length === 0) {
          console.info('[DASHBOARD] Supabase returned an empty array. No files found.');
        } else {
          console.log('[DASHBOARD] Supabase files data:', data);
        }
        const filesList: FileItem[] = data.map((row: any) => ({
          id: row.id,
          name: row.name,
          uploadedAt: row.uploaded_at ? new Date(row.uploaded_at).toLocaleDateString() : '',
          size: row.size ? formatBytes(row.size) : '',
        }));
        setFiles(filesList);
        setLoading(false);
      } catch (err) {
        console.error('[DASHBOARD] Unexpected error in fetchFiles:', err);
        setLoading(false);
      }
    }
    fetchFiles();
  }, []);

  return (
    <>
      <Navbar />
      <div className="relative min-h-screen">
        {/* Full-viewport veil background, fixed so it stays during scroll */}
        <div className="fixed inset-0 -z-10">
          <DarkVeil />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-white/70">Upload documents and start asking questions</p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Link href="/upload">
              <Button size="lg" className="w-full">
                Upload File
              </Button>
            </Link>
            <Link href="/chat">
              <Button variant="outline" size="lg" className="w-full bg-transparent">
                Start Chat
              </Button>
            </Link>
          </div>

          {/* Files List */}
          <Card className="bg-black text-white border border-white">
            <CardHeader className="bg-black text-white">
              <CardTitle className="text-white">Your Files</CardTitle>
              <CardDescription className="text-white/70">
                {loading ? "Loading..." : `${files.length} document${files.length !== 1 ? "s" : ""} uploaded`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-white/70">Loading files...</p>
              ) : files.length === 0 ? (
                <p className="text-center py-8 text-white/70">
                  No files uploaded yet.{" "}
                  <Link href="/upload" className="text-blue-400 hover:underline">
                    Upload your first file
                  </Link>
                </p>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border border-white rounded-lg bg-black hover:bg-white hover:text-black transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-white">{file.name}</p>
                        <p className="text-sm text-white/70">
                          {file.size} • Uploaded {file.uploadedAt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
