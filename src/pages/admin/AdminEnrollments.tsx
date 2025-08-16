import React, { useEffect, useState } from 'react'
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
      <h1 className="text-2xl font-semibold mb-4">Enrollment Management</h1>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Course</label>
          <select className="border px-3 py-2 rounded w-full" value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)}>
            <option value="">Select a course</option>
            {courses.map(c => (<option key={c.id} value={c.id}>{c.title}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Add enrollment by user email</label>
          <div className="flex">
            <input className="border px-3 py-2 rounded-l w-full" placeholder="user@example.com" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
            <button disabled={loading} onClick={handleAdd} className={`px-4 py-2 text-white rounded-r ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>{loading ? 'Adding...' : 'Add'}</button>
          </div>
          <p className="text-xs text-gray-500 mt-1">User must exist in the app (signed up) to enroll by email.</p>
        </div>
      </div>

      {selectedCourseId && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Current Enrollments</h2>
          {enrollments.length === 0 ? (
            <p className="text-sm text-gray-600">No enrollments yet.</p>
          ) : (
            <ul className="divide-y border rounded">
              {enrollments.map(en => (
                <li key={en.id} className="flex items-center justify-between px-3 py-2">
                  <div className="text-sm">
                    {usersById[en.user_id]?.email || en.user_id}
                    {usersById[en.user_id]?.full_name ? (
                      <span className="ml-2 text-gray-500">({usersById[en.user_id].full_name})</span>
                    ) : null}
                  </div>
                  <button disabled={loading} className={`px-3 py-1 rounded text-white ${loading ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'}`} onClick={() => handleRemove(en.id)}>Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminEnrollments
