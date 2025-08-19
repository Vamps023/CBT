import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { RotateCcw, Award } from 'lucide-react'
import {
  getAssessmentByModule,
  getQuestions,
  getOptionsForQuestions,
} from '../services/supabase/assessments'

interface Option {
  id: string;
  text: string;
  isCorrect?: boolean;
}

interface Question {
  id: string;
  text: string;
  options: Option[];
}

interface AssessmentProps {
  moduleId: string;
}

const Assessment: React.FC<AssessmentProps> = ({ moduleId }) => {
  const { user } = useAuth();
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({}); // questionId -> optionId
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<{ score: number, passed: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [passingScore, setPassingScore] = useState<number>(80);

  useEffect(() => {
    const loadAssessment = async () => {
      if (!moduleId) return;
      try {
        setLoading(true);
        const assessment = await getAssessmentByModule(moduleId)
        if (!assessment) {
          setAssessmentId(null)
          setQuestions([])
          return
        }
        setAssessmentId(assessment.id)
        if ((assessment as any).passing_score != null) {
          setPassingScore((assessment as any).passing_score)
        }
        const qs = await getQuestions(assessment.id)
        const ids = qs.map((q: any) => q.id)
        const opts = await getOptionsForQuestions(ids)
        const grouped: Record<string, any[]> = {}
        for (const o of opts) {
          grouped[o.question_id] = grouped[o.question_id] || []
          grouped[o.question_id].push(o)
        }
        const mapped = qs.map((q: any) => ({
          id: q.id,
          text: q.question_text,
          options: (grouped[q.id] || []).map((o: any) => ({ id: o.id, text: o.option_text, isCorrect: !!o.is_correct })),
        }))
        setQuestions(mapped)
      } catch (err) {
        console.error('Error loading assessment:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAssessment();
  }, [moduleId]);

  const handleAnswerSelect = (questionId: string, optionId: string) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async () => {
    if (!assessmentId || !user) return;

    const answers = Object.entries(selectedAnswers).map(([questionId, selectedOptionId]) => ({
      questionId,
      selectedOptionId
    }));

    try {
      console.debug('[Assessment] Invoking submitAssessment', { assessmentId, userId: user.id, answersSample: answers.slice(0, 3), answersCount: answers.length });
      const { data, error } = await supabase.functions.invoke('submitAssessment', {
        body: { assessmentId, answers, userId: user.id },
      });
      if (error) throw error;
      const parsed = (typeof data === 'string') ? JSON.parse(data) : data;
      console.debug('[Assessment] submitAssessment result', parsed);
      setResults(parsed);
      setShowResults(true);
    } catch (err) {
      console.error('Error submitting assessment:', err);
      // Fallback: compute score locally using fetched isCorrect flags
      try {
        const total = questions.length || 1;
        let correct = 0;
        console.debug('[Assessment] Local scoring start', { total, selectedAnswers, questionsSample: questions.slice(0, 3) });
        for (const q of questions) {
          const sel = selectedAnswers[q.id];
          const opt = q.options.find(o => o.id === sel);
          console.debug('[Assessment] Answer check', { qId: q.id, sel, foundOption: opt });
          if (opt && opt.isCorrect === true) correct++;
        }
        const score = (correct / total) * 100;
        const passed = score >= passingScore;
        console.debug('[Assessment] Local scoring result', { correct, total, score, passed });
        setResults({ score, passed });
        setShowResults(true);
      } catch (e) {
        console.error('Local scoring failed:', e);
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setShowResults(false);
    setResults(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return <div className="text-center p-8">Loading assessment...</div>;
  }

  if (showResults && results) {
    const resObj: any = typeof results === 'string' ? (()=>{ try { return JSON.parse(results) } catch { return {} } })() : results;
    const { score, passed } = resObj as any;
    const safeScore: number = typeof score === 'number' ? score : Number(score ?? 0)
    const showDebug = (import.meta as any)?.env?.DEV && ((import.meta as any)?.env?.VITE_SHOW_ASSESSMENT_DEBUG === 'true')
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center mb-8">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            safeScore >= 80 ? 'bg-green-100' : safeScore >= 60 ? 'bg-yellow-100' : 'bg-red-100'
          }`}>
            <Award className={`h-8 w-8 ${getScoreColor(safeScore)}`} />
          </div>

        {/* Debug block (dev only; set VITE_SHOW_ASSESSMENT_DEBUG=true to show) */}
        {showDebug && resObj && typeof resObj === 'object' && resObj.debug && (
          <div className="mt-6 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded p-4">
            <div className="font-medium mb-2">Submission Debug</div>
            <pre className="whitespace-pre-wrap break-words">
{JSON.stringify(resObj.debug, null, 2)}
            </pre>
          </div>
        )}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Assessment Complete!</h2>
          <p className="text-gray-600 mb-4">You have completed the Railway Operations Fundamentals quiz</p>
          <div className={`text-4xl font-bold mb-2 ${getScoreColor(safeScore)}`}>
            {safeScore.toFixed(0)}%
          </div>
          <p className="text-gray-600">
            You {passed ? 'passed' : 'did not pass'} this assessment.
          </p>
        </div>

        <div className="flex justify-center space-x-4">
          <button
            onClick={restartQuiz}
            className="flex items-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Retake Quiz
          </button>
        </div>
      </div>
    )
  }

  if (!questions.length) {
    return <div className="text-center p-8">No questions found for this assessment.</div>;
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

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
        <h3 className="text-lg font-medium text-gray-900 mb-6">{question.text}</h3>

        <div className="space-y-3">
          {question.options.map(option => (
            <label
              key={option.id}
              className={`block p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                selectedAnswers[question.id] === option.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option.id}
                  checked={selectedAnswers[question.id] === option.id}
                  onChange={() => handleAnswerSelect(question.id, option.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-3 text-gray-900">{option.text}</span>
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
          onClick={currentQuestion === questions.length - 1 ? handleSubmit : () => setCurrentQuestion(currentQuestion + 1)}
          disabled={!selectedAnswers[question.id]}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {currentQuestion === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
        </button>
      </div>
    </div>
  )
}

export default Assessment