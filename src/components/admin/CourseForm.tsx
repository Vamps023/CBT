import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { X, Upload, Clock, User } from 'lucide-react'

// Local types matching public.courses
type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export type CreateCourseForm = {
  title: string
  description: string
  duration_hours: number
  difficulty_level: Difficulty
  instructor_id: string
  is_published: boolean
  thumbnail_url: string | null
}

const schema = yup.object({
  title: yup.string().required('Title is required').min(3, 'Title must be at least 3 characters'),
  description: yup.string().required('Description is required').min(10, 'Description must be at least 10 characters'),
  duration_hours: yup.number().required('Duration is required').min(1, 'Duration must be at least 1 hour'),
  difficulty_level: yup.mixed<Difficulty>().oneOf(['beginner','intermediate','advanced']).required('Difficulty is required'),
  instructor_id: yup.string().required('Instructor is required'),
  is_published: yup.boolean().required(),
  thumbnail_url: yup.string().url('Must be a valid URL').nullable().notRequired(),
}).required()

interface CourseFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateCourseForm) => Promise<void>
  initialData?: Partial<CreateCourseForm>
  instructors: { id: string; full_name: string }[]
  loading?: boolean
  title: string
}

const CourseForm: React.FC<CourseFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  instructors,
  loading = false,
  title
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch
  } = useForm<CreateCourseForm>({
    resolver: yupResolver(schema) as unknown as import('react-hook-form').Resolver<CreateCourseForm>,
    defaultValues: {
      title: '',
      description: '',
      duration_hours: 1,
      difficulty_level: 'beginner',
      instructor_id: '',
      is_published: false,
      thumbnail_url: null,
      ...initialData
    }
  })

  const watchedThumbnail = watch('thumbnail_url')

  useEffect(() => {
    if (initialData) {
      Object.entries(initialData).forEach(([key, value]) => {
        if (key === 'thumbnail_url') {
          setValue('thumbnail_url', (value as any) ?? null)
        } else {
          setValue(key as keyof CreateCourseForm, value as any)
        }
      })
    }
  }, [initialData, setValue])

  const handleFormSubmit: import('react-hook-form').SubmitHandler<CreateCourseForm> = async (data) => {
    try {
      await onSubmit(data)
      reset()
      onClose()
    } catch (error) {
      console.error('Error submitting form:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Title *
              </label>
              <input
                {...register('title')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter course title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                {...register('description')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter course description"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Duration and Instructor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Duration (hours) *
                </label>
                <input
                  {...register('duration_hours', { valueAsNumber: true })}
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1"
                />
                {errors.duration_hours && (
                  <p className="mt-1 text-sm text-red-600">{errors.duration_hours.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="inline h-4 w-4 mr-1" />
                  Instructor *
                </label>
                <select
                  {...register('instructor_id')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select an instructor</option>
                  {instructors.map((instructor) => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.full_name || 'Unnamed'}
                    </option>
                  ))}
                </select>
                {errors.instructor_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.instructor_id.message}</p>
                )}
              </div>
            </div>

            {/* Difficulty and Published */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty *
                </label>
                <select
                  {...register('difficulty_level')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
                {errors.difficulty_level && (
                  <p className="mt-1 text-sm text-red-600">{(errors.difficulty_level as any).message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Published *
                </label>
                <select
                  {...register('is_published', { setValueAs: (v) => v === 'true' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="false">Unpublished</option>
                  <option value="true">Published</option>
                </select>
              </div>
            </div>

            {/* Thumbnail URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Upload className="inline h-4 w-4 mr-1" />
                Thumbnail URL
              </label>
              <input
                {...register('thumbnail_url', { setValueAs: (v) => (v === '' ? null : v) })}
                type="url"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com/image.jpg"
              />
              {errors.thumbnail_url && (
                <p className="mt-1 text-sm text-red-600">{errors.thumbnail_url.message}</p>
              )}
              
              {/* Thumbnail Preview */}
              {watchedThumbnail && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">Preview:</p>
                  <img
                    src={watchedThumbnail}
                    alt="Thumbnail preview"
                    className="w-32 h-20 object-cover rounded-lg border border-gray-200"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting || loading ? 'Saving...' : 'Save Course'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CourseForm