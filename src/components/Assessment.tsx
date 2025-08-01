import React, { useState } from 'react'
import { CheckCircle, XCircle, RotateCcw, Award } from 'lucide-react'

interface Question {
  id: number
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

interface AssessmentProps {
  courseId: string
}

const Assessment: React.FC<AssessmentProps> = ({ courseId }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [showResults, setShowResults] = useState(false)
  const [quizCompleted, setQuizCompleted] = useState(false)

  const questions: Question[] = [
    {
      id: 1,
      question: "What is the primary safety protocol when approaching a railway crossing?",
      options: [
        "Sound the horn continuously",
        "Reduce speed and check for visibility",
        "Maintain current speed",
        "Stop completely before crossing"
      ],
      correctAnswer: 1,
      explanation: "Reducing speed and checking for visibility ensures safe passage while maintaining operational efficiency."
    },
    {
      id: 2,
      question: "Which communication system is most critical for train operations?",
      options: [
        "Public address system",
        "Radio communication with control center",
        "Mobile phone network",
        "Email system"
      ],
      correctAnswer: 1,
      explanation: "Radio communication with the control center is essential for real-time coordination and safety updates."
    },
    {
      id: 3,
      question: "How often should brake systems be inspected?",
      options: [
        "Once a month",
        "Before every trip",
        "Once a week",
        "Only when problems occur"
      ],
      correctAnswer: 1,
      explanation: "Brake systems must be inspected before every trip to ensure passenger safety and operational reliability."
    }
  ]

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers]
    newAnswers[currentQuestion] = answerIndex
    setSelectedAnswers(newAnswers)
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      setShowResults(true)
      setQuizCompleted(true)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const restartQuiz = () => {
    setCurrentQuestion(0)
    setSelectedAnswers([])
    setShowResults(false)
    setQuizCompleted(false)
  }

  const calculateScore = () => {
    let correct = 0
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        correct++
      }
    })
    return (correct / questions.length) * 100
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (showResults) {
    const score = calculateScore()
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center mb-8">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            score >= 80 ? 'bg-green-100' : score >= 60 ? 'bg-yellow-100' : 'bg-red-100'
          }`}>
            <Award className={`h-8 w-8 ${getScoreColor(score)}`} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Assessment Complete!</h2>
          <p className="text-gray-600 mb-4">You have completed the Railway Operations Fundamentals quiz</p>
          <div className={`text-4xl font-bold mb-2 ${getScoreColor(score)}`}>
            {score.toFixed(0)}%
          </div>
          <p className="text-gray-600">
            {selectedAnswers.filter((answer, index) => answer === questions[index].correctAnswer).length} out of {questions.length} correct
          </p>
        </div>

        <div className="space-y-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900">Review Your Answers</h3>
          {questions.map((question, index) => {
            const isCorrect = selectedAnswers[index] === question.correctAnswer
            return (
              <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start space-x-3 mb-3">
                  {isCorrect ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-2">{question.question}</p>
                    <div className="space-y-1 text-sm">
                      <p className={`${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                        Your answer: {question.options[selectedAnswers[index]]}
                      </p>
                      {!isCorrect && (
                        <p className="text-green-700">
                          Correct answer: {question.options[question.correctAnswer]}
                        </p>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mt-2 italic">{question.explanation}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-center space-x-4">
          <button
            onClick={restartQuiz}
            className="flex items-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Retake Quiz
          </button>
          {score >= 80 && (
            <button className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <Award className="h-4 w-4 mr-2" />
              View Certificate
            </button>
          )}
        </div>
      </div>
    )
  }

  const question = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Railway Operations Assessment</h2>
          <span className="text-sm text-gray-500">
            Question {currentQuestion + 1} of {questions.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Question */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-6">{question.question}</h3>
        
        <div className="space-y-3">
          {question.options.map((option, index) => (
            <label
              key={index}
              className={`block p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                selectedAnswers[currentQuestion] === index
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <input
                  type="radio"
                  name={`question-${currentQuestion}`}
                  value={index}
                  checked={selectedAnswers[currentQuestion] === index}
                  onChange={() => handleAnswerSelect(index)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-3 text-gray-900">{option}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>

        <button
          onClick={handleNext}
          disabled={selectedAnswers[currentQuestion] === undefined}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {currentQuestion === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
        </button>
      </div>
    </div>
  )
}

export default Assessment