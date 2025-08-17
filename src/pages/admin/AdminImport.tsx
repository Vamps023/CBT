import React from 'react'
import ImportCourse from '../../components/admin/ImportCourse'

const AdminImport: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import Course</h1>
        <p className="text-gray-600 mt-1">Upload or paste a JSON to create a full course, modules, lessons, and assessments.</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200">
        <ImportCourse />
      </div>
    </div>
  )
}

export default AdminImport
