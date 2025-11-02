"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ArrowLeft, Play, CheckCircle, Award, Clock } from 'lucide-react'
import { awardLessonXP } from '@/lib/xp-system'

interface Lesson {
  id: string
  title: string
  content: string | null
  video_url: string | null
  completed: boolean
  section_title: string
}

interface NavigationInfo {
  previous_lesson?: { id: string; title: string }
  next_lesson?: { id: string; title: string }
}

export default function LessonViewPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const lessonId = params.lessonId as string

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [navigation, setNavigation] = useState<NavigationInfo>({})
  const [loading, setLoading] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [xpAwarded, setXpAwarded] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (courseId && lessonId) {
      fetchLessonData()
    }
  }, [courseId, lessonId])

  const fetchLessonData = async () => {
    try {
      setLoading(true)
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return

      // Check enrollment
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', user.id)
        .eq('course_id', courseId)
        .single()

      if (!enrollment) {
        toast.error('You are not enrolled in this course')
        router.push('/dashboard/student')
        return
      }

      // Fetch lesson with section info
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          content,
          video_url,
          section:sections (
            title
          )
        `)
        .eq('id', lessonId)
        .single()

      if (lessonError) throw lessonError

      // Check if completed
      const { data: progress } = await supabase
        .from('progress')
        .select('completed')
        .eq('student_id', user.id)
        .eq('lesson_id', lessonId)
        .single()

      setLesson({
        id: lessonData.id,
        title: lessonData.title,
        content: lessonData.content,
        video_url: lessonData.video_url,
        completed: progress?.completed || false,
        section_title: (lessonData.section as any)?.title || 'Unknown Section'
      })

      // Get navigation info (previous/next lessons in the course)
      await fetchNavigationInfo()

    } catch (error) {
      console.error('Error fetching lesson:', error)
      toast.error('Failed to load lesson')
    } finally {
      setLoading(false)
    }
  }

  const fetchNavigationInfo = async () => {
    try {
      // Get all lessons in the course ordered by section and lesson order
      const { data: allLessons, error } = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          section:sections (
            order_index
          )
        `)
        .eq('section.course_id', courseId)
        .order('section.order_index')
        .order('order_index')

      if (error) throw error

      const currentIndex = allLessons?.findIndex((l: any) => l.id === lessonId) || -1

      if (currentIndex > 0) {
        const prevLesson = allLessons?.[currentIndex - 1]
        setNavigation(prev => ({
          ...prev,
          previous_lesson: prevLesson ? {
            id: prevLesson.id,
            title: prevLesson.title
          } : undefined
        }))
      }

      if (currentIndex >= 0 && currentIndex < (allLessons?.length || 0) - 1) {
        const nextLesson = allLessons?.[currentIndex + 1]
        setNavigation(prev => ({
          ...prev,
          next_lesson: nextLesson ? {
            id: nextLesson.id,
            title: nextLesson.title
          } : undefined
        }))
      }
    } catch (error) {
      console.error('Error fetching navigation:', error)
    }
  }

  const completeLesson = async () => {
    if (!lesson || lesson.completed) return

    try {
      setCompleting(true)
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return

      // Award XP and mark as completed
      await awardLessonXP(user.id, lessonId)

      // Update local state
      setLesson(prev => prev ? { ...prev, completed: true } : null)
      setXpAwarded(true)

      toast.success('Lesson completed! +10 XP earned!')

      // Check for badge awards after a short delay
      setTimeout(() => {
        // This will be handled by the awardLessonXP function
      }, 1000)

    } catch (error) {
      console.error('Error completing lesson:', error)
      toast.error('Failed to complete lesson')
    } finally {
      setCompleting(false)
    }
  }

  const navigateToLesson = (lessonId: string) => {
    router.push(`/dashboard/student/course/${courseId}/lesson/${lessonId}`)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading lesson...</div>
        </div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Lesson not found</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push(`/dashboard/student/course/${courseId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">{lesson.section_title}</p>
            <h1 className="text-2xl font-bold">{lesson.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lesson.completed && (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}
          {xpAwarded && (
            <Badge variant="secondary">
              <Award className="h-3 w-3 mr-1" />
              +10 XP Earned!
            </Badge>
          )}
        </div>
      </div>

      {/* Lesson Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Content */}
          {lesson.video_url && (
            <Card>
              <CardContent className="p-0">
                <div className="aspect-video">
                  {lesson.video_url.includes('youtube.com') || lesson.video_url.includes('youtu.be') ? (
                    <iframe
                      src={lesson.video_url.replace('watch?v=', 'embed/')}
                      className="w-full h-full rounded-t-lg"
                      allowFullScreen
                      title="Lesson Video"
                    />
                  ) : (
                    <video
                      src={lesson.video_url}
                      controls
                      className="w-full h-full rounded-t-lg"
                      poster="/video-placeholder.jpg"
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Text Content */}
          {lesson.content && (
            <Card>
              <CardHeader>
                <CardTitle>Lesson Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: lesson.content.replace(/\n/g, '<br>')
                  }}
                />
              </CardContent>
            </Card>
          )}

          {!lesson.video_url && !lesson.content && (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">No content available for this lesson.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Completion Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Lesson Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lesson.completed ? (
                <div className="text-center space-y-3">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                  <p className="text-green-700 font-medium">Lesson Completed!</p>
                  <p className="text-sm text-muted-foreground">
                    Great job! You've earned 10 XP for completing this lesson.
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <Play className="h-12 w-12 text-blue-500 mx-auto" />
                  <p className="text-muted-foreground mb-4">
                    Complete this lesson to earn 10 XP
                  </p>
                  <Button
                    onClick={completeLesson}
                    disabled={completing}
                    className="w-full"
                  >
                    {completing ? 'Completing...' : 'Mark as Complete'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <Card>
            <CardHeader>
              <CardTitle>Navigation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {navigation.previous_lesson && (
                <Button
                  variant="outline"
                  onClick={() => navigateToLesson(navigation.previous_lesson!.id)}
                  className="w-full justify-start"
                >
                  ← {navigation.previous_lesson.title}
                </Button>
              )}

              {navigation.next_lesson && (
                <Button
                  onClick={() => navigateToLesson(navigation.next_lesson!.id)}
                  className="w-full justify-start"
                >
                  {navigation.next_lesson.title} →
                </Button>
              )}

              {!navigation.previous_lesson && !navigation.next_lesson && (
                <p className="text-sm text-muted-foreground text-center">
                  This is the only lesson in the course.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}