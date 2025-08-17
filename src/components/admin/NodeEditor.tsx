import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
// Using relaxed local typing to align with current DB schema without TS friction
// Remove unused type imports that caused lints
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface EditableNodeData {
  id: string;
  title: string;
  type: 'course' | 'module' | 'lesson' | 'assessment' | 'question' | 'option';
  isEditing?: boolean;
  onUpdate?: (id: string, data: any, force?: boolean) => void;
  onDelete?: (id: string) => void;
  onAddChild?: (parentId: string, type: string) => void;
  [key: string]: any;
}

export const EditableCourseNode: React.FC<NodeProps<EditableNodeData>> = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: data.title,
    description: data.description || '',
    difficulty_level: data.difficulty_level || 'beginner',
    duration_hours: data.duration_hours || 0,
  });

  const handleSave = () => {
    data.onUpdate?.(data.id, { ...editData }, true);
    setIsEditing(false);
    toast.success('Course updated');
  };

  const handleCancel = () => {
    setEditData({
      title: data.title,
      description: data.description || '',
      difficulty_level: data.difficulty_level || 'beginner',
      duration_hours: data.duration_hours || 0,
    });
    setIsEditing(false);
  };

  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg bg-blue-500 text-white border-2 ${selected ? 'border-yellow-400' : 'border-blue-600'} min-w-[250px] max-w-[350px]`}>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      
      {isEditing ? (
        <div className="space-y-2">
          <input
            value={editData.title}
            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            className="w-full px-2 py-1 text-sm text-black rounded"
            placeholder="Course title"
          />
          <textarea
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            className="w-full px-2 py-1 text-sm text-black rounded resize-none"
            rows={2}
            placeholder="Description"
          />
          <div className="flex space-x-2">
            <select
              value={editData.difficulty_level}
              onChange={(e) => setEditData({ ...editData, difficulty_level: e.target.value })}
              className="flex-1 px-2 py-1 text-sm text-black rounded"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <input
              type="number"
              value={editData.duration_hours}
              onChange={(e) => setEditData({ ...editData, duration_hours: parseInt(e.target.value) || 0 })}
              className="w-20 px-2 py-1 text-sm text-black rounded"
              placeholder="Hours"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button onClick={handleSave} className="p-1 bg-green-600 rounded hover:bg-green-700">
              <Save size={14} />
            </button>
            <button onClick={handleCancel} className="p-1 bg-red-600 rounded hover:bg-red-700">
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <div className="text-sm font-bold truncate">{data.title}</div>
              <div className="text-xs opacity-75">{data.difficulty_level} • {data.duration_hours}h</div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 hover:bg-blue-600 rounded"
              >
                <Edit2 size={12} />
              </button>
              <button
                onClick={() => data.onAddChild?.(data.id, 'module')}
                className="p-1 hover:bg-blue-600 rounded"
                title="Add Module"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
          <div className="text-xs bg-blue-600 px-2 py-1 rounded text-center">COURSE</div>
        </div>
      )}
    </div>
  );
};

// Standalone node for Question items
export const EditableQuestionNode: React.FC<NodeProps<EditableNodeData>> = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    question_text: data.question_text || data.title || 'Question',
  });

  const handleSave = () => {
    data.onUpdate?.(data.id, { ...editData }, true);
    setIsEditing(false);
    toast.success('Question updated');
  };

  const handleCancel = () => {
    setEditData({
      question_text: data.question_text || data.title || 'Question',
    });
    setIsEditing(false);
  };

  return (
    <div className={`px-3 py-2 shadow-md rounded-lg bg-amber-400 text-black border-2 ${selected ? 'border-yellow-400' : 'border-amber-500'} min-w-[220px]`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />

      {isEditing ? (
        <div className="space-y-2">
          <input
            value={editData.question_text}
            onChange={(e) => setEditData({ ...editData, question_text: e.target.value })}
            className="w-full px-2 py-1 text-sm text-black rounded"
            placeholder="Question text"
          />
          <div className="flex justify-end space-x-2">
            <button onClick={handleSave} className="p-1 bg-green-600 text-white rounded hover:bg-green-700">
              <Save size={14} />
            </button>
            <button onClick={handleCancel} className="p-1 bg-red-600 text-white rounded hover:bg-red-700">
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex-1">
              <div className="text-sm font-semibold truncate">{data.question_text || data.title}</div>
              <div className="text-xs opacity-80">Question</div>
            </div>
            <div className="flex items-center space-x-1">
              <button onClick={() => setIsEditing(true)} className="p-1 hover:bg-amber-500 rounded">
                <Edit2 size={12} />
              </button>
              <button
                onClick={() => data.onAddChild?.(data.id, 'option')}
                className="p-1 hover:bg-amber-500 rounded"
                title="Add Option"
              >
                <Plus size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); data.onDelete?.(data.id); }}
                className="p-1 hover:bg-red-600 rounded"
                title="Delete Question"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          <div className="text-[10px] bg-amber-500 px-2 py-0.5 rounded text-center text-white">QUESTION</div>
        </div>
      )}
    </div>
  );
};

// Standalone node for Option items
export const EditableOptionNode: React.FC<NodeProps<EditableNodeData>> = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    option_text: data.option_text || data.title || 'Option',
    is_correct: !!data.is_correct,
  });

  const handleSave = () => {
    data.onUpdate?.(data.id, { ...editData }, true);
    setIsEditing(false);
    toast.success('Option updated');
  };

  const handleCancel = () => {
    setEditData({
      option_text: data.option_text || data.title || 'Option',
      is_correct: !!data.is_correct,
    });
    setIsEditing(false);
  };

  return (
    <div className={`px-3 py-2 shadow rounded-lg bg-yellow-100 text-black border-2 ${selected ? 'border-yellow-400' : 'border-yellow-300'} min-w-[180px]`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      {isEditing ? (
        <div className="space-y-2">
          <input
            value={editData.option_text}
            onChange={(e) => setEditData({ ...editData, option_text: e.target.value })}
            className="w-full px-2 py-1 text-sm text-black rounded"
            placeholder="Option text"
          />
          <div className="flex items-center justify-between">
            <label className="text-xs flex items-center space-x-1">
              <input
                type="checkbox"
                checked={!!editData.is_correct}
                onChange={(e) => setEditData({ ...editData, is_correct: e.target.checked })}
              />
              <span>Correct</span>
            </label>
          </div>
          <div className="flex justify-end space-x-2">
            <button onClick={handleSave} className="p-1 bg-green-600 text-white rounded hover:bg-green-700">
              <Save size={14} />
            </button>
            <button onClick={handleCancel} className="p-1 bg-red-600 text-white rounded hover:bg-red-700">
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex-1">
              <div className="text-sm font-medium truncate">{data.option_text || data.title}</div>
              <div className="text-xs opacity-80">{data.is_correct ? 'Correct' : 'Incorrect'}</div>
            </div>
            <div className="flex items-center space-x-1">
              <button onClick={() => setIsEditing(true)} className="p-1 hover:bg-yellow-200 rounded">
                <Edit2 size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); data.onDelete?.(data.id); }}
                className="p-1 hover:bg-red-600 rounded"
                title="Delete Option"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          <div className="text-[10px] bg-yellow-300 px-2 py-0.5 rounded text-center">OPTION</div>
        </div>
      )}
    </div>
  );
};

export const EditableModuleNode: React.FC<NodeProps<EditableNodeData>> = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: data.title,
    description: data.description || '',
    order: data.order || 0,
  });

  const handleSave = () => {
    data.onUpdate?.(data.id, { ...editData }, true);
    setIsEditing(false);
    toast.success('Module updated');
  };

  const handleCancel = () => {
    setEditData({
      title: data.title,
      description: data.description || '',
      order: data.order || 0,
    });
    setIsEditing(false);
  };

  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg bg-green-500 text-white border-2 ${selected ? 'border-yellow-400' : 'border-green-600'} min-w-[220px] max-w-[300px]`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      
      {isEditing ? (
        <div className="space-y-2">
          <input
            value={editData.title}
            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            className="w-full px-2 py-1 text-sm text-black rounded"
            placeholder="Module title"
          />
          <textarea
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            className="w-full px-2 py-1 text-sm text-black rounded resize-none"
            rows={2}
            placeholder="Description"
          />
          <input
            type="number"
            value={editData.order}
            onChange={(e) => setEditData({ ...editData, order: parseInt(e.target.value) || 0 })}
            className="w-full px-2 py-1 text-sm text-black rounded"
            placeholder="Order"
          />
          <div className="flex justify-end space-x-2">
            <button onClick={handleSave} className="p-1 bg-green-600 rounded hover:bg-green-700">
              <Save size={14} />
            </button>
            <button onClick={handleCancel} className="p-1 bg-red-600 rounded hover:bg-red-700">
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <div className="text-sm font-bold truncate">{data.title}</div>
              <div className="text-xs opacity-75">Order: {data.order}</div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 hover:bg-green-600 rounded"
              >
                <Edit2 size={12} />
              </button>
              <button
                onClick={() => data.onAddChild?.(data.id, 'lesson')}
                className="p-1 hover:bg-green-600 rounded"
                title="Add Lesson"
              >
                <Plus size={12} />
              </button>
              <button
                onClick={() => data.onAddChild?.(data.id, 'assessment')}
                className="p-1 hover:bg-green-600 rounded"
                title="Add Assessment"
              >
                <Plus size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); data.onDelete?.(data.id); }}
                className="p-1 hover:bg-red-600 rounded"
                title="Delete Module"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          <div className="text-xs bg-green-600 px-2 py-1 rounded text-center">MODULE</div>
        </div>
      )}
    </div>
  );
};

export const EditableLessonNode: React.FC<NodeProps<EditableNodeData>> = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: data.title,
    description: data.description || '',
    lessonType: (data as any).type || 'video',
    duration_minutes: data.duration_minutes || 0,
    order: data.order || 0,
    video_url: data.video_url || '',
    youtube_url: data.youtube_url || '',
  });

  const handleSave = () => {
    const { lessonType, ...rest } = editData as any;
    data.onUpdate?.(data.id, { ...rest, type: lessonType }, true);
    setIsEditing(false);
    toast.success('Lesson updated');
  };

  const handleCancel = () => {
    setEditData({
      title: data.title,
      description: data.description || '',
      lessonType: (data as any).type || 'video',
      duration_minutes: data.duration_minutes || 0,
      order: data.order || 0,
      video_url: data.video_url || '',
      youtube_url: data.youtube_url || '',
    });
    setIsEditing(false);
  };

  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg bg-purple-500 text-white border-2 ${selected ? 'border-yellow-400' : 'border-purple-600'} min-w-[200px] max-w-[280px]`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      {isEditing ? (
        <div className="space-y-2">
          <input
            value={editData.title}
            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            className="w-full px-2 py-1 text-sm text-black rounded"
            placeholder="Lesson title"
          />
          <select
            value={editData.lessonType}
            onChange={(e) => setEditData({ ...editData, lessonType: e.target.value })}
            className="w-full px-2 py-1 text-sm text-black rounded"
          >
            <option value="video">Video</option>
            <option value="assessment">Assessment</option>
            <option value="simulation">Simulation</option>
          </select>
          <div className="flex space-x-2">
            <input
              type="number"
              value={editData.duration_minutes}
              onChange={(e) => setEditData({ ...editData, duration_minutes: parseInt(e.target.value) || 0 })}
              className="flex-1 px-2 py-1 text-sm text-black rounded"
              placeholder="Minutes"
            />
            <input
              type="number"
              value={editData.order}
              onChange={(e) => setEditData({ ...editData, order: parseInt(e.target.value) || 0 })}
              className="w-16 px-2 py-1 text-sm text-black rounded"
              placeholder="Order"
            />
          </div>
          {editData.lessonType === 'video' && (
            <input
              value={editData.youtube_url}
              onChange={(e) => setEditData({ ...editData, youtube_url: e.target.value })}
              className="w-full px-2 py-1 text-sm text-black rounded"
              placeholder="YouTube URL"
            />
          )}
          <div className="flex justify-end space-x-2">
            <button onClick={handleSave} className="p-1 bg-green-600 rounded hover:bg-green-700">
              <Save size={14} />
            </button>
            <button onClick={handleCancel} className="p-1 bg-red-600 rounded hover:bg-red-700">
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <div className="text-sm font-bold truncate">{data.title}</div>
              <div className="text-xs opacity-75">{data.type} • {data.duration_minutes}min</div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 hover:bg-purple-600 rounded"
              >
                <Edit2 size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); data.onDelete?.(data.id); }}
                className="p-1 hover:bg-red-600 rounded"
                title="Delete Lesson"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          <div className="text-xs bg-purple-600 px-2 py-1 rounded text-center">LESSON</div>
        </div>
      )}
    </div>
  );
};

export const EditableAssessmentNode: React.FC<NodeProps<EditableNodeData>> = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [optionsByQ, setOptionsByQ] = useState<Record<string, any[]>>({});

  const [editData, setEditData] = useState({
    title: data.title,
    passing_score: data.passing_score || 70,
    time_limit_seconds: data.time_limit_seconds || 3600,
  });

  const handleSave = () => {
    data.onUpdate?.(data.id, { ...editData }, true);
    setIsEditing(false);
    toast.success('Assessment updated');
  };

  const handleCancel = () => {
    setEditData({
      title: data.title,
      passing_score: data.passing_score || 70,
      time_limit_seconds: data.time_limit_seconds || 3600,
    });
    setIsEditing(false);
  };

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const { data: qs, error } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', data.id)
        .order('created_at');
      if (error) throw error;
      setQuestions(qs || []);
      if (qs && qs.length) {
        const qids = qs.map((q) => q.id);
        const { data: opts, error: oerr } = await supabase
          .from('assessment_options')
          .select('*')
          .in('question_id', qids)
          .order('created_at');
        if (oerr) throw oerr;
        const grouped: Record<string, any[]> = {};
        (opts || []).forEach((o) => {
          if (!grouped[o.question_id]) grouped[o.question_id] = [];
          grouped[o.question_id].push(o);
        });
        setOptionsByQ(grouped);
      } else {
        setOptionsByQ({});
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [data.id]);

  useEffect(() => {
    if (showQuestions) {
      loadQuestions();
    }
  }, [showQuestions, loadQuestions]);

  // Question CRUD
  const addQuestion = async () => {
    const payload = {
      assessment_id: data.id,
      question_text: 'New question',
    };
    const { data: inserted, error } = await supabase
      .from('assessment_questions')
      .insert(payload)
      .select()
      .single();
    if (error) {
      toast.error('Failed to add question');
      return;
    }
    setQuestions((prev) => [...prev, inserted as any]);
    toast.success('Question added');
  };

  const updateQuestion = async (qid: string, changes: any) => {
    // Only allow known columns to be updated
    const allowedKeys = ['question_text'];
    const filtered = Object.fromEntries(Object.entries(changes as Record<string, any>).filter(([k]) => allowedKeys.includes(k)));
    const { error } = await supabase
      .from('assessment_questions')
      .update(filtered)
      .eq('id', qid);
    if (error) {
      toast.error('Failed to update question');
      return;
    }
    setQuestions((prev) => prev.map(q => q.id === qid ? { ...q, ...filtered } as any : q));
    toast.success('Question updated');
  };

  const deleteQuestion = async (qid: string) => {
    const { error } = await supabase
      .from('assessment_questions')
      .delete()
      .eq('id', qid);
    if (error) {
      toast.error('Failed to delete question');
      return;
    }
    setQuestions((prev) => prev.filter(q => q.id !== qid));
    const { [qid]: _, ...rest } = optionsByQ;
    setOptionsByQ(rest);
    toast.success('Question deleted');
  };

  // Option CRUD
  const addOption = async (qid: string) => {
    const payload = {
      question_id: qid,
      option_text: 'New option',
      is_correct: false,
    };
    const { data: inserted, error } = await supabase
      .from('assessment_options')
      .insert(payload)
      .select()
      .single();
    if (error) {
      toast.error('Failed to add option');
      return;
    }
    setOptionsByQ((prev) => ({
      ...prev,
      [qid]: [...(prev[qid] || []), inserted as any],
    }));
    toast.success('Option added');
  };

  const updateOption = async (oid: string, qid: string, changes: any) => {
    // Only allow known columns to be updated
    const allowedKeys = ['option_text', 'is_correct'];
    const filtered = Object.fromEntries(Object.entries(changes as Record<string, any>).filter(([k]) => allowedKeys.includes(k)));
    const { error } = await supabase
      .from('assessment_options')
      .update(filtered)
      .eq('id', oid);
    if (error) {
      toast.error('Failed to update option');
      return;
    }
    setOptionsByQ((prev) => ({
      ...prev,
      [qid]: (prev[qid] || []).map(o => o.id === oid ? { ...o, ...filtered } as any : o),
    }));
    toast.success('Option updated');
  };

  const deleteOption = async (oid: string, qid: string) => {
    const { error } = await supabase
      .from('assessment_options')
      .delete()
      .eq('id', oid);
    if (error) {
      toast.error('Failed to delete option');
      return;
    }
    setOptionsByQ((prev) => ({
      ...prev,
      [qid]: (prev[qid] || []).filter(o => o.id !== oid),
    }));
    toast.success('Option deleted');
  };

  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg bg-orange-500 text-white border-2 ${selected ? 'border-yellow-400' : 'border-orange-600'} min-w-[260px] max-w-[360px]`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      
      {isEditing ? (
        <div className="space-y-2">
          <input
            value={editData.title}
            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            className="w-full px-2 py-1 text-sm text-black rounded"
            placeholder="Assessment title"
          />
          <div className="flex space-x-2">
            <input
              type="number"
              value={editData.passing_score}
              onChange={(e) => setEditData({ ...editData, passing_score: parseInt(e.target.value) || 70 })}
              className="flex-1 px-2 py-1 text-sm text-black rounded"
              placeholder="Pass %"
              min="0"
              max="100"
            />
            <input
              type="number"
              value={editData.time_limit_seconds}
              onChange={(e) => setEditData({ ...editData, time_limit_seconds: parseInt(e.target.value) || 3600 })}
              className="flex-1 px-2 py-1 text-sm text-black rounded"
              placeholder="Seconds"
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <button
              onClick={() => setShowQuestions((s) => !s)}
              className="px-2 py-1 text-xs rounded bg-orange-600 hover:bg-orange-700"
            >
              {showQuestions ? 'Hide Questions' : 'Manage Questions'}
            </button>
            <div className="space-x-2">
              <button onClick={handleSave} className="p-1 bg-green-600 rounded hover:bg-green-700">
                <Save size={14} />
              </button>
              <button onClick={handleCancel} className="p-1 bg-red-600 rounded hover:bg-red-700">
                <X size={14} />
              </button>
            </div>
          </div>

          {showQuestions && (
            <div className="mt-2 bg-white text-black rounded p-2 max-h-64 overflow-auto">
              <div className="flex justify-between items-center mb-2">
                <div className="font-semibold text-sm">Questions</div>
                <button onClick={addQuestion} className="px-2 py-1 text-xs rounded bg-gray-800 text-white hover:bg-black flex items-center">
                  <Plus size={12} className="mr-1" /> Add Question
                </button>
              </div>
              {loading && <div className="text-xs text-gray-600">Loading…</div>}
              {!loading && questions.length === 0 && (
                <div className="text-xs text-gray-600">No questions yet</div>
              )}
              <div className="space-y-2">
                {questions.map((q) => (
                  <div key={q.id} className="border rounded p-2">
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        value={q.question_text}
                        onChange={(e) => updateQuestion(q.id, { question_text: e.target.value })}
                        className="flex-1 px-2 py-1 text-sm border rounded"
                      />
                      <button onClick={() => deleteQuestion(q.id)} className="p-1 bg-red-600 text-white rounded">
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <div className="ml-2">
                      <div className="flex justify-between items-center mb-1">
                        <div className="text-xs font-semibold">Options</div>
                        <button onClick={() => addOption(q.id)} className="px-2 py-1 text-xs rounded bg-gray-700 text-white hover:bg-gray-800 flex items-center">
                          <Plus size={12} className="mr-1" /> Add Option
                        </button>
                      </div>
                      <div className="space-y-1">
                        {(optionsByQ[q.id] || []).map((o) => (
                          <div key={o.id} className="flex items-center space-x-2">
                            <input
                              value={o.option_text}
                              onChange={(e) => updateOption(o.id, q.id, { option_text: e.target.value })}
                              className="flex-1 px-2 py-1 text-sm border rounded"
                            />
                            <label className="text-xs flex items-center space-x-1">
                              <input
                                type="checkbox"
                                checked={!!o.is_correct}
                                onChange={(e) => updateOption(o.id, q.id, { is_correct: e.target.checked })}
                              />
                              <span>Correct</span>
                            </label>
                            <button onClick={() => deleteOption(o.id, q.id)} className="p-1 bg-red-600 text-white rounded">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <div className="text-sm font-bold truncate">{data.title}</div>
              <div className="text-xs opacity-75">Pass: {data.passing_score}% • {Math.floor(data.time_limit_seconds / 60)}min</div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 hover:bg-orange-600 rounded"
              >
                <Edit2 size={12} />
              </button>
              <button
                onClick={() => setShowQuestions((s) => !s)}
                className="p-1 hover:bg-orange-600 rounded"
                title="Manage Questions"
              >
                <Plus size={12} />
              </button>
              <button
                onClick={() => data.onDelete?.(data.id)}
                className="p-1 hover:bg-red-600 rounded"
                title="Delete Assessment"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          <div className="text-xs bg-orange-600 px-2 py-1 rounded text-center">ASSESSMENT</div>

          {showQuestions && (
            <div className="mt-2 bg-white text-black rounded p-2 max-h-64 overflow-auto">
              <div className="flex justify-between items-center mb-2">
                <div className="font-semibold text-sm">Questions</div>
                <button onClick={addQuestion} className="px-2 py-1 text-xs rounded bg-gray-800 text-white hover:bg-black flex items-center">
                  <Plus size={12} className="mr-1" /> Add Question
                </button>
              </div>
              {loading && <div className="text-xs text-gray-600">Loading…</div>}
              {!loading && questions.length === 0 && (
                <div className="text-xs text-gray-600">No questions yet</div>
              )}
              <div className="space-y-2">
                {questions.map((q) => (
                  <div key={q.id} className="border rounded p-2">
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        value={q.question_text}
                        onChange={(e) => updateQuestion(q.id, { question_text: e.target.value })}
                        className="flex-1 px-2 py-1 text-sm border rounded"
                      />
                      <button onClick={() => deleteQuestion(q.id)} className="p-1 bg-red-600 text-white rounded">
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <div className="ml-2">
                      <div className="flex justify-between items-center mb-1">
                        <div className="text-xs font-semibold">Options</div>
                        <button onClick={() => addOption(q.id)} className="px-2 py-1 text-xs rounded bg-gray-700 text-white hover:bg-gray-800 flex items-center">
                          <Plus size={12} className="mr-1" /> Add Option
                        </button>
                      </div>
                      <div className="space-y-1">
                        {(optionsByQ[q.id] || []).map((o) => (
                          <div key={o.id} className="flex items-center space-x-2">
                            <input
                              value={o.option_text}
                              onChange={(e) => updateOption(o.id, q.id, { option_text: e.target.value })}
                              className="flex-1 px-2 py-1 text-sm border rounded"
                            />
                            <label className="text-xs flex items-center space-x-1">
                              <input
                                type="checkbox"
                                checked={!!o.is_correct}
                                onChange={(e) => updateOption(o.id, q.id, { is_correct: e.target.checked })}
                              />
                              <span>Correct</span>
                            </label>
                            <button onClick={() => deleteOption(o.id, q.id)} className="p-1 bg-red-600 text-white rounded">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
