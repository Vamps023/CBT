import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  NodeTypes,
  EdgeTypes,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Course, CourseModule, Lesson, Assessment } from '../../types';
import { supabaseAdmin } from '../../lib/supabase-admin';
import { Plus, Save, Download, Upload, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

// Custom Node Components
const CourseNode = ({ data }: { data: any }) => (
  <div className="px-4 py-3 shadow-lg rounded-lg bg-blue-500 text-white border-2 border-blue-600 min-w-[200px]">
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-bold">{data.title}</div>
        <div className="text-xs opacity-75">{data.difficulty_level}</div>
        <div className="text-xs opacity-75">{data.duration_hours}h</div>
      </div>
      <div className="text-xs bg-blue-600 px-2 py-1 rounded">COURSE</div>
    </div>
  </div>
);

const ModuleNode = ({ data }: { data: any }) => (
  <div className="px-4 py-3 shadow-lg rounded-lg bg-green-500 text-white border-2 border-green-600 min-w-[180px]">
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-bold">{data.title}</div>
        <div className="text-xs opacity-75">Order: {data.order}</div>
      </div>
      <div className="text-xs bg-green-600 px-2 py-1 rounded">MODULE</div>
    </div>
  </div>
);

const LessonNode = ({ data }: { data: any }) => (
  <div className="px-4 py-3 shadow-lg rounded-lg bg-purple-500 text-white border-2 border-purple-600 min-w-[160px]">
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-bold">{data.title}</div>
        <div className="text-xs opacity-75">{data.type}</div>
        <div className="text-xs opacity-75">{data.duration_minutes}min</div>
      </div>
      <div className="text-xs bg-purple-600 px-2 py-1 rounded">LESSON</div>
    </div>
  </div>
);

const AssessmentNode = ({ data }: { data: any }) => (
  <div className="px-4 py-3 shadow-lg rounded-lg bg-orange-500 text-white border-2 border-orange-600 min-w-[160px]">
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-bold">{data.title}</div>
        <div className="text-xs opacity-75">Pass: {data.passing_score}%</div>
        <div className="text-xs opacity-75">{data.time_limit_seconds}s</div>
      </div>
      <div className="text-xs bg-orange-600 px-2 py-1 rounded">ASSESSMENT</div>
    </div>
  </div>
);

const nodeTypes: NodeTypes = {
  course: CourseNode,
  module: ModuleNode,
  lesson: LessonNode,
  assessment: AssessmentNode,
};

interface CourseGraphEditorProps {
  courseId?: string;
}

export const CourseGraphEditor: React.FC<CourseGraphEditorProps> = ({ courseId }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Load course data and convert to graph
  const loadCourseGraph = async (id: string) => {
    setIsLoading(true);
    try {
      // Fetch course data
      const { data: course } = await supabaseAdmin
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (!course) throw new Error('Course not found');
      setSelectedCourse(course);

      // Fetch modules
      const { data: modules } = await supabaseAdmin
        .from('course_modules')
        .select('*')
        .eq('course_id', id)
        .order('order');

      // Fetch lessons and assessments for all modules
      const moduleIds = modules?.map(m => m.id) || [];
      
      const [{ data: lessons }, { data: assessments }] = await Promise.all([
        supabaseAdmin
          .from('lessons')
          .select('*')
          .in('module_id', moduleIds)
          .order('order'),
        supabaseAdmin
          .from('assessments')
          .select('*')
          .in('module_id', moduleIds)
      ]);

      // Convert to React Flow nodes and edges
      const graphNodes: Node[] = [];
      const graphEdges: Edge[] = [];

      // Course node (root)
      graphNodes.push({
        id: course.id,
        type: 'course',
        position: { x: 400, y: 50 },
        data: course,
      });

      // Module nodes
      modules?.forEach((module, index) => {
        graphNodes.push({
          id: module.id,
          type: 'module',
          position: { x: 200 + (index * 300), y: 200 },
          data: module,
        });

        // Edge from course to module
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
            data: lesson,
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
            data: assessment,
          });

          graphEdges.push({
            id: `${module.id}-${assessment.id}`,
            source: module.id,
            target: assessment.id,
            type: 'smoothstep',
          });
        });
      });

      setNodes(graphNodes);
      setEdges(graphEdges);
    } catch (error) {
      console.error('Error loading course graph:', error);
      toast.error('Failed to load course graph');
    } finally {
      setIsLoading(false);
    }
  };

  // Save graph changes back to database
  const saveGraphChanges = async () => {
    if (!selectedCourse) return;

    setIsLoading(true);
    try {
      // Update node positions and data
      for (const node of nodes) {
        const { type, data, position } = node;
        
        // Save position metadata (you might want to add a positions table)
        // For now, we'll just update the main data
        
        switch (type) {
          case 'course':
            await supabaseAdmin
              .from('courses')
              .update(data)
              .eq('id', node.id);
            break;
          case 'module':
            await supabaseAdmin
              .from('course_modules')
              .update(data)
              .eq('id', node.id);
            break;
          case 'lesson':
            await supabaseAdmin
              .from('lessons')
              .update(data)
              .eq('id', node.id);
            break;
          case 'assessment':
            await supabaseAdmin
              .from('assessments')
              .update(data)
              .eq('id', node.id);
            break;
        }
      }

      toast.success('Graph saved successfully!');
    } catch (error) {
      console.error('Error saving graph:', error);
      toast.error('Failed to save graph changes');
    } finally {
      setIsLoading(false);
    }
  };

  // Export graph as JSON
  const exportGraph = () => {
    const graphData = {
      course: selectedCourse,
      nodes: nodes.map(n => ({ ...n, data: n.data })),
      edges,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0'
      }
    };

    const blob = new Blob([JSON.stringify(graphData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `course-${selectedCourse?.title}-graph.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import graph from JSON
  const importGraph = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const graphData = JSON.parse(e.target?.result as string);
        setNodes(graphData.nodes || []);
        setEdges(graphData.edges || []);
        setSelectedCourse(graphData.course || null);
        toast.success('Graph imported successfully!');
      } catch (error) {
        toast.error('Failed to import graph');
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (courseId) {
      loadCourseGraph(courseId);
    }
  }, [courseId]);

  return (
    <div className="h-screen w-full bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-gray-800">Course Graph Editor</h2>
          {selectedCourse && (
            <span className="text-sm text-gray-600">
              Editing: {selectedCourse.title}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={saveGraphChanges}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={16} />
            <span>Save</span>
          </button>
          
          <button
            onClick={exportGraph}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download size={16} />
            <span>Export</span>
          </button>
          
          <label className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer">
            <Upload size={16} />
            <span>Import</span>
            <input
              type="file"
              accept=".json"
              onChange={importGraph}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Graph Canvas */}
      <div className="h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Background />
          <Controls />
          <MiniMap
            nodeStrokeColor={(n) => {
              switch (n.type) {
                case 'course': return '#2563eb';
                case 'module': return '#16a34a';
                case 'lesson': return '#9333ea';
                case 'assessment': return '#ea580c';
                default: return '#64748b';
              }
            }}
            nodeColor={(n) => {
              switch (n.type) {
                case 'course': return '#3b82f6';
                case 'module': return '#22c55e';
                case 'lesson': return '#a855f7';
                case 'assessment': return '#f97316';
                default: return '#94a3b8';
              }
            }}
          />
        </ReactFlow>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseGraphEditor;
