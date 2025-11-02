import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Admin Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Manage users, roles, and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/en/dashboard/admin/users" className="text-blue-600 hover:underline">
              Manage Users
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Courses</CardTitle>
            <CardDescription>Create and manage courses</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/en/dashboard/admin/courses" className="text-blue-600 hover:underline">
              Manage Courses
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Reports</CardTitle>
            <CardDescription>View analytics and reports</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/en/dashboard/admin/reports" className="text-blue-600 hover:underline">
              View Reports
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}