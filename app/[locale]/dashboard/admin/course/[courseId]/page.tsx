"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
import { ArrowLeft, Play, Edit, Trash2, Plus, GripVertical, Save, X, Upload, FileText, Users, GraduationCap } from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

interface Course {
  id: string
  name: string
  description: string
  language?: { name: string } | null
  teacher?: { name: string } | null
  sections: Section[]
  enrollments_count: number
}

interface Section {
  id: string
  title: string
  order_index: number
  lessons: Lesson[]
  isEditing?: boolean
}

interface Lesson {
  id: string
  title: string
  content: string | null
  video_url: string | null
  order_index: number
  isEditing?: boolean
}

export default function AdminCourseViewPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string

  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Dialog states
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false)
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false)
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false)

  // Form states
  const [editingSection, setEditingSection] = useState<Section | null>(null)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [currentSectionId, setCurrentSectionId] = useState<string>('')

  const [sectionForm, setSectionForm] = useState({ title: '' })
  const [lessonForm, setLessonForm] = useState({
    title: '',
    content: '',
    video_url: '',
    videoFile: null as File | null
  })
  const [teachers, setTeachers] = useState<Array<{id: string, name: string}>>([])
  const [selectedTeacher, setSelectedTeacher] = useState<string>('')

  const supabase = createClient()

  useEffect(() => {
    if (courseId) {
      fetchCourseData()
      fetchTeachers()
    }
  }, [courseId])

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('id, name')
        .order('name')

      if (error) throw error
      setTeachers(data || [])
    } catch (error) {
      console.error('Error fetching teachers:', error)
    }
  }

  const fetchCourseData = async () => {
    try {
      setLoading(true)

      // Fetch course with sections, lessons, and teacher info
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`
          id,
          name,
          description,
          language:languages(name),
          teacher:teachers(name),
          sections (
            id,
            title,
            order_index,
            lessons (
              id,
              title,
              content,
              video_url,
              order_index
            )
          )
        `)
        .eq('id', courseId)
        .single()

      if (courseError) throw courseError

      // Get enrollment count
      const { count: enrollmentsCount } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId)

      // Build course structure
      const formattedCourse: Course = {
        id: courseData.id,
        name: courseData.name,
        description: courseData.description,
        language: Array.isArray(courseData.language) ? courseData.language[0] : courseData.language,
        teacher: Array.isArray(courseData.teacher) ? courseData.teacher[0] : courseData.teacher,
        sections: (courseData.sections || []).map((section: any) => ({
          id: section.id,
          title: section.title,
          order_index: section.order_index,
          lessons: (section.lessons || [])
            .sort((a: any, b: any) => a.order_index - b.order_index)
        })).sort((a: any, b: any) => a.order_index - b.order_index),
        enrollments_count: enrollmentsCount || 0
      }

      setCourse(formattedCourse)
    } catch (error) {
      console.error('Error fetching course data:', error)
      toast.error('Failed to load course')
    } finally {
      setLoading(false)
    }
  }

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!sectionForm.title.trim()) {
      toast.error('Section title is required')
      return
    }

    try {
      if (editingSection) {
        const { error } = await supabase
          .from('sections')
          .update({ title: sectionForm.title.trim() })
          .eq('id', editingSection.id)

        if (error) throw error

        setCourse(prev => prev ? {
          ...prev,
          sections: prev.sections.map(section =>
            section.id === editingSection.id
              ? { ...section, title: sectionForm.title.trim() }
              : section
          )
        } : null)
        toast.success('Section updated successfully!')
      } else {
        const maxOrder = Math.max(...(course?.sections.map(s => s.order_index) || [0]), 0)
        const { data, error } = await supabase
          .from('sections')
          .insert({
            course_id: courseId,
            title: sectionForm.title.trim(),
            order_index: maxOrder + 1
          })
          .select()
          .single()

        if (error) throw error

        setCourse(prev => prev ? {
          ...prev,
          sections: [...prev.sections, { ...data, lessons: [] }]
        } : null)
        toast.success('Section created successfully!')
      }

      setSectionForm({ title: '' })
      setSectionDialogOpen(false)
      setEditingSection(null)
    } catch (error) {
      console.error('Error saving section:', error)
      toast.error('Failed to save section')
    }
  }

  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!lessonForm.title.trim()) {
      toast.error('Lesson title is required')
      return
    }

    setSaving(true)
    try {
      let videoUrl = lessonForm.video_url

      // Upload video if file selected
      if (lessonForm.videoFile) {
        const fileExt = lessonForm.videoFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `lessons/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('videos')
          .upload(filePath, lessonForm.videoFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('videos')
          .getPublicUrl(filePath)

        videoUrl = publicUrl
      }

      if (editingLesson) {
        const { error } = await supabase
          .from('lessons')
          .update({
            title: lessonForm.title.trim(),
            content: lessonForm.content.trim() || null,
            video_url: videoUrl || null
          })
          .eq('id', editingLesson.id)

        if (error) throw error

        setCourse(prev => prev ? {
          ...prev,
          sections: prev.sections.map(section => ({
            ...section,
            lessons: section.lessons.map(lesson =>
              lesson.id === editingLesson.id
                ? {
                    ...lesson,
                    title: lessonForm.title.trim(),
                    content: lessonForm.content.trim() || null,
                    video_url: videoUrl || null
                  }
                : lesson
            )
          }))
        } : null)
        toast.success('Lesson updated successfully!')
      } else {
        const section = course?.sections.find(s => s.id === currentSectionId)
        const maxOrder = Math.max(...(section?.lessons.map(l => l.order_index) || [0]), 0)

        const { data, error } = await supabase
          .from('lessons')
          .insert({
            section_id: currentSectionId,
            title: lessonForm.title.trim(),
            content: lessonForm.content.trim() || null,
            video_url: videoUrl || null,
            order_index: maxOrder + 1
          })
          .select()
          .single()

        if (error) throw error

        setCourse(prev => prev ? {
          ...prev,
          sections: prev.sections.map(section =>
            section.id === currentSectionId
              ? { ...section, lessons: [...section.lessons, data] }
              : section
          )
        } : null)
        toast.success('Lesson created successfully!')
      }

      setLessonForm({ title: '', content: '', video_url: '', videoFile: null })
      setLessonDialogOpen(false)
      setEditingLesson(null)
      setCurrentSectionId('')
    } catch (error) {
      console.error('Error saving lesson:', error)
      toast.error('Failed to save lesson')
    } finally {
      setSaving(false)
    }
  }

  const assignTeacher = async () => {
    if (!selectedTeacher) {
      toast.error('Please select a teacher')
      return
    }

    try {
      const { error } = await supabase
        .from('courses')
        .update({ teacher_id: selectedTeacher })
        .eq('id', courseId)

      if (error) throw error

      // Fetch updated teacher info
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('name')
        .eq('id', selectedTeacher)
        .single()

      setCourse(prev => prev ? {
        ...prev,
        teacher: teacherData
      } : null)

      toast.success('Teacher assigned successfully!')
      setTeacherDialogOpen(false)
      setSelectedTeacher('')
    } catch (error) {
      console.error('Error assigning teacher:', error)
      toast.error('Failed to assign teacher')
    }
  }

  const deleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section? This will also delete all lessons in it.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', sectionId)

      if (error) throw error

      setCourse(prev => prev ? {
        ...prev,
        sections: prev.sections.filter(section => section.id !== sectionId)
      } : null)
      toast.success('Section deleted successfully')
    } catch (error) {
      console.error('Error deleting section:', error)
      toast.error('Failed to delete section')
    }
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

      setCourse(prev => prev ? {
        ...prev,
        sections: prev.sections.map(section => ({
          ...section,
          lessons: section.lessons.filter(lesson => lesson.id !== lessonId)
        }))
      } : null)
      toast.success('Lesson deleted successfully')
    } catch (error) {
      console.error('Error deleting lesson:', error)
      toast.error('Failed to delete lesson')
    }
  }

  const onDragEnd = async (result: { destination: { index: number } | null; source: { index: number }; type: string }) => {
    if (!result.destination) return

    const { source, destination, type } = result

    if (type === 'section' && course) {
      const reorderedSections = Array.from(course.sections)
      const [removed] = reorderedSections.splice(source.index, 1)
      reorderedSections.splice(destination.index, 0, removed)

      // Update order indices
      const updates = reorderedSections.map((section, index) => ({
        id: section.id,
        order_index: index + 1
      }))

      try {
        for (const update of updates) {
          await supabase
            .from('sections')
            .update({ order_index: update.order_index })
            .eq('id', update.id)
        }

        setCourse({
          ...course,
          sections: reorderedSections.map((section, index) => ({
            ...section,
            order_index: index + 1
          }))
        })
      } catch (error) {
        console.error('Error reordering sections:', error)
        toast.error('Failed to reorder sections')
      }
    }
  }

  const openLessonDialog = (sectionId: string, lesson?: Lesson) => {
    setCurrentSectionId(sectionId)
    if (lesson) {
      setEditingLesson(lesson)
      setLessonForm({
        title: lesson.title,
        content: lesson.content || '',
        video_url: lesson.video_url || '',
        videoFile: null
      })
    } else {
      setEditingLesson(null)
      setLessonForm({ title: '', content: '', video_url: '', videoFile: null })
    }
    setLessonDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading course...</div>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Course not found</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/en/dashboard/admin/course-builder')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course Builder
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{course.name}</h1>
            {course.description && (
              <p className="text-muted-foreground">{course.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {course.enrollments_count} students enrolled
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GraduationCap className="h-4 w-4" />
              {course.teacher?.name || 'No teacher assigned'}
            </div>
          </div>
          <Dialog open={teacherDialogOpen} onOpenChange={setTeacherDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Assign Teacher
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Teacher</DialogTitle>
                <DialogDescription>
                  Select a teacher to assign to this course
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teacher-select">Teacher</Label>
                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setTeacherDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={assignTeacher}>
                    Assign Teacher
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSection ? 'Edit Section' : 'Add New Section'}</DialogTitle>
                <DialogDescription>
                  {editingSection ? 'Update section details' : 'Create a new section for this course'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSectionSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="section-title">Section Title *</Label>
                  <Input
                    id="section-title"
                    value={sectionForm.title}
                    onChange={(e) => setSectionForm({ title: e.target.value })}
                    placeholder="Enter section title"
                    required
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setSectionDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Section</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Course Content */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="sections" type="section">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
              {course.sections.map((section, index) => (
                <Draggable key={section.id} draggableId={section.id} index={index}>
                  {(provided) => (
                    <Card ref={provided.innerRef} {...provided.draggableProps}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                            </div>
                            <CardTitle className="flex items-center gap-2">
                              <FileText className="h-5 w-5" />
                              {section.title}
                            </CardTitle>
                            <Badge variant="outline">{section.lessons.length} lessons</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openLessonDialog(section.id)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Lesson
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingSection(section)
                                setSectionForm({ title: section.title })
                                setSectionDialogOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteSection(section.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {/* Lessons */}
                          {section.lessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Play className="h-5 w-5 text-blue-500" />
                                <div>
                                  <h4 className="font-medium">{lesson.title}</h4>
                                  {lesson.video_url && (
                                    <p className="text-sm text-muted-foreground">Has video content</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openLessonDialog(section.id, lesson)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteLesson(lesson.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}

                          {section.lessons.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No lessons in this section yet.</p>
                              <Button
                                variant="outline"
                                className="mt-4"
                                onClick={() => openLessonDialog(section.id)}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add First Lesson
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Lesson Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingLesson ? 'Edit Lesson' : 'Add New Lesson'}</DialogTitle>
            <DialogDescription>
              {editingLesson ? 'Update lesson content' : 'Create a new lesson for this section'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLessonSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lesson-title">Lesson Title *</Label>
              <Input
                id="lesson-title"
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                placeholder="Enter lesson title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lesson-content">Content</Label>
              <Textarea
                id="lesson-content"
                value={lessonForm.content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setLessonForm({ ...lessonForm, content: e.target.value })
                }
                placeholder="Enter lesson content (markdown supported)"
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-url">Video URL</Label>
              <Input
                id="video-url"
                value={lessonForm.video_url}
                onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                placeholder="https://example.com/video.mp4"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-file">Or Upload Video</Label>
              <Input
                id="video-file"
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  setLessonForm({ ...lessonForm, videoFile: file })
                }}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setLessonDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Lesson'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}