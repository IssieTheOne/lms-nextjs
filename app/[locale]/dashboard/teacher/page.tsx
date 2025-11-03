"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Users, FileText, BarChart3, Plus } from 'lucide-react'

interface Course {
  id: string
  name: string
  description: string
  language?: { name: string } | null
  sections_count: number
  students_count: number
}

export default function TeacherDashboard() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchTeacherCourses()
  }, [])

  const fetchTeacherCourses = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return

      // Fetch courses where the teacher is assigned
      const { data: coursesData, error } = await supabase
        .from('courses')
        .select(`
          id,
          name,
          description,
          language:languages(name),
          sections:sections(count),
          enrollments:enrollments(count)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Format the data
      const formattedCourses = (coursesData || []).map(course => ({
        id: course.id,
        name: course.name,
        description: course.description,
        language: Array.isArray(course.language) ? course.language[0] : course.language,
        sections_count: course.sections?.[0]?.count || 0,
        students_count: course.enrollments?.[0]?.count || 0
      }))

      setCourses(formattedCourses)
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Teacher Dashboard</h2>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading courses...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Teacher Dashboard</h2>
        <Link href="/dashboard/admin/course-builder">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create New Course
          </Button>
        </Link>
      </div>

      {/* Courses Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">My Courses</h3>
        {courses.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No courses yet</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't been assigned to any courses yet. Contact an administrator to get started.
                </p>
                <Link href="/dashboard/admin/course-builder">
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Course
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{course.name}</CardTitle>
                      {course.description && (
                        <CardDescription className="line-clamp-2">
                          {course.description}
                        </CardDescription>
                      )}
                    </div>
                    {course.language && (
                      <Badge variant="secondary">{course.language.name}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {course.sections_count} sections
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {course.students_count} students
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/en/dashboard/teacher/course/${course.id}`} className="flex-1">
                        <Button className="w-full">
                          <BookOpen className="h-4 w-4 mr-2" />
                          Build Course
                        </Button>
                      </Link>
                      <Link href={`/en/dashboard/teacher/reports?course=${course.id}`}>
                        <Button variant="outline" size="sm">
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {courses.reduce((sum, course) => sum + course.students_count, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {courses.reduce((sum, course) => sum + course.sections_count, 0)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}