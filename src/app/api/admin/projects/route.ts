import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/encryption'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, ftp_host, ftp_user, ftp_password, ftp_port, ftp_path, public_url, target_files } = body

    if (!name || !ftp_host || !ftp_user || !ftp_password) {
      return NextResponse.json(
        { error: '必須項目を入力してください' },
        { status: 400 }
      )
    }

    // Check if current user is admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // Encrypt FTP password
    const encryptedPassword = encrypt(ftp_password)

    // Create project
    const { data: project, error: createError } = await supabase
      .from('projects')
      .insert({
        name,
        ftp_host,
        ftp_user,
        ftp_password_encrypted: encryptedPassword,
        ftp_port: ftp_port || 21,
        ftp_path: ftp_path || '/',
        public_url: public_url || null,
        target_files: target_files || [],
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, project })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'プロジェクト作成中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, name, ftp_host, ftp_user, ftp_password, ftp_port, ftp_path, public_url, target_files } = body

    if (!id || !name || !ftp_host || !ftp_user) {
      return NextResponse.json(
        { error: '必須項目を入力してください' },
        { status: 400 }
      )
    }

    // Check if current user is admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // Prepare update data
    const updateData: any = {
      name,
      ftp_host,
      ftp_user,
      ftp_port: ftp_port || 21,
      ftp_path: ftp_path || '/',
      public_url: public_url || null,
      target_files: target_files || [],
    }

    // Only update password if provided
    if (ftp_password) {
      updateData.ftp_password_encrypted = encrypt(ftp_password)
    }

    // Update project
    const { data: project, error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, project })
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'プロジェクト更新中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('id')

    if (!projectId) {
      return NextResponse.json({ error: 'プロジェクトIDは必須です' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // Delete assignments first
    await supabase.from('user_projects').delete().eq('project_id', projectId)
    
    // Delete project
    await supabase.from('projects').delete().eq('id', projectId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'プロジェクト削除中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
