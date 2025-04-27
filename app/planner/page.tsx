"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ListTodo, Calendar, Brain, StickyNote, Bell, X, Edit2, Save, Trash2, Plus, CalendarDays } from "lucide-react";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

function PlannerPage() {
  // --- Tasks State ---
  const [tasks, setTasks] = useState<{ id: number; title: string; due: string; completed: boolean; editing?: boolean }[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const taskId = useRef(1);

  // --- Planners State ---
  const [plans, setPlans] = useState<{ date: string; text: string }[]>([]);
  const [planDate, setPlanDate] = useState("");
  const [planText, setPlanText] = useState("");

  // --- Mind Maps State ---
  const [nodes, setNodes] = useState<{ id: number; label: string; x: number; y: number }[]>([{ id: 1, label: "Central Idea", x: 200, y: 100 }]);
  const [edges, setEdges] = useState<{ from: number; to: number }[]>([]);
  const [draggedNode, setDraggedNode] = useState<number|null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }|null>(null);
  const mindMapRef = useRef<HTMLDivElement>(null);
  const nodeId = useRef(2);

  // --- Sticky Notes State ---
  const [notes, setNotes] = useState<{ id: number; text: string; x: number; y: number }[]>([]);
  const [noteText, setNoteText] = useState("");
  const noteId = useRef(1);

  // --- Reminders State ---
  const [reminders, setReminders] = useState<{ id: number; text: string; time: string }[]>([]);
  const [reminderText, setReminderText] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const reminderId = useRef(1);

  // --- Tasks Handlers ---
  const addTask = () => {
    if (!taskTitle.trim()) return;
    setTasks(t => [...t, { id: taskId.current++, title: taskTitle, due: taskDue, completed: false }]);
    setTaskTitle("");
    setTaskDue("");
  };
  const toggleTask = (id: number) => setTasks(t => t.map(task => task.id === id ? { ...task, completed: !task.completed } : task));
  const deleteTask = (id: number) => setTasks(t => t.filter(task => task.id !== id));
  const editTask = (id: number) => setTasks(t => t.map(task => task.id === id ? { ...task, editing: true } : { ...task, editing: false }));
  const saveTask = (id: number, newTitle: string, newDue: string) => setTasks(t => t.map(task => task.id === id ? { ...task, title: newTitle, due: newDue, editing: false } : task));

  // --- Planners Handlers ---
  const addPlan = () => {
    if (!planDate || !planText.trim()) return;
    setPlans(p => [...p, { date: planDate, text: planText }]);
    setPlanDate("");
    setPlanText("");
  };

  // --- Mind Map Handlers ---
  const addNode = () => {
    setNodes(n => [...n, { id: nodeId.current++, label: "New Node", x: 100, y: 200 }]);
  };
  const updateNode = (id: number, label: string) => setNodes(n => n.map(node => node.id === id ? { ...node, label } : node));
  const removeNode = (id: number) => {
    setNodes(n => n.filter(node => node.id !== id));
    setEdges(e => e.filter(edge => edge.from !== id && edge.to !== id));
  };
  const addEdge = (from: number, to: number) => {
    if (from !== to && !edges.find(e => e.from === from && e.to === to)) setEdges(e => [...e, { from, to }]);
  };
  // Drag logic for mind map
  const onNodeMouseDown = (id: number, e: React.MouseEvent) => {
    setDraggedNode(id);
    setDragOffset({ x: e.clientX - nodes.find(n => n.id === id)!.x, y: e.clientY - nodes.find(n => n.id === id)!.y });
  };
  const onNodeMouseMove = (e: React.MouseEvent) => {
    if (draggedNode && dragOffset) {
      setNodes(n => n.map(node => node.id === draggedNode ? { ...node, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y } : node));
    }
  };
  const onNodeMouseUp = () => setDraggedNode(null);

  // --- Sticky Notes Handlers ---
  const addNote = () => {
    if (!noteText.trim()) return;
    setNotes(n => [...n, { id: noteId.current++, text: noteText, x: 50, y: 50 }]);
    setNoteText("");
  };
  const updateNote = (id: number, text: string) => setNotes(n => n.map(note => note.id === id ? { ...note, text } : note));
  const deleteNote = (id: number) => setNotes(n => n.filter(note => note.id !== id));
  // Drag logic for sticky notes
  const onNoteMouseDown = (id: number, e: React.MouseEvent) => {
    setDraggedNode(id);
    setDragOffset({ x: e.clientX - notes.find(n => n.id === id)!.x, y: e.clientY - notes.find(n => n.id === id)!.y });
  };
  const onNoteMouseMove = (e: React.MouseEvent) => {
    if (draggedNode && dragOffset) {
      setNotes(n => n.map(note => note.id === draggedNode ? { ...note, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y } : note));
    }
  };
  const onNoteMouseUp = () => setDraggedNode(null);

  // --- Reminders Handlers ---
  const addReminder = () => {
    if (!reminderText.trim() || !reminderTime) return;
    setReminders(r => [...r, { id: reminderId.current++, text: reminderText, time: reminderTime }]);
    setReminderText("");
    setReminderTime("");
  };
  const deleteReminder = (id: number) => setReminders(r => r.filter(reminder => reminder.id !== id));

  return (
    <div className="max-w-4xl mx-auto py-10">
      <h1 className="text-4xl font-bold mb-6 text-center">Planner</h1>
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid grid-cols-5 mb-8">
          <TabsTrigger value="tasks"><ListTodo className="inline-block mr-2" />Tasks</TabsTrigger>
          <TabsTrigger value="planners"><Calendar className="inline-block mr-2" />Planners</TabsTrigger>
          <TabsTrigger value="mindmaps"><Brain className="inline-block mr-2" />Mind Maps</TabsTrigger>
          <TabsTrigger value="stickynotes"><StickyNote className="inline-block mr-2" />Sticky Notes</TabsTrigger>
          <TabsTrigger value="reminders"><Bell className="inline-block mr-2" />Reminders</TabsTrigger>
        </TabsList>
        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col md:flex-row gap-2 mb-4" onSubmit={e => { e.preventDefault(); addTask(); }}>
                <Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Task title" className="flex-1" />
                <Input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} className="w-44" />
                <Button type="submit"><Plus className="h-4 w-4 mr-1" />Add</Button>
              </form>
              <ul className="space-y-2">
                {tasks.map(task => (
                  <li key={task.id} className="flex items-center gap-2 bg-muted rounded px-3 py-2">
                    <Checkbox checked={task.completed} onCheckedChange={() => toggleTask(task.id)} />
                    {task.editing ? (
                      <>
                        <Input
                          value={task.title}
                          onChange={e => saveTask(task.id, e.target.value, task.due)}
                          className="flex-1"
                        />
                        <Input
                          type="date"
                          value={task.due}
                          onChange={e => saveTask(task.id, task.title, e.target.value)}
                          className="w-32"
                        />
                        <Button size="icon" variant="ghost" onClick={() => saveTask(task.id, task.title, task.due)}><Save /></Button>
                      </>
                    ) : (
                      <>
                        <span className={task.completed ? "line-through flex-1" : "flex-1"}>{task.title}</span>
                        <span className="text-xs text-muted-foreground w-24">{task.due}</span>
                        <Button size="icon" variant="ghost" onClick={() => editTask(task.id)}><Edit2 /></Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => deleteTask(task.id)}><Trash2 /></Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Planners Tab */}
        <TabsContent value="planners">
          <Card>
            <CardHeader>
              <CardTitle>Planners</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col md:flex-row gap-2 mb-4" onSubmit={e => { e.preventDefault(); addPlan(); }}>
                <Input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)} className="w-44" />
                <Input value={planText} onChange={e => setPlanText(e.target.value)} placeholder="Plan details" className="flex-1" />
                <Button type="submit"><Plus className="h-4 w-4 mr-1" />Add</Button>
              </form>
              <ul className="space-y-2">
                {plans.map((plan, i) => (
                  <li key={i} className="flex items-center gap-2 bg-muted rounded px-3 py-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span className="w-24 text-xs text-muted-foreground">{plan.date}</span>
                    <span className="flex-1">{plan.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Mind Maps Tab */}
        <TabsContent value="mindmaps">
          <Card>
            <CardHeader>
              <CardTitle>Mind Maps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex gap-2">
                <Button size="sm" onClick={addNode}><Plus className="h-4 w-4 mr-1" />Add Node</Button>
              </div>
              <div
                ref={mindMapRef}
                className="relative bg-muted rounded border h-80 overflow-auto"
                style={{ minHeight: 320 }}
                onMouseMove={onNodeMouseMove}
                onMouseUp={onNodeMouseUp}
              >
                {/* Edges */}
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                  {edges.map((edge, i) => {
                    const from = nodes.find(n => n.id === edge.from);
                    const to = nodes.find(n => n.id === edge.to);
                    if (!from || !to) return null;
                    return (
                      <line
                        key={i}
                        x1={from.x + 60}
                        y1={from.y + 20}
                        x2={to.x + 60}
                        y2={to.y + 20}
                        stroke="#888"
                        strokeWidth={2}
                      />
                    );
                  })}
                </svg>
                {/* Nodes */}
                {nodes.map(node => (
                  <div
                    key={node.id}
                    className="absolute bg-white border rounded shadow px-4 py-2 cursor-move select-none"
                    style={{ left: node.x, top: node.y, zIndex: 1, minWidth: 120 }}
                    onMouseDown={e => onNodeMouseDown(node.id, e)}
                  >
                    <Input
                      value={node.label}
                      onChange={e => updateNode(node.id, e.target.value)}
                      className="mb-2"
                    />
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => removeNode(node.id)}><Trash2 /></Button>
                      {/* Connect to another node */}
                      <select
                        className="border rounded px-1 text-xs"
                        onChange={e => { const to = Number(e.target.value); if (to) addEdge(node.id, to); }}
                        defaultValue=""
                      >
                        <option value="">Connect...</option>
                        {nodes.filter(n => n.id !== node.id).map(n => (
                          <option key={n.id} value={n.id}>{n.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Sticky Notes Tab */}
        <TabsContent value="stickynotes">
          <Card>
            <CardHeader>
              <CardTitle>Sticky Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="flex gap-2 mb-4" onSubmit={e => { e.preventDefault(); addNote(); }}>
                <Input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="New note..." className="flex-1" />
                <Button type="submit"><Plus className="h-4 w-4 mr-1" />Add</Button>
              </form>
              <div
                className="relative bg-muted rounded border h-64 overflow-auto"
                style={{ minHeight: 180 }}
                onMouseMove={onNoteMouseMove}
                onMouseUp={onNoteMouseUp}
              >
                {notes.map(note => (
                  <div
                    key={note.id}
                    className="absolute bg-yellow-100 border border-yellow-300 rounded shadow px-4 py-2 cursor-move"
                    style={{ left: note.x, top: note.y, minWidth: 120 }}
                    onMouseDown={e => onNoteMouseDown(note.id, e)}
                  >
                    <Textarea
                      value={note.text}
                      onChange={e => updateNote(note.id, e.target.value)}
                      className="mb-1 bg-yellow-50"
                      rows={2}
                    />
                    <Button size="icon" variant="ghost" onClick={() => deleteNote(note.id)}><Trash2 /></Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Reminders Tab */}
        <TabsContent value="reminders">
          <Card>
            <CardHeader>
              <CardTitle>Reminders</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col md:flex-row gap-2 mb-4" onSubmit={e => { e.preventDefault(); addReminder(); }}>
                <Input value={reminderText} onChange={e => setReminderText(e.target.value)} placeholder="Reminder text" className="flex-1" />
                <Input type="datetime-local" value={reminderTime} onChange={e => setReminderTime(e.target.value)} className="w-56" />
                <Button type="submit"><Plus className="h-4 w-4 mr-1" />Add</Button>
              </form>
              <ul className="space-y-2">
                {reminders.map(reminder => (
                  <li key={reminder.id} className="flex items-center gap-2 bg-muted rounded px-3 py-2">
                    <Bell className="h-4 w-4 text-primary" />
                    <span className="flex-1">{reminder.text}</span>
                    <span className="text-xs text-muted-foreground w-44">{reminder.time}</span>
                    <Button size="icon" variant="ghost" onClick={() => deleteReminder(reminder.id)}><Trash2 /></Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
export default PlannerPage;