"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { ArrowLeft, Play, CheckCircle, BookOpen, Award } from 'lucide-react'

interface Course {
  id: string
  name: string
  description: string
  sections: Section[]
}

interface Section {
  id: string
  title: string
  order_index: number
  lessons: Lesson[]
}

interface Lesson {
  id: string
  title: string
  content: string | null
  video_url: string | null
  order_index: number
  completed: boolean
}

interface CourseProgress {
  completed_lessons: number
  total_lessons: number
  progress_percentage: number
}

export default function CourseViewPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const locale = params.locale as string

  const [course, setCourse] = useState<Course | null>(null)
  const [progress, setProgress] = useState<CourseProgress | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (courseId) {
      fetchCourseData()
    }
  }, [courseId])

  const fetchCourseData = async () => {
    try {
      setLoading(true)
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return

      // Check if student is enrolled
      const { data: enrollment, error: enrollError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', user.id)
        .eq('course_id', courseId)
        .single()

      if (enrollError || !enrollment) {
        toast.error('You are not enrolled in this course')
        router.push(`/${locale}/dashboard/student`)
        return
      }

      // Fetch course with sections and lessons
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`
          id,
          name,
          description,
          sections (
            id,
            title,
            order_index,
            lessons (
              id,
              title,
              content,
              video_url,
              order_index
            )
          )
        `)
        .eq('id', courseId)
        .single()

      if (courseError) throw courseError

      // Get progress for each lesson
      const allLessons = courseData.sections?.flatMap((section: any) =>
        section.lessons?.map((lesson: any) => lesson.id) || []
      ) || []

      const { data: progressData, error: progressError } = await supabase
        .from('progress')
        .select('lesson_id, completed')
        .eq('student_id', user.id)
        .in('lesson_id', allLessons)

      if (progressError) throw progressError

      const progressMap = new Map(
        progressData?.map((p: any) => [p.lesson_id, p.completed]) || []
      )

      // Build course structure with progress
      const formattedCourse: Course = {
        id: courseData.id,
        name: courseData.name,
        description: courseData.description,
        sections: (courseData.sections || []).map((section: any) => ({
          id: section.id,
          title: section.title,
          order_index: section.order_index,
          lessons: (section.lessons || [])
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((lesson: any) => ({
              ...lesson,
              completed: progressMap.get(lesson.id) || false
            }))
        })).sort((a: any, b: any) => a.order_index - b.order_index)
      }

      setCourse(formattedCourse)

      // Calculate overall progress
      const totalLessons = allLessons.length
      const completedLessons = progressData?.filter((p: any) => p.completed).length || 0

      setProgress({
        completed_lessons: completedLessons,
        total_lessons: totalLessons,
        progress_percentage: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0
      })

    } catch (error) {
      console.error('Error fetching course data:', error)
      toast.error('Failed to load course')
    } finally {
      setLoading(false)
    }
  }

  const startLesson = (lessonId: string) => {
    router.push(`/${locale}/dashboard/student/course/${courseId}/lesson/${lessonId}`)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading course...</div>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Course not found</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push(`/${locale}/dashboard/student`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{course.name}</h1>
          {course.description && (
            <p className="text-muted-foreground">{course.description}</p>
          )}
        </div>
      </div>

      {/* Progress Overview */}
      {progress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {progress.completed_lessons} of {progress.total_lessons} lessons completed
                </span>
                <Badge variant="secondary">
                  {Math.round(progress.progress_percentage)}%
                </Badge>
              </div>
              <Progress value={progress.progress_percentage} className="h-3" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Course Content */}
      <div className="space-y-6">
        {course.sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {section.lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {lesson.completed ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Play className="h-5 w-5 text-blue-500" />
                      )}
                      <div>
                        <h4 className="font-medium">{lesson.title}</h4>
                        {lesson.video_url && (
                          <p className="text-sm text-muted-foreground">Includes video content</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {lesson.completed && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Completed
                        </Badge>
                      )}
                      <Button
                        onClick={() => startLesson(lesson.id)}
                        variant={lesson.completed ? "outline" : "default"}
                      >
                        {lesson.completed ? 'Review' : 'Start'}
                      </Button>
                    </div>
                  </div>
                ))}

                {section.lessons.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    No lessons in this section yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}