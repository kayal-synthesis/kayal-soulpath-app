'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  CheckCircle, Circle, Clock,
  Plus, Search, Calendar, User,
  Tag, Trash2, X, Loader2, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

// Real, complete build. There was no tasks table before tonight, and
// every task shown here used to be one of six hardcoded entries,
// including three dated back in March 2026, already in the past.
// Nothing was ever real, "Create Task" had no handler, the circle icon
// meant to mark a task done had no click handler either, search and
// the priority/assignee filters had state but no effect. This
// connects to the real, new tasks table, built specifically for this.

interface Task {
  id:          string
  title:       string
  description: string | null
  priority:    'low' | 'medium' | 'high' | 'critical'
  status:      'todo' | 'in_progress' | 'done'
  project:     string | null
  assigned_to: string | null
  due_date:    string | null
  created_at:  string
  admin_users?: { name?: string; email?: string } | null
}

interface AdminUserOption {
  id:   string
  name: string
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'text-red-600',
  high:     'text-orange-600',
  medium:   'text-yellow-600',
  low:      'text-neutral-500',
}

export default function TasksPage() {
  const supabase = createClient()

  const [tasks, setTasks] = useState<Task[]>([])
  const [admins, setAdmins] = useState<AdminUserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [view, setView] = useState<'all' | 'todo' | 'in_progress' | 'done'>('all')
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const [newTask, setNewTask] = useState({
    title: '', description: '', priority: 'medium', project: '', assigned_to: '', due_date: '',
  })
  const [creating, setCreating] = useState(false)

  const fetchTasks = useCallback(async () => {
    setRefreshing(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, admin_users:assigned_to(name, email)')
        .order('created_at', { ascending: false })
      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const fetchAdmins = useCallback(async () => {
    const { data } = await supabase.from('admin_users').select('id, name')
    setAdmins(data || [])
  }, [])

  useEffect(() => { fetchTasks(); fetchAdmins() }, [fetchTasks, fetchAdmins])

  const createTask = async () => {
    if (!newTask.title.trim()) {
      toast.error('Title is required')
      return
    }
    setCreating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('tasks').insert({
        title:       newTask.title.trim(),
        description: newTask.description.trim() || null,
        priority:    newTask.priority,
        status:      'todo',
        project:     newTask.project.trim() || null,
        assigned_to: newTask.assigned_to || null,
        due_date:    newTask.due_date || null,
        created_by:  user?.id || null,
      })
      if (error) throw error
      toast.success('Task created')
      setShowCreate(false)
      setNewTask({ title: '', description: '', priority: 'medium', project: '', assigned_to: '', due_date: '' })
      fetchTasks()
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error('Failed to create task')
    } finally {
      setCreating(false)
    }
  }

  const cycleStatus = async (task: Task) => {
    const next: Record<Task['status'], Task['status']> = { todo: 'in_progress', in_progress: 'done', done: 'todo' }
    setProcessingId(task.id)
    try {
      const { error } = await supabase.from('tasks').update({ status: next[task.status], updated_at: new Date().toISOString() }).eq('id', task.id)
      if (error) throw error
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next[task.status] } : t))
    } catch {
      toast.error('Failed to update task')
    } finally {
      setProcessingId(null)
    }
  }

  const deleteTask = async (id: string) => {
    if (!confirm('Delete this task? This cannot be undone.')) return
    setProcessingId(id)
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
      setTasks(prev => prev.filter(t => t.id !== id))
      toast.success('Task deleted')
    } catch {
      toast.error('Failed to delete task')
    } finally {
      setProcessingId(null)
    }
  }

  const stats = {
    total:      tasks.length,
    todo:       tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    done:       tasks.filter(t => t.status === 'done').length,
    critical:   tasks.filter(t => t.priority === 'critical').length,
  }

  const filtered = tasks.filter(t => {
    if (view !== 'all' && t.status !== view) return false
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
    if (assigneeFilter !== 'all' && t.assigned_to !== assigneeFilter) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !(t.description || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-12 h-12 animate-spin text-primary-600" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Task Management</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage and track your team's tasks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTasks} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Task
          </Button>
        </div>
      </div>

      {/* Stats, real */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4"><p className="text-xs text-neutral-500">Total Tasks</p><p className="text-2xl font-bold">{stats.total}</p></Card>
        <Card className="p-4"><p className="text-xs text-neutral-500">To Do</p><p className="text-2xl font-bold text-yellow-600">{stats.todo}</p></Card>
        <Card className="p-4"><p className="text-xs text-neutral-500">In Progress</p><p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p></Card>
        <Card className="p-4"><p className="text-xs text-neutral-500">Completed</p><p className="text-2xl font-bold text-green-600">{stats.done}</p></Card>
        <Card className="p-4 bg-red-50"><p className="text-xs text-red-600">Critical</p><p className="text-2xl font-bold text-red-600">{stats.critical}</p></Card>
      </div>

      {/* Filters, real */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg"
            />
          </div>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
            <option value="all">All Assignees</option>
            {admins.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 mt-4">
          {(['all', 'todo', 'in_progress', 'done'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded-lg text-sm capitalize ${view === v ? 'bg-primary-100 text-primary-700' : 'hover:bg-neutral-100'}`}
            >
              {v.replace('_', ' ')}
            </button>
          ))}
        </div>
      </Card>

      {/* Tasks List, real */}
      <Card className="p-6">
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-center text-neutral-400 py-8">No tasks found</p>
          ) : filtered.map((task) => (
            <div key={task.id} className="flex items-center gap-4 p-3 border rounded-lg hover:shadow-sm">
              <button
                onClick={() => cycleStatus(task)}
                disabled={processingId === task.id}
                className="flex-shrink-0"
                title="Click to advance status"
              >
                {task.status === 'done' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : task.status === 'in_progress' ? (
                  <Clock className="w-5 h-5 text-blue-500" />
                ) : (
                  <Circle className="w-5 h-5 text-neutral-300" />
                )}
              </button>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${task.status === 'done' ? 'line-through text-neutral-400' : ''}`}>
                    {task.title}
                  </span>
                  <Badge variant="outline" size="sm" className={PRIORITY_COLOR[task.priority]}>
                    {task.priority}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {task.admin_users?.name || 'Unassigned'}
                  </span>
                  {task.project && (
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {task.project}
                    </span>
                  )}
                  {task.due_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Due {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => deleteTask(task.id)}
                  disabled={processingId === task.id}
                  className="p-1 hover:bg-red-50 text-red-600 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Create Task Modal, real */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Create Task</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-neutral-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} className="w-full p-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} rows={3} className="w-full p-2 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })} className="w-full p-2 border rounded-lg">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input type="date" value={newTask.due_date} onChange={e => setNewTask({ ...newTask, due_date: e.target.value })} className="w-full p-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Project (optional)</label>
                <input value={newTask.project} onChange={e => setNewTask({ ...newTask, project: e.target.value })} className="w-full p-2 border rounded-lg" placeholder="e.g. Affiliate System" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Assign to</label>
                <select value={newTask.assigned_to} onChange={e => setNewTask({ ...newTask, assigned_to: e.target.value })} className="w-full p-2 border rounded-lg">
                  <option value="">Unassigned</option>
                  {admins.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={createTask} disabled={creating} className="flex-1">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Task'}
                </Button>
                <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
