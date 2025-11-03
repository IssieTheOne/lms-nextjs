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
import { Save, UserCheck, Mail, Calendar, KeyRound, Shield, Users, GraduationCap, UserX, AlertTriangle, Archive, Eye, EyeOff, ChevronLeft, ChevronRight, Search, Filter, MoreHorizontal, Ban, CheckCircle, Edit, Trash2, User, Phone, MapPin } from 'lucide-react'

interface User {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
  is_active?: boolean
  is_archived?: boolean
  is_teacher_only?: boolean // Flag to indicate teachers without profiles
}

interface UserWithChanges extends User {
  newRole?: string
  hasChanges?: boolean
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithChanges[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserWithChanges[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetPasswordDialog, setResetPasswordDialog] = useState(false)
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)

  // User Details Modal
  const [userDetailsDialog, setUserDetailsDialog] = useState(false)
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<User | null>(null)
  const [editingUserRole, setEditingUserRole] = useState('')
  const [savingUserDetails, setSavingUserDetails] = useState(false)

  // Create Account Modal
  const [createAccountDialog, setCreateAccountDialog] = useState(false)
  const [selectedUserForAccount, setSelectedUserForAccount] = useState<User | null>(null)
  const [accountEmail, setAccountEmail] = useState('')
  const [accountPassword, setAccountPassword] = useState('')
  const [creatingAccount, setCreatingAccount] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [usersPerPage] = useState(10)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const supabase = createClient()

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, roleFilter, statusFilter])

  const fetchUsers = async () => {
    try {
      // Fetch profiles (users with accounts)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      // Fetch teachers (including those without profiles)
      const { data: teachers, error: teachersError } = await supabase
        .from('teachers')
        .select('*')
        .order('created_at', { ascending: false })

      if (teachersError) throw teachersError

      // Combine profiles and teachers
      const combinedUsers: User[] = []

      // Add profiles first
      if (profiles) {
        combinedUsers.push(...profiles.map(profile => ({
          ...profile,
          is_teacher_only: false
        })))
      }

      // Add teachers that don't have profiles
      if (teachers) {
        const profileIds = new Set(profiles?.map(p => p.id) || [])
        const teacherOnly = teachers
          .filter(teacher => !profileIds.has(teacher.id))
          .map(teacher => ({
            id: teacher.id,
            email: `teacher-${teacher.id}@system.local`, // Placeholder email
            full_name: teacher.name,
            role: 'teacher' as const,
            created_at: teacher.created_at,
            is_active: teacher.is_active,
            is_archived: false,
            is_teacher_only: true
          }))

        combinedUsers.push(...teacherOnly)
      }

      setUsers(combinedUsers)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = users

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(user => !user.is_archived)
      } else if (statusFilter === 'archived') {
        filtered = filtered.filter(user => user.is_archived)
      }
    }

    setFilteredUsers(filtered)
    setCurrentPage(1) // Reset to first page when filtering
  }

  const updateUserRole = (userId: string, newRole: string) => {
    setUsers(users.map(user =>
      user.id === userId
        ? { ...user, newRole, hasChanges: newRole !== user.role }
        : user
    ))
  }

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId)

      if (error) throw error

      setUsers(users.map(user =>
        user.id === userId
          ? { ...user, is_active: isActive }
          : user
      ))

      toast.success(`User ${isActive ? 'enabled' : 'disabled'} successfully`)
    } catch (error) {
      console.error('Error updating user status:', error)
      toast.error('Failed to update user status')
    }
  }

  const archiveUser = async (userId: string, isArchived: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_archived: isArchived })
        .eq('id', userId)

      if (error) throw error

      setUsers(users.map(user =>
        user.id === userId
          ? { ...user, is_archived: isArchived }
          : user
      ))

      toast.success(`User ${isArchived ? 'archived' : 'unarchived'} successfully`)
    } catch (error) {
      console.error('Error archiving user:', error)
      toast.error('Failed to archive user')
    }
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

  const openUserDetailsDialog = (user: User) => {
    setSelectedUserForDetails(user)
    setEditingUserRole(user.role)
    setUserDetailsDialog(true)
  }

  const openCreateAccountDialog = (user: User) => {
    setSelectedUserForAccount(user)
    setAccountEmail('')
    setAccountPassword('')
    setCreateAccountDialog(true)
  }

  const createUserAccount = async () => {
    if (!selectedUserForAccount || !accountEmail.trim() || !accountPassword.trim()) {
      toast.error('Please provide both email and password')
      return
    }

    if (accountPassword.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    setCreatingAccount(true)
    try {
      // Call the API route to create the user account
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: accountEmail.trim(),
          password: accountPassword.trim(),
          fullName: selectedUserForAccount.full_name,
          role: selectedUserForAccount.role,
          teacherId: selectedUserForAccount.id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user account')
      }

      // Refresh the users list
      await fetchUsers()

      toast.success(`Account created successfully for ${selectedUserForAccount.full_name}`)
      setCreateAccountDialog(false)
      setSelectedUserForAccount(null)
      setAccountEmail('')
      setAccountPassword('')
    } catch (error) {
      console.error('Error creating user account:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create user account')
    } finally {
      setCreatingAccount(false)
    }
  }

  const saveUserDetails = async () => {
    if (!selectedUserForDetails) return

    setSavingUserDetails(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: editingUserRole })
        .eq('id', selectedUserForDetails.id)

      if (error) throw error

      setUsers(users.map(user =>
        user.id === selectedUserForDetails.id
          ? { ...user, role: editingUserRole }
          : user
      ))

      toast.success('User details updated successfully')
      setUserDetailsDialog(false)
      setSelectedUserForDetails(null)
    } catch (error) {
      console.error('Error updating user details:', error)
      toast.error('Failed to update user details')
    } finally {
      setSavingUserDetails(false)
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4" />
      case 'teacher': return <UserCheck className="h-4 w-4" />
      case 'student': return <GraduationCap className="h-4 w-4" />
      case 'parent': return <Users className="h-4 w-4" />
      default: return <UserCheck className="h-4 w-4" />
    }
  }

  const getCurrentRole = (user: UserWithChanges) => {
    return user.newRole || user.role
  }

  const hasAnyChanges = users.some(user => user.hasChanges)

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage)
  const startIndex = (currentPage - 1) * usersPerPage
  const endIndex = startIndex + usersPerPage
  const currentUsers = filteredUsers.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

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
          <p className="text-muted-foreground mt-1">Comprehensive user management with advanced controls</p>
        </div>
        <div className="text-sm text-muted-foreground">
          Total users: {users.length} | Showing: {filteredUsers.length}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="p-2 lg:p-3 bg-blue-500/10 rounded-full">
                <GraduationCap className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-100">{users.filter(u => u.role === 'student').length}</div>
                <div className="text-xs lg:text-sm text-blue-600 dark:text-blue-400 font-medium">Students</div>
                <div className="text-xs text-blue-500 dark:text-blue-500 mt-1 hidden sm:block">Active learners</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="p-2 lg:p-3 bg-green-500/10 rounded-full">
                <UserCheck className="h-5 w-5 lg:h-6 lg:w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-bold text-green-900 dark:text-green-100">{users.filter(u => u.role === 'teacher').length}</div>
                <div className="text-xs lg:text-sm text-green-600 dark:text-green-400 font-medium">Teachers</div>
                <div className="text-xs text-green-500 dark:text-green-500 mt-1 hidden sm:block">Course creators</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="p-2 lg:p-3 bg-purple-500/10 rounded-full">
                <Users className="h-5 w-5 lg:h-6 lg:w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-bold text-purple-900 dark:text-purple-100">{users.filter(u => u.role === 'parent').length}</div>
                <div className="text-xs lg:text-sm text-purple-600 dark:text-purple-400 font-medium">Parents</div>
                <div className="text-xs text-purple-500 dark:text-purple-500 mt-1 hidden sm:block">Family accounts</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800 hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="p-2 lg:p-3 bg-red-500/10 rounded-full">
                <Shield className="h-5 w-5 lg:h-6 lg:w-6 text-red-600" />
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-bold text-red-900 dark:text-red-100">{users.filter(u => u.role === 'admin').length}</div>
                <div className="text-xs lg:text-sm text-red-600 dark:text-red-400 font-medium">Admins</div>
                <div className="text-xs text-red-500 dark:text-red-500 mt-1 hidden sm:block">Platform managers</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 sm:gap-4">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-32 sm:w-40">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 sm:w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Users ({filteredUsers.length})
          </CardTitle>
          <CardDescription>
            Manage user accounts, roles, and access controls. Teachers without accounts are shown as inactive and can be converted to full users later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {currentUsers.map((user) => (
              <div key={user.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg transition-all duration-200 hover:shadow-md ${user.is_archived ? 'opacity-60 bg-gray-50 dark:bg-gray-900' : ''}`}>
                <div className="flex items-center gap-4 mb-4 sm:mb-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                    user.is_archived
                      ? 'bg-gray-400'
                      : user.is_teacher_only
                        ? 'bg-orange-500'
                        : user.role === 'admin'
                          ? 'bg-red-500'
                          : user.role === 'teacher'
                            ? 'bg-green-500'
                            : user.role === 'student'
                              ? 'bg-blue-500'
                              : 'bg-purple-500'
                  }`}>
                    {(user.full_name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold truncate ${user.is_archived ? 'line-through' : ''}`}>
                        {user.full_name || 'No name provided'}
                      </h3>
                      {user.is_archived && <Archive className="h-4 w-4 text-gray-500 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {user.is_teacher_only ? 'No account yet' : user.email}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        {getRoleIcon(user.role)}
                        {user.role}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="text-left sm:text-right space-y-1">
                    <div className="flex items-center justify-end gap-2">
                      <Badge variant={getRoleBadgeVariant(user.role)} className="px-3 py-1">
                        {user.role}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-end gap-2 text-xs">
                      <span className={`flex items-center gap-1 ${
                        user.is_teacher_only
                          ? 'text-orange-600'
                          : user.is_active !== false
                            ? 'text-green-600'
                            : 'text-red-600'
                      }`}>
                        {user.is_teacher_only ? (
                          <AlertTriangle className="h-3 w-3" />
                        ) : user.is_active !== false ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <Ban className="h-3 w-3" />
                        )}
                        {user.is_teacher_only ? 'No Account' : user.is_active !== false ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openUserDetailsDialog(user)}
                      className="hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openResetPasswordDialog(user)}
                      disabled={user.is_archived || user.is_teacher_only}
                      className="hover:bg-orange-50 hover:border-orange-300 dark:hover:bg-orange-950"
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleUserStatus(user.id, user.is_active === false)}
                      disabled={user.is_archived || user.is_teacher_only}
                      className={user.is_active !== false ? 'hover:bg-red-50 hover:border-red-300' : 'hover:bg-green-50 hover:border-green-300'}
                    >
                      {user.is_active !== false ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => archiveUser(user.id, !user.is_archived)}
                      className={user.is_archived ? 'hover:bg-green-50 hover:border-green-300' : 'hover:bg-gray-50 hover:border-gray-300'}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <UserX className="h-12 w-12 mx-auto mb-4" />
                <p>No users found matching your criteria</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 pt-6 border-t">
              <div className="text-sm text-muted-foreground text-center sm:text-left">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
              </div>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="hidden sm:flex"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="hidden sm:flex"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <div className="flex sm:hidden gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={userDetailsDialog} onOpenChange={setUserDetailsDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Details: {selectedUserForDetails?.full_name || selectedUserForDetails?.email}
            </DialogTitle>
            <DialogDescription>
              View and manage user information and permissions
            </DialogDescription>
          </DialogHeader>

          {selectedUserForDetails && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ${
                      selectedUserForDetails.is_archived
                        ? 'bg-gray-400'
                        : selectedUserForDetails.is_teacher_only
                          ? 'bg-orange-500'
                          : selectedUserForDetails.role === 'admin'
                            ? 'bg-red-500'
                            : selectedUserForDetails.role === 'teacher'
                              ? 'bg-green-500'
                              : selectedUserForDetails.role === 'student'
                                ? 'bg-blue-500'
                                : 'bg-purple-500'
                    }`}>
                      {(selectedUserForDetails.full_name || selectedUserForDetails.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{selectedUserForDetails.full_name || 'No name provided'}</h3>
                      <p className="text-sm text-muted-foreground">{selectedUserForDetails.email}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedUserForDetails.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Joined {new Date(selectedUserForDetails.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getRoleIcon(selectedUserForDetails.role)}
                      <span className="text-sm">Role: {selectedUserForDetails.role}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedUserForDetails.is_teacher_only ? (
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                      ) : selectedUserForDetails.is_active !== false ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Ban className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm">
                        Status: {selectedUserForDetails.is_teacher_only ? 'No Account' : selectedUserForDetails.is_active !== false ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    {selectedUserForDetails.is_archived && (
                      <div className="flex items-center gap-2">
                        <Archive className="h-4 w-4 text-gray-600" />
                        <span className="text-sm">Archived</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="user-role">User Role</Label>
                    <Select value={editingUserRole} onValueChange={setEditingUserRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Quick Actions</h4>
                    <div className="space-y-2">
                      {selectedUserForDetails.is_teacher_only && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUserDetailsDialog(false)
                            openCreateAccountDialog(selectedUserForDetails)
                          }}
                          className="w-full justify-start hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-950"
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Create Account
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUserDetailsDialog(false)
                          openResetPasswordDialog(selectedUserForDetails)
                        }}
                        disabled={selectedUserForDetails.is_archived || selectedUserForDetails.is_teacher_only}
                        className="w-full justify-start hover:bg-orange-50 hover:border-orange-300 dark:hover:bg-orange-950"
                      >
                        <KeyRound className="h-4 w-4 mr-2" />
                        Reset Password
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          toggleUserStatus(selectedUserForDetails.id, selectedUserForDetails.is_active === false)
                          setUserDetailsDialog(false)
                        }}
                        disabled={selectedUserForDetails.is_archived || selectedUserForDetails.is_teacher_only}
                        className={`w-full justify-start ${selectedUserForDetails.is_active !== false ? 'hover:bg-red-50 hover:border-red-300' : 'hover:bg-green-50 hover:border-green-300'}`}
                      >
                        {selectedUserForDetails.is_active !== false ? <Ban className="h-4 w-4 mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                        {selectedUserForDetails.is_active !== false ? 'Disable User' : 'Enable User'}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          archiveUser(selectedUserForDetails.id, !selectedUserForDetails.is_archived)
                          setUserDetailsDialog(false)
                        }}
                        className={`w-full justify-start ${selectedUserForDetails.is_archived ? 'hover:bg-green-50 hover:border-green-300' : 'hover:bg-gray-50 hover:border-gray-300'}`}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        {selectedUserForDetails.is_archived ? 'Unarchive User' : 'Archive User'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setUserDetailsDialog(false)}
                  disabled={savingUserDetails}
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveUserDetails}
                  disabled={savingUserDetails || editingUserRole === selectedUserForDetails.role}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {savingUserDetails ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

      {/* Create Account Dialog */}
      <Dialog open={createAccountDialog} onOpenChange={setCreateAccountDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Create Account for {selectedUserForAccount?.full_name}
            </DialogTitle>
            <DialogDescription>
              Create a user account so this teacher can log in to the system
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account-email">Email Address</Label>
              <Input
                id="account-email"
                type="email"
                value={accountEmail}
                onChange={(e) => setAccountEmail(e.target.value)}
                placeholder="Enter email address"
                required
              />
              <p className="text-xs text-muted-foreground">
                This will be the teacher's login email
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-password">Password</Label>
              <Input
                id="account-password"
                type="password"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
                placeholder="Enter password"
                minLength={6}
                required
              />
              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters long
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setCreateAccountDialog(false)}
                disabled={creatingAccount}
              >
                Cancel
              </Button>
              <Button
                onClick={createUserAccount}
                disabled={creatingAccount || !accountEmail.trim() || !accountPassword.trim() || accountPassword.length < 6}
                className="bg-green-600 hover:bg-green-700"
              >
                {creatingAccount ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}