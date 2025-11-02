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
import { Plus, Edit, Trash2, Upload, BookOpen, Users, Clock, Award, ChevronRight, GripVertical, X } from 'lucide-react'

interface Course {
  id: string
  name: string
  description: string | null
  image_url: string | null
  academic_year_id: string | null
  language_id: string | null
  xp_value: number
  teacher_id: string | null
  is_published: boolean
  created_at: string
  updated_at: string
  teacher?: {
    profile: {
      full_name: string | null
    }
  }
  academic_year?: {
    name: string
  }
  language?: {
    name: string
    code: string
  }
  specialties?: Array<{
    specialty: {
      id: string
      name: string
    }
  }>
  sections?: Section[]
}

interface Section {
  id: string
  course_id: string
  title: string
  description: string | null
  order_index: number
  created_at: string
  lessons?: Lesson[]
}

interface Lesson {
  id: string
  section_id: string
  title: string
  content: string | null
  video_url: string | null
  order_index: number
  xp_value: number
  created_at: string
}

interface Teacher {
  id: string
  profile: {
    full_name: string | null
  }
}

interface AcademicYear {
  id: string
  name: string
}

interface Language {
  id: string
  name: string
  code: string
}

interface Specialty {
  id: string
  name: string
  language_id: string
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [languages, setLanguages] = useState<Language[]>([])
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [uploading, setUploading] = useState(false)

  const [createFormData, setCreateFormData] = useState({
    name: '',
    description: '',
    academic_year_id: '',
    language_id: '',
    specialty_ids: [] as string[],
    xp_value: '100',
    teacher_id: '',
    is_published: false,
    image: null as File | null
  })

  const [builderData, setBuilderData] = useState({
    sections: [] as Section[]
  })

  const supabase = createClient()

  useEffect(() => {
    fetchCourses()
    fetchTeachers()
    fetchAcademicYears()
    fetchLanguages()
    fetchSpecialties()
  }, [])

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          teacher:teachers(
            profile:profiles(full_name)
          ),
          academic_year:academic_years(name),
          language:languages(name, code),
          specialties:course_specialties(
            specialty:specialties(id, name)
          ),
          sections:sections(
            id,
            title,
            description,
            order_index,
            lessons:lessons(
              id,
              title,
              order_index,
              xp_value
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCourses(data || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
      toast.error('Failed to load courses')
    } finally {
      setLoading(false)
    }
  }

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select(`
          id,
          profiles!teachers_profile_id_fkey(full_name)
        `)

      if (error) throw error

      const transformedData = data?.map(item => ({
        id: item.id,
        profile: {
          full_name: (item.profiles as any)?.full_name || null
        }
      })) || []

      setTeachers(transformedData)
    } catch (error) {
      console.error('Error fetching teachers:', error)
    }
  }

  const fetchAcademicYears = async () => {
    try {
      const { data, error } = await supabase
        .from('academic_years')
        .select('id, name')
        .order('name')

      if (error) throw error
      setAcademicYears(data || [])
    } catch (error) {
      console.error('Error fetching academic years:', error)
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

  const fetchSpecialties = async () => {
    try {
      const { data, error } = await supabase
        .from('specialties')
        .select('id, name, language_id')
        .order('name')

      if (error) throw error
      setSpecialties(data || [])
    } catch (error) {
      console.error('Error fetching specialties:', error)
    }
  }

  const handleCreateInputChange = (field: string, value: string | boolean | string[]) => {
    setCreateFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCreateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setCreateFormData(prev => ({ ...prev, image: file }))
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `courses/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('course-images')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        toast.error('Failed to upload image, course will be created without image')
        return null
      }

      const { data } = supabase.storage
        .from('course-images')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Image upload failed:', error)
      toast.error('Failed to upload image, course will be created without image')
      return null
    }
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!createFormData.name.trim()) {
      toast.error('Course name is required')
      return
    }

    setUploading(true)

    try {
      let imageUrl = null

      if (createFormData.image) {
        imageUrl = await uploadImage(createFormData.image)
      }

      let teacherId = createFormData.teacher_id

      // If no teacher is selected, create an inactive teacher account for attribution
      if (!teacherId) {
        // Create a system teacher profile first
        const systemTeacherEmail = `system-teacher-${Date.now()}@lms.internal`
        const systemTeacherName = `Course Creator - ${createFormData.name.substring(0, 20)}`

        // Create profile for system teacher
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .insert({
            email: systemTeacherEmail,
            full_name: systemTeacherName,
            role: 'teacher'
          })
          .select()
          .single()

        if (profileError) throw profileError

        // Create teacher record
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .insert({
            profile_id: profileData.id,
            bio: 'System-generated teacher account for course attribution',
            is_active: false // Mark as inactive
          })
          .select()
          .single()

        if (teacherError) throw teacherError

        teacherId = teacherData.id
        toast.info('Created system teacher account for course attribution')
      }

      const courseData = {
        name: createFormData.name.trim(),
        description: createFormData.description.trim() || null,
        academic_year_id: createFormData.academic_year_id || null,
        language_id: createFormData.language_id || null,
        xp_value: parseInt(createFormData.xp_value) || 100,
        teacher_id: teacherId,
        is_published: createFormData.is_published,
        ...(imageUrl && { image_url: imageUrl })
      }

      const { data, error } = await supabase
        .from('courses')
        .insert(courseData)
        .select(`
          *,
          teacher:teachers(
            profile:profiles(full_name)
          ),
          academic_year:academic_years(name),
          language:languages(name, code)
        `)
        .single()

      if (error) throw error

      // Handle specialty insertions for new course
      if (createFormData.specialty_ids.length > 0) {
        const specialtyInserts = createFormData.specialty_ids.map(specialtyId => ({
          course_id: data.id,
          specialty_id: specialtyId
        }))

        await supabase
          .from('course_specialties')
          .insert(specialtyInserts)
      }

      setCourses(prev => [data, ...prev])
      toast.success('Course created successfully!')

      // Reset form and open course builder
      setCreateFormData({
        name: '',
        description: '',
        academic_year_id: '',
        language_id: '',
        specialty_ids: [],
        xp_value: '100',
        teacher_id: '',
        is_published: false,
        image: null
      })
      setIsCreateDialogOpen(false)

      // Open course builder for the new course
      openCourseBuilder(data)
    } catch (error) {
      console.error('Error creating course:', error)
      toast.error('Failed to create course')
    } finally {
      setUploading(false)
    }
  }

  const openCourseBuilder = async (course: Course) => {
    setSelectedCourse(course)

    // Fetch sections and lessons for this course
    try {
      const { data: sections, error } = await supabase
        .from('sections')
        .select(`
          *,
          lessons:lessons(*)
        `)
        .eq('course_id', course.id)
        .order('order_index')

      if (error) throw error

      setBuilderData({
        sections: sections || []
      })
    } catch (error) {
      console.error('Error fetching course content:', error)
      toast.error('Failed to load course content')
      setBuilderData({ sections: [] })
    }

    setIsBuilderOpen(true)
  }

  const addSection = () => {
    const newSection: Section = {
      id: `temp-${Date.now()}`,
      course_id: selectedCourse!.id,
      title: 'New Section',
      description: null,
      order_index: builderData.sections.length,
      created_at: new Date().toISOString(),
      lessons: []
    }

    setBuilderData(prev => ({
      sections: [...prev.sections, newSection]
    }))
  }

  const updateSection = (sectionId: string, updates: Partial<Section>) => {
    setBuilderData(prev => ({
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    }))
  }

  const deleteSection = (sectionId: string) => {
    setBuilderData(prev => ({
      sections: prev.sections.filter(section => section.id !== sectionId)
    }))
  }

  const addLesson = (sectionId: string) => {
    const section = builderData.sections.find(s => s.id === sectionId)
    if (!section) return

    const newLesson: Lesson = {
      id: `temp-${Date.now()}`,
      section_id: sectionId,
      title: 'New Lesson',
      content: null,
      video_url: null,
      order_index: section.lessons?.length || 0,
      xp_value: 10,
      created_at: new Date().toISOString()
    }

    setBuilderData(prev => ({
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, lessons: [...(section.lessons || []), newLesson] }
          : section
      )
    }))
  }

  const updateLesson = (sectionId: string, lessonId: string, updates: Partial<Lesson>) => {
    setBuilderData(prev => ({
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              lessons: section.lessons?.map(lesson =>
                lesson.id === lessonId ? { ...lesson, ...updates } : lesson
              )
            }
          : section
      )
    }))
  }

  const deleteLesson = (sectionId: string, lessonId: string) => {
    setBuilderData(prev => ({
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              lessons: section.lessons?.filter(lesson => lesson.id !== lessonId)
            }
          : section
      )
    }))
  }

  const saveCourseContent = async () => {
    if (!selectedCourse) return

    try {
      // Save sections and lessons
      for (const section of builderData.sections) {
        let sectionId = section.id

        if (section.id.startsWith('temp-')) {
          // Create new section
          const { data: newSection, error: sectionError } = await supabase
            .from('sections')
            .insert({
              course_id: selectedCourse.id,
              title: section.title,
              description: section.description,
              order_index: section.order_index
            })
            .select()
            .single()

          if (sectionError) throw sectionError
          sectionId = newSection.id
        } else {
          // Update existing section
          const { error: sectionError } = await supabase
            .from('sections')
            .update({
              title: section.title,
              description: section.description,
              order_index: section.order_index
            })
            .eq('id', section.id)

          if (sectionError) throw sectionError
        }

        // Handle lessons
        if (section.lessons) {
          for (const lesson of section.lessons) {
            if (lesson.id.startsWith('temp-')) {
              // Create new lesson
              const { error: lessonError } = await supabase
                .from('lessons')
                .insert({
                  section_id: sectionId,
                  title: lesson.title,
                  content: lesson.content,
                  video_url: lesson.video_url,
                  order_index: lesson.order_index,
                  xp_value: lesson.xp_value
                })

              if (lessonError) throw lessonError
            } else {
              // Update existing lesson
              const { error: lessonError } = await supabase
                .from('lessons')
                .update({
                  title: lesson.title,
                  content: lesson.content,
                  video_url: lesson.video_url,
                  order_index: lesson.order_index,
                  xp_value: lesson.xp_value
                })
                .eq('id', lesson.id)

              if (lessonError) throw lessonError
            }
          }
        }
      }

      toast.success('Course content saved successfully!')
      fetchCourses() // Refresh the courses list
      setIsBuilderOpen(false)
      setSelectedCourse(null)
    } catch (error) {
      console.error('Error saving course content:', error)
      toast.error('Failed to save course content')
    }
  }

  const deleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId)

      if (error) throw error

      setCourses(courses.filter(course => course.id !== courseId))
      toast.success('Course deleted successfully')
    } catch (error) {
      console.error('Error deleting course:', error)
      toast.error('Failed to delete course')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Course Builder</h2>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading courses...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Course Builder</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Course</DialogTitle>
              <DialogDescription>
                Set up the basic information for your course. You'll be able to add content after creation.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Course Name *</Label>
                <Input
                  id="name"
                  value={createFormData.name}
                  onChange={(e) => handleCreateInputChange('name', e.target.value)}
                  placeholder="Enter course name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={createFormData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleCreateInputChange('description', e.target.value)}
                  placeholder="Enter course description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="academic_year">Academic Year</Label>
                  <Select value={createFormData.academic_year_id} onValueChange={(value) => handleCreateInputChange('academic_year_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select academic year" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears.map((year) => (
                        <SelectItem key={year.id} value={year.id}>
                          {year.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={createFormData.language_id} onValueChange={(value) => handleCreateInputChange('language_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialties">Specialties</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {specialties
                    .filter(specialty => specialty.language_id === createFormData.language_id)
                    .map((specialty) => (
                      <div key={specialty.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`specialty-${specialty.id}`}
                          checked={createFormData.specialty_ids.includes(specialty.id)}
                          onChange={(e) => {
                            const checked = e.target.checked
                            const currentIds = createFormData.specialty_ids
                            const newIds = checked
                              ? [...currentIds, specialty.id]
                              : currentIds.filter(id => id !== specialty.id)
                            handleCreateInputChange('specialty_ids', newIds)
                          }}
                        />
                        <Label htmlFor={`specialty-${specialty.id}`}>{specialty.name}</Label>
                      </div>
                    ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="xp_value">XP Value</Label>
                  <Input
                    id="xp_value"
                    type="number"
                    value={createFormData.xp_value}
                    onChange={(e) => handleCreateInputChange('xp_value', e.target.value)}
                    placeholder="100"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teacher">Teacher (Optional)</Label>
                  <Select value={createFormData.teacher_id} onValueChange={(value) => handleCreateInputChange('teacher_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a teacher or leave empty for auto-assignment" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.profile.full_name || 'Unnamed Teacher'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    If no teacher is selected, a system teacher account will be created for attribution.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Course Image</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleCreateFileChange}
                />
                {createFormData.image && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {createFormData.image.name}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={createFormData.is_published}
                  onChange={(e) => handleCreateInputChange('is_published', e.target.checked)}
                />
                <Label htmlFor="is_published">Publish course (make visible to students)</Label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading}>
                  {uploading ? 'Creating...' : 'Create Course'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
            <p className="text-muted-foreground mb-4">Create your first course to get started with the course builder.</p>
          </div>
        ) : (
          courses.map((course) => (
            <Card key={course.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => openCourseBuilder(course)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{course.name}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {course.description || 'No description'}
                    </CardDescription>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span>{course.sections?.length || 0} sections</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Award className="h-4 w-4 text-muted-foreground" />
                        <span>{course.xp_value} XP</span>
                      </div>
                    </div>
                    <Badge variant={course.is_published ? "default" : "secondary"} className="text-xs">
                      {course.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Language: {course.language?.name || 'Not set'}</span>
                    <span>Teacher: {course.teacher?.profile?.full_name || 'Unassigned'}</span>
                  </div>

                  {course.specialties && course.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {course.specialties.slice(0, 2).map((cs) => (
                        <Badge key={cs.specialty.id} variant="outline" className="text-xs">
                          {cs.specialty.name}
                        </Badge>
                      ))}
                      {course.specialties.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{course.specialties.length - 2} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); openCourseBuilder(course); }}>
                      <Edit className="h-4 w-4 mr-1" />
                      Build Course
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); deleteCourse(course.id); }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Course Builder Dialog */}
      <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Course Builder: {selectedCourse?.name}
            </DialogTitle>
            <DialogDescription>
              Add sections and lessons to build your course content.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Course Structure</h3>
              <Button onClick={addSection}>
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </div>

            <div className="space-y-4">
              {builderData.sections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-2" />
                  <p>No sections yet. Add your first section to get started.</p>
                </div>
              ) : (
                builderData.sections.map((section, sectionIndex) => (
                  <Card key={section.id} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                          <div className="flex-1">
                            <Input
                              value={section.title}
                              onChange={(e) => updateSection(section.id, { title: e.target.value })}
                              className="font-semibold border-none p-0 h-auto text-lg"
                              placeholder="Section title"
                            />
                            <Input
                              value={section.description || ''}
                              onChange={(e) => updateSection(section.id, { description: e.target.value })}
                              className="border-none p-0 h-auto text-sm text-muted-foreground mt-1"
                              placeholder="Section description (optional)"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => addLesson(section.id)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Lesson
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteSection(section.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {section.lessons && section.lessons.length > 0 ? (
                          section.lessons.map((lesson, lessonIndex) => (
                            <div key={lesson.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                              <GripVertical className="h-4 w-4 text-muted-foreground cursor-move flex-shrink-0" />
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Input
                                  value={lesson.title}
                                  onChange={(e) => updateLesson(section.id, lesson.id, { title: e.target.value })}
                                  placeholder="Lesson title"
                                  className="md:col-span-2"
                                />
                                <div className="flex items-center gap-2">
                                  <Award className="h-4 w-4 text-muted-foreground" />
                                  <Input
                                    type="number"
                                    value={lesson.xp_value}
                                    onChange={(e) => updateLesson(section.id, lesson.id, { xp_value: parseInt(e.target.value) || 0 })}
                                    placeholder="XP"
                                    className="w-20"
                                    min="0"
                                  />
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteLesson(section.id, lesson.id)}
                                className="text-destructive hover:text-destructive flex-shrink-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-muted-foreground text-sm">
                            No lessons in this section yet.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsBuilderOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveCourseContent}>
                Save Course Content
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}