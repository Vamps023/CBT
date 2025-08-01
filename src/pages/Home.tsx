import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Train, PlayCircle, Award, Users, ArrowRight } from 'lucide-react'

const Home: React.FC = () => {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <div className="bg-blue-600 p-4 rounded-2xl">
              <Train className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Master Train Operations with
            <span className="text-blue-600 block mt-2">Sogeclair CBT</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Advanced Computer-Based Training platform for railway professionals. 
            Learn with simulations and guided tutorials.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link
                to="/courses"
                className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                Continue Learning
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/signup"
                  className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Start Learning Today
                </Link>
                <Link
                  to="/courses"
                  className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors"
                >
                  Browse Courses
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="bg-blue-100 p-3 rounded-xl w-fit mx-auto mb-4">
              <PlayCircle className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Interactive Video Training</h3>
            <p className="text-gray-600">
              High-quality video content with interactive elements and progress tracking to ensure effective learning.
            </p>
          </div>
          
          <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="bg-green-100 p-3 rounded-xl w-fit mx-auto mb-4">
              <Train className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">3D Train Simulations</h3>
            <p className="text-gray-600">
              Immersive WebGL-based train simulations for hands-on practice in a safe virtual environment.
            </p>
          </div>
          
          <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="bg-purple-100 p-3 rounded-xl w-fit mx-auto mb-4">
              <Award className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Comprehensive Assessments</h3>
            <p className="text-gray-600">
              Detailed quizzes and evaluations with instant feedback to validate your knowledge and skills.
            </p>
          </div>
        </div>
      </div>   
    </div>
  )
}

export default Home