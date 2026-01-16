'use client'

import { parseEvents, parseSchedule, generateEventsHtml, generateScheduleHtml, type EventItem, type ScheduleItem } from '@/lib/editor-utils'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/lib/types'

export default function ProjectEditPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [content, setContent] = useState('')
  const [initialContent, setInitialContent] = useState('')
  const [selectedFile, setSelectedFile] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [viewMode, setViewMode] = useState<'code' | 'preview' | 'split'>('split')
  const [editorMode, setEditorMode] = useState<'code' | 'visual'>('code')
  
  // Visual Editor State
  const [events, setEvents] = useState<EventItem[]>([])
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [activeTab, setActiveTab] = useState<'events' | 'schedule'>('events')

  useEffect(() => {
    fetchProject()
  }, [])

  useEffect(() => {
    if (selectedFile && project) {
      loadFile()
    }
  }, [selectedFile])

  useEffect(() => {
    setHasChanges(content !== initialContent)
  }, [content, initialContent])

  const fetchProject = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Check if user has access
      const { data: assignment } = await supabase
        .from('user_projects')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', params.id as string)
        .single()
      
      // Also allow admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!assignment && profile?.role !== 'admin') {
        alert('プロジェクトへのアクセス権がありません')
        router.push('/dashboard')
        return
      }

      const { data: projectData, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', params.id as string)
        .single()

      if (error || !projectData) {
        console.error('Error fetching project:', error)
        alert('プロジェクトの取得に失敗しました')
        return
      }

      setProject(projectData)
      
      // Set default selected file if available
      if (projectData.target_files && projectData.target_files.length > 0) {
        // Find index.html or use first file
        const defaultFile = projectData.target_files.find((f: string) => f === 'index.html') || projectData.target_files[0]
        setSelectedFile(defaultFile)
      }

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Parse content when switching to visual mode
  const handleSwitchToVisual = () => {
    setEvents(parseEvents(content))
    setSchedule(parseSchedule(content))
    setEditorMode('visual')
    setViewMode('preview') // Visual mode works best with preview
  }

  const handleSwitchToCode = () => {
    setEditorMode('code')
    setViewMode('split')
  }

  // Update logic for Visual Editor
  const updateEvents = (newEvents: EventItem[]) => {
    setEvents(newEvents)
    const newHtml = generateEventsHtml(content, newEvents)
    setContent(newHtml)
  }

  const updateSchedule = (newSchedule: ScheduleItem[]) => {
    setSchedule(newSchedule)
    const newHtml = generateScheduleHtml(content, newSchedule)
    setContent(newHtml)
  }

  const loadFile = async () => {
    if (!selectedFile || !project) return
    
    try {
      setLoading(true)
      const response = await fetch('/api/ftp/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          file_path: selectedFile
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'ファイルの読み込みに失敗しました')
      }

      setContent(data.content)
      setInitialContent(data.content)
      setEditorMode('code') // Reset to code mode on load
      setViewMode('split')
    } catch (e: any) {
      console.error(e)
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedFile || !project) return

    try {
      setSaving(true)
      const response = await fetch('/api/ftp/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          file_path: selectedFile,
          content: content
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '保存に失敗しました')
      }

      setInitialContent(content)
      setHasChanges(false)
      alert('保存しました')
    } catch (e: any) {
      console.error(e)
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !project) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between">
            {/* ... Left side ... */}
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
              <h1 className="text-xl font-bold text-white">{project?.name}</h1>
              <p className="text-sm text-slate-400">{project?.ftp_host}</p>
            </div>
            
            {/* Editor Mode Toggle */}
            <div className="ml-8 flex bg-slate-800 rounded-lg p-1 border border-white/10">
                <button
                    onClick={handleSwitchToCode}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                        editorMode === 'code' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                >
                    コード編集
                </button>
                <button
                    onClick={handleSwitchToVisual}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                        editorMode === 'visual' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                >
                    かんたん編集
                </button>
            </div>
          </div>
          
          {/* ... Right side ... */}
          <div className="flex items-center gap-4">
             {/* ... status and save button ... */}
            {hasChanges && (
              <span className="text-sm text-amber-400">未保存の変更があります</span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {saving ? '保存中...' : hasChanges ? 'サイトに反映' : '変更なし'}
            </button>
          </div>
        </div>
      </header>
      
      {/* ... Content Area ... */}
       <div className="max-w-[1920px] mx-auto h-[calc(100vh-73px)] flex flex-col">
         {/* ... Messages ... */}

         <div className="flex-1 flex overflow-hidden">
            {/* Sidebar (hide in visual mode or keep?) Let's keep for file switching */}
             <div className="w-64 bg-slate-900 border-r border-white/10 flex flex-col hidden lg:flex">
                {/* ... File list ... */}
                <div className="p-4 border-b border-white/10">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">File Browser</h2>
                </div>
                {/* ... list ... */}
                 <div className="flex-1 overflow-y-auto p-2">
                  <div className="space-y-0.5">
                    {project?.target_files?.map((file) => (
                        <button
                          key={file}
                          onClick={() => setSelectedFile(file)}
                          className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all flex items-center gap-2 ${
                            selectedFile === file
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-400 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span className="truncate">{file}</span>
                        </button>
                      ))}
                  </div>
                 </div>
             </div>

            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col bg-slate-800">
                {editorMode === 'code' ? (
                    // CODE MODE UI
                    <>
                        <div className="h-10 bg-slate-800 border-b border-white/10 flex items-center justify-between px-4">
                            {/* ... Toolbar ... */}
                             <div className="flex items-center gap-4 text-slate-300">
                                <span className="text-sm font-medium">{selectedFile}</span>
                                <div className="flex bg-slate-900/50 rounded-lg p-0.5 border border-white/5">
                                    <button onClick={() => setViewMode('code')} className={`px-3 py-1 text-xs rounded-md ${viewMode === 'code' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Code</button>
                                    <button onClick={() => setViewMode('split')} className={`px-3 py-1 text-xs rounded-md ${viewMode === 'split' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Split</button>
                                    <button onClick={() => setViewMode('preview')} className={`px-3 py-1 text-xs rounded-md ${viewMode === 'preview' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Preview</button>
                                </div>
                             </div>
                             <button onClick={loadFile} className="text-xs text-slate-400 hover:text-white">Reload</button>
                        </div>
                        <div className="flex-1 flex overflow-hidden relative">
                             {/* Code Editor */}
                              <div className={`flex-1 flex flex-col ${viewMode === 'preview' ? 'hidden' : ''} border-r border-white/10`}>
                                <textarea
                                  value={content}
                                  onChange={(e) => setContent(e.target.value)}
                                  className="flex-1 w-full bg-[#1e1e1e] text-slate-200 p-4 font-mono text-sm resize-none focus:outline-none"
                                  spellCheck={false}
                                />
                              </div>
                              {/* Preview Iframe */}
                              <div className={`flex-1 bg-white flex flex-col ${viewMode === 'code' ? 'hidden' : ''}`}>
                                 <iframe
                    title="Live Preview"
                    className="flex-1 w-full h-full"
                    srcDoc={(() => {
                        // Inject <base> tag to fix relative paths
                        // Use public_url if available, falling back to FTP host
                        let baseUrl = '';
                        if (project.public_url) {
                            baseUrl = project.public_url.endsWith('/') ? project.public_url : project.public_url + '/';
                        } else {
                            baseUrl = `http://${project.ftp_host}${project.ftp_path.endsWith('/') ? project.ftp_path : project.ftp_path + '/'}`;
                        }
                        
                        const baseTag = `<base href="${baseUrl}">`;
                        // Insert after <head> or at start
                        return content.replace('<head>', `<head>${baseTag}`);
                    })()}
                    sandbox="allow-scripts allow-same-origin" 
                 />
                              </div>
                        </div>
                    </>
                ) : (
                    // VISUAL EDITOR FLIP LAYOUT: Form on Left, Preview on Right
                     <div className="flex-1 flex overflow-hidden">
                        {/* Form Area */}
                        <div className="w-[500px] flex flex-col border-r border-white/10 bg-slate-800 overflow-hidden">
                            <div className="p-4 border-b border-white/10 flex gap-4">
                                <button
                                    onClick={() => setActiveTab('events')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${activeTab === 'events' ? 'bg-green-600/20 border-green-500 text-green-200' : 'border-transparent text-slate-400 hover:bg-white/5'}`}
                                >
                                    イベント情報
                                </button>
                                <button
                                    onClick={() => setActiveTab('schedule')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${activeTab === 'schedule' ? 'bg-green-600/20 border-green-500 text-green-200' : 'border-transparent text-slate-400 hover:bg-white/5'}`}
                                >
                                    年間スケジュール
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                {activeTab === 'events' ? (
                                    <div className="space-y-6">
                                        {events.map((event, index) => (
                                            <div key={event.id} className="bg-slate-900/50 border border-white/10 rounded-lg p-4 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="text-sm font-bold text-white">イベント {index + 1}</h3>
                                                    <button onClick={() => {
                                                        const newEvents = [...events];
                                                        newEvents.splice(index, 1);
                                                        updateEvents(newEvents);
                                                    }} className="text-red-400 hover:text-red-300 text-xs">削除</button>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-400 block mb-1">タイトル</label>
                                                    <textarea
                                                        value={event.title}
                                                        onChange={(e) => {
                                                            const newEvents = [...events];
                                                            newEvents[index].title = e.target.value;
                                                            updateEvents(newEvents);
                                                        }}
                                                        className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1 text-sm text-white h-16"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-xs text-slate-400 block mb-1">日時</label>
                                                        <input
                                                            value={event.date}
                                                            onChange={(e) => {
                                                                const newEvents = [...events];
                                                                newEvents[index].date = e.target.value;
                                                                updateEvents(newEvents);
                                                            }}
                                                            className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1 text-sm text-white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-slate-400 block mb-1">時間</label>
                                                        <input
                                                            value={event.time}
                                                            onChange={(e) => {
                                                                const newEvents = [...events];
                                                                newEvents[index].time = e.target.value;
                                                                updateEvents(newEvents);
                                                            }}
                                                            className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1 text-sm text-white"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-xs text-slate-400 block mb-1">WEB販売日</label>
                                                        <input
                                                            value={event.webSaleDate}
                                                            onChange={(e) => {
                                                                const newEvents = [...events];
                                                                newEvents[index].webSaleDate = e.target.value;
                                                                updateEvents(newEvents);
                                                            }}
                                                            className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1 text-sm text-white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-slate-400 block mb-1">窓口発売日</label>
                                                        <input
                                                            value={event.counterSaleDate}
                                                            onChange={(e) => {
                                                                const newEvents = [...events];
                                                                newEvents[index].counterSaleDate = e.target.value;
                                                                updateEvents(newEvents);
                                                            }}
                                                            className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1 text-sm text-white"
                                                        />
                                                    </div>
                                                </div>
                                                 <div>
                                                    <label className="text-xs text-slate-400 block mb-1">詳しく見る (PDFなど)</label>
                                                    <input
                                                        value={event.detailLink}
                                                        onChange={(e) => {
                                                            const newEvents = [...events];
                                                            newEvents[index].detailLink = e.target.value;
                                                            updateEvents(newEvents);
                                                        }}
                                                        className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1 text-sm text-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-400 block mb-1">チケットリンク</label>
                                                    <input
                                                        value={event.ticketLink}
                                                        onChange={(e) => {
                                                            const newEvents = [...events];
                                                            newEvents[index].ticketLink = e.target.value;
                                                            updateEvents(newEvents);
                                                        }}
                                                        className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1 text-sm text-white"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => {
                                                const newEvents = [...events, { id: Date.now().toString(), title: '新しいイベント', date: '', time: '', webSaleDate: '', counterSaleDate: '', ticketLink: '', detailLink: '' }];
                                                updateEvents(newEvents);
                                            }}
                                            className="w-full py-2 border-2 border-dashed border-white/10 rounded-lg text-slate-400 hover:text-white hover:border-white/20"
                                        >
                                            + イベントを追加
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                         {schedule.map((item, index) => (
                                            <div key={item.id} className="bg-slate-900/50 border border-white/10 rounded-lg p-4 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="text-sm font-bold text-white">スケジュール {index + 1}</h3>
                                                     <button onClick={() => {
                                                        const newSchedule = [...schedule];
                                                        newSchedule.splice(index, 1);
                                                        updateSchedule(newSchedule);
                                                    }} className="text-red-400 hover:text-red-300 text-xs">削除</button>
                                                </div>
                                                 <div>
                                                    <label className="text-xs text-slate-400 block mb-1">イベント名</label>
                                                    <input
                                                        value={item.title}
                                                        onChange={(e) => {
                                                            const newSchedule = [...schedule];
                                                            newSchedule[index].title = e.target.value;
                                                            updateSchedule(newSchedule);
                                                        }}
                                                        className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1 text-sm text-white"
                                                    />
                                                </div>
                                                 <div>
                                                    <label className="text-xs text-slate-400 block mb-1">日付</label>
                                                    <input
                                                        value={item.date}
                                                        onChange={(e) => {
                                                            const newSchedule = [...schedule];
                                                            newSchedule[index].date = e.target.value;
                                                            updateSchedule(newSchedule);
                                                        }}
                                                        className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1 text-sm text-white"
                                                    />
                                                </div>
                                                 <div>
                                                    <label className="text-xs text-slate-400 block mb-1">時間</label>
                                                    <input
                                                        value={item.time}
                                                        onChange={(e) => {
                                                            const newSchedule = [...schedule];
                                                            newSchedule[index].time = e.target.value;
                                                            updateSchedule(newSchedule);
                                                        }}
                                                        className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1 text-sm text-white"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.isClosed}
                                                        onChange={(e) => {
                                                            const newSchedule = [...schedule];
                                                            newSchedule[index].isClosed = e.target.checked;
                                                            updateSchedule(newSchedule);
                                                        }}
                                                        id={`closed-${item.id}`}
                                                        className="rounded bg-slate-800 border-white/10"
                                                    />
                                                    <label htmlFor={`closed-${item.id}`} className="text-sm text-slate-300">「終了しました」を表示</label>
                                                </div>
                                            </div>
                                         ))}
                                         <button
                                            onClick={() => {
                                                const newSchedule = [...schedule, { id: Date.now().toString(), title: '新しい予定', date: '', time: '', isClosed: false }];
                                                updateSchedule(newSchedule);
                                            }}
                                            className="w-full py-2 border-2 border-dashed border-white/10 rounded-lg text-slate-400 hover:text-white hover:border-white/20"
                                        >
                                            + スケジュールを追加
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Preview Area (Full height) */}
                         <div className="flex-1 bg-white flex flex-col">
                                 <div className="flex items-center gap-2">
                                    <span>Preview</span>
                                    {!project?.public_url ? (
                                        <span className="text-red-400 flex items-center gap-1 font-bold">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            公開URL未設定 (CSS無効)
                                        </span>
                                    ) : (project.public_url.startsWith('http://') || (project.public_url.indexOf('://') === -1 && !project.public_url.startsWith('https'))) ? (
                                         // Warning for HTTP or potentially ambiguous URLs (though we force HTTPS in logic below, showing warning if input is raw HTTP)
                                         // Actually, let's check the *processed* URL or just the input. 
                                         // If input is explicitly http, warn.
                                        project.public_url.startsWith('http://') && (
                                            <span className="text-amber-500 flex items-center gap-1 text-[10px]">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                保護されていない通信(http)のため、CSSがブロックされる可能性があります
                                            </span>
                                        )
                                    ) : null}
                                 </div>
                              </div>
                             <iframe
                                title="Live Preview"
                                className="flex-1 w-full h-full"
                                srcDoc={(() => {
                                    let baseUrl = '';
                                    let baseUrl = '';
                                    if (project?.public_url) {
                                        let url = project.public_url.trim();
                                        // Auto-prepend https if missing protocol
                                        if (!url.startsWith('http://') && !url.startsWith('https://')) {
                                            url = 'https://' + url;
                                        }
                                        baseUrl = url.endsWith('/') ? url : url + '/';
                                    } else {
                                        baseUrl = `http://${project?.ftp_host}${project?.ftp_path.endsWith('/') ? project?.ftp_path : project?.ftp_path + '/'}`;
                                    }
                                    const baseTag = `<base href="${baseUrl}">`;
                                    return content.replace('<head>', `<head>${baseTag}`);
                                })()}
                                sandbox="allow-scripts allow-same-origin"
                             />
                          </div>
                     </div>
                )}
            </div>
         </div>
       </div>
    </div>
  )
}
