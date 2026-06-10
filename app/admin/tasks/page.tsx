// @ts-nocheck
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  CheckCircle, Circle, Clock, AlertTriangle,
  Plus, Filter, Search, Calendar, User,
  Tag, Flag, MoreVertical, Edit, Trash2,
  ChevronRight, ChevronLeft
} from 'lucide-react'

export default function TasksPage() {
  const router = useRouter()
  const [view, setView] = useState<'all' | 'todo' | 'in_progress' | 'done'>('all')

  const tasks = [
    { id: 't1', title: 'Review security logs', priority: 'high', status: 'todo', dueDate: '2026-03-20', assignedTo: 'Alex', project: 'Security' },
    { id: 't2', title: 'Update user permissions', priority: 'medium', status: 'in_progress', dueDate: '2026-03-22', assignedTo: 'Sarah', project: 'Users' },
    { id: 't3', title: 'Deploy new features', priority: 'high', status: 'in_progress', dueDate: '2026-03-18', assignedTo: 'Mike', project: 'Development' },
    { id: 't4', title: 'Write documentation', priority: 'low', status: 'todo', dueDate: '2026-03-25', assignedTo: 'Emma', project: 'Docs' },
    { id: 't5', title: 'Fix payment gateway', priority: 'critical', status: 'todo', dueDate: '2026-03-15', assignedTo: 'John', project: 'Payments' },
    { id: 't6', title: 'Update user guide', priority: 'low', status: 'done', dueDate: '2026-03-10', assignedTo: 'Emma', project: 'Docs' },
  ]

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    critical: tasks.filter(t => t.priority === 'critical').length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Task Management</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage and track your team's tasks</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-xs text-neutral-500">Total Tasks</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-neutral-500">To Do</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.todo}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-neutral-500">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-neutral-500">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.done}</p>
        </Card>
        <Card className="p-4 bg-red-50">
          <p className="text-xs text-red-600">Critical</p>
          <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              className="w-full pl-9 pr-4 py-2 border rounded-lg"
            />
          </div>
          <select className="px-3 py-2 border rounded-lg">
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select className="px-3 py-2 border rounded-lg">
            <option value="all">All Assignees</option>
            <option value="alex">Alex</option>
            <option value="sarah">Sarah</option>
            <option value="mike">Mike</option>
          </select>
          <button className="p-2 border rounded-lg hover:bg-neutral-50">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setView('all')}
            className={`px-3 py-1 rounded-lg text-sm ${view === 'all' ? 'bg-primary-100 text-primary-700' : 'hover:bg-neutral-100'}`}
          >
            All
          </button>
          <button
            onClick={() => setView('todo')}
            className={`px-3 py-1 rounded-lg text-sm ${view === 'todo' ? 'bg-primary-100 text-primary-700' : 'hover:bg-neutral-100'}`}
          >
            To Do
          </button>
          <button
            onClick={() => setView('in_progress')}
            className={`px-3 py-1 rounded-lg text-sm ${view === 'in_progress' ? 'bg-primary-100 text-primary-700' : 'hover:bg-neutral-100'}`}
          >
            In Progress
          </button>
          <button
            onClick={() => setView('done')}
            className={`px-3 py-1 rounded-lg text-sm ${view === 'done' ? 'bg-primary-100 text-primary-700' : 'hover:bg-neutral-100'}`}
          >
            Done
          </button>
        </div>
      </Card>

      {/* Tasks List */}
      <Card className="p-6">
        <div className="space-y-2">
          {tasks.filter(t => view === 'all' || t.status === view).map((task) => (
            <div key={task.id} className="flex items-center gap-4 p-3 border rounded-lg hover:shadow-sm">
              <button className="flex-shrink-0">
                {task.status === 'done' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-neutral-300" />
                )}
              </button>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${task.status === 'done' ? 'line-through text-neutral-400' : ''}`}>
                    {task.title}
                  </span>
                  <Badge variant={
                    task.priority === 'critical' ? 'secondary' :
                    task.priority === 'high' ? 'outline' : 'primary'
                  } size="sm">
                    {task.priority}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {task.assignedTo}
                  </span>
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {task.project}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Due {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-1 hover:bg-neutral-100 rounded">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-1 hover:bg-red-50 text-red-600 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}