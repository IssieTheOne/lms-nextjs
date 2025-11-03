"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { BookOpen, Trophy, Award, User, CheckCircle, XCircle, MessageCircle, Bot } from 'lucide-react'

interface CourseProgress {
  id: string
  name: string
  completed_lessons: number
  total_lessons: number
  progress_percentage: number
  xp_earned: number
}

interface StudentBadge {
  id: string
  name: string
  description: string
  icon_url?: string
  xp_reward: number
  earned_at: string
}

interface ParentRequest {
  id: string
  parent_name: string
  parent_email: string
}

export default function StudentDashboard() {
  const [courses, setCourses] = useState<CourseProgress[]>([])
  const [badges, setBadges] = useState<StudentBadge[]>([])
  const [parentRequests, setParentRequests] = useState<ParentRequest[]>([])
  const [stats, setStats] = useState({
    total_xp: 0,
    courses_completed: 0,
    total_courses: 0,
    badges_earned: 0
  })
  const [loading, setLoading] = useState(false)
  const [parentDialogOpen, setParentDialogOpen] = useState(false)

  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string

  useEffect(() => {
    fetchDashboardData()
    fetchParentRequests()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return

      // Get enrolled courses with progress
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select(`
          course:courses (
            id,
            name,
            sections (
              lessons (
                id
              )
            )
          )
        `)
        .eq('student_id', user.id)

      if (enrollError) throw enrollError

      const coursesData = await Promise.all(
        (enrollments || []).map(async (enrollment: any) => {
          const course = enrollment.course
          const totalLessons = course.sections?.reduce((acc: number, section: any) =>
            acc + (section.lessons?.length || 0), 0) || 0

          // Count completed lessons and XP earned
          const { data: progressData, error: progressError } = await supabase
            .from('progress')
            .select('completed')
            .eq('student_id', user.id)
            .in('lesson_id',
              course.sections?.flatMap((section: any) =>
                section.lessons?.map((lesson: any) => lesson.id) || []
              ) || []
            )

          if (progressError) throw progressError

          const completedLessons = progressData?.filter(p => p.completed).length || 0

          return {
            id: course.id,
            name: course.name,
            completed_lessons: completedLessons,
            total_lessons: totalLessons,
            progress_percentage: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0,
            xp_earned: completedLessons * 10 // Assuming 10 XP per lesson
          }
        })
      )

      setCourses(coursesData)

      // Get earned badges
      const { data: badgesData, error: badgesError } = await supabase
        .from('student_badges')
        .select(`
          id,
          earned_at,
          badge:badge_id (
            name,
            description,
            icon_url,
            xp_reward
          )
        `)
        .eq('student_id', user.id)
        .order('earned_at', { ascending: false })

      if (badgesError) throw badgesError

      const formattedBadges = badgesData?.map((sb: any) => ({
        id: sb.id,
        name: sb.badge?.name || 'Unknown Badge',
        description: sb.badge?.description || '',
        icon_url: sb.badge?.icon_url,
        xp_reward: sb.badge?.xp_reward || 0,
        earned_at: sb.earned_at
      })) || []

      setBadges(formattedBadges)

      // Calculate stats
      const totalXP = formattedBadges.reduce((acc, badge) => acc + badge.xp_reward, 0) +
                     coursesData.reduce((acc, course) => acc + course.xp_earned, 0)
      const coursesCompleted = coursesData.filter(c => c.progress_percentage === 100).length

      setStats({
        total_xp: totalXP,
        courses_completed: coursesCompleted,
        total_courses: coursesData.length,
        badges_earned: formattedBadges.length
      })

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchParentRequests = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return

      // Get pending parent link requests (where parent has linked but student hasn't confirmed)
      // For now, we'll show all parent links as they are automatically created
      const { data: links, error } = await supabase
        .from('parent_student_links')
        .select(`
          id,
          parent:parent_id (
            full_name,
            email
          )
        `)
        .eq('student_id', user.id)

      if (error) throw error

      const requests = links?.map((link: any) => ({
        id: link.id,
        parent_name: link.parent?.full_name || 'Unknown Parent',
        parent_email: link.parent?.email || ''
      })) || []

      setParentRequests(requests)
    } catch (error) {
      console.error('Error fetching parent requests:', error)
    }
  }

  const handleParentRequest = async (requestId: string, accept: boolean) => {
    if (!accept) {
      // For now, just remove the link if rejected
      try {
        const { error } = await supabase
          .from('parent_student_links')
          .delete()
          .eq('id', requestId)

        if (error) throw error

        toast.success('Parent link request declined')
        fetchParentRequests()
      } catch (error) {
        console.error('Error declining parent request:', error)
        toast.error('Failed to decline request')
      }
    } else {
      // Accept the link (it's already created, so just show success)
      toast.success('Parent link accepted!')
      setParentRequests(prev => prev.filter(r => r.id !== requestId))
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Student Dashboard</h2>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading your progress...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Student Dashboard</h2>
        {parentRequests.length > 0 && (
          <Button variant="outline" onClick={() => setParentDialogOpen(true)}>
            <User className="h-4 w-4 mr-2" />
            Parent Requests ({parentRequests.length})
          </Button>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">{stats.total_xp}</div>
                <div className="text-xs text-muted-foreground">Total XP</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.courses_completed}</div>
                <div className="text-xs text-muted-foreground">Courses Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats.badges_earned}</div>
                <div className="text-xs text-muted-foreground">Badges Earned</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{stats.total_courses}</div>
                <div className="text-xs text-muted-foreground">Total Enrolled</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Main Content - Courses and Badges */}
        <div className="xl:col-span-2 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Course Progress */}
            <Card>
              <CardHeader>
                <CardTitle>My Courses</CardTitle>
                <CardDescription>Track your progress in enrolled courses</CardDescription>
              </CardHeader>
              <CardContent>
                {courses.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No courses enrolled yet.</p>
                ) : (
                  <div className="space-y-4">
                    {courses.map((course) => (
                      <div key={course.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">{course.name}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {course.completed_lessons}/{course.total_lessons} lessons
                            </span>
                            <Button
                              size="sm"
                              onClick={() => router.push(`/${locale}/dashboard/student/course/${course.id}`)}
                            >
                              View Course
                            </Button>
                          </div>
                        </div>
                        <Progress value={course.progress_percentage} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{Math.round(course.progress_percentage)}% complete</span>
                          <span>+{course.xp_earned} XP earned</span>
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
                <CardTitle>Achievements</CardTitle>
                <CardDescription>Your earned badges and certificates</CardDescription>
              </CardHeader>
              <CardContent>
                {badges.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No achievements yet.</p>
                ) : (
                  <div className="space-y-3">
                    {badges.slice(0, 5).map((badge) => (
                      <div key={badge.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <Trophy className="h-8 w-8 text-yellow-500" />
                        <div className="flex-1">
                          <h4 className="font-medium">{badge.name}</h4>
                          <p className="text-sm text-muted-foreground">{badge.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary">+{badge.xp_reward} XP</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(badge.earned_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {badges.length > 5 && (
                      <p className="text-sm text-muted-foreground text-center">
                        And {badges.length - 5} more achievements...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Parent Link Requests Dialog */}
      <Dialog open={parentDialogOpen} onOpenChange={setParentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Parent Link Requests</DialogTitle>
            <DialogDescription>
              Parents who want to monitor your progress have sent link requests.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {parentRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No pending requests</p>
            ) : (
              parentRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{request.parent_name}</h4>
                    <p className="text-sm text-muted-foreground">{request.parent_email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleParentRequest(request.id, true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleParentRequest(request.id, false)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}