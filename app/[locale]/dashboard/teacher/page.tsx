import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function TeacherDashboard() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Teacher Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>My Courses</CardTitle>
            <CardDescription>Manage your courses</CardDescription>
          </CardHeader>
          <CardContent>
            <p>No courses created yet.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Students</CardTitle>
            <CardDescription>View student progress</CardDescription>
          </CardHeader>
          <CardContent>
            <p>No students.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
            <CardDescription>Create and manage assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <p>No assignments.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}