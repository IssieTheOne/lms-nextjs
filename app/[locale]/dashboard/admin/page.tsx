"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Users, BarChart3, Settings, Plus, TrendingUp, UserCheck, GraduationCap, Award } from 'lucide-react'

interface Stats {
  totalUsers: number
  activeCourses: number
  totalEnrollments: number
  completionRate: number
}

interface RecentActivity {
  id: string
  type: 'course_published' | 'enrollment' | 'teacher_joined'
  message: string
  timestamp: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeCourses: 0,
    totalEnrollments: 0,
    completionRate: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchStats()
    fetchRecentActivity()
  }, [])

  const fetchStats = async () => {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Get active courses (published courses)
      const { count: activeCourses } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true)

      // Get total enrollments
      const { count: totalEnrollments } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })

      // Calculate completion rate (completed lessons / total lessons)
      const { data: progressData } = await supabase
        .from('progress')
        .select('completed')

      const totalProgressRecords = progressData?.length || 0
      const completedRecords = progressData?.filter(p => p.completed).length || 0
      const completionRate = totalProgressRecords > 0 ? Math.round((completedRecords / totalProgressRecords) * 100) : 0

      setStats({
        totalUsers: totalUsers || 0,
        activeCourses: activeCourses || 0,
        totalEnrollments: totalEnrollments || 0,
        completionRate
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      const activities: RecentActivity[] = []

      // Get recently published courses
      const { data: recentCourses } = await supabase
        .from('courses')
        .select('id, name, updated_at')
        .eq('is_published', true)
        .order('updated_at', { ascending: false })
        .limit(3)

      recentCourses?.forEach(course => {
        activities.push({
          id: `course-${course.id}`,
          type: 'course_published',
          message: `New course "${course.name}" published`,
          timestamp: course.updated_at
        })
      })

      // Get recent enrollments
      const { data: recentEnrollments } = await supabase
        .from('enrollments')
        .select(`
          id,
          enrolled_at,
          student:profiles!enrollments_student_id_fkey(full_name),
          course:courses(name)
        `)
        .order('enrolled_at', { ascending: false })
        .limit(2)

      recentEnrollments?.forEach(enrollment => {
        activities.push({
          id: `enrollment-${enrollment.id}`,
          type: 'enrollment',
          message: `${(enrollment.student as any)?.full_name || 'A student'} enrolled in "${(enrollment.course as any)?.name}"`,
          timestamp: enrollment.enrolled_at
        })
      })

      // Get recently joined teachers
      const { data: recentTeachers } = await supabase
        .from('teachers')
        .select(`
          id,
          created_at,
          profile:profiles!teachers_profile_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(2)

      recentTeachers?.forEach(teacher => {
        activities.push({
          id: `teacher-${teacher.id}`,
          type: 'teacher_joined',
          message: `Teacher "${(teacher.profile as any)?.full_name || 'New teacher'}" joined the platform`,
          timestamp: teacher.created_at
        })
      })

      // Sort by timestamp and take the most recent 5
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setRecentActivity(activities.slice(0, 5))
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">Welcome back! Here's what's happening with your LMS.</p>
        </div>
        <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          <Link href="/en/dashboard/admin/courses">
            <Plus className="h-5 w-5 mr-2" />
            Create Course
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Registered users on the platform
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Active Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.activeCourses}</div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Published courses available to students
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Enrollments</CardTitle>
            <UserCheck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.totalEnrollments.toLocaleString()}</div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              Total student enrollments
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Completion Rate</CardTitle>
            <Award className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.completionRate}%</div>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              Average lesson completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 hover:border-blue-300">
          <CardHeader className="pb-3">
            <BookOpen className="h-6 w-6 text-blue-600 mb-2" />
            <CardTitle className="text-lg">Courses</CardTitle>
            <CardDescription>Create and manage courses</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/en/dashboard/admin/courses">
                Manage Courses
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 hover:border-green-300">
          <CardHeader className="pb-3">
            <Users className="h-6 w-6 text-green-600 mb-2" />
            <CardTitle className="text-lg">Users</CardTitle>
            <CardDescription>Manage users and roles</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/en/dashboard/admin/users">
                Manage Users
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 hover:border-purple-300">
          <CardHeader className="pb-3">
            <BarChart3 className="h-6 w-6 text-purple-600 mb-2" />
            <CardTitle className="text-lg">Reports</CardTitle>
            <CardDescription>View analytics and progress</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/en/dashboard/admin/reports">
                View Reports
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 hover:border-gray-300">
          <CardHeader className="pb-3">
            <Settings className="h-6 w-6 text-gray-600 mb-2" />
            <CardTitle className="text-lg">Settings</CardTitle>
            <CardDescription>Platform configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/en/dashboard/admin/study-levels">
                  Study Levels
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/en/dashboard/admin/languages">
                  Languages
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest updates and changes in your LMS</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No recent activity to display</p>
              </div>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className={`flex items-center gap-4 p-3 rounded-lg ${
                  activity.type === 'course_published' ? 'bg-green-50 dark:bg-green-950' :
                  activity.type === 'enrollment' ? 'bg-blue-50 dark:bg-blue-950' :
                  'bg-purple-50 dark:bg-purple-950'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'course_published' ? 'bg-green-500' :
                    activity.type === 'enrollment' ? 'bg-blue-500' :
                    'bg-purple-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}