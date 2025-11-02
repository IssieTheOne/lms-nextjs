"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Save, UserCheck, Mail, Calendar } from 'lucide-react'

interface User {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
}

interface UserWithChanges extends User {
  newRole?: string
  hasChanges?: boolean
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithChanges[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = (userId: string, newRole: string) => {
    setUsers(users.map(user =>
      user.id === userId
        ? { ...user, newRole, hasChanges: newRole !== user.role }
        : user
    ))
  }

  const saveAllChanges = async () => {
    const usersWithChanges = users.filter(user => user.hasChanges)
    if (usersWithChanges.length === 0) {
      toast.info('No changes to save')
      return
    }

    setSaving(true)
    try {
      // Update each user individually
      for (const user of usersWithChanges) {
        if (user.newRole) {
          const { error } = await supabase
            .from('profiles')
            .update({ role: user.newRole })
            .eq('id', user.id)

          if (error) throw error
        }
      }

      // Update local state
      setUsers(users.map(user => ({
        ...user,
        role: user.newRole || user.role,
        hasChanges: false,
        newRole: undefined
      })))

      toast.success(`Updated ${usersWithChanges.length} user${usersWithChanges.length > 1 ? 's' : ''} successfully`)
    } catch (error) {
      console.error('Error updating users:', error)
      toast.error('Failed to update users')
    } finally {
      setSaving(false)
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive'
      case 'teacher': return 'default'
      case 'student': return 'secondary'
      case 'parent': return 'outline'
      default: return 'secondary'
    }
  }

  const getCurrentRole = (user: UserWithChanges) => {
    return user.newRole || user.role
  }

  const hasAnyChanges = users.some(user => user.hasChanges)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Manage Users</h1>
          <div className="animate-pulse bg-gray-200 h-10 w-24 rounded"></div>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="text-lg text-muted-foreground">Loading users...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Users</h1>
          <p className="text-muted-foreground mt-1">Update user roles and permissions</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Total users: {users.length}
          </div>
          {hasAnyChanges && (
            <Button
              onClick={saveAllChanges}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{users.filter(u => u.role === 'student').length}</div>
                <div className="text-sm text-muted-foreground">Students</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{users.filter(u => u.role === 'teacher').length}</div>
                <div className="text-sm text-muted-foreground">Teachers</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{users.filter(u => u.role === 'parent').length}</div>
                <div className="text-sm text-muted-foreground">Parents</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-red-600" />
              <div>
                <div className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</div>
                <div className="text-sm text-muted-foreground">Admins</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            All Users
          </CardTitle>
          <CardDescription>
            View and manage user roles across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className={`flex items-center justify-between p-6 border rounded-lg transition-colors ${user.hasChanges ? 'border-blue-300 bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {(user.full_name || user.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-lg">{user.full_name || 'No name'}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Joined: {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground mb-1">Current Role</div>
                    <Badge variant={getRoleBadgeVariant(user.role)} className="mb-2">
                      {user.role}
                    </Badge>
                    {user.hasChanges && (
                      <div className="text-xs text-blue-600 font-medium">
                        → {user.newRole}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Select
                      value={getCurrentRole(user)}
                      onValueChange={(value: string) => updateUserRole(user.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    {user.hasChanges && (
                      <div className="text-xs text-blue-600 font-medium text-center">
                        Unsaved change
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}