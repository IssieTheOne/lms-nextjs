"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save, UserCheck, Mail, Calendar, KeyRound, Shield, Users, GraduationCap, UserX, AlertTriangle } from 'lucide-react'

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
  const [resetPasswordDialog, setResetPasswordDialog] = useState(false)
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)

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

  const resetUserPassword = async () => {
    if (!selectedUserForReset || !newPassword.trim()) {
      toast.error('Please enter a new password')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    setResettingPassword(true)
    try {
      const { error } = await supabase.auth.admin.updateUserById(selectedUserForReset.id, {
        password: newPassword.trim()
      })

      if (error) throw error

      toast.success(`Password reset successfully for ${selectedUserForReset.email}`)
      setResetPasswordDialog(false)
      setSelectedUserForReset(null)
      setNewPassword('')
    } catch (error) {
      console.error('Error resetting password:', error)
      toast.error('Failed to reset password')
    } finally {
      setResettingPassword(false)
    }
  }

  const openResetPasswordDialog = (user: User) => {
    setSelectedUserForReset(user)
    setNewPassword('')
    setResetPasswordDialog(true)
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <GraduationCap className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{users.filter(u => u.role === 'student').length}</div>
                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Students</div>
                <div className="text-xs text-blue-500 dark:text-blue-500 mt-1">Active learners</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-3xl font-bold text-green-900 dark:text-green-100">{users.filter(u => u.role === 'teacher').length}</div>
                <div className="text-sm text-green-600 dark:text-green-400 font-medium">Teachers</div>
                <div className="text-xs text-green-500 dark:text-green-500 mt-1">Course creators</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-full">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">{users.filter(u => u.role === 'parent').length}</div>
                <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">Parents</div>
                <div className="text-xs text-purple-500 dark:text-purple-500 mt-1">Family accounts</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800 hover:shadow-lg transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <div className="text-3xl font-bold text-red-900 dark:text-red-100">{users.filter(u => u.role === 'admin').length}</div>
                <div className="text-sm text-red-600 dark:text-red-400 font-medium">Admins</div>
                <div className="text-xs text-red-500 dark:text-red-500 mt-1">Platform managers</div>
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
              <Card key={user.id} className={`transition-all duration-200 hover:shadow-md ${user.hasChanges ? 'ring-2 ring-blue-300 dark:ring-blue-600' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {(user.full_name || user.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg text-foreground">{user.full_name || 'No name provided'}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {user.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">Role</div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getRoleBadgeVariant(user.role)} className="px-3 py-1">
                            {user.role}
                          </Badge>
                          {user.hasChanges && (
                            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-sm font-medium">→ {user.newRole}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Select
                          value={getCurrentRole(user)}
                          onValueChange={(value: string) => updateUserRole(user.id, value)}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="teacher">Teacher</SelectItem>
                            <SelectItem value="parent">Parent</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openResetPasswordDialog(user)}
                          className="w-36 hover:bg-orange-50 hover:border-orange-300 dark:hover:bg-orange-950"
                        >
                          <KeyRound className="h-4 w-4 mr-2" />
                          Reset Password
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialog} onOpenChange={setResetPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUserForReset?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters long
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setResetPasswordDialog(false)}
                disabled={resettingPassword}
              >
                Cancel
              </Button>
              <Button
                onClick={resetUserPassword}
                disabled={resettingPassword || !newPassword.trim() || newPassword.length < 6}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {resettingPassword ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}