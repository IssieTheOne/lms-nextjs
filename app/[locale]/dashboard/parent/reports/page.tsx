"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Download, TrendingUp, Award, BookOpen, Calendar, User } from 'lucide-react'

interface StudentReport {
  id: string
  name: string
  email: string
  totalXP: number
  badgesEarned: number
  coursesEnrolled: number
  coursesCompleted: number
  averageProgress: number
  lastActivity: string
  recentAchievements: string[]
  courseProgress: CourseProgress[]
}

interface CourseProgress {
  courseId: string
  courseTitle: string
  progress: number
  completedLessons: number
  totalLessons: number
  lastAccessed: string
}

export default function ParentReportsPage() {
  const [students, setStudents] = useState<StudentReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchStudentReports()
  }, [])

  const fetchStudentReports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get linked students
      const { data: linkedStudents } = await supabase
        .from('parent_student_links')
        .select(`
          student_id,
          profiles!parent_student_links_student_id_fkey (
            id,
            full_name,
            email,
            enrollments (
              id,
              progress (completed, lesson_id),
              courses (
                id,
                title,
                sections (
                  lessons (id, title)
                )
              )
            ),
            student_badges (
              earned_at,
              badges (name, description, xp_required)
            )
          )
        `)
        .eq('parent_id', user.id)

      const studentReports = linkedStudents?.map((link: any) => {
        const student = link.profiles
        const enrollments = student?.enrollments || []
        const badges = student?.student_badges || []

        const totalXP = badges.reduce((acc: number, sb: any) => acc + (sb.badges?.xp_required || 0), 0)
        const coursesCompleted = enrollments.filter((e: any) => {
          const totalLessons = e.courses?.sections?.reduce((acc: number, s: any) => acc + (s.lessons?.length || 0), 0) || 0
          const completedLessons = e.progress?.filter((p: any) => p.completed).length || 0
          return completedLessons === totalLessons
        }).length

        const averageProgress = enrollments.length > 0
          ? enrollments.reduce((acc: number, e: any) => {
              const totalLessons = e.courses?.sections?.reduce((acc2: number, s: any) => acc2 + (s.lessons?.length || 0), 0) || 0
              const completedLessons = e.progress?.filter((p: any) => p.completed).length || 0
              return acc + (completedLessons / totalLessons) * 100
            }, 0) / enrollments.length
          : 0

        const courseProgress = enrollments.map((e: any) => {
          const totalLessons = e.courses?.sections?.reduce((acc: number, s: any) => acc + (s.lessons?.length || 0), 0) || 0
          const completedLessons = e.progress?.filter((p: any) => p.completed).length || 0

          return {
            courseId: e.courses?.id,
            courseTitle: e.courses?.title,
            progress: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0,
            completedLessons,
            totalLessons,
            lastAccessed: 'Recent' // Would need actual timestamps
          }
        })

        const recentAchievements = badges
          .sort((a: any, b: any) => new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime())
          .slice(0, 3)
          .map((sb: any) => sb.badges?.name)

        return {
          id: student?.id,
          name: student?.full_name || 'Unknown Student',
          email: student?.email || '',
          totalXP,
          badgesEarned: badges.length,
          coursesEnrolled: enrollments.length,
          coursesCompleted,
          averageProgress,
          lastActivity: 'Active this week',
          recentAchievements,
          courseProgress
        }
      }) || []

      setStudents(studentReports)
    } catch (error) {
      console.error('Error fetching student reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportStudentReport = (studentId: string) => {
    // In a real implementation, this would generate and download a PDF report
    console.log(`Exporting report for student ${studentId}...`)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Student Reports</h2>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading student reports...</div>
        </div>
      </div>
    )
  }

  if (students.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Student Reports</h2>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Linked Students</h3>
              <p className="text-muted-foreground">
                You haven't linked any students yet. Visit your dashboard to link students and view their progress.
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
        <h2 className="text-3xl font-bold">Student Reports</h2>
        <Button variant="outline" onClick={() => exportStudentReport('all')}>
          <Download className="w-4 h-4 mr-2" />
          Export All Reports
        </Button>
      </div>

      {/* Student Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.map(student => (
          <Card key={student.id} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedStudent(selectedStudent === student.id ? null : student.id)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{student.name}</CardTitle>
                <Badge variant="outline">{student.lastActivity}</Badge>
              </div>
              <CardDescription>{student.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">XP Earned</div>
                    <div className="font-semibold text-lg">{student.totalXP}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Badges</div>
                    <div className="font-semibold text-lg">{student.badgesEarned}</div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Overall Progress</span>
                    <span>{student.averageProgress.toFixed(1)}%</span>
                  </div>
                  <Progress value={student.averageProgress} className="h-2" />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span>Courses Completed</span>
                  <span className="font-medium">{student.coursesCompleted}/{student.coursesEnrolled}</span>
                </div>

                {student.recentAchievements.length > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Recent Achievements</div>
                    <div className="flex flex-wrap gap-1">
                      {student.recentAchievements.map((achievement, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {achievement}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Student Report */}
      {selectedStudent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Detailed Progress Report</CardTitle>
                <CardDescription>
                  {students.find(s => s.id === selectedStudent)?.name}'s course progress and achievements
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => exportStudentReport(selectedStudent)}>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {students.find(s => s.id === selectedStudent)?.courseProgress.map(course => (
                <div key={course.courseId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">{course.courseTitle}</h4>
                    <Badge variant="secondary">{course.progress.toFixed(1)}% complete</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                    <div>
                      <div className="text-muted-foreground">Lessons Completed</div>
                      <div className="font-medium">{course.completedLessons}/{course.totalLessons}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Last Accessed</div>
                      <div className="font-medium">{course.lastAccessed}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Status</div>
                      <div className="font-medium">
                        {course.progress === 100 ? 'Completed' : course.progress > 0 ? 'In Progress' : 'Not Started'}
                      </div>
                    </div>
                  </div>

                  <Progress value={course.progress} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}