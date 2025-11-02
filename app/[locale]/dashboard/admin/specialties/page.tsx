"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Target } from 'lucide-react'

interface Specialty {
  id: string
  name: string
  language_id: string
  created_at: string
  language: {
    name: string
    code: string
  }
}

interface Language {
  id: string
  name: string
  code: string
}

export default function SpecialtiesPage() {
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [languages, setLanguages] = useState<Language[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSpecialty, setEditingSpecialty] = useState<Specialty | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    language_id: ''
  })

  const supabase = createClient()

  useEffect(() => {
    fetchSpecialties()
    fetchLanguages()
  }, [])

  const fetchSpecialties = async () => {
    try {
      const { data, error } = await supabase
        .from('specialties')
        .select(`
          *,
          languages (
            name,
            code
          )
        `)
        .order('name')

      if (error) throw error

      const formattedData = data?.map(item => ({
        ...item,
        language: {
          name: (item.languages as any).name,
          code: (item.languages as any).code
        }
      })) || []

      setSpecialties(formattedData)
    } catch (error) {
      console.error('Error fetching specialties:', error)
      toast.error('Failed to load specialties')
    } finally {
      setLoading(false)
    }
  }

  const fetchLanguages = async () => {
    try {
      const { data, error } = await supabase
        .from('languages')
        .select('id, name, code')
        .order('name')

      if (error) throw error
      setLanguages(data || [])
    } catch (error) {
      console.error('Error fetching languages:', error)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.language_id) {
      toast.error('Specialty name and language are required')
      return
    }

    try {
      if (editingSpecialty) {
        const { data, error } = await supabase
          .from('specialties')
          .update({
            name: formData.name.trim(),
            language_id: formData.language_id
          })
          .eq('id', editingSpecialty.id)
          .select()
          .single()

        if (error) throw error

        // Fetch updated data to get language info
        await fetchSpecialties()
        toast.success('Specialty updated successfully!')
      } else {
        const { data, error } = await supabase
          .from('specialties')
          .insert({
            name: formData.name.trim(),
            language_id: formData.language_id
          })
          .select()
          .single()

        if (error) throw error

        // Fetch updated data to get language info
        await fetchSpecialties()
        toast.success('Specialty created successfully!')
      }

      setFormData({
        name: '',
        language_id: ''
      })
      setIsDialogOpen(false)
      setEditingSpecialty(null)
    } catch (error) {
      console.error('Error saving specialty:', error)
      toast.error('Failed to save specialty')
    }
  }

  const editSpecialty = (specialty: Specialty) => {
    setEditingSpecialty(specialty)
    setFormData({
      name: specialty.name,
      language_id: specialty.language_id
    })
    setIsDialogOpen(true)
  }

  const deleteSpecialty = async (specialtyId: string) => {
    if (!confirm('Are you sure you want to delete this specialty? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('specialties')
        .delete()
        .eq('id', specialtyId)

      if (error) throw error

      setSpecialties(specialties.filter(spec => spec.id !== specialtyId))
      toast.success('Specialty deleted successfully')
    } catch (error) {
      console.error('Error deleting specialty:', error)
      toast.error('Failed to delete specialty')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Manage Specialties</h2>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading specialties...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Manage Specialties</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setEditingSpecialty(null)
            setFormData({
              name: '',
              language_id: ''
            })
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Specialty
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingSpecialty ? 'Edit Specialty' : 'Create New Specialty'}</DialogTitle>
              <DialogDescription>
                {editingSpecialty ? 'Update specialty information.' : 'Add a new specialty linked to a teaching language.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Specialty Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Mathematics, Literature, Science"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language_id">Language *</Label>
                <Select value={formData.language_id} onValueChange={(value) => handleInputChange('language_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((language) => (
                      <SelectItem key={language.id} value={language.id}>
                        {language.name} ({language.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  {editingSpecialty ? 'Update Specialty' : 'Create Specialty'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Specialties</CardTitle>
          <CardDescription>
            View and manage specialties organized by teaching language
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {specialties.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No specialties found. Create your first specialty to get started.
              </div>
            ) : (
              specialties.map((specialty) => (
                <div key={specialty.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <Target className="h-5 w-5 text-purple-500" />
                      <h3 className="font-semibold text-lg">{specialty.name}</h3>
                      <Badge variant="outline">
                        {specialty.language.name} ({specialty.language.code})
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(specialty.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => editSpecialty(specialty)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteSpecialty(specialty.id)}
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