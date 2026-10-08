import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import {
  AlertCircle,
  ArrowDownAZ,
  ArrowUpDown,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Edit3,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Mail,
  Menu,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';

const getInitialApiUrl = () => {
  if (import.meta.env?.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return 'http://localhost:5000';
};

const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('taskflow_token') || null);
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('taskflow_user') || '');
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [todos, setTodos] = useState([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [apiUrl, setApiUrl] = useState(getInitialApiUrl);
  const [pendingApiUrl, setPendingApiUrl] = useState(getInitialApiUrl);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const handleLogout = () => {
    setToken(null);
    setCurrentUser('');
    setTodos([]);
    localStorage.removeItem('taskflow_token');
    localStorage.removeItem('taskflow_user');
  };

  const fetchTodos = async (targetUrl = apiUrl) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${targetUrl.replace(/\/$/, '')}/api/todos`, { headers: getHeaders() });
      if (response.status === 401) {
        handleLogout();
        throw new Error('Session expired');
      }
      if (!response.ok) throw new Error('Unable to load tasks');
      setTodos(await response.json());
      setIsConnected(true);
    } catch (error) {
      console.warn('Backend issue:', error.message);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchTodos();
  }, [token, apiUrl]);

  const handleAuth = async (event) => {
    event.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Authentication failed');
      setToken(data.token);
      setCurrentUser(data.email);
      localStorage.setItem('taskflow_token', data.token);
      localStorage.setItem('taskflow_user', data.email);
      setAuthEmail('');
      setAuthPassword('');
      setIsConnected(true);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleAddTodo = async (event) => {
    event.preventDefault();
    const text = newTodoText.trim();
    if (!text) return;
    const tempId = `local-${Date.now()}`;
    setTodos((items) => [{ _id: tempId, text, completed: false, createdAt: new Date().toISOString() }, ...items]);
    setNewTodoText('');
    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/todos`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ text }),
      });
      if (response.status === 401) return handleLogout();
      if (!response.ok) throw new Error('Failed to create task');
      const savedTodo = await response.json();
      setTodos((items) => items.map((item) => (item._id === tempId ? savedTodo : item)));
    } catch (error) {
      console.error('Error saving todo:', error);
      setTodos((items) => items.filter((item) => item._id !== tempId));
    }
  };

  const handleToggleTodo = async (todo) => {
    const completed = !todo.completed;
    setTodos((items) => items.map((item) => (item._id === todo._id ? { ...item, completed } : item)));
    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/todos/${todo._id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ completed }),
      });
      if (response.status === 401) handleLogout();
      if (!response.ok) throw new Error('Failed to update task');
    } catch {
      setTodos((items) => items.map((item) => (item._id === todo._id ? { ...item, completed: todo.completed } : item)));
    }
  };

  const saveEdit = async (id) => {
    const text = editingText.trim();
    if (!text) return;
    const previous = todos;
    setTodos((items) => items.map((item) => (item._id === id ? { ...item, text, updatedAt: new Date().toISOString() } : item)));
    setEditingId(null);
    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/todos/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error('Update failed');
    } catch {
      setTodos(previous);
    }
  };

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    const id = deleteCandidate._id;
    setTodos((items) => items.filter((item) => item._id !== id));
    setDeleteCandidate(null);
    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/todos/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (response.status === 401) handleLogout();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const filteredTodos = useMemo(() => todos
    .filter((todo) => {
      const matchesFilter = filter === 'all' || (filter === 'active' ? !todo.completed : todo.completed);
      return matchesFilter && todo.text.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      if (sortBy === 'az') return a.text.localeCompare(b.text);
      if (sortBy === 'za') return b.text.localeCompare(a.text);
      if (sortBy === 'status') return Number(a.completed) - Number(b.completed);
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }), [todos, filter, searchQuery, sortBy]);

  const completedCount = todos.filter((todo) => todo.completed).length;
  const activeCount = todos.length - completedCount;
  const progress = todos.length ? Math.round((completedCount / todos.length) * 100) : 0;

  if (!token) {
    return (
      <main className="auth-page">
        <div className="auth-orb auth-orb-one" />
        <div className="auth-orb auth-orb-two" />
        <button className="icon-button auth-settings" onClick={() => setIsSettingsOpen(true)} aria-label="API settings"><Settings size={18} /></button>
        <section className="auth-card">
          <div className="brand-mark"><Sparkles size={24} /></div>
          <p className="eyebrow">YOUR PERSONAL SPACE</p>
          <h1>Make room for<br /><span>what matters.</span></h1>
          <p className="auth-copy">A calmer way to plan your day, track progress, and get things done.</p>
          <div className="auth-tabs">
            <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Sign in</button>
            <button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Create account</button>
          </div>
          <form onSubmit={handleAuth} className="auth-form">
            {authError && <div className="error-message"><AlertCircle size={16} />{authError}</div>}
            <label>Email address<input type="email" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="you@example.com" /></label>
            <label>Password<input type="password" required value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="At least 8 characters" /></label>
            <button className="primary-button auth-submit" disabled={isAuthLoading}>{isAuthLoading ? 'Please wait...' : authMode === 'login' ? 'Continue' : 'Create account'} <span>→</span></button>
          </form>
          <p className="auth-footer">{authMode === 'login' ? 'New here? ' : 'Already have an account? '}<button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>{authMode === 'login' ? 'Start for free' : 'Sign in instead'}</button></p>
        </section>
        {isSettingsOpen && <SettingsModal apiUrl={pendingApiUrl} setApiUrl={setPendingApiUrl} close={() => setIsSettingsOpen(false)} save={() => { setApiUrl(pendingApiUrl); setIsSettingsOpen(false); }} />}
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand"><div className="brand-mark small"><Sparkles size={17} /></div><strong>taskflow<span>.</span></strong><button className="mobile-close" onClick={() => setIsSidebarOpen(false)}><X size={18} /></button></div>
        <nav className="main-nav">
          <p className="nav-label">Workspace</p>
          <button className="nav-item active"><LayoutDashboard size={17} /> Overview</button>
          <button className="nav-item" onClick={() => setFilter('active')}><ListFilter size={17} /> My tasks <b>{activeCount}</b></button>
          <button className="nav-item" onClick={() => setFilter('completed')}><CheckCircle2 size={17} /> Completed</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="connection"><span className={isConnected ? 'status-dot' : 'status-dot offline'} />{isConnected ? 'Synced and up to date' : 'Offline mode'}</div>
          <button className="nav-item" onClick={() => setIsSettingsOpen(true)}><Settings size={17} /> Settings</button>
          <div className="profile"><div className="avatar">{currentUser.charAt(0).toUpperCase()}</div><div><strong>{currentUser.split('@')[0]}</strong><small>{currentUser}</small></div><button onClick={handleLogout} aria-label="Log out"><LogOut size={16} /></button></div>
        </div>
      </aside>
      <div className="main-panel">
        <header className="topbar"><button className="menu-button" onClick={() => setIsSidebarOpen(true)}><Menu size={21} /></button><div className="breadcrumb"><span>Workspace</span><b>/</b> Overview</div><div className="topbar-actions"><button className="icon-button" onClick={() => fetchTodos()} aria-label="Refresh"><RefreshCw size={17} className={isLoading ? 'spin' : ''} /></button><div className="mini-avatar">{currentUser.charAt(0).toUpperCase()}</div></div></header>
        <main className="content">
          <section className="welcome-row"><div><p className="eyebrow">THURSDAY, OCTOBER 8</p><h1>Good morning, {currentUser.split('@')[0] || 'there'} <span>✦</span></h1><p className="muted">Here's what's on your plate today.</p></div><div className="progress-card"><div className="progress-ring" style={{ '--progress': `${progress * 3.6}deg` }}><strong>{progress}%</strong></div><div><strong>Daily progress</strong><span>{completedCount} of {todos.length} tasks done</span></div></div></section>
          <section className="stats-grid"><StatCard label="All tasks" value={todos.length} icon={<ListFilter size={18} />} tone="purple" /><StatCard label="In progress" value={activeCount} icon={<Clock3 size={18} />} tone="orange" /><StatCard label="Completed" value={completedCount} icon={<CheckCircle2 size={18} />} tone="green" /></section>
          <section className="tasks-section">
            <div className="section-heading"><div><h2>My tasks</h2><p className="muted">{filteredTodos.length} tasks showing</p></div><form className="add-task" onSubmit={handleAddTodo}><Plus size={18} /><input value={newTodoText} onChange={(event) => setNewTodoText(event.target.value)} placeholder="Add a new task..." /><button type="submit" disabled={!newTodoText.trim()}>Add task</button></form></div>
            <div className="toolbar"><div className="filter-tabs">{['all', 'active', 'completed'].map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item === 'all' ? 'All tasks' : item === 'active' ? 'In progress' : 'Completed'}</button>)}</div><div className="toolbar-right"><div className="search-box"><Search size={15} /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search tasks" /></div><select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort tasks"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="az">A to Z</option><option value="za">Z to A</option><option value="status">Status</option></select><button className="icon-button filter-button"><ArrowUpDown size={16} /></button></div></div>
            <div className="task-list">{filteredTodos.length === 0 ? <div className="empty-state"><CheckCircle2 size={30} /><h3>{searchQuery ? 'No matching tasks' : 'Your list is clear'}</h3><p>{searchQuery ? 'Try another search term.' : 'Add a task above to get started.'}</p></div> : filteredTodos.map((todo) => <TaskRow key={todo._id} todo={todo} editingId={editingId} editingText={editingText} setEditingText={setEditingText} onToggle={handleToggleTodo} onEdit={(item) => { setEditingId(item._id); setEditingText(item.text); }} onSave={saveEdit} onCancel={() => setEditingId(null)} onDelete={setDeleteCandidate} />)}</div>
          </section>
        </main>
      </div>
      {isSettingsOpen && <SettingsModal apiUrl={pendingApiUrl} setApiUrl={setPendingApiUrl} close={() => setIsSettingsOpen(false)} save={() => { setApiUrl(pendingApiUrl); setIsSettingsOpen(false); }} />}
      {deleteCandidate && <div className="modal-backdrop"><div className="modal small-modal"><button className="modal-close" onClick={() => setDeleteCandidate(null)}><X size={18} /></button><div className="modal-icon danger"><Trash2 size={20} /></div><h2>Delete this task?</h2><p>This will permanently remove “{deleteCandidate.text}”.</p><div className="modal-actions"><button className="secondary-button" onClick={() => setDeleteCandidate(null)}>Cancel</button><button className="danger-button" onClick={confirmDelete}>Delete task</button></div></div></div>}
    </div>
  );
}

function StatCard({ label, value, icon, tone }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong></div><MoreHorizontal size={18} className="stat-menu" /></div>;
}

function TaskRow({ todo, editingId, editingText, setEditingText, onToggle, onEdit, onSave, onCancel, onDelete }) {
  const editing = editingId === todo._id;
  return <article className={`task-row ${todo.completed ? 'completed' : ''}`}><button className={`check-button ${todo.completed ? 'checked' : ''}`} onClick={() => onToggle(todo)} disabled={editing} aria-label={todo.completed ? 'Mark as active' : 'Mark as completed'}>{todo.completed ? <Check size={15} /> : <Circle size={20} />}</button><div className="task-body">{editing ? <input className="edit-input" autoFocus value={editingText} onChange={(event) => setEditingText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onSave(todo._id); if (event.key === 'Escape') onCancel(); }} /> : <h3 onDoubleClick={() => !todo.completed && onEdit(todo)}>{todo.text}</h3>}<div className="task-meta"><Clock3 size={13} /> {formatDate(todo.createdAt || todo.timestamp)} {todo.updatedAt && <span>· edited</span>}</div></div><div className="task-actions">{editing ? <><button className="action-button success" onClick={() => onSave(todo._id)}><Check size={16} /></button><button className="action-button" onClick={onCancel}><X size={16} /></button></> : <><button className="action-button edit" onClick={() => onEdit(todo)} aria-label="Edit task"><Edit3 size={15} /></button><button className="action-button delete" onClick={() => onDelete(todo)} aria-label="Delete task"><Trash2 size={15} /></button></>}</div></article>;
}

function SettingsModal({ apiUrl, setApiUrl, close, save }) {
  return <div className="modal-backdrop"><div className="modal"><button className="modal-close" onClick={close}><X size={18} /></button><div className="modal-icon"><Server size={20} /></div><h2>API settings</h2><p>Connect taskflow to your backend environment.</p><label>Backend URL<input value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} /></label><div className="modal-actions"><button className="secondary-button" onClick={close}>Cancel</button><button className="primary-button" onClick={save}>Save changes</button></div></div></div>;
}
