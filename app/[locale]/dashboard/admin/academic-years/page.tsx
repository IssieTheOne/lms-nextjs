"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Calendar } from 'lucide-react'

interface AcademicYear {
  id: string
  name: string
  description: string | null
  created_at: string
}

export default function AcademicYearsPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  const supabase = createClient()

  useEffect(() => {
    fetchAcademicYears()
  }, [])

  const fetchAcademicYears = async () => {
    try {
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAcademicYears(data || [])
    } catch (error) {
      console.error('Error fetching academic years:', error)
      toast.error('Failed to load academic years')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Academic year name is required')
      return
    }

    try {
      if (editingYear) {
        const { data, error } = await supabase
          .from('academic_years')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null
          })
          .eq('id', editingYear.id)
          .select()
          .single()

        if (error) throw error

        setAcademicYears(academicYears.map(year =>
          year.id === editingYear.id ? data : year
        ))
        toast.success('Academic year updated successfully!')
      } else {
        const { data, error } = await supabase
          .from('academic_years')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null
          })
          .select()
          .single()

        if (error) throw error

        setAcademicYears(prev => [data, ...prev])
        toast.success('Academic year created successfully!')
      }

      setFormData({
        name: '',
        description: ''
      })
      setIsDialogOpen(false)
      setEditingYear(null)
    } catch (error) {
      console.error('Error saving academic year:', error)
      toast.error('Failed to save academic year')
    }
  }

  const editAcademicYear = (year: AcademicYear) => {
    setEditingYear(year)
    setFormData({
      name: year.name,
      description: year.description || ''
    })
    setIsDialogOpen(true)
  }

  const deleteAcademicYear = async (yearId: string) => {
    if (!confirm('Are you sure you want to delete this academic year? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('academic_years')
        .delete()
        .eq('id', yearId)

      if (error) throw error

      setAcademicYears(academicYears.filter(year => year.id !== yearId))
      toast.success('Academic year deleted successfully')
    } catch (error) {
      console.error('Error deleting academic year:', error)
      toast.error('Failed to delete academic year')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Manage Academic Years</h2>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading academic years...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Manage Academic Years</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setEditingYear(null)
            setFormData({
              name: '',
              description: ''
            })
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Academic Year
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingYear ? 'Edit Academic Year' : 'Create New Academic Year'}</DialogTitle>
              <DialogDescription>
                {editingYear ? 'Update academic year information.' : 'Add a new academic year to the system.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Academic Year Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., 2024-2025"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
                  placeholder="Optional description for this academic year"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingYear ? 'Update Academic Year' : 'Create Academic Year'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Academic Years</CardTitle>
          <CardDescription>
            View and manage academic years in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {academicYears.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No academic years found. Create your first academic year to get started.
              </div>
            ) : (
              academicYears.map((year) => (
                <div key={year.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <h3 className="font-semibold text-lg">{year.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {year.description || 'No description'}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(year.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => editAcademicYear(year)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteAcademicYear(year.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}