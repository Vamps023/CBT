import React, { useState } from 'react';
import { EnhancedCourseGraphEditor } from '../../components/admin/EnhancedCourseGraphEditor';
import { useAdmin } from '../../contexts/AdminContext';

const AdminCourseGraphEditor: React.FC = () => {
  const { user } = useAdmin();
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50">
      <EnhancedCourseGraphEditor 
        courseId={selectedCourseId}
        onCourseSelect={setSelectedCourseId}
      />
    </div>
  );
};

export default AdminCourseGraphEditor;
