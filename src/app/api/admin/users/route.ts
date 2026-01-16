import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { email, password, role } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'メールアドレスとパスワードは必須です' },
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

    // Create user with admin client
    const adminSupabase = await createAdminClient()
    // Create user with admin client
    let userId: string | undefined
    let createdUser: any

    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      // Regardless of the specific error, check if the user actually exists.
      // This handles "User already registered" (422/400) and ensures we recover zombies.
      
      const { data: existingUsers } = await adminSupabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      })
      
      const targetEmail = email.toLowerCase().trim()
      const existingUser = existingUsers.users.find(u => 
        u.email?.toLowerCase().trim() === targetEmail
      )

      if (existingUser) {
        // User DOES exist. Check profile.
        const { data: existingProfile } = await adminSupabase
          .from('profiles')
          .select('*')
          .eq('id', existingUser.id)
          .single()

        if (!existingProfile) {
          // Zombie user detected! Recover it.
          userId = existingUser.id
          
          // Update password to the new one provided (Resetting the zombie)
          const { error: updateError } = await adminSupabase.auth.admin.updateUserById(userId, { password })
          
          if (updateError) {
             console.error('Error updating zombie user password:', updateError)
          }
          
          // Proceed to create profile
        } else {
          // Genuine duplicate (User + Profile both exist)
          return NextResponse.json({ error: 'このメールアドレスは既に使用されています' }, { status: 400 })
        }
      } else {
        // User does NOT exist in our list, so the creation error was genuine (e.g. Weak Password, DB connectivity)
        // OR filtering failed (unlikely with 1000 limit but possible)
        console.error('Create failed and user not found:', createError)
        
        // Return detailed debug info to the user/UI
        return NextResponse.json({ 
          error: `ユーザー作成エラー: ${createError.message}`,
          debug: {
            authError: createError.message,
            usersFoundInList: existingUsers?.users?.length || 0,
            searchTarget: targetEmail,
            message: 'Authユーザーは見つかりましたが、リスト取得で特定できませんでした。'
          }
        }, { status: 400 })
      }
    } else {
      createdUser = newUser.user
      userId = newUser.user?.id
    }

    // Create profile if userId is available (either new or recovered)
    if (userId) {
      await adminSupabase.from('profiles').insert({
        id: userId,
        email: email,
        role: role || 'user',
      })
    }

    return NextResponse.json({ success: true, user: createdUser })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'ユーザー作成中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return NextResponse.json({ error: 'ユーザーIDは必須です' }, { status: 400 })
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

    // Prevent self-deletion
    if (userId === user.id) {
      return NextResponse.json({ error: '自分自身は削除できません' }, { status: 400 })
    }

    // Delete user with admin client
    const adminSupabase = await createAdminClient()
    
    // Delete profile first
    await adminSupabase.from('profiles').delete().eq('id', userId)
    
    // Delete user assignments
    await adminSupabase.from('user_projects').delete().eq('user_id', userId)
    
    // Delete auth user
    await adminSupabase.auth.admin.deleteUser(userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'ユーザー削除中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
