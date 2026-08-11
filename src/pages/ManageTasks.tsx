import { useState, useEffect } from 'react';
import { PageType, User } from '../types';
import { ArrowLeft, Plus, CheckCircle2, Circle, Clock, Trash2 } from 'lucide-react';
import { apiClient } from '../lib/apiClient';

interface Task {
  id: string;
  title: string;
  status: 'PENDING' | 'COMPLETED';
  date: string;
  userId: string;
}

export function ManageTasks({ onNavigate, user }: { onNavigate: (page: PageType) => void, user: User }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const data = await apiClient.get('/api/tasks');
      setTasks(data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchTasks();
  }, [user.id]);

  const addTask = async () => {
    if (newTask.trim() === '') return;
    
    try {
      const newTaskData = {
        title: newTask,
        date: new Date().toISOString(),
      };
      
      const createdTask = await apiClient.post('/api/tasks', newTaskData);
      setTasks(prev => [createdTask, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setNewTask('');
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const toggleStatus = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'PENDING' ? 'COMPLETED' : 'PENDING';
      const updatedTask = await apiClient.patch(`/api/tasks/${taskId}`, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await apiClient.delete(`/api/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const clearCompletedTasks = async () => {
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
    if (completedTasks.length === 0) return;
    
    try {
      for (const task of completedTasks) {
        await apiClient.delete(`/api/tasks/${task.id}`);
      }
      fetchTasks();
    } catch (error) {
      console.error("Error clearing tasks:", error);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => onNavigate('erp')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-slate-600" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Manage Tasks</h1>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex justify-end mb-4">
          {tasks.some(t => t.status === 'COMPLETED') && (
            <button 
              onClick={clearCompletedTasks}
              className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear Completed
            </button>
          )}
        </div>
        <div className="flex gap-4 mb-8">
          <input 
            type="text" 
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Add a new task..." 
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button onClick={addTask} className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Task
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No tasks found. Create one above!</div>
        ) : (
          <div className="space-y-4">
            {tasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <button onClick={() => toggleStatus(task.id, task.status)}>
                    {task.status === 'COMPLETED' ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-300" />
                    )}
                  </button>
                  <div>
                    <h3 className={`font-medium ${task.status === 'COMPLETED' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                      <Clock className="w-4 h-4" />
                      <span>{task.date}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {task.status === 'COMPLETED' ? 'Completed' : 'Pending'}
                  </span>
                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Delete task"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
