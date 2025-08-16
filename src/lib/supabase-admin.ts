import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey)

// Types for the admin course management system
export type CourseStatus = 'draft' | 'published' | 'archived'

export type Category = {
  id: string
  name: string
  description?: string
  created_at: string
}

export type Instructor = {
  id: string
  name: string
  email: string
  bio?: string
  avatar_url?: string
  created_at: string
}

export type AdminCourse = {
  id: string
  title: string
  description?: string
  price: number
  duration_hours: number
  category_id?: string
  instructor_id?: string
  status: CourseStatus
  thumbnail_url?: string
  created_at: string
  updated_at: string
  // Relations
  categories?: Category
  instructors?: Instructor
}

export type CourseEnrollment = {
  id: string
  course_id: string
  student_id: string
  enrolled_at: string
  completed_at?: string
  // Relations
  admin_courses?: AdminCourse
}

export type CreateCourseData = Omit<AdminCourse, 'id' | 'created_at' | 'updated_at' | 'categories' | 'instructors'>
export type UpdateCourseData = Partial<CreateCourseData>

// Course management functions
export const courseService = {
  // Get all courses with filters and pagination
  async getCourses(options: {
    page?: number
    limit?: number
    search?: string
    category?: string
    status?: CourseStatus
    sortBy?: 'title' | 'created_at' | 'price'
    sortOrder?: 'asc' | 'desc'
  } = {}) {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      status,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options

    let query = supabaseAdmin
      .from('admin_courses')
      .select(`
        *,
        categories(id, name),
        instructors(id, name, avatar_url)
      `)

    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }
    
    if (category) {
      query = query.eq('category_id', category)
    }
    
    if (status) {
      query = query.eq('status', status)
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    return {
      courses: data as AdminCourse[],
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      currentPage: page
    }
  },

  // Get single course by ID
  async getCourse(id: string) {
    const { data, error } = await supabaseAdmin
      .from('admin_courses')
      .select(`
        *,
        categories(id, name),
        instructors(id, name, email, bio, avatar_url)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data as AdminCourse
  },

  // Create new course
  async createCourse(courseData: CreateCourseData) {
    const { data, error } = await supabaseAdmin
      .from('admin_courses')
      .insert([courseData])
      .select(`
        *,
        categories(id, name),
        instructors(id, name, avatar_url)
      `)
      .single()

    if (error) throw error
    return data as AdminCourse
  },

  // Update course
  async updateCourse(id: string, courseData: UpdateCourseData) {
    const { data, error } = await supabaseAdmin
      .from('admin_courses')
      .update(courseData)
      .eq('id', id)
      .select(`
        *,
        categories(id, name),
        instructors(id, name, avatar_url)
      `)
      .single()

    if (error) throw error
    return data as AdminCourse
  },

  // Delete course
  async deleteCourse(id: string) {
    const { error } = await supabaseAdmin
      .from('admin_courses')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Bulk delete courses
  async bulkDeleteCourses(ids: string[]) {
    const { error } = await supabaseAdmin
      .from('admin_courses')
      .delete()
      .in('id', ids)

    if (error) throw error
  },

  // Bulk update course status
  async bulkUpdateStatus(ids: string[], status: CourseStatus) {
    const { error } = await supabaseAdmin
      .from('admin_courses')
      .update({ status })
      .in('id', ids)

    if (error) throw error
  }
}

// Category management functions
export const categoryService = {
  async getCategories() {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('name')

    if (error) throw error
    return data as Category[]
  },

  async createCategory(name: string, description?: string) {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert([{ name, description }])
      .select()
      .single()

    if (error) throw error
    return data as Category
  }
}

// Instructor management functions
export const instructorService = {
  async getInstructors() {
    const { data, error } = await supabaseAdmin
      .from('instructors')
      .select('*')
      .order('name')

    if (error) throw error
    return data as Instructor[]
  },

  async createInstructor(instructorData: Omit<Instructor, 'id' | 'created_at'>) {
    const { data, error } = await supabaseAdmin
      .from('instructors')
      .insert([instructorData])
      .select()
      .single()

    if (error) throw error
    return data as Instructor
  }
}

// Real-time subscriptions
export const subscribeToCoursesChanges = (callback: (payload: any) => void) => {
  return supabaseAdmin
    .channel('admin_courses_changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'admin_courses' }, 
      callback
    )
    .subscribe()
}