import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readFile } from '@/lib/ftp'
import type { Project } from '@/lib/types'

export async function POST(request: Request) {
  let requestFilePath = ''

  try {
    const { project_id, file_path } = await request.json()
    requestFilePath = file_path || ''

    if (!project_id || !file_path) {
      return NextResponse.json(
        { error: 'プロジェクトIDとファイルパスは必須です' },
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

    // Read file from FTP
    const content = await readFile({
      host: project.ftp_host,
      user: project.ftp_user,
      encryptedPassword: project.ftp_password_encrypted,
      port: project.ftp_port,
      path: project.ftp_path,
    }, file_path)

    return NextResponse.json({ success: true, content })
  } catch (error: any) {
    console.error('Error reading FTP file:', error)
    
    let errorMessage = `ファイル読み込み失敗: ${error.message || '不明なエラー'}`
    
    // Add helpful hint for 550 errors with non-ASCII characters
    if ((error.code === 550 || error.message?.includes('550')) && /[^\x00-\x7F]/.test(requestFilePath)) {
      errorMessage += ' (ヒント: 日本語のフォルダ名やファイル名が含まれているため、サーバーが認識できない可能性があります。フォルダ名を半角英数字に変更してみてください)'
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
