import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  NodeTypes,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Course } from '../../types';
import { supabase } from '../../lib/supabase';
import { 
  EditableCourseNode, 
  EditableModuleNode, 
  EditableLessonNode, 
  EditableAssessmentNode,
  EditableQuestionNode,
  EditableOptionNode,
} from './NodeEditor';
import type { ReactFlowInstance } from 'reactflow';
import { RefreshCw, Zap, Eye, EyeOff, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const nodeTypes: NodeTypes = {
  course: EditableCourseNode,
  module: EditableModuleNode,
  lesson: EditableLessonNode,
  assessment: EditableAssessmentNode,
  question: EditableQuestionNode,
  option: EditableOptionNode,
};

interface EnhancedCourseGraphEditorProps {
  courseId?: string;
  onCourseSelect?: (courseId: string) => void;
}

export const EnhancedCourseGraphEditor: React.FC<EnhancedCourseGraphEditorProps> = ({ 
  courseId, 
  onCourseSelect 
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [contextMenu, setContextMenu] = useState<{x:number; y:number; visible:boolean; targetId?:string; targetType?:string}>({x:0,y:0,visible:false});
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);
  // Keep latest nodes in a ref to avoid stale closure issues during async saves
  const nodesRef = useRef<Node[]>([]);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Layout persistence helpers (localStorage)
  const layoutStorageKey = useCallback(() => {
    const id = selectedCourse?.id || courseId || 'default';
    return `graph_layout_${id}`;
  }, [selectedCourse?.id, courseId]);
  const layoutStorageKeyFor = useCallback((id: string) => `graph_layout_${id}`, []);

  const saveLayout = useCallback(() => {
    try {
      const posMap: Record<string, { x: number; y: number }> = {};
      for (const n of nodesRef.current) {
        posMap[n.id] = { x: n.position.x, y: n.position.y };
      }
      localStorage.setItem(layoutStorageKey(), JSON.stringify(posMap));
    } catch (e) {
      console.warn('Failed to save layout', e);
    }
  }, [layoutStorageKey]);

  const applySavedLayout = useCallback((list: Node[]): Node[] => {
    try {
      const raw = localStorage.getItem(layoutStorageKey());
      if (!raw) return list;
      const posMap = JSON.parse(raw) as Record<string, { x: number; y: number }>;
      return list.map((n) => (posMap[n.id] ? { ...n, position: posMap[n.id] } : n));
    } catch {
      return list;
    }
  }, [layoutStorageKey]);

  // Supabase layout persistence (global per-course)
  const loadLayoutFromSupabase = useCallback(async (cid: string): Promise<Record<string, { x: number; y: number }> | null> => {
    if (!cid) return null;
    try {
      const { data, error } = await supabase
        .from('graph_layouts')
        .select('positions')
        .eq('course_id', cid)
        .single();
      if (error || !data) return null;
      const positions = (data as any).positions as Record<string, { x: number; y: number }>;
      if (positions && typeof positions === 'object') return positions;
      return null;
    } catch (e) {
      console.warn('Failed to load layout from Supabase', e);
      return null;
    }
  }, []);

  const saveLayoutToSupabase = useCallback(async (cidParam?: string) => {
    const cid = cidParam || selectedCourse?.id || courseId;
    if (!cid) return;
    try {
      const posMap: Record<string, { x: number; y: number }> = {};
      for (const n of nodesRef.current) {
        posMap[n.id] = { x: n.position.x, y: n.position.y };
      }
      await supabase
        .from('graph_layouts')
        .upsert({ course_id: cid, positions: posMap, updated_at: new Date().toISOString() }, { onConflict: 'course_id' });
    } catch (e) {
      console.warn('Failed to save layout to Supabase', e);
    }
  }, [selectedCourse?.id, courseId]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Load all courses for selection
  const loadCourses = async () => {
    try {
      const { data: coursesData, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCourses(coursesData || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  // Enhanced node update handler
  const handleNodeUpdate = useCallback(async (nodeId: string, updatedData: any, force?: boolean) => {
    console.debug('[GraphEditor] handleNodeUpdate called', { nodeId, updatedData, force, autoSave });
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...updatedData } }
          : node
      )
    );

    if (force || autoSave) {
      console.debug('[GraphEditor] Proceeding to saveNodeToDatabase', { nodeId, updatedData });
      await saveNodeToDatabase(nodeId, updatedData);
    }
  }, [autoSave, setNodes]);

  // Enhanced node deletion handler
  const handleNodeDelete = useCallback(async (nodeId: string) => {
    const nodeToDelete = nodesRef.current.find(n => n.id === nodeId);
    if (!nodeToDelete) return;

    // Remove node and its edges
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => 
      edge.source !== nodeId && edge.target !== nodeId
    ));

    // Delete from database with manual cascade if needed
    try {
      const { type } = nodeToDelete;

      if (type === 'option') {
        const { error } = await supabase.from('assessment_options').delete().eq('id', nodeId);
        if (error) throw error;
      } else if (type === 'question') {
        // Delete options under the question, then the question
        const { error: optErr } = await supabase.from('assessment_options').delete().eq('question_id', nodeId);
        if (optErr) throw optErr;
        const { error: qErr } = await supabase.from('assessment_questions').delete().eq('id', nodeId);
        if (qErr) throw qErr;
      } else if (type === 'assessment') {
        // Find questions under assessment
        const { data: qs, error: qSelErr } = await supabase
          .from('assessment_questions')
          .select('id')
          .eq('assessment_id', nodeId);
        if (qSelErr) throw qSelErr;
        const qids = (qs || []).map(q => q.id);
        if (qids.length) {
          const { error: delOptsErr } = await supabase.from('assessment_options').delete().in('question_id', qids);
          if (delOptsErr) throw delOptsErr;
          const { error: delQsErr } = await supabase.from('assessment_questions').delete().in('id', qids);
          if (delQsErr) throw delQsErr;
        }
        const { error: delAssessErr } = await supabase.from('assessments').delete().eq('id', nodeId);
        if (delAssessErr) throw delAssessErr;
      } else if (type === 'lesson') {
        const { error } = await supabase.from('lessons').delete().eq('id', nodeId);
        if (error) throw error;
      } else if (type === 'module') {
        // Delete lessons
        const { data: lessons, error: lSelErr } = await supabase
          .from('lessons')
          .select('id')
          .eq('module_id', nodeId);
        if (lSelErr) throw lSelErr;
        const lIds = (lessons || []).map(l => l.id);
        if (lIds.length) {
          const { error: delLErr } = await supabase.from('lessons').delete().in('id', lIds);
          if (delLErr) throw delLErr;
        }
        // Delete assessments and their nested children
        const { data: assessments, error: aSelErr } = await supabase
          .from('assessments')
          .select('id')
          .eq('module_id', nodeId);
        if (aSelErr) throw aSelErr;
        const aIds = (assessments || []).map(a => a.id);
        if (aIds.length) {
          const { data: qs2, error: q2SelErr } = await supabase
            .from('assessment_questions')
            .select('id')
            .in('assessment_id', aIds);
          if (q2SelErr) throw q2SelErr;
          const q2Ids = (qs2 || []).map(q => q.id);
          if (q2Ids.length) {
            const { error: delOptsErr } = await supabase.from('assessment_options').delete().in('question_id', q2Ids);
            if (delOptsErr) throw delOptsErr;
            const { error: delQsErr } = await supabase.from('assessment_questions').delete().in('id', q2Ids);
            if (delQsErr) throw delQsErr;
          }
          const { error: delAsErr } = await supabase.from('assessments').delete().in('id', aIds);
          if (delAsErr) throw delAsErr;
        }
        // Finally delete module
        const { error: delModErr } = await supabase.from('course_modules').delete().eq('id', nodeId);
        if (delModErr) throw delModErr;
      } else {
        // Fallback: no-op
        return;
      }
      toast.success(`${type} deleted successfully`);
    } catch (error) {
      console.error('Error deleting node:', error);
      toast.error('Failed to delete item');
    }
  }, [setNodes, setEdges]);

  // Add a child node under a given parent (restores previously missing implementation)
  const handleAddChild = useCallback(async (parentId: string, childType: Node['type']) => {
    const parentNode = nodesRef.current.find(n => n.id === parentId);
    if (!parentNode) return;

    let position = { x: parentNode.position.x + 200, y: parentNode.position.y + 150 };
    let tableName = '';
    let dbData: any = {};

    switch (childType) {
      case 'module': {
        tableName = 'course_modules';
        dbData = {
          course_id: parentId,
          title: 'New Module',
        };
        const existing = nodesRef.current.filter(n => n.type === 'module').length;
        position = { x: parentNode.position.x + existing * 300, y: parentNode.position.y + 150 };
        break;
      }
      case 'lesson': {
        tableName = 'lessons';
        dbData = {
          module_id: parentId,
          title: 'New Lesson',
          type: 'video',
          order: nodesRef.current.filter(n => n.type === 'lesson' && (n.data as any).module_id === parentId).length + 1,
        };
        const existing = nodesRef.current.filter(n => (n.data as any).module_id === parentId).length;
        position = { x: parentNode.position.x + existing * 120, y: parentNode.position.y + 150 };
        break;
      }
      case 'assessment': {
        tableName = 'assessments';
        dbData = {
          module_id: parentId,
          title: 'New Assessment',
          passing_score: 70,
          time_limit_seconds: 3600,
        };
        position = { x: parentNode.position.x + 200, y: parentNode.position.y + 300 };
        break;
      }
      case 'question': {
        tableName = 'assessment_questions';
        dbData = {
          assessment_id: parentId,
          question_text: 'New question',
        };
        const existing = nodesRef.current.filter(n => n.type === 'question' && (n.data as any).assessment_id === parentId).length;
        position = { x: parentNode.position.x + existing * 160, y: parentNode.position.y + 150 };
        break;
      }
      case 'option': {
        tableName = 'assessment_options';
        dbData = {
          question_id: parentId,
          option_text: 'New option',
          is_correct: false,
        };
        const existing = nodesRef.current.filter(n => n.type === 'option' && (n.data as any).question_id === parentId).length;
        position = { x: parentNode.position.x + existing * 140, y: parentNode.position.y + 130 };
        break;
      }
      default:
        return;
    }

    try {
      const { data: insertedData, error } = await supabase
        .from(tableName)
        .insert(dbData)
        .select()
        .single();
      if (error) throw error;
      if (!insertedData) throw new Error('Insert failed');

      const newNode: Node = {
        id: insertedData.id,
        type: childType,
        position,
        data: {
          ...insertedData,
          onUpdate: handleNodeUpdate,
          onDelete: handleNodeDelete,
          onAddChild: handleAddChild,
        },
      };

      setNodes((nds) => [...nds, newNode]);
      const newEdge: Edge = {
        id: `${parentId}-${insertedData.id}`,
        source: parentId,
        target: insertedData.id,
        type: 'smoothstep',
      };
      setEdges((eds) => [...eds, newEdge]);

      // Persist layout after adding
      setTimeout(() => { saveLayout(); saveLayoutToSupabase(); }, 0);
      toast.success(`${childType} added successfully`);
    } catch (error) {
      console.error('Error adding child node:', error);
      toast.error(`Failed to add ${childType}`);
    }
  }, [setNodes, setEdges, handleNodeUpdate, handleNodeDelete, saveLayout, saveLayoutToSupabase]);

  // Context menu helpers
  const closeContext = () => setContextMenu((s) => ({...s, visible:false}));
  const onPaneContextMenu = useCallback((evt: React.MouseEvent) => {
    evt.preventDefault();
    // Position relative to canvas
    const rect = canvasRef.current?.getBoundingClientRect();
    const x = rect ? evt.clientX - rect.left : evt.clientX;
    const y = rect ? evt.clientY - rect.top : evt.clientY;
    const selectedNode = nodes.find(n => (n as any).selected);
    setContextMenu({ x, y, visible: true, targetId: selectedNode?.id, targetType: selectedNode?.type });
  }, [nodes]);

  const onNodeContextMenu = useCallback((evt: React.MouseEvent, node: Node) => {
    evt.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    const x = rect ? evt.clientX - rect.left : evt.clientX;
    const y = rect ? evt.clientY - rect.top : evt.clientY;
    setContextMenu({ x, y, visible: true, targetId: node.id, targetType: node.type });
  }, []);

  // Close on Escape / outside click / wheel scroll
  useEffect(() => {
    if (!contextMenu.visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeContext(); };
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!canvasRef.current?.contains(target)) closeContext();
    };
    const onWheel = () => closeContext();
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('wheel', onWheel);
    };
  }, [contextMenu.visible]);

  // Auto layout: compute topological levels from edges and place nodes in columns
  const autoLayout = useCallback(() => {
    if (!nodes.length) return;
    const incomingCount = new Map<string, number>();
    nodes.forEach(n => incomingCount.set(n.id, 0));
    edges.forEach(e => {
      incomingCount.set(e.target, (incomingCount.get(e.target) || 0) + 1);
    });

    // Kahn's algorithm to get levels
    const queue: string[] = [];
    incomingCount.forEach((cnt, id) => { if ((cnt || 0) === 0) queue.push(id); });
    const level = new Map<string, number>();
    queue.forEach(id => level.set(id, 0));

    const outAdj = new Map<string, string[]>();
    edges.forEach(e => {
      if (!outAdj.has(e.source)) outAdj.set(e.source, []);
      outAdj.get(e.source)!.push(e.target);
    });

    const q = [...queue];
    while (q.length) {
      const u = q.shift()!;
      const uLev = level.get(u) ?? 0;
      const outs = outAdj.get(u) || [];
      for (const v of outs) {
        const nextLev = Math.max(level.get(v) ?? 0, uLev + 1);
        level.set(v, nextLev);
        const newIn = (incomingCount.get(v) || 0) - 1;
        incomingCount.set(v, newIn);
        if (newIn === 0) q.push(v);
      }
    }

    // Group nodes by level
    const byLevel = new Map<number, string[]>();
    nodes.forEach(n => {
      const lv = level.get(n.id) ?? 0;
      if (!byLevel.has(lv)) byLevel.set(lv, []);
      byLevel.get(lv)!.push(n.id);
    });

    const xSpacing = 240; // horizontal distance within a level
    const ySpacing = 180; // vertical distance between levels
    const startX = 100;
    const startY = 60;

    const newPositions = new Map<string, { x: number; y: number }>();
    const levels = Array.from(byLevel.keys()).sort((a, b) => a - b);
    for (const lv of levels) {
      const ids = byLevel.get(lv)!;
      ids.forEach((id, idx) => {
        const x = startX + idx * xSpacing;
        const y = startY + lv * ySpacing;
        newPositions.set(id, { x, y });
      });
    }

    // Apply new positions
    setNodes((nds) => nds.map(n => newPositions.has(n.id) ? { ...n, position: newPositions.get(n.id)! } : n));
    // Persist layout after applying
    setTimeout(() => { saveLayout(); saveLayoutToSupabase(); }, 0);
  }, [nodes, edges, setNodes, saveLayout, saveLayoutToSupabase]);

  // Save individual node to database
  const saveNodeToDatabase = async (nodeId: string, data: any) => {
    console.debug('[GraphEditor] saveNodeToDatabase start', { nodeId, data });
    console.debug('[GraphEditor] nodesRef length', nodesRef.current.length);
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node) {
      console.warn('[GraphEditor] saveNodeToDatabase: node not found', { nodeId });
      return;
    }

    try {
      // Ensure an authenticated user exists (RLS)
      const { data: authData } = await supabase.auth.getUser();
      console.debug('[GraphEditor] auth.getUser()', authData);
      if (!authData?.user) {
        toast.error('Not authenticated. Please sign in as admin.');
        return;
      }

      let tableName = '';
      // Build a safe payload with only allowed columns per table and that exist on the loaded node data
      let payload: any = {};
      const nodeDataKeys = Object.keys((node.data as any) || {});
      const incomingKeys = Object.keys((data as any) || {});
      const unionKeys = Array.from(new Set([...nodeDataKeys, ...incomingKeys]));
      switch (node.type) {
        case 'course': {
          tableName = 'courses';
          const allowed = ['title', 'description', 'difficulty_level', 'duration_hours'];
          const effective = allowed.filter(k => unionKeys.includes(k));
          payload = Object.fromEntries(Object.entries(data).filter(([k]) => effective.includes(k)));
          break;
        }
        case 'module': {
          tableName = 'course_modules';
          const allowed = ['title'];
          const effective = allowed.filter(k => unionKeys.includes(k));
          payload = Object.fromEntries(Object.entries(data).filter(([k]) => effective.includes(k)));
          break;
        }
        case 'lesson': {
          tableName = 'lessons';
          const allowed = ['title', 'description', 'type', 'duration_minutes', 'order', 'video_url', 'youtube_url'];
          const effective = allowed.filter(k => unionKeys.includes(k));
          payload = Object.fromEntries(Object.entries(data).filter(([k]) => effective.includes(k)));
          break;
        }
        case 'assessment': {
          tableName = 'assessments';
          const allowed = ['title', 'passing_score', 'time_limit_seconds'];
          const effective = allowed.filter(k => unionKeys.includes(k));
          payload = Object.fromEntries(Object.entries(data).filter(([k]) => effective.includes(k)));
          break;
        }
        case 'question': {
          tableName = 'assessment_questions';
          // Support DBs where the column might be named differently; use union of keys and map if needed
          const allowed = ['question_text', 'text', 'question'];
          const effective = allowed.filter(k => unionKeys.includes(k));
          let base = Object.fromEntries(Object.entries(data).filter(([k]) => effective.includes(k)));
          // If client sent question_text but node/schema uses 'text' or 'question', map it based on existing node keys
          if (!nodeDataKeys.includes('question_text') && 'question_text' in data) {
            if (nodeDataKeys.includes('text')) {
              base = { ...base, text: (data as any).question_text };
            } else if (nodeDataKeys.includes('question')) {
              base = { ...base, question: (data as any).question_text };
            }
            delete (base as any).question_text;
          }
          payload = base;
          break;
        }
        case 'option': {
          tableName = 'assessment_options';
          const allowed = ['option_text', 'is_correct', 'text', 'label'];
          const effective = allowed.filter(k => unionKeys.includes(k));
          let base = Object.fromEntries(Object.entries(data).filter(([k]) => effective.includes(k)));
          // Map option_text to 'text' or 'label' if schema uses those (based on existing node keys)
          if (!nodeDataKeys.includes('option_text') && 'option_text' in data) {
            if (nodeDataKeys.includes('text')) {
              base = { ...base, text: (data as any).option_text };
            } else if (nodeDataKeys.includes('label')) {
              base = { ...base, label: (data as any).option_text };
            }
            delete (base as any).option_text;
          }
          payload = base;
          break;
        }
        default: return;
      }

      if (!payload || Object.keys(payload).length === 0) {
        console.debug('[GraphEditor] Skipping DB update due to empty payload', { nodeId, type: node.type });
        return;
      }
      console.debug('[GraphEditor] Supabase update begin', { tableName, nodeId, payload });
      const { data: updated, error } = await supabase
        .from(tableName)
        .update(payload)
        .eq('id', nodeId)
        .select()
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        toast.error(`Failed to save: ${error.message}`);
        return;
      }

      if (!updated) {
        toast.error('Update blocked by RLS or record not found.');
        return;
      }

      setLastSaved(new Date());
      console.debug('[GraphEditor] Supabase update success', updated);
      toast.success('Saved');
    } catch (error) {
      console.error('Error saving node:', error);
      toast.error('Failed to save changes');
    }
  };

  // Load course graph with enhanced node data
  const loadCourseGraph = async (id: string) => {
    setIsLoading(true);
    // Clear previous graph immediately to avoid visual carryover while loading new course
    setNodes([]);
    setEdges([]);
    try {
      // Fetch course data
      const { data: course, error: courseErr } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();
      if (courseErr) throw courseErr;
      if (!course) throw new Error('Course not found');
      setSelectedCourse(course);

      // Fetch modules
      const { data: modules, error: modulesErr } = await supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', id)
        .order('created_at');
      if (modulesErr) throw modulesErr;

      // Fetch lessons and assessments
      const moduleIds = modules?.map(m => m.id) || [];
      
      const [{ data: lessons, error: lessonsErr }, { data: assessments, error: assessErr }] = await Promise.all([
        supabase
          .from('lessons')
          .select('*')
          .in('module_id', moduleIds)
          .order('order'),
        supabase
          .from('assessments')
          .select('*')
          .in('module_id', moduleIds)
      ]);
      if (lessonsErr) throw lessonsErr;
      if (assessErr) throw assessErr;

      // Fetch questions and options
      const assessmentIds = (assessments || []).map(a => a.id);
      let questions: any[] = [];
      let options: any[] = [];
      if (assessmentIds.length > 0) {
        const { data: qs, error: qErr } = await supabase
          .from('assessment_questions')
          .select('*')
          .in('assessment_id', assessmentIds)
          .order('created_at');
        if (qErr) throw qErr;
        questions = qs || [];
        const qids = questions.map(q => q.id);
        if (qids.length > 0) {
          const { data: os, error: oErr } = await supabase
            .from('assessment_options')
            .select('*')
            .in('question_id', qids)
            .order('created_at');
          if (oErr) throw oErr;
          options = os || [];
        }
      }

      // Convert to React Flow nodes with enhanced data
      const graphNodes: Node[] = [];
      const graphEdges: Edge[] = [];

      // Course node (root)
      graphNodes.push({
        id: course.id,
        type: 'course',
        position: { x: 400, y: 50 },
        data: {
          ...course,
          onUpdate: handleNodeUpdate,
          onAddChild: handleAddChild,
        },
      });

      // Module nodes
      modules?.forEach((module, index) => {
        graphNodes.push({
          id: module.id,
          type: 'module',
          position: { x: 200 + (index * 300), y: 200 },
          data: {
            ...module,
            onUpdate: handleNodeUpdate,
            onDelete: handleNodeDelete,
            onAddChild: handleAddChild,
          },
        });

        graphEdges.push({
          id: `${course.id}-${module.id}`,
          source: course.id,
          target: module.id,
          type: 'smoothstep',
        });

        // Lessons for this module
        const moduleLessons = lessons?.filter(l => l.module_id === module.id) || [];
        moduleLessons.forEach((lesson, lessonIndex) => {
          graphNodes.push({
            id: lesson.id,
            type: 'lesson',
            position: { x: 100 + (index * 300) + (lessonIndex * 120), y: 350 },
            data: {
              ...lesson,
              onUpdate: handleNodeUpdate,
              onDelete: handleNodeDelete,
            },
          });

          graphEdges.push({
            id: `${module.id}-${lesson.id}`,
            source: module.id,
            target: lesson.id,
            type: 'smoothstep',
          });
        });

        // Assessments for this module
        const moduleAssessments = assessments?.filter(a => a.module_id === module.id) || [];
        moduleAssessments.forEach((assessment, assessmentIndex) => {
          graphNodes.push({
            id: assessment.id,
            type: 'assessment',
            position: { x: 300 + (index * 300) + (assessmentIndex * 120), y: 500 },
            data: {
              ...assessment,
              onUpdate: handleNodeUpdate,
              onDelete: handleNodeDelete,
              onAddChild: handleAddChild,
            },
          });

          graphEdges.push({
            id: `${module.id}-${assessment.id}`,
            source: module.id,
            target: assessment.id,
            type: 'smoothstep',
          });

          // Questions under this assessment
          const aQuestions = questions.filter(q => q.assessment_id === assessment.id);
          aQuestions.forEach((q, qIndex) => {
            graphNodes.push({
              id: q.id,
              type: 'question',
              position: { x: 260 + (index * 300) + (qIndex * 160), y: 650 },
              data: {
                ...q,
                onUpdate: handleNodeUpdate,
                onDelete: handleNodeDelete,
                onAddChild: handleAddChild,
              },
            });
            graphEdges.push({
              id: `${assessment.id}-${q.id}`,
              source: assessment.id,
              target: q.id,
              type: 'smoothstep',
            });

            // Options under this question
            const qOptions = options.filter(o => o.question_id === q.id);
            qOptions.forEach((o, oIndex) => {
              graphNodes.push({
                id: o.id,
                type: 'option',
                position: { x: 240 + (index * 300) + (qIndex * 160) + (oIndex * 140), y: 780 },
                data: {
                  ...o,
                  onUpdate: handleNodeUpdate,
                  onDelete: handleNodeDelete,
                },
              });
              graphEdges.push({
                id: `${q.id}-${o.id}`,
                source: q.id,
                target: o.id,
                type: 'smoothstep',
              });
            });
          });
        });
      });

      // Try Supabase-stored layout first; fallback to localStorage
      const sbPositions = await loadLayoutFromSupabase(id);
      let laidOut = graphNodes;
      if (sbPositions) {
        // cache in localStorage and apply
        try { localStorage.setItem(layoutStorageKeyFor(id), JSON.stringify(sbPositions)); } catch {}
        laidOut = graphNodes.map(n => sbPositions[n.id] ? { ...n, position: sbPositions[n.id] } : n);
      } else {
        // Apply any saved positions from localStorage
        // Use keyed cache for the specific course we are loading
        try {
          const raw = localStorage.getItem(layoutStorageKeyFor(id));
          if (raw) {
            const posMap = JSON.parse(raw) as Record<string, { x: number; y: number }>;
            laidOut = graphNodes.map(n => posMap[n.id] ? { ...n, position: posMap[n.id] } : n);
          } else {
            laidOut = applySavedLayout(graphNodes);
          }
        } catch {
          laidOut = applySavedLayout(graphNodes);
        }
      }
      setNodes(laidOut);
      setEdges(graphEdges);
    } catch (error) {
      console.error('Error loading course graph:', error);
      toast.error('Failed to load course graph');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && nodes.length > 0) {
      const saveTimer = setTimeout(() => {
        setLastSaved(new Date());
      }, 2000);

      return () => clearTimeout(saveTimer);
    }
  }, [nodes, edges, autoSave]);

  // Load courses on mount
  useEffect(() => {
    loadCourses();
  }, []);

  // Load course graph when courseId changes
  useEffect(() => {
    if (courseId) {
      loadCourseGraph(courseId);
    }
  }, [courseId]);

  // Filter courses based on search
  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ReactFlowProvider>
      <div className="h-screen w-full bg-gray-50 flex">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold mb-3">Course Selection</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {filteredCourses.map((course) => (
                <div
                  key={course.id}
                  onClick={() => onCourseSelect?.(course.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedCourse?.id === course.id
                      ? 'bg-blue-100 border-blue-300'
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                  } border`}
                >
                  <div className="font-medium text-sm truncate">{course.title}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {course.difficulty_level} • {course.duration_hours}h
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Graph Area */}
        <div className="flex-1 flex flex-col">
          {/* Enhanced Toolbar */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-bold text-gray-800">Course Graph Editor</h2>
                {selectedCourse && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {selectedCourse.title}
                    </span>
                    {lastSaved && (
                      <span className="text-xs text-green-600">
                        Saved {lastSaved.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={autoLayout}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  <span>Auto Layout</span>
                </button>
                <button
                  onClick={() => setAutoSave(!autoSave)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${
                    autoSave 
                      ? 'bg-green-100 text-green-700 border border-green-300' 
                      : 'bg-gray-100 text-gray-700 border border-gray-300'
                  }`}
                >
                  <Zap size={14} />
                  <span>Auto-save</span>
                </button>
                
                <button
                  onClick={() => setShowMiniMap(!showMiniMap)}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  {showMiniMap ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>MiniMap</span>
                </button>
                
                <button
                  onClick={() => selectedCourse && loadCourseGraph(selectedCourse.id)}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  <RefreshCw size={14} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Graph Canvas */}
          <div ref={canvasRef} className="flex-1 relative" onClick={() => contextMenu.visible && closeContext()}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onPaneContextMenu={onPaneContextMenu}
              onNodeContextMenu={onNodeContextMenu}
              nodeTypes={nodeTypes}
              onInit={(inst) => { rfInstanceRef.current = inst; }}
              onNodeDragStop={() => setTimeout(() => { saveLayout(); saveLayoutToSupabase(); }, 0)}
              fitView
            >
              <Controls />
              {showMiniMap && (
                <MiniMap nodeColor={(n) => {
                  switch (n.type) {
                    case 'course': return '#3b82f6';
                    case 'module': return '#22c55e';
                    case 'lesson': return '#a855f7';
                    case 'assessment': return '#f97316';
                    case 'question': return '#f59e0b';
                    case 'option': return '#facc15';
                    default: return '#64748b';
                  }
                }} />
              )}
              <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
            </ReactFlow>

            {/* Context Menu */}
            {contextMenu.visible && (
              <div
                className="absolute z-50 bg-white rounded shadow-lg border text-sm"
                style={{ left: contextMenu.x, top: contextMenu.y }}
                onMouseLeave={closeContext}
              >
                {contextMenu.targetType === 'course' && (
                  <button
                    className="block px-3 py-2 hover:bg-gray-100 w-full text-left"
                    onClick={() => { contextMenu.targetId && handleAddChild(contextMenu.targetId, 'module'); closeContext(); }}
                  >
                    Add Module
                  </button>
                )}
                {contextMenu.targetType === 'module' && (
                  <>
                    <button
                      className="block px-3 py-2 hover:bg-gray-100 w-full text-left"
                      onClick={() => { contextMenu.targetId && handleAddChild(contextMenu.targetId, 'lesson'); closeContext(); }}
                    >
                      Add Lesson
                    </button>
                    <button
                      className="block px-3 py-2 hover:bg-gray-100 w-full text-left"
                      onClick={() => { contextMenu.targetId && handleAddChild(contextMenu.targetId, 'assessment'); closeContext(); }}
                    >
                      Add Assessment
                    </button>
                  </>
                )}
                {contextMenu.targetType === 'assessment' && (
                  <button
                    className="block px-3 py-2 hover:bg-gray-100 w-full text-left"
                    onClick={() => { contextMenu.targetId && handleAddChild(contextMenu.targetId, 'question'); closeContext(); }}
                  >
                    Add Question
                  </button>
                )}
                {contextMenu.targetType === 'question' && (
                  <button
                    className="block px-3 py-2 hover:bg-gray-100 w-full text-left"
                    onClick={() => { contextMenu.targetId && handleAddChild(contextMenu.targetId, 'option'); closeContext(); }}
                  >
                    Add Option
                  </button>
                )}
                {!contextMenu.targetType && (
                  <div className="px-3 py-2 text-gray-500">Right-click a node to add children</div>
                )}
              </div>
            )}

            {isLoading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-white p-6 rounded-lg">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
};

export default EnhancedCourseGraphEditor;
