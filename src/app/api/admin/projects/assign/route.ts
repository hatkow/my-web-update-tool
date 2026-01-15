import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { project_id, user_id } = await request.json()

    if (!project_id || !user_id) {
      return NextResponse.json(
        { error: 'プロジェクトIDとユーザーIDは必須です' },
        { status: 400 }
      )
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

    // Check if already assigned
    const { data: existing } = await supabase
      .from('user_projects')
      .select('id')
      .eq('project_id', project_id)
      .eq('user_id', user_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'すでに割り当て済みです' }, { status: 400 })
    }

    // Create assignment
    const { error: createError } = await supabase
      .from('user_projects')
      .insert({ project_id, user_id })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error assigning user:', error)
    return NextResponse.json(
      { error: '割り当て中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('id')

    if (!assignmentId) {
      return NextResponse.json({ error: '割り当てIDは必須です' }, { status: 400 })
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

    await supabase.from('user_projects').delete().eq('id', assignmentId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unassigning user:', error)
    return NextResponse.json(
      { error: '割り当て解除中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
