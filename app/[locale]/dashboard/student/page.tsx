import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function StudentDashboard() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Student Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>My Courses</CardTitle>
            <CardDescription>View enrolled courses and progress</CardDescription>
          </CardHeader>
          <CardContent>
            <p>No courses enrolled yet.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
            <CardDescription>Upcoming assignments and quizzes</CardDescription>
          </CardHeader>
          <CardContent>
            <p>No assignments.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Achievements</CardTitle>
            <CardDescription>Badges and certificates earned</CardDescription>
          </CardHeader>
          <CardContent>
            <p>No achievements yet.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}