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
import { Plus, Edit, Trash2, Play } from 'lucide-react'

interface Section {
  id: string
  title: string
  order_index: number
  course_id: string
  created_at: string
  lessons?: Lesson[]
}

interface Lesson {
  id: string
  title: string
  content: string | null
  video_url: string | null
  order_index: number
  created_at: string
}

interface Course {
  id: string
  title: string
}

export default function SectionsPage() {
  const [sections, setSections] = useState<Section[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')

  const [formData, setFormData] = useState({
    title: '',
    course_id: '',
    order_index: '0'
  })

  const supabase = createClient()

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    if (selectedCourseId) {
      fetchSections(selectedCourseId)
    } else {
      setSections([])
    }
  }, [selectedCourseId])

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .order('title')

      if (error) throw error
      setCourses(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching courses:', error)
      toast.error('Failed to load courses')
      setLoading(false)
    }
  }

  const fetchSections = async (courseId: string) => {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select(`
          *,
          lessons(*)
        `)
        .eq('course_id', courseId)
        .order('order_index')

      if (error) throw error
      setSections(data || [])
    } catch (error) {
      console.error('Error fetching sections:', error)
      toast.error('Failed to load sections')
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim() || !formData.course_id) {
      toast.error('Section title and course are required')
      return
    }

    try {
      const sectionData = {
        title: formData.title.trim(),
        course_id: formData.course_id,
        order_index: parseInt(formData.order_index) || 0
      }

      const { data, error } = await supabase
        .from('sections')
        .insert(sectionData)
        .select()
        .single()

      if (error) throw error

      if (selectedCourseId === formData.course_id) {
        setSections(prev => [...prev, { ...data, lessons: [] }])
      }

      setFormData({
        title: '',
        course_id: '',
        order_index: '0'
      })
      setIsDialogOpen(false)
      toast.success('Section created successfully!')
    } catch (error) {
      console.error('Error creating section:', error)
      toast.error('Failed to create section')
    }
  }

  const deleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section? This will also delete all lessons in this section.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', sectionId)

      if (error) throw error

      setSections(sections.filter(section => section.id !== sectionId))
      toast.success('Section deleted successfully')
    } catch (error) {
      console.error('Error deleting section:', error)
      toast.error('Failed to delete section')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Manage Course Sections</h2>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading courses...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Manage Course Sections</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Section</DialogTitle>
              <DialogDescription>
                Add a new section to organize course content.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="course">Course *</Label>
                <Select value={formData.course_id} onValueChange={(value) => handleInputChange('course_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Section Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter section title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="order">Order Index</Label>
                <Input
                  id="order"
                  type="number"
                  min="0"
                  value={formData.order_index}
                  onChange={(e) => handleInputChange('order_index', e.target.value)}
                  placeholder="0"
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
                <Button type="submit">Create Section</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Select Course</CardTitle>
            <CardDescription>
              Choose a course to view and manage its sections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedCourseId && (
          <Card>
            <CardHeader>
              <CardTitle>Sections</CardTitle>
              <CardDescription>
                Sections for {courses.find(c => c.id === selectedCourseId)?.title}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sections.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No sections found. Create your first section to get started.
                  </div>
                ) : (
                  sections.map((section) => (
                    <div key={section.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{section.title}</h3>
                          <Badge variant="outline">Order: {section.order_index}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-1" />
                            Add Lesson
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteSection(section.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground">Lessons:</h4>
                        {section.lessons && section.lessons.length > 0 ? (
                          <div className="grid gap-2">
                            {section.lessons.map((lesson) => (
                              <div key={lesson.id} className="flex items-center justify-between bg-muted/50 p-3 rounded">
                                <div className="flex items-center gap-3">
                                  {lesson.video_url && <Play className="h-4 w-4 text-blue-500" />}
                                  <span className="font-medium">{lesson.title}</span>
                                  <Badge variant="secondary">Order: {lesson.order_index}</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No lessons in this section yet.</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}