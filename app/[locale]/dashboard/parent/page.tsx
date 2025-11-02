import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ParentDashboard() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Parent Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Children's Progress</CardTitle>
            <CardDescription>Monitor your children's learning progress</CardDescription>
          </CardHeader>
          <CardContent>
            <p>No children linked yet.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Reports</CardTitle>
            <CardDescription>View detailed progress reports</CardDescription>
          </CardHeader>
          <CardContent>
            <p>No reports available.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Communication</CardTitle>
            <CardDescription>Messages from teachers</CardDescription>
          </CardHeader>
          <CardContent>
            <p>No messages.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}