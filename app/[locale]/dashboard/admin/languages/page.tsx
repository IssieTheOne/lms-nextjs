"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Languages } from 'lucide-react'

interface Language {
  id: string
  name: string
  code: string
  created_at: string
}

export default function LanguagesPage() {
  const [languages, setLanguages] = useState<Language[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    code: ''
  })

  const supabase = createClient()

  useEffect(() => {
    fetchLanguages()
  }, [])

  const fetchLanguages = async () => {
    try {
      const { data, error } = await supabase
        .from('languages')
        .select('*')
        .order('name')

      if (error) throw error
      setLanguages(data || [])
    } catch (error) {
      console.error('Error fetching languages:', error)
      toast.error('Failed to load languages')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Language name and code are required')
      return
    }

    // Validate code format (should be lowercase, no spaces)
    if (!/^[a-z]{2,10}$/.test(formData.code)) {
      toast.error('Language code should be lowercase letters only (2-10 characters)')
      return
    }

    try {
      if (editingLanguage) {
        const { data, error } = await supabase
          .from('languages')
          .update({
            name: formData.name.trim(),
            code: formData.code.trim().toLowerCase()
          })
          .eq('id', editingLanguage.id)
          .select()
          .single()

        if (error) throw error

        setLanguages(languages.map(lang =>
          lang.id === editingLanguage.id ? data : lang
        ))
        toast.success('Language updated successfully!')
      } else {
        const { data, error } = await supabase
          .from('languages')
          .insert({
            name: formData.name.trim(),
            code: formData.code.trim().toLowerCase()
          })
          .select()
          .single()

        if (error) throw error

        setLanguages(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
        toast.success('Language created successfully!')
      }

      setFormData({
        name: '',
        code: ''
      })
      setIsDialogOpen(false)
      setEditingLanguage(null)
    } catch (error) {
      console.error('Error saving language:', error)
      toast.error('Failed to save language')
    }
  }

  const editLanguage = (language: Language) => {
    setEditingLanguage(language)
    setFormData({
      name: language.name,
      code: language.code
    })
    setIsDialogOpen(true)
  }

  const deleteLanguage = async (languageId: string) => {
    if (!confirm('Are you sure you want to delete this language? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('languages')
        .delete()
        .eq('id', languageId)

      if (error) throw error

      setLanguages(languages.filter(lang => lang.id !== languageId))
      toast.success('Language deleted successfully')
    } catch (error) {
      console.error('Error deleting language:', error)
      toast.error('Failed to delete language')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Manage Languages</h2>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading languages...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Manage Languages</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setEditingLanguage(null)
            setFormData({
              name: '',
              code: ''
            })
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Language
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingLanguage ? 'Edit Language' : 'Create New Language'}</DialogTitle>
              <DialogDescription>
                {editingLanguage ? 'Update language information.' : 'Add a new teaching language to the system.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Language Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Arabic, English, French"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Language Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value)}
                  placeholder="e.g., ar, en, fr"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Use lowercase letters only (2-10 characters)
                </p>
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
                  {editingLanguage ? 'Update Language' : 'Create Language'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Languages</CardTitle>
          <CardDescription>
            View and manage teaching languages in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {languages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No languages found. Create your first language to get started.
              </div>
            ) : (
              languages.map((language) => (
                <div key={language.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <Languages className="h-5 w-5 text-green-500" />
                      <h3 className="font-semibold text-lg">{language.name}</h3>
                      <Badge variant="secondary">{language.code}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(language.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => editLanguage(language)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteLanguage(language.id)}
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