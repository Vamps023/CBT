import React, { useState, useEffect } from 'react'
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Trash2, 
  Globe, 
  FileText
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import CourseForm, { CreateCourseForm } from '../../components/admin/CourseForm'
import CourseTable from '../../components/admin/CourseTable'
import toast from 'react-hot-toast'

type AdminCourse = {
  id: string
  title: string
  description: string
  thumbnail_url?: string
  is_published: boolean
  created_at: string
  updated_at: string
  instructor_id: string
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  duration_hours: number
}

type User = {
  id: string
  full_name: string
  email: string
  role: string
}

const AdminCourses: React.FC = () => {
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [instructors, setInstructors] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  
  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null)
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [sortBy, setSortBy] = useState<'title' | 'created_at' | 'difficulty_level'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Selection state
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const limit = 10

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  useEffect(() => {
    loadCourses()
  }, [currentPage, debouncedSearch, selectedStatus, sortBy, sortOrder])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      
      // Load instructors (users with role 'instructor')
      const { data: instructorsData, error: instructorsError } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .eq('role', 'instructor')
      
      if (instructorsError) {
        console.error('Failed to fetch instructors:', instructorsError.message)
        throw instructorsError
      }
      setInstructors(instructorsData || [])
      
      // Load courses
      await loadCourses()
    } catch (error) {
      console.error('Error loading initial data:', error)
      toast.error('Failed to load initial data')
    } finally {
      setLoading(false)
    }
  }

  const refreshInstructors = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role')
      .eq('role', 'instructor')
    if (error) {
      console.error('Failed to refresh instructors:', error)
      return
    }
    setInstructors(data || [])
  }

  const handleAddInstructor = async () => {
    const email = window.prompt('Enter user email to promote to Instructor:')?.trim()
    if (!email) return
    try {
      const { data: userRow, error: userErr } = await supabase
        .from('users')
        .select('id, email, role, full_name')
        .eq('email', email)
        .single()
      if (userErr || !userRow) {
        toast.error('User not found')
        return
      }
      if (userRow.role === 'instructor') {
        toast.success('User is already an instructor')
        return
      }
      const { error: updErr } = await supabase
        .from('users')
        .update({ role: 'instructor' })
        .eq('id', userRow.id)
      if (updErr) throw updErr
      await refreshInstructors()
      toast.success(`Promoted ${email} to instructor`)
    } catch (e: any) {
      console.error('Failed to add instructor:', e)
      toast.error(e?.message || 'Failed to promote user')
    }
  }

  const handleTogglePublish = async (courseId: string, nextPublished: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke('adminCourseOps', {
        body: { action: 'togglePublish', payload: { courseId, nextPublished } }
      })
      if (error || (data && (data as any).error)) throw (error || new Error((data as any).error))
      setCourses(prev => prev.map(c => (c.id === courseId ? { ...c, is_published: nextPublished } : c)))
      toast.success(nextPublished ? 'Course published' : 'Course unpublished')
    } catch (e: any) {
      console.error('Failed to toggle publish:', e)
      toast.error(e?.message || 'Failed to update publish status')
    }
  }

  const loadCourses = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('courses')
        .select('id,title,description,thumbnail_url,duration_hours,difficulty_level,is_published,created_at,updated_at,instructor_id', { count: 'exact' })
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range((currentPage - 1) * limit, currentPage * limit - 1)
      
      // Apply filters if they exist
      if (debouncedSearch) {
        query = query.ilike('title', `%${debouncedSearch}%`)
      }
      
      if (selectedStatus !== '') {
        query = query.eq('is_published', selectedStatus === 'true')
      }
      
      const { data, error, count } = await query
      if (error) throw error
      
      setCourses((data as any as AdminCourse[]) || [])
      setTotalPages(Math.ceil((count || 0) / limit))
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error loading courses:', error)
      toast.error('Failed to load courses')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCourse = async (courseData: CreateCourseForm) => {
    try {
      setFormLoading(true)
      // Ensure user is authenticated before attempting insert (RLS requires it)
      const { data: authUser } = await supabase.auth.getUser()
      if (!authUser?.user) {
        toast.error('You must be signed in to create a course')
        return
      }
      const { data, error } = await supabase
        .from('courses')
        .insert([{ 
          ...courseData
        }])
        .select()
        .single()
      
      if (error) {
        console.error('Supabase insert error (courses):', error)
        throw error
      }
      
      if (data) {
        setCourses([data as unknown as AdminCourse, ...courses])
      }
      toast.success('Course created successfully')
    } catch (error: any) {
      console.error('Error creating course:', error)
      const msg = error?.message || 'Failed to create course'
      const details = error?.details || error?.hint || ''
      toast.error(`${msg}${details ? ` — ${details}` : ''}`)
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdateCourse = async (courseData: CreateCourseForm) => {
    if (!editingCourse) return
    
    try {
      setFormLoading(true)
      const { data, error } = await supabase.functions.invoke('adminCourseOps', {
        body: { action: 'update', payload: { courseId: editingCourse.id, data: courseData } }
      })
      
      if (error || (data && (data as any).error)) {
        const err = (error || new Error((data as any).error)) as any
        console.error('Supabase function update error (courses):', err)
        throw err
      }
      
      if (data && (data as any).course) {
        const updated = (data as any).course as AdminCourse
        setCourses(courses.map(course => course.id === editingCourse.id ? updated : course))
      }
      toast.success('Course updated successfully')
    } catch (error: any) {
      console.error('Error updating course:', error)
      const msg = error?.message || 'Failed to update course'
      const details = error?.details || error?.hint || ''
      toast.error(`${msg}${details ? ` — ${details}` : ''}`)
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (courseId: string) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        const { data, error } = await supabase.functions.invoke('adminCourseOps', {
          body: { action: 'delete', payload: { courseId } }
        })
        
        if (error || (data && (data as any).error)) {
          const err = (error || new Error((data as any).error)) as any
          console.error('Supabase function delete error (courses):', err)
          throw err
        }
        
        setCourses(courses.filter(course => course.id !== courseId))
        toast.success('Course deleted successfully')
      } catch (error: any) {
        console.error('Error deleting course:', error)
        const msg = error?.message || 'Failed to delete course'
        const details = error?.details || error?.hint || ''
        toast.error(`${msg}${details ? ` — ${details}` : ''}`)
      }
    }
  }

  const handleBulkDelete = async () => {
    if (selectedCourses.length === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedCourses.length} courses?`)) return
    
    try {
      const { data, error } = await supabase.functions.invoke('adminCourseOps', {
        body: { action: 'bulkDelete', payload: { ids: selectedCourses } }
      })
      
      if (error || (data && (data as any).error)) {
        const err = (error || new Error((data as any).error)) as any
        console.error('Supabase function bulk delete error (courses):', err)
        throw err
      }
      
      setCourses(courses.filter(course => !selectedCourses.includes(course.id)))
      toast.success(`${selectedCourses.length} courses deleted successfully`)
    } catch (error: any) {
      console.error('Error deleting courses:', error)
      const msg = error?.message || 'Failed to delete courses'
      const details = error?.details || error?.hint || ''
      toast.error(`${msg}${details ? ` — ${details}` : ''}`)
    }
  }

  const handleBulkStatusUpdate = async (isPublished: boolean) => {
    if (selectedCourses.length === 0) return
    
    try {
      const { data, error } = await supabase.functions.invoke('adminCourseOps', {
        body: { action: 'bulkPublish', payload: { ids: selectedCourses, is_published: isPublished } }
      })
      
      if (error || (data && (data as any).error)) {
        const err = (error || new Error((data as any).error)) as any
        console.error('Supabase function bulk publish error (courses):', err)
        throw err
      }
      
      setCourses(courses.map(course => selectedCourses.includes(course.id) ? { ...course, is_published: isPublished } : course))
      toast.success(`${selectedCourses.length} courses updated successfully`)
    } catch (error: any) {
      console.error('Error updating courses:', error)
      const msg = error?.message || 'Failed to update courses'
      const details = error?.details || error?.hint || ''
      toast.error(`${msg}${details ? ` — ${details}` : ''}`)
    }
  }

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    )
  }

  const handleSelectAll = (selected: boolean) => {
    setSelectedCourses(selected ? courses.map(course => course.id) : [])
  }

  const handleEditCourse = (course: { id: string; title: string; description: string; thumbnail_url?: string; duration_hours: number; difficulty_level: 'beginner' | 'intermediate' | 'advanced'; is_published: boolean; created_at: string }) => {
    // Find full course from state to retain fields not included in table type (e.g., instructor_id, updated_at)
    const full = courses.find(c => c.id === course.id)
    if (full) setEditingCourse(full)
    setShowForm(true)
  }

  const handleViewCourse = (courseId: string) => {
    // Navigate to course detail view
    window.open(`/courses/${courseId}`, '_blank')
  }

  const resetFilters = () => {
    setSearchTerm('')
    setSelectedStatus('')
    setSortBy('created_at')
    setSortOrder('desc')
    setCurrentPage(1)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingCourse(null)
  }

  return (
    <div className="p-6">
      {/* Header */}
            <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
        <div className="flex items-center space-x-2">
            <button
                onClick={handleAddInstructor}
                className="bg-white border border-gray-300 text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                title="Promote a user to Instructor by email"
            >
                Add Instructor
            </button>
            <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm"
            >
                <Plus className="h-4 w-4 mr-2" />
                Add Course
            </button>
        </div>
      </div>
      <p className="text-gray-600 mb-6">Manage your course catalog, search for courses, and perform bulk actions.</p>

            {/* Filters and Search */}
      <div className="mb-6">
                <div className="flex flex-wrap items-center gap-4 mb-4">
          {/* Search */}
                    <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {/* Published Filter */}
                    <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All</option>
            <option value="true">Published</option>
            <option value="false">Unpublished</option>
          </select>

          {/* Sort */}
          <div className="flex space-x-2 flex-grow sm:flex-grow-0">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-')
                setSortBy(field as 'title' | 'created_at' | 'difficulty_level')
                setSortOrder(order as 'asc' | 'desc')
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
              <option value="difficulty_level-asc">Difficulty Low-High</option>
              <option value="difficulty_level-desc">Difficulty High-Low</option>
            </select>
            
            <button
              onClick={resetFilters}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              title="Reset filters"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedCourses.length > 0 && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <span className="text-sm text-gray-600">
              {selectedCourses.length} course{selectedCourses.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkStatusUpdate(true)}
                className="flex items-center px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                <Globe className="h-4 w-4 mr-1" />
                Publish
              </button>
              <button
                onClick={() => handleBulkStatusUpdate(false)}
                className="flex items-center px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
              >
                <FileText className="h-4 w-4 mr-1" />
                Unpublish
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          Showing {courses.length} of {totalCount} courses
        </p>
        <button
          onClick={loadCourses}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </button>
      </div>

      {/* Course Table */}
      <CourseTable
        courses={courses}
        selectedCourses={selectedCourses}
        onSelectCourse={handleSelectCourse}
        onSelectAll={handleSelectAll}
        onEditCourse={handleEditCourse}
        onDeleteCourse={handleDelete}
        onViewCourse={handleViewCourse}
        onTogglePublish={handleTogglePublish}
        loading={loading}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 text-sm rounded-lg ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          
          <p className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </p>
        </div>
      )}

      {/* Course Form Modal */}
      <CourseForm
        isOpen={showForm}
        onClose={closeForm}
        onSubmit={editingCourse ? handleUpdateCourse : handleCreateCourse}
        initialData={editingCourse ? {
          title: editingCourse.title,
          description: editingCourse.description,
          duration_hours: editingCourse.duration_hours,
          difficulty_level: editingCourse.difficulty_level,
          instructor_id: editingCourse.instructor_id,
          is_published: editingCourse.is_published,
          thumbnail_url: editingCourse.thumbnail_url
        } : undefined}
        instructors={instructors}
        loading={formLoading}
        title={editingCourse ? 'Edit Course' : 'Create New Course'}
      />
    </div>
  )
}

export default AdminCourses