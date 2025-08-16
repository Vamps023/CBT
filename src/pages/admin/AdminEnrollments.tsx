import React, { useEffect, useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'react-hot-toast'
import { listByCourse, addByEmail as svcAddByEmail, remove as svcRemove } from '../../services/supabase/enrollments'
import { getManyByIds } from '../../services/supabase/users'

type Course = { id: string; title: string }
type Enrollment = { id: string; user_id: string; course_id: string }
type UserRow = { id: string; email: string | null; full_name: string | null }

const AdminEnrollments: React.FC = () => {
  const { user, isAdmin } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [usersById, setUsersById] = useState<Record<string, UserRow>>({})
  const [addEmail, setAddEmail] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadCourses = async () => {
      if (!user) return
      let query = supabase.from('courses').select('id, title').order('title', { ascending: true })
      if (!isAdmin) query = query.eq('instructor_id', user.id)
      const { data, error } = await query
      if (error) {
        toast.error(error.message)
        return
      }
      setCourses((data as Course[]) || [])
    }
    loadCourses()
  }, [user, isAdmin])

  useEffect(() => {
    const loadEnrollments = async () => {
      if (!selectedCourseId) return
      try {
        const rows = await listByCourse(selectedCourseId)
        setEnrollments(rows)
        const userIds = Array.from(new Set(rows.map(r => r.user_id)))
        if (userIds.length) {
          const udata = await getManyByIds(userIds)
          const map: Record<string, UserRow> = {}
          for (const u of udata as any[]) map[u.id] = u
          setUsersById(map)
        } else {
          setUsersById({})
        }
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load enrollments')
      }
    }
    loadEnrollments()
  }, [selectedCourseId])

  const handleAdd = async () => {
    const email = addEmail.trim().toLowerCase()
    if (!email || !selectedCourseId) return toast.error('Enter email and select a course')
    setLoading(true)
    try {
      const res = await svcAddByEmail(selectedCourseId, email)
      if ((res as any).already) {
        toast('User is already enrolled', { icon: 'ℹ️' })
      } else {
        toast.success('Enrollment added')
      }
      setAddEmail('')

      // reload
      const rows = await listByCourse(selectedCourseId)
      setEnrollments(rows)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add enrollment')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (enrollmentId: string) => {
    setLoading(true)
    try {
      await svcRemove(enrollmentId)
      setEnrollments(enrollments.filter(e => e.id !== enrollmentId))
      toast.success('Enrollment removed')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove enrollment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
            <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Enrollment Management</h1>
      </div>
      <p className="text-gray-600 mb-6">Add or remove student enrollments for specific courses.</p>

      {/* Controls Card */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Course Selection */}
          <div>
            <label htmlFor="course-select" className="block text-sm font-medium text-gray-700 mb-1">Select a Course</label>
            <select
              id="course-select"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              <option value="">Choose a course to manage enrollments...</option>
              {courses.map(c => (<option key={c.id} value={c.id}>{c.title}</option>))}
            </select>
          </div>
          {/* Add Enrollment */}
          <div>
            <label htmlFor="add-email" className="block text-sm font-medium text-gray-700 mb-1">Add Student by Email</label>
            <div className="flex items-center space-x-2">
              <input
                id="add-email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="student@example.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                disabled={!selectedCourseId}
              />
              <button
                disabled={loading || !selectedCourseId || !addEmail.trim()}
                onClick={handleAdd}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2 flex-shrink-0"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Plus size={18} />}
                <span>Add</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">User must have an existing account.</p>
          </div>
        </div>
      </div>

      {/* Enrollments List Card */}
      {selectedCourseId && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Enrollments for: <span className="font-bold">{courses.find(c => c.id === selectedCourseId)?.title}</span>
          </h3>
          {enrollments.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No students are enrolled in this course yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Remove</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {enrollments.map(en => (
                    <tr key={en.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {usersById[en.user_id]?.full_name || <span className="text-gray-500">N/A</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {usersById[en.user_id]?.email || en.user_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          disabled={loading}
                          className="text-red-600 hover:text-red-900 disabled:text-gray-400 p-1 rounded-full hover:bg-red-100 transition-colors"
                          onClick={() => handleRemove(en.id)}
                          title="Remove Enrollment"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminEnrollments
