"use client"

import { createClient } from '@/lib/supabase'

const supabase = createClient()

export interface BadgeCriteria {
  type: 'xp_threshold' | 'courses_completed' | 'lessons_completed' | 'streak_days'
  value: number
}

export interface Badge {
  id: string
  name: string
  description: string
  xp_reward: number
  criteria: BadgeCriteria
}

/**
 * Award XP to a student for completing a lesson
 */
export async function awardLessonXP(studentId: string, lessonId: string): Promise<void> {
  try {
    // Check if already awarded
    const { data: existingProgress } = await supabase
      .from('progress')
      .select('completed')
      .eq('student_id', studentId)
      .eq('lesson_id', lessonId)
      .single()

    if (existingProgress?.completed) {
      return // Already completed
    }

    // Mark lesson as completed and award XP
    const { error } = await supabase
      .from('progress')
      .upsert({
        student_id: studentId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString()
      })

    if (error) throw error

    // Award XP to student profile
    const { error: xpError } = await supabase.rpc('increment_student_xp', {
      student_id: studentId,
      xp_amount: 10 // 10 XP per lesson
    })

    if (xpError) {
      console.error('Error awarding XP:', xpError)
    }

    // Check for badge awards
    await checkAndAwardBadges(studentId)

  } catch (error) {
    console.error('Error awarding lesson XP:', error)
    throw error
  }
}

/**
 * Check and award badges based on student progress
 */
export async function checkAndAwardBadges(studentId: string): Promise<void> {
  try {
    // Get student stats
    const stats = await getStudentStats(studentId)

    // Get all available badges
    const { data: badges, error } = await supabase
      .from('badges')
      .select('*')

    if (error) throw error

    for (const badge of badges || []) {
      // Check if student already has this badge
      const { data: existingBadge } = await supabase
        .from('student_badges')
        .select('id')
        .eq('student_id', studentId)
        .eq('badge_id', badge.id)
        .single()

      if (existingBadge) continue // Already has this badge

      // Check if criteria is met
      const criteria = badge.criteria as BadgeCriteria
      let criteriaMet = false

      switch (criteria.type) {
        case 'xp_threshold':
          criteriaMet = stats.total_xp >= criteria.value
          break
        case 'courses_completed':
          criteriaMet = stats.courses_completed >= criteria.value
          break
        case 'lessons_completed':
          criteriaMet = stats.lessons_completed >= criteria.value
          break
        case 'streak_days':
          // For now, we'll skip streak tracking
          criteriaMet = false
          break
      }

      if (criteriaMet) {
        // Award the badge
        const { error: awardError } = await supabase
          .from('student_badges')
          .insert({
            student_id: studentId,
            badge_id: badge.id
          })

        if (awardError) {
          console.error('Error awarding badge:', awardError)
          continue
        }

        // Award XP for the badge
        const { error: xpError } = await supabase.rpc('increment_student_xp', {
          student_id: studentId,
          xp_amount: badge.xp_reward
        })

        if (xpError) {
          console.error('Error awarding badge XP:', xpError)
        }

        console.log(`Badge "${badge.name}" awarded to student ${studentId}`)
      }
    }
  } catch (error) {
    console.error('Error checking badges:', error)
  }
}

/**
 * Get comprehensive student statistics
 */
export async function getStudentStats(studentId: string) {
  try {
    // Get XP from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('xp_points')
      .eq('id', studentId)
      .single()

    // Get completed lessons count
    const { count: lessonsCompleted } = await supabase
      .from('progress')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('completed', true)

    // Get completed courses count
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`
        course:courses (
          sections (
            lessons (
              id
            )
          )
        )
      `)
      .eq('student_id', studentId)

    let coursesCompleted = 0
    if (enrollments) {
      for (const enrollment of enrollments) {
        const course = (enrollment as any).course
        const totalLessons = course.sections?.reduce((acc: number, section: any) =>
          acc + (section.lessons?.length || 0), 0) || 0

        if (totalLessons > 0) {
          const { count: completedLessons } = await supabase
            .from('progress')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', studentId)
            .eq('completed', true)
            .in('lesson_id',
              course.sections?.flatMap((section: any) =>
                section.lessons?.map((lesson: any) => lesson.id) || []
              ) || []
            )

          if ((completedLessons || 0) === totalLessons) {
            coursesCompleted++
          }
        }
      }
    }

    return {
      total_xp: profile?.xp_points || 0,
      lessons_completed: lessonsCompleted || 0,
      courses_completed: coursesCompleted
    }
  } catch (error) {
    console.error('Error getting student stats:', error)
    return {
      total_xp: 0,
      lessons_completed: 0,
      courses_completed: 0
    }
  }
}

/**
 * Create default badges for the system
 */
export async function createDefaultBadges(): Promise<void> {
  const defaultBadges = [
    {
      name: 'First Steps',
      description: 'Complete your first lesson',
      xp_reward: 25,
      criteria: { type: 'lessons_completed' as const, value: 1 }
    },
    {
      name: 'Learning Enthusiast',
      description: 'Complete 10 lessons',
      xp_reward: 50,
      criteria: { type: 'lessons_completed' as const, value: 10 }
    },
    {
      name: 'Knowledge Seeker',
      description: 'Complete 50 lessons',
      xp_reward: 100,
      criteria: { type: 'lessons_completed' as const, value: 50 }
    },
    {
      name: 'Course Champion',
      description: 'Complete your first course',
      xp_reward: 75,
      criteria: { type: 'courses_completed' as const, value: 1 }
    },
    {
      name: 'Academic Excellence',
      description: 'Complete 5 courses',
      xp_reward: 200,
      criteria: { type: 'courses_completed' as const, value: 5 }
    },
    {
      name: 'XP Explorer',
      description: 'Earn 100 XP',
      xp_reward: 30,
      criteria: { type: 'xp_threshold' as const, value: 100 }
    },
    {
      name: 'XP Master',
      description: 'Earn 500 XP',
      xp_reward: 100,
      criteria: { type: 'xp_threshold' as const, value: 500 }
    },
    {
      name: 'XP Legend',
      description: 'Earn 1000 XP',
      xp_reward: 250,
      criteria: { type: 'xp_threshold' as const, value: 1000 }
    }
  ]

  for (const badge of defaultBadges) {
    const { error } = await supabase
      .from('badges')
      .upsert({
        name: badge.name,
        description: badge.description,
        xp_reward: badge.xp_reward,
        criteria: badge.criteria
      }, {
        onConflict: 'name'
      })

    if (error) {
      console.error('Error creating badge:', badge.name, error)
    }
  }
}