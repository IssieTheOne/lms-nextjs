"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Download, TrendingUp, Users, BookOpen, Award, Calendar } from 'lucide-react'

interface Stats {
  totalUsers: number
  totalCourses: number
  totalStudents: number
  totalTeachers: number
  totalEnrollments: number
  totalLessons: number
  totalQuizzes: number
  totalBadges: number
}

interface CourseStats {
  id: string
  title: string
  enrollments: number
  completionRate: number
  averageProgress: number
  totalLessons: number
  totalQuizzes: number
}

interface StudentProgress {
  id: string
  name: string
  email: string
  totalXP: number
  badgesEarned: number
  coursesEnrolled: number
  coursesCompleted: number
  averageProgress: number
  lastActivity: string
}

interface EnrollmentTrend {
  month: string
  enrollments: number
  completions: number
}

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalCourses: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalEnrollments: 0,
    totalLessons: 0,
    totalQuizzes: 0,
    totalBadges: 0
  })
  const [courseStats, setCourseStats] = useState<CourseStats[]>([])
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([])
  const [enrollmentTrends, setEnrollmentTrends] = useState<EnrollmentTrend[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      await Promise.all([
        fetchStats(),
        fetchCourseStats(),
        fetchStudentProgress(),
        fetchEnrollmentTrends()
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    // Get total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // Get users by role
    const { data: roleStats } = await supabase
      .from('profiles')
      .select('role')

    const totalStudents = roleStats?.filter(u => u.role === 'student').length || 0
    const totalTeachers = roleStats?.filter(u => u.role === 'teacher').length || 0

    // Get total courses
    const { count: totalCourses } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })

    // Get total enrollments
    const { count: totalEnrollments } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })

    // Get total lessons
    const { count: totalLessons } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })

    // Get total quizzes
    const { count: totalQuizzes } = await supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true })

    // Get total badges
    const { count: totalBadges } = await supabase
      .from('badges')
      .select('*', { count: 'exact', head: true })

    setStats({
      totalUsers: totalUsers || 0,
      totalCourses: totalCourses || 0,
      totalStudents,
      totalTeachers,
      totalEnrollments: totalEnrollments || 0,
      totalLessons: totalLessons || 0,
      totalQuizzes: totalQuizzes || 0,
      totalBadges: totalBadges || 0
    })
  }

  const fetchCourseStats = async () => {
    const { data: courses } = await supabase
      .from('courses')
      .select(`
        id,
        title,
        sections (
          id,
          lessons (
            id,
            quizzes (id)
          )
        ),
        enrollments (
          id,
          progress (
            completed
          )
        )
      `)

    const courseStats = courses?.map(course => {
      const enrollments = course.enrollments || []
      const totalLessons = course.sections?.reduce((acc, section) =>
        acc + (section.lessons?.length || 0), 0) || 0
      const totalQuizzes = course.sections?.reduce((acc, section) =>
        acc + (section.lessons?.reduce((lessonAcc, lesson) =>
          lessonAcc + (lesson.quizzes?.length || 0), 0) || 0), 0) || 0

      const completedEnrollments = enrollments.filter(e =>
        e.progress?.every(p => p.completed) && e.progress?.length === totalLessons
      ).length

      const averageProgress = enrollments.length > 0
        ? enrollments.reduce((acc, e) => {
            const progressCount = e.progress?.filter(p => p.completed).length || 0
            return acc + (progressCount / totalLessons) * 100
          }, 0) / enrollments.length
        : 0

      return {
        id: course.id,
        title: course.title,
        enrollments: enrollments.length,
        completionRate: enrollments.length > 0 ? (completedEnrollments / enrollments.length) * 100 : 0,
        averageProgress,
        totalLessons,
        totalQuizzes
      }
    }) || []

    setCourseStats(courseStats)
  }

  const fetchStudentProgress = async () => {
    const { data: students } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        enrollments (
          id,
          progress (completed),
          courses (title, sections (lessons (id)))
        ),
        student_badges (
          badges (name, xp_required)
        )
      `)
      .eq('role', 'student')
      .limit(50) // Limit for performance

    const studentProgress = students?.map(student => {
      const enrollments = student.enrollments || []
      const badges = student.student_badges || []

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

      return {
        id: student.id,
        name: student.full_name || 'Unknown',
        email: student.email || '',
        totalXP,
        badgesEarned: badges.length,
        coursesEnrolled: enrollments.length,
        coursesCompleted,
        averageProgress,
        lastActivity: 'Recent' // Would need to track actual activity
      }
    }) || []

    setStudentProgress(studentProgress)
  }

  const fetchEnrollmentTrends = async () => {
    try {
      // Get enrollment data grouped by month
      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select('enrolled_at')

      // Group by month and count
      const monthlyData: { [key: string]: number } = {}
      const completionData: { [key: string]: number } = {}

      enrollmentData?.forEach(enrollment => {
        const date = new Date(enrollment.enrolled_at)
        const monthKey = date.toLocaleDateString('en-US', { month: 'short' })

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = 0
          completionData[monthKey] = 0
        }
        monthlyData[monthKey]++
      })

      // Get completion data (this is simplified - in a real app you'd track course completions)
      const { data: progressData } = await supabase
        .from('progress')
        .select('completed, created_at')
        .eq('completed', true)

      progressData?.forEach(progress => {
        const date = new Date(progress.created_at)
        const monthKey = date.toLocaleDateString('en-US', { month: 'short' })

        if (!completionData[monthKey]) {
          completionData[monthKey] = 0
        }
        completionData[monthKey]++
      })

      // Create trends data for the last 6 months
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
      const trends: EnrollmentTrend[] = months.map(month => ({
        month,
        enrollments: monthlyData[month] || 0,
        completions: completionData[month] || 0
      }))

      setEnrollmentTrends(trends)
    } catch (error) {
      console.error('Error fetching enrollment trends:', error)
      // Fallback to empty data
      setEnrollmentTrends([])
    }
  }

  const exportReport = (type: 'students' | 'courses' | 'enrollments') => {
    // In a real implementation, this would generate and download a CSV/PDF
    console.log(`Exporting ${type} report...`)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Reports & Analytics</h2>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading comprehensive reports...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Reports & Analytics</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportReport('students')}>
            <Download className="w-4 h-4 mr-2" />
            Export Students
          </Button>
          <Button variant="outline" onClick={() => exportReport('courses')}>
            <Download className="w-4 h-4 mr-2" />
            Export Courses
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalStudents} students, {stats.totalTeachers} teachers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCourses}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalLessons} lessons, {stats.totalQuizzes} quizzes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrollments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEnrollments}</div>
            <p className="text-xs text-muted-foreground">
              Student enrollments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Achievements</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBadges}</div>
            <p className="text-xs text-muted-foreground">
              Available badges
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Tabs defaultValue="courses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="courses">Course Performance</TabsTrigger>
          <TabsTrigger value="students">Student Progress</TabsTrigger>
          <TabsTrigger value="trends">Enrollment Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Course Performance Overview</CardTitle>
              <CardDescription>
                Detailed analytics for each course including enrollment and completion rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {courseStats.map(course => (
                  <div key={course.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{course.title}</h4>
                      <Badge variant="secondary">{course.enrollments} enrolled</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Completion Rate</div>
                        <div className="font-medium">{course.completionRate.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Avg Progress</div>
                        <div className="font-medium">{course.averageProgress.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Lessons</div>
                        <div className="font-medium">{course.totalLessons}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Quizzes</div>
                        <div className="font-medium">{course.totalQuizzes}</div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Progress value={course.averageProgress} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Progress Report</CardTitle>
              <CardDescription>
                Individual student performance metrics and achievements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {studentProgress.map(student => (
                  <div key={student.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{student.name}</h4>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                      </div>
                      <Badge variant="outline">{student.lastActivity}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">XP Earned</div>
                        <div className="font-medium">{student.totalXP}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Badges</div>
                        <div className="font-medium">{student.badgesEarned}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Courses Enrolled</div>
                        <div className="font-medium">{student.coursesEnrolled}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Courses Completed</div>
                        <div className="font-medium">{student.coursesCompleted}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Avg Progress</div>
                        <div className="font-medium">{student.averageProgress.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Progress value={student.averageProgress} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enrollment Trends</CardTitle>
              <CardDescription>
                Monthly enrollment and completion statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {enrollmentTrends.map(trend => (
                  <div key={trend.month} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{trend.month}</span>
                    </div>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <div className="text-muted-foreground">Enrollments</div>
                        <div className="font-medium">{trend.enrollments}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Completions</div>
                        <div className="font-medium">{trend.completions}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Completion Rate</div>
                        <div className="font-medium">
                          {((trend.completions / trend.enrollments) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}