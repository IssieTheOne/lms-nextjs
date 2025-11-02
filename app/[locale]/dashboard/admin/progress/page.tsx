"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Users, BookOpen, Trophy, TrendingUp } from 'lucide-react'

interface ProgressStats {
  totalStudents: number
  totalCourses: number
  totalEnrollments: number
  averageCompletion: number
}

interface StudentProgress {
  id: string
  student_id: string
  course_id: string
  progress_percentage: number
  completed_lessons: number
  total_lessons: number
  last_accessed: string
  student: {
    full_name: string
    email: string
  }
  course: {
    title: string
  }
}

export default function ProgressPage() {
  const [stats, setStats] = useState<ProgressStats>({
    totalStudents: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    averageCompletion: 0
  })
  const [progressData, setProgressData] = useState<StudentProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([])

  const supabase = createClient()

  useEffect(() => {
    fetchStats()
    fetchCourses()
    fetchProgressData()
  }, [selectedCourse])

  const fetchStats = async () => {
    try {
      // Get total students
      const { count: studentsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')

      // Get total courses
      const { count: coursesCount } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })

      // Get total enrollments
      const { count: enrollmentsCount } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })

      // Get average completion
      const { data: progressData } = await supabase
        .from('progress')
        .select('progress_percentage')

      const avgCompletion = progressData && progressData.length > 0
        ? progressData.reduce((sum, p) => sum + p.progress_percentage, 0) / progressData.length
        : 0

      setStats({
        totalStudents: studentsCount || 0,
        totalCourses: coursesCount || 0,
        totalEnrollments: enrollmentsCount || 0,
        averageCompletion: Math.round(avgCompletion)
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      toast.error('Failed to load statistics')
    }
  }

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .order('title')

      if (error) throw error
      setCourses(data || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const fetchProgressData = async () => {
    try {
      let query = supabase
        .from('progress')
        .select(`
          id,
          student_id,
          course_id,
          progress_percentage,
          completed_lessons,
          total_lessons,
          last_accessed,
          profiles!inner(full_name, email),
          courses!inner(title)
        `)
        .order('last_accessed', { ascending: false })

      if (selectedCourse !== 'all') {
        query = query.eq('course_id', selectedCourse)
      }

      const { data, error } = await query

      if (error) throw error

      const formattedData = data?.map(item => ({
        id: item.id,
        student_id: item.student_id,
        course_id: item.course_id,
        progress_percentage: item.progress_percentage,
        completed_lessons: item.completed_lessons,
        total_lessons: item.total_lessons,
        last_accessed: item.last_accessed,
        student: {
          full_name: (item.profiles as any).full_name,
          email: (item.profiles as any).email
        },
        course: {
          title: (item.courses as any).title
        }
      })) || []

      setProgressData(formattedData)
    } catch (error) {
      console.error('Error fetching progress data:', error)
      toast.error('Failed to load progress data')
    } finally {
      setLoading(false)
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 60) return 'bg-yellow-500'
    if (percentage >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Progress Tracking</h2>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading progress data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Progress Tracking</h2>
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCourses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEnrollments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Completion</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageCompletion}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Progress</CardTitle>
          <CardDescription>
            Track individual student progress across courses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {progressData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No progress data found.
              </div>
            ) : (
              progressData.map((progress) => (
                <div key={progress.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-semibold">{progress.student.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{progress.student.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">{progress.course.title}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {progress.completed_lessons}/{progress.total_lessons} lessons completed
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={progress.progress_percentage}
                        className="flex-1 max-w-[200px]"
                      />
                      <span className="text-sm font-medium">{progress.progress_percentage}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last accessed: {new Date(progress.last_accessed).toLocaleDateString()}
                    </div>
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