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
import { Plus, Edit, Trash2, GraduationCap } from 'lucide-react'

interface StudyLevel {
  id: string
  name: string
  description: string | null
  order_index: number
  created_at: string
}

export default function StudyLevelsPage() {
  const [studyLevels, setStudyLevels] = useState<StudyLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingLevel, setEditingLevel] = useState<StudyLevel | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    order_index: 0
  })

  const supabase = createClient()

  useEffect(() => {
    fetchStudyLevels()
  }, [])

  const fetchStudyLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('study_levels')
        .select('*')
        .order('order_index', { ascending: true })

      if (error) throw error
      setStudyLevels(data || [])
    } catch (error) {
      console.error('Error fetching study levels:', error)
      toast.error('Failed to load study levels')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Study level name is required')
      return
    }

    try {
      if (editingLevel) {
        const { data, error } = await supabase
          .from('study_levels')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            order_index: formData.order_index
          })
          .eq('id', editingLevel.id)
          .select()
          .single()

        if (error) throw error

        setStudyLevels(studyLevels.map(level =>
          level.id === editingLevel.id ? data : level
        ))
        toast.success('Study level updated successfully!')
      } else {
        const { data, error } = await supabase
          .from('study_levels')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            order_index: formData.order_index
          })
          .select()
          .single()

        if (error) throw error

        setStudyLevels(prev => [...prev, data].sort((a, b) => a.order_index - b.order_index))
        toast.success('Study level created successfully!')
      }

      setFormData({
        name: '',
        description: '',
        order_index: 0
      })
      setIsDialogOpen(false)
      setEditingLevel(null)
    } catch (error) {
      console.error('Error saving study level:', error)
      toast.error('Failed to save study level')
    }
  }

  const editStudyLevel = (level: StudyLevel) => {
    setEditingLevel(level)
    setFormData({
      name: level.name,
      description: level.description || '',
      order_index: level.order_index
    })
    setIsDialogOpen(true)
  }

  const deleteStudyLevel = async (levelId: string) => {
    if (!confirm('Are you sure you want to delete this study level? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('study_levels')
        .delete()
        .eq('id', levelId)

      if (error) throw error

      setStudyLevels(studyLevels.filter(level => level.id !== levelId))
      toast.success('Study level deleted successfully')
    } catch (error) {
      console.error('Error deleting study level:', error)
      toast.error('Failed to delete study level')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Manage Study Levels</h2>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading study levels...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Manage Study Levels</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setEditingLevel(null)
            setFormData({
              name: '',
              description: '',
              order_index: 0
            })
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Study Level
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingLevel ? 'Edit Study Level' : 'Create New Study Level'}</DialogTitle>
              <DialogDescription>
                {editingLevel ? 'Update study level information.' : 'Add a new study level to the system.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Study Level Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., 1st Year BAC, Tronc Commun"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="order_index">Order Index</Label>
                <Input
                  id="order_index"
                  type="number"
                  value={formData.order_index}
                  onChange={(e) => handleInputChange('order_index', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                />
                <p className="text-xs text-muted-foreground">
                  Lower numbers appear first in the list
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
                  placeholder="Optional description for this study level"
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
                  {editingLevel ? 'Update Study Level' : 'Create Study Level'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Study Levels</CardTitle>
          <CardDescription>
            View and manage study levels in the system. These represent educational levels like "1st Year BAC", "2nd Year BAC", etc.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {studyLevels.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No study levels found. Create your first study level to get started.
              </div>
            ) : (
              studyLevels.map((level) => (
                <div key={level.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <GraduationCap className="h-5 w-5 text-blue-500" />
                      <div>
                        <h3 className="font-semibold text-lg">{level.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          Order: {level.order_index}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {level.description || 'No description'}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(level.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => editStudyLevel(level)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteStudyLevel(level.id)}
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