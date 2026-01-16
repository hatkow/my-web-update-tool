'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Project, Profile, UserProject } from '@/lib/types'

import Link from 'next/link'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectAssignments, setProjectAssignments] = useState<UserProject[]>([])
  
  // Form state
  const [name, setName] = useState('')
  const [ftpHost, setFtpHost] = useState('')
  const [ftpUser, setFtpUser] = useState('')
  const [ftpPassword, setFtpPassword] = useState('')
  const [ftpPort, setFtpPort] = useState('21')
  const [ftpPath, setFtpPath] = useState('/')
  const [publicUrl, setPublicUrl] = useState('')
  const [targetFiles, setTargetFiles] = useState('')
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchProjects()
    fetchUsers()
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setProjects(data)
    }
    setLoading(false)
  }

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'user')
      .order('email')

    if (data) {
      setUsers(data)
    }
  }

  const fetchProjectAssignments = async (projectId: string) => {
    const { data } = await supabase
      .from('user_projects')
      .select('*, profile:profiles(*)')
      .eq('project_id', projectId)

    if (data) {
      setProjectAssignments(data)
    }
  }

  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const isEditing = !!editingProject
    const url = '/api/admin/projects'
    const method = isEditing ? 'PUT' : 'POST'
    const body: any = {
      name,
      ftp_host: ftpHost,
      ftp_user: ftpUser,
      ftp_port: parseInt(ftpPort),
      ftp_path: ftpPath,
      public_url: publicUrl,
      target_files: targetFiles.split('\n').filter(f => f.trim()),
    }

    if (isEditing) {
      body.id = editingProject.id
      if (ftpPassword) {
        body.ftp_password = ftpPassword
      }
    } else {
      body.ftp_password = ftpPassword
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || `プロジェクト${isEditing ? '更新' : '作成'}に失敗しました`)
      } else {
        setSuccess(`プロジェクトを${isEditing ? '更新' : '作成'}しました`)
        resetForm()
        setShowModal(false)
        fetchProjects()
      }
    } catch {
      setError('エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setName('')
    setFtpHost('')
    setFtpUser('')
    setFtpPassword('')
    setFtpPort('21')
    setFtpPath('/')
    setPublicUrl('')
    setTargetFiles('')
    setEditingProject(null)
  }

  const handleOpenCreateModal = () => {
    resetForm()
    setShowModal(true)
  }

  const handleOpenEditModal = (project: Project) => {
    setEditingProject(project)
    setName(project.name)
    setFtpHost(project.ftp_host)
    setFtpUser(project.ftp_user)
    setFtpPassword('') // Password is not filled for security
    setFtpPort(project.ftp_port.toString())
    setFtpPath(project.ftp_path || '/')
    setPublicUrl(project.public_url || '')
    setTargetFiles(project.target_files ? project.target_files.join('\n') : '')
    setShowModal(true)
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('このプロジェクトを削除しますか？')) return

    try {
      const response = await fetch(`/api/admin/projects?id=${projectId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSuccess('プロジェクトを削除しました')
        fetchProjects()
      } else {
        setError('プロジェクト削除に失敗しました')
      }
    } catch {
      setError('エラーが発生しました')
    }
  }

  const handleOpenAssignModal = async (project: Project) => {
    setSelectedProject(project)
    await fetchProjectAssignments(project.id)
    setShowAssignModal(true)
  }

  const handleAssignUser = async (userId: string) => {
    if (!selectedProject) return

    try {
      const response = await fetch('/api/admin/projects/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProject.id,
          user_id: userId,
        }),
      })

      if (response.ok) {
        await fetchProjectAssignments(selectedProject.id)
      }
    } catch {
      setError('割り当てに失敗しました')
    }
  }

  const handleUnassignUser = async (assignmentId: string) => {
    try {
      const response = await fetch(`/api/admin/projects/assign?id=${assignmentId}`, {
        method: 'DELETE',
      })

      if (response.ok && selectedProject) {
        await fetchProjectAssignments(selectedProject.id)
      }
    } catch {
      setError('割り当て解除に失敗しました')
    }
  }

  const assignedUserIds = projectAssignments.map(a => a.user_id)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            プロジェクト管理 (v1.1)
          </h1>
          <p className="text-slate-400">
            FTP設定の追加・ユーザーへの割り当て
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          新規プロジェクト
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-500/20 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 text-center text-slate-400 py-12">読み込み中...</div>
        ) : projects.length === 0 ? (
          <div className="col-span-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
            <p className="text-slate-400">プロジェクトがありません</p>
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/project/${project.id}`}
                    className="p-2 text-slate-400 hover:text-green-400 transition-colors"
                    title="エディタを開く"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Link>
                  <button
                    onClick={() => handleOpenEditModal(project)}
                    className="p-2 text-slate-400 hover:text-yellow-400 transition-colors"
                    title="編集"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleOpenAssignModal(project)}
                    className="p-2 text-slate-400 hover:text-blue-400 transition-colors"
                    title="ユーザー割り当て"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                    title="削除"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-2">
                {project.name}
              </h3>
              
              <div className="space-y-1 text-sm text-slate-400">
                <p>ホスト: {project.ftp_host}</p>
                <p>ユーザー: {project.ftp_user}</p>
                <p>パス: {project.ftp_path}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingProject ? 'プロジェクト編集' : '新規プロジェクト作成'}
            </h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  プロジェクト名
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：山田商店 ホームページ"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    FTPホスト
                  </label>
                  <input
                    type="text"
                    value={ftpHost}
                    onChange={(e) => setFtpHost(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ftp.example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    ポート
                  </label>
                  <input
                    type="number"
                    value={ftpPort}
                    onChange={(e) => setFtpPort(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    FTPユーザー
                  </label>
                  <input
                    type="text"
                    value={ftpUser}
                    onChange={(e) => setFtpUser(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    FTPパスワード {editingProject && '(変更しない場合は空欄)'}
                  </label>
                  <input
                    type="password"
                    value={ftpPassword}
                    onChange={(e) => setFtpPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={!editingProject}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  FTPパス（ルートディレクトリ）
                </label>
                <input
                  type="text"
                  value={ftpPath}
                  onChange={(e) => setFtpPath(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="/public_html"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  編集対象ファイル（1行に1ファイル）
                </label>
                <textarea
                  value={targetFiles}
                  onChange={(e) => setTargetFiles(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                  placeholder="index.html&#10;news.html&#10;menu.html"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 px-4 py-3 bg-white/5 text-slate-300 font-medium rounded-lg hover:bg-white/10 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all"
                >
                  {saving ? (editingProject ? '更新中...' : '作成中...') : (editingProject ? '更新' : '作成')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-2">
              ユーザー割り当て
            </h2>
            <p className="text-slate-400 mb-6">{selectedProject.name}</p>
            
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-slate-300">割り当て済みユーザー</h3>
              {projectAssignments.length === 0 ? (
                <p className="text-slate-500 text-sm">なし</p>
              ) : (
                <div className="space-y-2">
                  {projectAssignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2">
                      <span className="text-white">{assignment.profile?.email}</span>
                      <button
                        onClick={() => handleUnassignUser(assignment.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-slate-300">未割り当てユーザー</h3>
              {users.length === 0 ? (
                <p className="text-slate-500 text-sm">ユーザーがいません。「ユーザー管理」から追加してください。</p>
              ) : users.filter(u => !assignedUserIds.includes(u.id)).length === 0 ? (
                <p className="text-slate-500 text-sm">すべてのユーザーが割り当て済みです</p>
              ) : (
                <div className="space-y-2">
                  {users.filter(u => !assignedUserIds.includes(u.id)).map((user) => (
                    <div key={user.id} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2">
                      <span className="text-white">{user.email}</span>
                      <button
                        onClick={() => handleAssignUser(user.id)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <button
              onClick={() => setShowAssignModal(false)}
              className="w-full px-4 py-3 bg-white/5 text-slate-300 font-medium rounded-lg hover:bg-white/10 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
