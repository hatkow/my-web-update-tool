'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Project, Profile } from '@/lib/types'
import Link from 'next/link'

export default function ProjectEditPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const supabase = createClient()

  const [project, setProject] = useState<Project | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [selectedFile, setSelectedFile] = useState('')
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingFile, setLoadingFile] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [viewMode, setViewMode] = useState<'code' | 'preview' | 'split'>('split')

  useEffect(() => {
    fetchProject()
    fetchProfile()
  }, [projectId])

  const fetchProject = async () => {
    try {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (data) {
        setProject(data)
        if (data.target_files && data.target_files.length > 0) {
          setSelectedFile(data.target_files[0])
        }
      }
    } catch {
      setError('プロジェクトの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (data) {
        setProfile(data)
      }
    }
  }

  useEffect(() => {
    if (selectedFile && project) {
      loadFile()
    }
  }, [selectedFile, project])

  const loadFile = async () => {
    if (!selectedFile) return
    
    setLoadingFile(true)
    setError('')
    
    try {
      const response = await fetch('/api/ftp/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          file_path: selectedFile,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'ファイルの読み込みに失敗しました')
        setContent('')
        setOriginalContent('')
      } else {
        setContent(data.content)
        setOriginalContent(data.content)
      }
    } catch {
      setError('ファイルの読み込みに失敗しました')
    } finally {
      setLoadingFile(false)
    }
  }

  const handleSave = async () => {
    if (!selectedFile) return
    
    setSaving(true)
    setError('')
    setSuccess('')
    
    try {
      const response = await fetch('/api/ftp/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          file_path: selectedFile,
          content,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '保存に失敗しました')
      } else {
        setSuccess('サイトに反映しました！')
        setOriginalContent(content)
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch {
      setError('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = content !== originalContent

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white">読み込み中...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">プロジェクトが見つかりません</p>
          <Link href="/dashboard" className="text-blue-400 hover:underline">
            ダッシュボードに戻る
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">{project.name}</h1>
              <p className="text-sm text-slate-400">{project.ftp_host}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {hasChanges && (
              <span className="text-sm text-amber-400">未保存の変更があります</span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  保存中...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  サイトに反映
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1920px] mx-auto h-[calc(100vh-73px)] flex flex-col">
        {error && (
          <div className="bg-red-500/20 border-b border-red-500/50 text-red-200 px-4 py-2 text-sm text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/20 border-b border-green-500/50 text-green-200 px-4 py-2 text-sm text-center flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - File List */}
          <div className="w-64 bg-slate-900 border-r border-white/10 flex flex-col">
            <div className="p-4 border-b border-white/10">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">File Browser</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="space-y-0.5">
                {project.target_files && project.target_files.length > 0 ? (
                  project.target_files.map((file) => (
                    <button
                      key={file}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all flex items-center gap-2 ${
                        selectedFile === file
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="truncate">{file}</span>
                    </button>
                  ))
                ) : (
                  <p className="text-slate-500 text-xs px-2 py-4 text-center">
                    No files configured
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col bg-slate-800">
            {/* Toolbar */}
            <div className="h-10 bg-slate-800 border-b border-white/10 flex items-center justify-between px-4">
               <div className="flex items-center gap-4 text-slate-300">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span className="text-sm font-medium">{selectedFile || 'No file selected'}</span>
                  </div>
                  {/* View Toggles */}
                  <div className="flex bg-slate-900/50 rounded-lg p-0.5 border border-white/5">
                    <button
                      onClick={() => setViewMode('code')}
                      className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode === 'code' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                      Code
                    </button>
                    <button
                       onClick={() => setViewMode('split')}
                       className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode === 'split' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                      Split
                    </button>
                    <button
                       onClick={() => setViewMode('preview')}
                       className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode === 'preview' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                      Preview
                    </button>
                  </div>
               </div>
               <button
                  onClick={loadFile}
                  disabled={loadingFile}
                  className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <svg className={`w-3.5 h-3.5 ${loadingFile ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reload File
                </button>
            </div>

            {/* Split Pane */}
            <div className="flex-1 flex overflow-hidden relative">
              {loadingFile ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800/50 backdrop-blur-sm z-10">
                  <div className="text-slate-400 flex flex-col items-center">
                    <svg className="animate-spin w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </div>
                </div>
              ) : null}

              {/* Code Editor */}
              <div className={`flex-1 flex flex-col ${viewMode === 'preview' ? 'hidden' : ''} border-r border-white/10`}>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="flex-1 w-full bg-[#1e1e1e] text-slate-200 p-4 font-mono text-sm resize-none focus:outline-none leading-relaxed"
                  placeholder="Select a file to start editing..."
                  spellCheck={false}
                />
              </div>

              {/* Live Preview */}
              <div className={`flex-1 bg-white flex flex-col ${viewMode === 'code' ? 'hidden' : ''}`}>
                 <div className="bg-slate-100 border-b border-slate-200 px-3 py-1 flex items-center justify-between text-xs text-slate-500">
                    <span>Preview</span>
                    <span>{project.ftp_host}</span>
                 </div>
                 <iframe
                    title="Live Preview"
                    className="flex-1 w-full h-full"
                    srcDoc={(() => {
                        // Inject <base> tag to fix relative paths
                        const baseUrl = `http://${project.ftp_host}${project.ftp_path.endsWith('/') ? project.ftp_path : project.ftp_path + '/'}`;
                        const baseTag = `<base href="${baseUrl}">`;
                        // Insert after <head> or at start
                        return content.replace('<head>', `<head>${baseTag}`);
                    })()}
                    sandbox="allow-scripts allow-same-origin" 
                 />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
