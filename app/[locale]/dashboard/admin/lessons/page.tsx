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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Play, Upload } from 'lucide-react'

interface Lesson {
  id: string
  title: string
  description: string | null
  video_url: string | null
  duration: number | null
  order_index: number
  section_id: string
  created_at: string
  section: {
    title: string
    course: {
      title: string
    }
  }
}

interface Section {
  id: string
  title: string
  course: {
    title: string
  }
}

export default function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [uploadingVideo, setUploadingVideo] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    duration: '',
    section_id: '',
    order_index: '1'
  })

  const supabase = createClient()

  useEffect(() => {
    fetchLessons()
    fetchSections()
  }, [])

  const fetchLessons = async () => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          *,
          sections (
            title,
            courses (title)
          )
        `)
        .order('order_index', { ascending: true })

      if (error) throw error

      const formattedData = data?.map(item => ({
        ...item,
        section: {
          title: (item.sections as any).title,
          course: {
            title: (item.sections as any).courses.title
          }
        }
      })) || []

      setLessons(formattedData)
    } catch (error) {
      console.error('Error fetching lessons:', error)
      toast.error('Failed to load lessons')
    } finally {
      setLoading(false)
    }
  }

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select(`
          id,
          title,
          courses (title)
        `)
        .order('title')

      if (error) throw error

      const formattedSections = data?.map(item => ({
        id: item.id,
        title: item.title,
        course: {
          title: (item.courses as any).title
        }
      })) || []

      setSections(formattedSections)
    } catch (error) {
      console.error('Error fetching sections:', error)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file')
      return
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      toast.error('Video file size must be less than 100MB')
      return
    }

    setUploadingVideo(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `lessons/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, video_url: publicUrl }))
      toast.success('Video uploaded successfully!')
    } catch (error) {
      console.error('Error uploading video:', error)
      toast.error('Failed to upload video')
    } finally {
      setUploadingVideo(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim() || !formData.section_id) {
      toast.error('Title and section are required')
      return
    }

    try {
      const lessonData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        video_url: formData.video_url || null,
        duration: formData.duration ? parseInt(formData.duration) : null,
        section_id: formData.section_id,
        order_index: parseInt(formData.order_index) || 1
      }

      if (editingLesson) {
        const { data, error } = await supabase
          .from('lessons')
          .update(lessonData)
          .eq('id', editingLesson.id)
          .select()
          .single()

        if (error) throw error

        setLessons(lessons.map(lesson =>
          lesson.id === editingLesson.id
            ? { ...data, section: lesson.section }
            : lesson
        ))
        toast.success('Lesson updated successfully!')
      } else {
        const { data, error } = await supabase
          .from('lessons')
          .insert(lessonData)
          .select()
          .single()

        if (error) throw error

        // Fetch updated data to get the section info
        await fetchLessons()
        toast.success('Lesson created successfully!')
      }

      setFormData({
        title: '',
        description: '',
        video_url: '',
        duration: '',
        section_id: '',
        order_index: '1'
      })
      setIsDialogOpen(false)
      setEditingLesson(null)
    } catch (error) {
      console.error('Error saving lesson:', error)
      toast.error('Failed to save lesson')
    }
  }

  const editLesson = (lesson: Lesson) => {
    setEditingLesson(lesson)
    setFormData({
      title: lesson.title,
      description: lesson.description || '',
      video_url: lesson.video_url || '',
      duration: lesson.duration?.toString() || '',
      section_id: lesson.section_id,
      order_index: lesson.order_index.toString()
    })
    setIsDialogOpen(true)
  }

  const deleteLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId)

      if (error) throw error

      setLessons(lessons.filter(lesson => lesson.id !== lessonId))
      toast.success('Lesson deleted successfully')
    } catch (error) {
      console.error('Error deleting lesson:', error)
      toast.error('Failed to delete lesson')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Manage Lessons</h2>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading lessons...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Manage Lessons</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setEditingLesson(null)
            setFormData({
              title: '',
              description: '',
              video_url: '',
              duration: '',
              section_id: '',
              order_index: '1'
            })
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Lesson
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingLesson ? 'Edit Lesson' : 'Create New Lesson'}</DialogTitle>
              <DialogDescription>
                {editingLesson ? 'Update lesson details' : 'Add a new lesson to a course section'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Lesson Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter lesson title"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section_id">Section *</Label>
                  <Select value={formData.section_id} onValueChange={(value) => handleInputChange('section_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.title} ({section.course.title})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
                  placeholder="Enter lesson description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="video_url">Video URL</Label>
                  <Input
                    id="video_url"
                    value={formData.video_url}
                    onChange={(e) => handleInputChange('video_url', e.target.value)}
                    placeholder="https://example.com/video.mp4"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', e.target.value)}
                    placeholder="30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="video_upload">Or Upload Video</Label>
                <Input
                  id="video_upload"
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  disabled={uploadingVideo}
                />
                {uploadingVideo && <p className="text-sm text-muted-foreground">Uploading video...</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="order_index">Order Index</Label>
                <Input
                  id="order_index"
                  type="number"
                  value={formData.order_index}
                  onChange={(e) => handleInputChange('order_index', e.target.value)}
                  placeholder="1"
                  min="1"
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
                <Button type="submit" disabled={uploadingVideo}>
                  {editingLesson ? 'Update Lesson' : 'Create Lesson'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Lessons</CardTitle>
          <CardDescription>
            View and manage lessons across all course sections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {lessons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No lessons found. Create your first lesson to get started.
              </div>
            ) : (
              lessons.map((lesson) => (
                <div key={lesson.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <Play className="h-5 w-5 text-blue-500" />
                      <h3 className="font-semibold text-lg">{lesson.title}</h3>
                      <Badge variant="outline">Order: {lesson.order_index}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {lesson.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">
                        {lesson.section.course.title} → {lesson.section.title}
                      </Badge>
                      {lesson.duration && (
                        <span className="text-sm text-muted-foreground">
                          {lesson.duration} minutes
                        </span>
                      )}
                      {lesson.video_url && (
                        <span className="text-sm text-green-600">
                          ✓ Video attached
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(lesson.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => editLesson(lesson)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteLesson(lesson.id)}
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