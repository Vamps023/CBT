import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { AdminProvider } from './contexts/AdminContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import AdminProtectedRoute from './components/admin/AdminProtectedRoute'
import AdminLayout from './components/admin/AdminLayout'
import Home from './pages/Home'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import Courses from './pages/Courses'
import CourseDetail from './pages/CourseDetail'
import Dashboard from './pages/Dashboard'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminAssessments from './pages/admin/AdminAssessments.tsx';
import AdminEnrollments from './pages/admin/AdminEnrollments.tsx';
import AdminCourseContent from './pages/admin/AdminCourseContent.tsx';
import AdminCourses from './pages/admin/AdminCourses.tsx';
import AdminImport from './pages/admin/AdminImport.tsx';

function App() {
  return (
    <AdminProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={
                <>
                  <Navbar />
                  <Home />
                </>
              } />
              <Route path="/signin" element={
                <>
                  <Navbar />
                  <SignIn />
                </>
              } />
              <Route path="/signup" element={
                <>
                  <Navbar />
                  <SignUp />
                </>
              } />
              <Route path="/courses" element={
                <>
                  <Navbar />
                  <Courses />
                </>
              } />
              <Route path="/course/:courseId" element={
                <>
                  <Navbar />
                  <CourseDetail />
                </>
              } />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Navbar />
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              
              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={
                <AdminProtectedRoute>
                  <AdminLayout />
                </AdminProtectedRoute>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="courses" element={<AdminCourses />} />
                <Route path="enrollments" element={<AdminEnrollments />} />
                <Route path="course-content" element={<AdminCourseContent />} />
                <Route path="assessments" element={<AdminAssessments />} />
                <Route path="import" element={<AdminImport />} />
              </Route>
            </Routes>
            
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#4ade80',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 4000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </AdminProvider>
  )
}

export default App