"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Plus, User, Trophy, BookOpen, Mail, BarChart3 } from 'lucide-react'

interface LinkedStudent {
  id: string
  full_name: string
  email: string
  xp_points: number
  courses_completed: number
  total_courses: number
  recent_badges: Array<{
    id: string
    name: string
    earned_at: string
  }>
}

interface StudentProgress {
  course_name: string
  completed_lessons: number
  total_lessons: number
  progress_percentage: number
}

export default function ParentDashboard() {
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([])
  const [selectedStudent, setSelectedStudent] = useState<LinkedStudent | null>(null)
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([])
  const [loading, setLoading] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [studentEmail, setStudentEmail] = useState('')
  const [linking, setLinking] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchLinkedStudents()
  }, [])

  const fetchLinkedStudents = async () => {
    try {
      setLoading(true)
      const { data: links, error: linksError } = await supabase
        .from('parent_student_links')
        .select(`
          student:student_id (
            id,
            full_name,
            email,
            xp_points
          )
        `)
        .eq('parent_id', (await supabase.auth.getUser()).data.user?.id)

      if (linksError) throw linksError

      if (!links || links.length === 0) {
        setLinkedStudents([])
        return
      }

      // Get detailed info for each linked student
      const studentsData = await Promise.all(
        links.map(async (link: any) => {
          const student = link.student

          // Get course enrollment count
          const { count: totalCourses } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', student.id)

          // Get completed courses count
          const { count: completedCourses } = await supabase
            .from('progress')
            .select(`
              lesson:lesson_id (
                section:section_id (
                  course:course_id (
                    id
                  )
                )
              )
            `, { count: 'exact', head: true })
            .eq('student_id', student.id)
            .eq('completed', true)

          // Get recent badges (last 5)
          const { data: recentBadges } = await supabase
            .from('student_badges')
            .select(`
              id,
              earned_at,
              badge:badge_id (
                name
              )
            `)
            .eq('student_id', student.id)
            .order('earned_at', { ascending: false })
            .limit(5)

          return {
            id: student.id,
            full_name: student.full_name || 'Unknown Student',
            email: student.email,
            xp_points: student.xp_points || 0,
            courses_completed: completedCourses || 0,
            total_courses: totalCourses || 0,
            recent_badges: recentBadges?.map((sb: any) => ({
              id: sb.id,
              name: sb.badge?.name || 'Unknown Badge',
              earned_at: sb.earned_at
            })) || []
          }
        })
      )

      setLinkedStudents(studentsData)
    } catch (error) {
      console.error('Error fetching linked students:', error)
      toast.error('Failed to load children information')
    } finally {
      setLoading(false)
    }
  }

  const fetchStudentProgress = async (studentId: string) => {
    try {
      // Get all courses the student is enrolled in with progress
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`
          course:courses (
            name,
            sections (
              lessons (
                id
              )
            )
          )
        `)
        .eq('student_id', studentId)

      if (error) throw error

      const progressData = await Promise.all(
        (enrollments || []).map(async (enrollment: any) => {
          const course = enrollment.course
          const totalLessons = course.sections?.reduce((acc: number, section: any) =>
            acc + (section.lessons?.length || 0), 0) || 0

          // Count completed lessons
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

          return {
            course_name: course.name,
            completed_lessons: completedLessons || 0,
            total_lessons: totalLessons,
            progress_percentage: totalLessons > 0 ? ((completedLessons || 0) / totalLessons) * 100 : 0
          }
        })
      )

      setStudentProgress(progressData)
    } catch (error) {
      console.error('Error fetching student progress:', error)
      toast.error('Failed to load progress details')
    }
  }

  const linkStudent = async () => {
    if (!studentEmail.trim()) {
      toast.error('Please enter a student email')
      return
    }

    try {
      setLinking(true)

      // Find the student by email
      const { data: student, error: studentError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', studentEmail.trim())
        .eq('role', 'student')
        .single()

      if (studentError || !student) {
        toast.error('Student not found or not a valid student account')
        return
      }

      // Check if already linked
      const { data: existingLink } = await supabase
        .from('parent_student_links')
        .select('id')
        .eq('parent_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('student_id', student.id)
        .single()

      if (existingLink) {
        toast.error('This student is already linked to your account')
        return
      }

      // Create the link
      const { error: linkError } = await supabase
        .from('parent_student_links')
        .insert({
          parent_id: (await supabase.auth.getUser()).data.user?.id,
          student_id: student.id
        })

      if (linkError) throw linkError

      toast.success('Student linked successfully!')
      setStudentEmail('')
      setLinkDialogOpen(false)
      fetchLinkedStudents()
    } catch (error) {
      console.error('Error linking student:', error)
      toast.error('Failed to link student')
    } finally {
      setLinking(false)
    }
  }

  const unlinkStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to unlink this student?')) return

    try {
      const { error } = await supabase
        .from('parent_student_links')
        .delete()
        .eq('parent_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('student_id', studentId)

      if (error) throw error

      toast.success('Student unlinked successfully')
      fetchLinkedStudents()
      if (selectedStudent?.id === studentId) {
        setSelectedStudent(null)
        setStudentProgress([])
      }
    } catch (error) {
      console.error('Error unlinking student:', error)
      toast.error('Failed to unlink student')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Parent Dashboard</h2>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading children information...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Parent Dashboard</h2>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/en/dashboard/parent/reports">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Reports
            </a>
          </Button>
          <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Link Student
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link a Student</DialogTitle>
            <DialogDescription>
              Enter your child's email address to link their account to your dashboard
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="student-email">Student Email</Label>
              <Input
                id="student-email"
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="child@example.com"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={linkStudent} disabled={linking}>
                {linking ? 'Linking...' : 'Link Student'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {linkedStudents.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Welcome to Parent Dashboard</CardTitle>
            <CardDescription>
              Link your children's accounts to monitor their learning progress and achievements.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No children linked yet.</p>
              <Button onClick={() => setLinkDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Link Your First Student
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Linked Students List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>My Children</CardTitle>
                <CardDescription>Click on a student to view their progress</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {linkedStudents.map((student) => (
                  <div
                    key={student.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedStudent?.id === student.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => {
                      setSelectedStudent(student)
                      fetchStudentProgress(student.id)
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{student.full_name}</h4>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          unlinkStudent(student.id)
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        Unlink
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3 w-3" />
                        {student.xp_points} XP
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {student.courses_completed}/{student.total_courses} courses
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Student Details */}
          <div className="lg:col-span-2">
            {selectedStudent ? (
              <div className="space-y-6">
                {/* Student Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {selectedStudent.full_name}'s Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{selectedStudent.xp_points}</div>
                        <div className="text-sm text-muted-foreground">Total XP</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{selectedStudent.courses_completed}</div>
                        <div className="text-sm text-muted-foreground">Courses Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{selectedStudent.total_courses}</div>
                        <div className="text-sm text-muted-foreground">Total Enrolled</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{selectedStudent.recent_badges.length}</div>
                        <div className="text-sm text-muted-foreground">Recent Badges</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Course Progress */}
                <Card>
                  <CardHeader>
                    <CardTitle>Course Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {studentProgress.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No course data available</p>
                    ) : (
                      <div className="space-y-4">
                        {studentProgress.map((course, index) => (
                          <div key={index} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <h4 className="font-medium">{course.course_name}</h4>
                              <span className="text-sm text-muted-foreground">
                                {course.completed_lessons}/{course.total_lessons} lessons
                              </span>
                            </div>
                            <Progress value={course.progress_percentage} className="h-2" />
                            <div className="text-xs text-muted-foreground text-right">
                              {Math.round(course.progress_percentage)}% complete
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Badges */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      Recent Achievements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedStudent.recent_badges.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No badges earned yet</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedStudent.recent_badges.map((badge) => (
                          <div key={badge.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Trophy className="h-5 w-5 text-yellow-500" />
                              <div>
                                <h4 className="font-medium">{badge.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Earned {new Date(badge.earned_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary">Earned</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Select a student to view their progress</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}