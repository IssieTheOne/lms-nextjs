"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Download, Users, BookOpen, TrendingUp, Award, Calendar } from 'lucide-react'

interface CourseReport {
  id: string
  title: string
  enrollments: number
  completionRate: number
  averageProgress: number
  totalLessons: number
  totalQuizzes: number
  studentProgress: StudentProgress[]
}

interface StudentProgress {
  id: string
  name: string
  email: string
  progress: number
  completedLessons: number
  totalLessons: number
  lastActivity: string
  quizScores: number[]
}

export default function TeacherReportsPage() {
  const [courses, setCourses] = useState<CourseReport[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchCourseReports()
  }, [])

  const fetchCourseReports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get courses created by this teacher
      const { data: teacherCourses } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          sections (
            id,
            lessons (
              id,
              title,
              quizzes (id, title)
            )
          ),
          enrollments (
            id,
            progress (completed, lesson_id),
            profiles (
              id,
              full_name,
              email
            )
          )
        `)
        .eq('created_by', user.id)

      const courseReports = teacherCourses?.map(course => {
        const enrollments = course.enrollments || []
        const totalLessons = course.sections?.reduce((acc: number, section: any) =>
          acc + (section.lessons?.length || 0), 0) || 0
        const totalQuizzes = course.sections?.reduce((acc: number, section: any) =>
          acc + (section.lessons?.reduce((lessonAcc: number, lesson: any) =>
            lessonAcc + (lesson.quizzes?.length || 0), 0) || 0), 0) || 0

        const completedEnrollments = enrollments.filter((e: any) => {
          const completedLessons = e.progress?.filter((p: any) => p.completed).length || 0
          return completedLessons === totalLessons
        }).length

        const averageProgress = enrollments.length > 0
          ? enrollments.reduce((acc: number, e: any) => {
              const completedLessons = e.progress?.filter((p: any) => p.completed).length || 0
              return acc + (completedLessons / totalLessons) * 100
            }, 0) / enrollments.length
          : 0

        const studentProgress = enrollments.map((e: any) => {
          const completedLessons = e.progress?.filter((p: any) => p.completed).length || 0

          return {
            id: e.profiles?.id,
            name: e.profiles?.full_name || 'Unknown',
            email: e.profiles?.email || '',
            progress: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0,
            completedLessons,
            totalLessons,
            lastActivity: 'Active', // Would need actual timestamps
            quizScores: [] // Would need to fetch actual quiz scores
          }
        })

        return {
          id: course.id,
          title: course.title,
          enrollments: enrollments.length,
          completionRate: enrollments.length > 0 ? (completedEnrollments / enrollments.length) * 100 : 0,
          averageProgress,
          totalLessons,
          totalQuizzes,
          studentProgress
        }
      }) || []

      setCourses(courseReports)
    } catch (error) {
      console.error('Error fetching course reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportCourseReport = (courseId: string) => {
    // In a real implementation, this would generate and download a CSV/PDF
    console.log(`Exporting report for course ${courseId}...`)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Course Reports</h2>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading course reports...</div>
        </div>
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Course Reports</h2>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Courses Created</h3>
              <p className="text-muted-foreground">
                You haven't created any courses yet. Visit the course builder to create your first course.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Course Reports</h2>
        <Button variant="outline" onClick={() => exportCourseReport('all')}>
          <Download className="w-4 h-4 mr-2" />
          Export All Reports
        </Button>
      </div>

      {/* Course Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map(course => (
          <Card key={course.id} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedCourse(selectedCourse === course.id ? null : course.id)}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{course.title}</CardTitle>
              <CardDescription>{course.enrollments} students enrolled</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Completion Rate</div>
                    <div className="font-semibold text-lg">{course.completionRate.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Avg Progress</div>
                    <div className="font-semibold text-lg">{course.averageProgress.toFixed(1)}%</div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Class Progress</span>
                    <span>{course.averageProgress.toFixed(1)}%</span>
                  </div>
                  <Progress value={course.averageProgress} className="h-2" />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span>Content</span>
                  <span className="font-medium">{course.totalLessons} lessons, {course.totalQuizzes} quizzes</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Course Report */}
      {selectedCourse && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Student Progress Report</CardTitle>
                <CardDescription>
                  Detailed progress for {courses.find(c => c.id === selectedCourse)?.title}
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => exportCourseReport(selectedCourse)}>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {courses.find(c => c.id === selectedCourse)?.studentProgress.map(student => (
                <div key={student.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{student.name}</h4>
                      <p className="text-sm text-muted-foreground">{student.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{student.lastActivity}</Badge>
                      <Badge variant={student.progress === 100 ? "default" : "secondary"}>
                        {student.progress.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                    <div>
                      <div className="text-muted-foreground">Lessons Completed</div>
                      <div className="font-medium">{student.completedLessons}/{student.totalLessons}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Quiz Average</div>
                      <div className="font-medium">
                        {student.quizScores.length > 0
                          ? (student.quizScores.reduce((a, b) => a + b, 0) / student.quizScores.length).toFixed(1) + '%'
                          : 'No quizzes taken'
                        }
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Status</div>
                      <div className="font-medium">
                        {student.progress === 100 ? 'Completed' : student.progress > 0 ? 'In Progress' : 'Not Started'}
                      </div>
                    </div>
                  </div>

                  <Progress value={student.progress} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}