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
import { Plus, Edit, Trash2, Play, FileText, GripVertical } from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

interface Course {
  id: string
  name: string
  academic_year?: { name: string } | null
  language?: { name: string } | null
}

interface Section {
  id: string
  title: string
  order_index: number
  lessons: Lesson[]
  quizzes: Quiz[]
}

interface Lesson {
  id: string
  title: string
  content: string | null
  video_url: string | null
  order_index: number
}

interface Quiz {
  id: string
  title: string
  data: Record<string, unknown>
}

export default function CourseBuilderPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Dialog states
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false)
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false)

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

  const supabase = createClient()

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseStructure()
    }
  }, [selectedCourse])

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          id,
          name,
          academic_year:academic_years(name),
          language:languages(name)
        `)
        .order('name')

      if (error) throw error

      const formattedCourses = (data || []).map(course => ({
        ...course,
        academic_year: Array.isArray(course.academic_year) ? course.academic_year[0] : course.academic_year,
        language: Array.isArray(course.language) ? course.language[0] : course.language
      }))

      setCourses(formattedCourses)
    } catch (error) {
      console.error('Error fetching courses:', error)
      toast.error('Failed to load courses')
    }
  }

  const fetchCourseStructure = async () => {
    if (!selectedCourse) return

    setLoading(true)
    try {
      // Fetch sections with their lessons and quizzes
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select(`
          id,
          title,
          order_index,
          lessons (
            id,
            title,
            content,
            video_url,
            order_index
          ),
          quizzes (
            id,
            title,
            data
          )
        `)
        .eq('course_id', selectedCourse)
        .order('order_index')

      if (sectionsError) throw sectionsError

      const formattedSections = sectionsData?.map(section => ({
        ...section,
        lessons: (section.lessons || []).sort((a: Lesson, b: Lesson) => a.order_index - b.order_index),
        quizzes: section.quizzes || []
      })) || []

      setSections(formattedSections)
    } catch (error) {
      console.error('Error fetching course structure:', error)
      toast.error('Failed to load course structure')
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

        setSections(sections.map(section =>
          section.id === editingSection.id
            ? { ...section, title: sectionForm.title.trim() }
            : section
        ))
        toast.success('Section updated successfully!')
      } else {
        const maxOrder = Math.max(...sections.map(s => s.order_index), 0)
        const { data, error } = await supabase
          .from('sections')
          .insert({
            course_id: selectedCourse,
            title: sectionForm.title.trim(),
            order_index: maxOrder + 1
          })
          .select()
          .single()

        if (error) throw error

        setSections([...sections, { ...data, lessons: [], quizzes: [] }])
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

        setSections(sections.map(section => ({
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
        })))
        toast.success('Lesson updated successfully!')
      } else {
        const section = sections.find(s => s.id === currentSectionId)
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

        setSections(sections.map(section =>
          section.id === currentSectionId
            ? { ...section, lessons: [...section.lessons, data] }
            : section
        ))
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

  const deleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section? This will also delete all lessons and quizzes in it.')) {
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

      setSections(sections.map(section => ({
        ...section,
        lessons: section.lessons.filter(lesson => lesson.id !== lessonId)
      })))
      toast.success('Lesson deleted successfully')
    } catch (error) {
      console.error('Error deleting lesson:', error)
      toast.error('Failed to delete lesson')
    }
  }

  const onDragEnd = async (result: { destination: { index: number } | null; source: { index: number }; type: string }) => {
    if (!result.destination) return

    const { source, destination, type } = result

    if (type === 'section') {
      const reorderedSections = Array.from(sections)
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

        setSections(reorderedSections.map((section, index) => ({
          ...section,
          order_index: index + 1
        })))
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
        <h2 className="text-3xl font-bold">Course Builder</h2>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading course structure...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Course Builder</h2>
      </div>

      {/* Course Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Course</CardTitle>
          <CardDescription>Choose a course to build or edit its structure</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name} - {course.academic_year?.name} ({course.language?.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCourse && (
        <>
          {/* Add Section Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Course Structure</h3>
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

          {/* Course Structure */}
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="sections" type="section">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                  {sections.map((section, index) => (
                    <Draggable key={section.id} draggableId={section.id} index={index}>
                      {(provided) => (
                        <Card ref={provided.innerRef} {...provided.draggableProps}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div {...provided.dragHandleProps}>
                                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <CardTitle className="text-lg">{section.title}</CardTitle>
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
                                <div key={lesson.id} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <Play className="h-4 w-4 text-blue-500" />
                                    <div>
                                      <h4 className="font-medium">{lesson.title}</h4>
                                      {lesson.video_url && (
                                        <p className="text-sm text-muted-foreground">Has video</p>
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

                              {/* Quizzes */}
                              {section.quizzes.map((quiz) => (
                                <div key={quiz.id} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <FileText className="h-4 w-4 text-green-500" />
                                    <h4 className="font-medium">{quiz.title}</h4>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm">
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}

                              {section.lessons.length === 0 && section.quizzes.length === 0 && (
                                <p className="text-muted-foreground text-center py-4">
                                  No lessons or quizzes in this section yet.
                                </p>
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
        </>
      )}
    </div>
  )
}