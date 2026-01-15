import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeFile } from '@/lib/ftp'
import type { Project } from '@/lib/types'

export async function POST(request: Request) {
  try {
    const { project_id, file_path, content } = await request.json()

    if (!project_id || !file_path || content === undefined) {
      return NextResponse.json(
        { error: 'プロジェクトID、ファイルパス、コンテンツは必須です' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // Check if user has access to the project
    const { data: assignment } = await supabase
      .from('user_projects')
      .select('*')
      .eq('user_id', user.id)
      .eq('project_id', project_id)
      .single()

    // Also allow admin access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!assignment && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'このプロジェクトへのアクセス権がありません' }, { status: 403 })
    }

    // Get project details
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single() as { data: Project | null }

    if (!project) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません' }, { status: 404 })
    }

    // Write file to FTP
    await writeFile({
      host: project.ftp_host,
      user: project.ftp_user,
      encryptedPassword: project.ftp_password_encrypted,
      port: project.ftp_port,
      path: project.ftp_path,
    }, file_path, content)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error writing FTP file:', error)
    return NextResponse.json(
      { error: 'ファイル保存中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
