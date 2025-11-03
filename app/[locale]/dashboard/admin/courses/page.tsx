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
import { Plus, Edit, Trash2, Upload, BookOpen, Users, Clock, Award, ChevronRight, GripVertical, X, GraduationCap, Target, Settings } from 'lucide-react'

interface Course {
  id: string
  name: string
  description: string | null
  image_url: string | null
  study_level_id: string | null
  language_id: string | null
  xp_value: number
  teacher_id: string | null
  is_published: boolean
  created_at: string
  updated_at: string
  teacher?: {
    id: string
    name?: string | null
    profile?: {
      full_name: string | null
    } | null
  } | null
  study_level?: {
    name: string
  } | null
  language?: {
    name: string
    code: string
  } | null
  specialties?: Array<{
    specialty: {
      id: string
      name: string
    }
  }>
  sections?: Section[] | null
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
  profile?: {
    full_name: string | null
  } | null
  name?: string | null
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

interface StudyLevel {
  id: string
  name: string
  description?: string | null
  order_index: number
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [studyLevels, setStudyLevels] = useState<StudyLevel[]>([])
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
    study_level_id: '',
    language_id: '',
    specialty_ids: [] as string[],
    xp_value: '100',
    teacher_id: '', // For selecting existing teacher
    teacher_name: '', // For entering new teacher name
    is_published: false,
    image: null as File | null
  })

  const [builderData, setBuilderData] = useState({
    sections: [] as Section[]
  })

  const supabase = createClient()

  useEffect(() => {
    console.log('Component mounted, fetching data...')
    fetchCourses()
    fetchTeachers()
    fetchStudyLevels()
    fetchLanguages()
    fetchSpecialties()
  }, [])

  const fetchCourses = async () => {
    try {
      console.log('Fetching courses...')
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          teacher:teachers!fk_courses_teacher(
            id,
            name,
            profile:profiles(id, full_name)
          ),
          study_level:study_levels!fk_courses_study_level(id, name),
          language:languages!fk_courses_language(id, name, code),
          course_specialties(
            specialty:specialties(id, name)
          ),
          sections:sections(
            id,
            title,
            order_index
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error fetching courses:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })

        // If the error is about missing relationships, try a simpler query
        if (error.code === 'PGRST200' && error.message.includes('relationship')) {
          console.log('Trying simpler query without joins...')
          const { data: simpleData, error: simpleError } = await supabase
            .from('courses')
            .select('*')
            .order('created_at', { ascending: false })

          if (simpleError) {
            console.error('Even simple query failed:', simpleError)
            throw simpleError
          }

          console.log('Simple query succeeded, courses fetched:', simpleData?.length || 0)
          setCourses(simpleData || [])
          return
        }

        throw error
      }

      console.log('Courses fetched successfully:', data?.length || 0, 'courses')

      // Transform the data to match expected structure
      const transformedData = data?.map(course => ({
        ...course,
        specialties: course.course_specialties?.map((cs: any) => ({
          specialty: cs.specialty
        })) || []
      })) || []

      setCourses(transformedData)
    } catch (error) {
      console.error('Error fetching courses:', error)
      console.error('Error type:', typeof error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
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
          name,
          profiles!teachers_profile_id_fkey(full_name)
        `)

      if (error) throw error

      const transformedData = data?.map(item => ({
        id: item.id,
        name: item.name,
        profile: {
          full_name: (item.profiles as any)?.full_name || null
        }
      })) || []

      setTeachers(transformedData)
    } catch (error) {
      console.error('Error fetching teachers:', error)
    }
  }

  const fetchStudyLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('study_levels')
        .select('id, name, order_index')
        .order('order_index')

      if (error) throw error
      setStudyLevels(data || [])
    } catch (error) {
      console.error('Error fetching study levels:', error)
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

    if (!createFormData.study_level_id) {
      toast.error('Study level is required')
      return
    }

    if (!createFormData.language_id) {
      toast.error('Language is required')
      return
    }

    setUploading(true)

    try {
      let imageUrl = null

      if (createFormData.image) {
        imageUrl = await uploadImage(createFormData.image)
      }

      let teacherId = createFormData.teacher_id

      // If teacher name is provided instead of selecting existing teacher, create new teacher
      if (!createFormData.teacher_id && createFormData.teacher_name.trim()) {
        // Create teacher record with name but no profile
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .insert({
            name: createFormData.teacher_name.trim(),
            bio: 'Teacher account created during course creation',
            is_active: false // Mark as inactive until admin enables
          })
          .select()
          .single()

        if (teacherError) throw teacherError

        teacherId = teacherData.id
        toast.success(`Created teacher account for ${createFormData.teacher_name.trim()}`)
      } else if (!createFormData.teacher_id) {
        // No teacher selected, use default system teacher
        const systemTeacherName = 'System Administrator'

        // Check if default system teacher exists
        const { data: existingSystemTeacher } = await supabase
          .from('teachers')
          .select('id')
          .eq('name', systemTeacherName)
          .single()

        if (existingSystemTeacher) {
          teacherId = existingSystemTeacher.id
        } else {
          // Create the default system teacher
          const { data: teacherData, error: teacherError } = await supabase
            .from('teachers')
            .insert({
              name: systemTeacherName,
              bio: 'Default system teacher for course attribution',
              is_active: false
            })
            .select()
            .single()

          if (teacherError) throw teacherError

          teacherId = teacherData.id
          toast.info('Using default system teacher')
        }
      }

      const courseData = {
        name: createFormData.name.trim(),
        description: createFormData.description.trim() || null,
        study_level_id: createFormData.study_level_id || null,
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
          teacher:teachers!fk_courses_teacher(
            id,
            name,
            profile:profiles(full_name)
          ),
          study_level:study_levels!fk_courses_study_level(name),
          language:languages!fk_courses_language(name, code)
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
        study_level_id: '',
        language_id: '',
        specialty_ids: [],
        xp_value: '100',
        teacher_id: '', // Changed back to teacher_id
        teacher_name: '', // For new teacher name
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('Manual refresh triggered')
              fetchStudyLevels()
              fetchLanguages()
              fetchSpecialties()
            }}
          >
            🔄 Refresh Data
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Course
          </Button>
        </div>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Course</DialogTitle>
            <DialogDescription>
              Set up the basic information for your course. You'll be able to add content after creation.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCourse} className="space-y-4">
            {/* Course Basic Info - Compact */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Course Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Course Name *</Label>
                  <Input
                    id="name"
                    value={createFormData.name}
                    onChange={(e) => handleCreateInputChange('name', e.target.value)}
                    placeholder="e.g., Mathematics 7ème Année"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                  <Input
                    id="description"
                    value={createFormData.description}
                    onChange={(e) => handleCreateInputChange('description', e.target.value)}
                    placeholder="Brief course description"
                  />
                </div>
              </div>
            </Card>

            {/* Moroccan Education Structure - Compact */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold">Moroccan Education Structure</h3>
                <Badge variant="outline" className="text-xs">🇲🇦</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Study Level Selection */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <Label htmlFor="study_level" className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Study Level *
                    </Label>
                  </div>
                  <Select value={createFormData.study_level_id} onValueChange={(value) => handleCreateInputChange('study_level_id', value)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {studyLevels.length === 0 ? (
                        <SelectItem value="no-levels" disabled>
                          No study levels available
                        </SelectItem>
                      ) : (
                        studyLevels.map((level) => (
                          <SelectItem key={level.id} value={level.id} className="py-2">
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{level.name}</span>
                              {level.description && (
                                <span className="text-xs text-muted-foreground">{level.description}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Language Selection */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <Label htmlFor="language" className="text-sm font-medium text-green-700 dark:text-green-300">
                      Teaching Language *
                    </Label>
                  </div>
                  <Select value={createFormData.language_id} onValueChange={(value) => handleCreateInputChange('language_id', value)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((language) => (
                        <SelectItem key={language.id} value={language.id} className="py-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              language.code === 'ar' ? 'bg-red-500' :
                              language.code === 'biof' ? 'bg-blue-500' :
                              'bg-purple-500'
                            }`}></div>
                            <span className="font-medium text-sm">{language.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Specialties and Settings - Compact */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Specialties Selection */}
              {createFormData.language_id && (
                <Card className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-600" />
                      <Label className="text-sm font-medium text-purple-700 dark:text-purple-300">
                        Academic Specialties
                      </Label>
                      <Badge variant="secondary" className="text-xs">
                        {specialties.filter(s => s.language_id === createFormData.language_id).length}
                      </Badge>
                    </div>

                    <div className="max-h-32 overflow-y-auto space-y-2">
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
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                            <Label
                              htmlFor={`specialty-${specialty.id}`}
                              className="text-sm cursor-pointer flex-1"
                            >
                              {specialty.name}
                            </Label>
                          </div>
                        ))}
                    </div>

                    {specialties.filter(s => s.language_id === createFormData.language_id).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        No specialties available
                      </p>
                    )}
                  </div>
                </Card>
              )}

              {/* Course Settings */}
              <Card className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-orange-600" />
                    <h4 className="text-sm font-semibold">Course Settings</h4>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="xp_value" className="text-sm">XP Value</Label>
                      <Input
                        id="xp_value"
                        type="number"
                        value={createFormData.xp_value}
                        onChange={(e) => handleCreateInputChange('xp_value', e.target.value)}
                        placeholder="100"
                        min="0"
                        className="w-20 h-8"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Teacher Assignment</Label>

                      {/* Existing Teacher Dropdown */}
                      <div className="space-y-2">
                        <Label htmlFor="teacher_id" className="text-xs text-muted-foreground">
                          Select existing teacher (optional)
                        </Label>
                        <Select value={createFormData.teacher_id} onValueChange={(value) => handleCreateInputChange('teacher_id', value)}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select existing teacher (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {teachers.length === 0 ? (
                              <SelectItem value="no-teachers" disabled>
                                No teachers available
                              </SelectItem>
                            ) : (
                              teachers.map((teacher) => (
                                <SelectItem key={teacher.id} value={teacher.id} className="py-2">
                                  <span className="font-medium text-sm">
                                    {teacher.profile?.full_name || teacher.name || 'Unnamed Teacher'}
                                  </span>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* OR Divider */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-px bg-border"></div>
                        <span className="text-xs text-muted-foreground px-2">OR</span>
                        <div className="flex-1 h-px bg-border"></div>
                      </div>

                      {/* New Teacher Name Input */}
                      <div className="space-y-2">
                        <Label htmlFor="teacher_name" className="text-xs text-muted-foreground">
                          Enter new teacher name
                        </Label>
                        <Input
                          id="teacher_name"
                          value={createFormData.teacher_name}
                          onChange={(e) => handleCreateInputChange('teacher_name', e.target.value)}
                          placeholder="e.g., Dr. Ahmed Bennani"
                          className="h-9"
                        />
                        <p className="text-xs text-muted-foreground">
                          Leave both fields empty to use the default System Administrator teacher
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="is_published" className="text-sm cursor-pointer">
                        Publish Course
                      </Label>
                      <input
                        type="checkbox"
                        id="is_published"
                        checked={createFormData.is_published}
                        onChange={(e) => handleCreateInputChange('is_published', e.target.checked)}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Image Upload */}
            <Card className="p-4">
              <div className="space-y-3">
                <Label htmlFor="image" className="text-sm font-medium">Course Image (Optional)</Label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleCreateFileChange}
                    className="hidden"
                  />
                  <Label htmlFor="image" className="cursor-pointer">
                    <span className="text-sm font-medium text-blue-600 hover:text-blue-700">
                      Click to upload image
                    </span>
                    <span className="text-xs text-muted-foreground block mt-1">
                      PNG, JPG up to 5MB
                    </span>
                  </Label>
                  {createFormData.image && (
                    <div className="mt-2 p-2 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-700 dark:text-green-300">
                        ✓ {createFormData.image.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Course...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Course
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
                    <span>Level: {course.study_level?.name || 'Not set'}</span>
                    <span>Language: {course.language?.name || 'Not set'}</span>
                    <span>Teacher: {course.teacher?.name || course.teacher?.profile?.full_name || 'Unassigned'}</span>
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