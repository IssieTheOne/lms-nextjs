import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, role, teacherId } = await request.json()

    if (!email || !password || !fullName || !role || !teacherId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create the user account
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password.trim(),
      email_confirm: true
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Check if a profile already exists for this user (created by the trigger)
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    let profileData

    if (existingProfile) {
      // Update the existing profile
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          email: email.trim(),
          full_name: fullName.trim(),
          role: role,
          is_active: true,
          is_archived: false
        })
        .eq('id', authData.user.id)
        .select()
        .single()

      if (updateError) {
        console.error('Profile update error:', updateError)
        // Try to delete the created user if profile update fails
        try {
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
          console.log('Cleaned up auth user after profile update failure')
        } catch (cleanupError) {
          console.error('Failed to cleanup auth user:', cleanupError)
        }

        return NextResponse.json(
          { error: `Failed to update user profile: ${updateError.message}` },
          { status: 500 }
        )
      }

      profileData = updatedProfile
    } else {
      // Create a new profile (this shouldn't happen with the trigger, but just in case)
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: email.trim(),
          full_name: fullName.trim(),
          role: role,
          is_active: true,
          is_archived: false
        })
        .select()
        .single()

      if (insertError) {
        console.error('Profile creation error:', insertError)
        // Try to delete the created user if profile creation fails
        try {
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
          console.log('Cleaned up auth user after profile creation failure')
        } catch (cleanupError) {
          console.error('Failed to cleanup auth user:', cleanupError)
        }

        return NextResponse.json(
          { error: `Failed to create user profile: ${insertError.message}` },
          { status: 500 }
        )
      }

      profileData = newProfile
    }

    // Update the teacher record to link it to the new profile
    const { error: teacherError } = await supabaseAdmin
      .from('teachers')
      .update({ 
        profile_id: profileData.id,
        id: profileData.id  // Update teacher ID to match profile ID for consistency
      })
      .eq('id', teacherId)

    if (teacherError) {
      console.error('Teacher update error:', teacherError)
      // If updating the teacher ID fails (because it's already used), just update profile_id
      const { error: teacherError2 } = await supabaseAdmin
        .from('teachers')
        .update({ 
          profile_id: profileData.id
        })
        .eq('id', teacherId)

      if (teacherError2) {
        console.error('Teacher profile_id update also failed:', teacherError2)
        // Don't fail the whole operation - the profile was created successfully
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: profileData.id,
        email: profileData.email,
        full_name: profileData.full_name
      }
    })

  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}