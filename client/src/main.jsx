import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  FolderKanban,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Shield,
  UserRound,
  Users
} from "lucide-react";
import "./styles.css";

const blankProject = { name: "", description: "", members: [] };
const blankTask = { title: "", project: "", assignee: "", priority: "Medium", dueDate: "", description: "" };
const apiBaseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const views = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "tasks", label: "Tasks", icon: ClipboardList },
  { id: "team", label: "Team", icon: Users }
];

function getStored(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("ethara_token"));
  const [user, setUser] = useState(getStored("ethara_user", null));
  const [activeView, setActiveView] = useState("dashboard");
  const [authMode, setAuthMode] = useState("login");
  const [auth, setAuth] = useState({ name: "", email: "", password: "", role: "Member" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [projectForm, setProjectForm] = useState(blankProject);
  const [taskForm, setTaskForm] = useState(blankTask);
  const [taskSearch, setTaskSearch] = useState("");

  const isAdmin = user?.role === "Admin";

  async function api(path, options = {}) {
    const response = await fetch(`${apiBaseUrl}/api${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Request failed");
    return data;
  }

  async function loadData() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [dashboardData, userData, projectData, taskData] = await Promise.all([
        api("/dashboard"),
        api("/auth/users"),
        api("/projects"),
        api("/tasks")
      ]);

      setDashboard(dashboardData);
      setUsers(userData.users);
      setProjects(projectData.projects);
      setTasks(taskData.tasks);
      setTaskForm((current) => ({
        ...current,
        project: current.project || projectData.projects[0]?._id || "",
        assignee: current.assignee || userData.users[0]?._id || ""
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [token]);

  function saveSession(session) {
    localStorage.setItem("ethara_token", session.token);
    localStorage.setItem("ethara_user", JSON.stringify(session.user));
    setToken(session.token);
    setUser(session.user);
  }

  function logout() {
    localStorage.removeItem("ethara_token");
    localStorage.removeItem("ethara_user");
    setToken(null);
    setUser(null);
    setDashboard(null);
    setActiveView("dashboard");
  }

  async function submitAuth(event) {
    event.preventDefault();
    setError("");
    try {
      const payload = authMode === "signup" ? auth : { email: auth.email, password: auth.password };
      const session = await api(`/auth/${authMode}`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      saveSession(session);
    } catch (err) {
      setError(err.message);
    }
  }

  async function createProject(event) {
    event.preventDefault();
    setError("");
    try {
      await api("/projects", {
        method: "POST",
        body: JSON.stringify(projectForm)
      });
      setProjectForm(blankProject);
      await loadData();
      setActiveView("projects");
    } catch (err) {
      setError(err.message);
    }
  }

  async function createTask(event) {
    event.preventDefault();
    setError("");
    try {
      await api("/tasks", {
        method: "POST",
        body: JSON.stringify(taskForm)
      });
      setTaskForm(blankTask);
      await loadData();
      setActiveView("tasks");
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateTaskStatus(taskId, status) {
    setError("");
    try {
      await api(`/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  const completion = useMemo(() => {
    if (!dashboard?.taskCount) return 0;
    return Math.round((dashboard.byStatus.Done / dashboard.taskCount) * 100);
  }, [dashboard]);

  const filteredTasks = useMemo(() => {
    const query = taskSearch.trim().toLowerCase();
    if (!query) return tasks;
    return tasks.filter((task) =>
      [task.title, task.description, task.project?.name, task.assignee?.name, task.status, task.priority]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [tasks, taskSearch]);

  const recentTasks = tasks.slice(0, 5);
  const overdueTasks = tasks.filter((task) => isOverdue(task));

  if (!token || !user) {
    return (
      <main className="auth-page">
        <section className="auth-copy">
          <span className="brand-mark"><BriefcaseBusiness size={22} /> Ethara</span>
          <h1>Run projects with clear ownership.</h1>
          <p>Admins create teams and assign work. Members update progress and keep delivery health visible.</p>
          <div className="auth-stats">
            <span><Shield size={18} /> Role-aware</span>
            <span><ClipboardList size={18} /> Task tracking</span>
            <span><BarChart3 size={18} /> Live dashboard</span>
          </div>
        </section>

        <form className="auth-card" onSubmit={submitAuth}>
          <div className="mode-switch">
            {["login", "signup"].map((mode) => (
              <button
                type="button"
                key={mode}
                className={authMode === mode ? "active" : ""}
                onClick={() => setAuthMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>

          {authMode === "signup" && (
            <label>
              Name
              <input value={auth.name} minLength="2" maxLength="80" onChange={(event) => setAuth({ ...auth, name: event.target.value })} required />
            </label>
          )}
          <label>
            Email
            <input type="email" value={auth.email} onChange={(event) => setAuth({ ...auth, email: event.target.value })} required />
          </label>
          <label>
            Password
            <input type="password" minLength="6" value={auth.password} onChange={(event) => setAuth({ ...auth, password: event.target.value })} required />
          </label>
          {authMode === "signup" && (
            <label>
              Role
              <select value={auth.role} onChange={(event) => setAuth({ ...auth, role: event.target.value })}>
                <option>Member</option>
                <option>Admin</option>
              </select>
            </label>
          )}
          <button className="primary" type="submit">Continue</button>
          {error && <p className="error">{error}</p>}
        </form>
      </main>
    );
  }

  const activeLabel = views.find((view) => view.id === activeView)?.label || "Dashboard";

  return (
    <main className="app">
      <aside className="sidebar">
        <div>
          <span className="brand-mark"><BriefcaseBusiness size={20} /> Ethara</span>
          <nav aria-label="Workspace sections">
            {views.map((view) => {
              const Icon = view.icon;
              return (
                <button
                  type="button"
                  key={view.id}
                  className={activeView === view.id ? "active" : ""}
                  onClick={() => setActiveView(view.id)}
                >
                  <Icon size={18} />
                  {view.label}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="user-card">
          <div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div>
          <strong>{user.name}</strong>
          <span>{user.email}</span>
          <em>{user.role}</em>
          <button className="quiet" onClick={logout}><LogOut size={16} /> Logout</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
            <h1>{activeLabel}</h1>
          </div>
          <button className="quiet" onClick={loadData}><RefreshCw size={16} /> {loading ? "Loading" : "Refresh"}</button>
        </header>

        {error && <div className="notice"><CircleAlert size={18} /> {error}</div>}

        {activeView === "dashboard" && (
          <DashboardView
            dashboard={dashboard}
            completion={completion}
            recentTasks={recentTasks}
            overdueTasks={overdueTasks}
            projects={projects}
            setActiveView={setActiveView}
            onStatus={updateTaskStatus}
          />
        )}

        {activeView === "projects" && (
          <ProjectsView
            isAdmin={isAdmin}
            users={users}
            projects={projects}
            projectForm={projectForm}
            setProjectForm={setProjectForm}
            createProject={createProject}
          />
        )}

        {activeView === "tasks" && (
          <TasksView
            isAdmin={isAdmin}
            users={users}
            projects={projects}
            tasks={filteredTasks}
            taskForm={taskForm}
            setTaskForm={setTaskForm}
            createTask={createTask}
            taskSearch={taskSearch}
            setTaskSearch={setTaskSearch}
            onStatus={updateTaskStatus}
          />
        )}

        {activeView === "team" && (
          <TeamView users={users} projects={projects} tasks={tasks} isAdmin={isAdmin} />
        )}
      </section>
    </main>
  );
}

function DashboardView({ dashboard, completion, recentTasks, overdueTasks, projects, setActiveView, onStatus }) {
  return (
    <>
      <section className="metrics">
        <Metric icon={<BriefcaseBusiness />} label="Projects" value={dashboard?.projectCount ?? 0} />
        <Metric icon={<ClipboardList />} label="Tasks" value={dashboard?.taskCount ?? 0} />
        <Metric icon={<CalendarClock />} label="Overdue" value={dashboard?.overdueCount ?? 0} tone="warning" />
        <Metric icon={<CheckCircle2 />} label="Completion" value={`${completion}%`} tone="success" />
      </section>

      <section className="overview-grid">
        <article className="progress-panel">
          <div>
            <h2>Status mix</h2>
            <p>Todo {dashboard?.byStatus.Todo ?? 0} / In progress {dashboard?.byStatus["In Progress"] ?? 0} / Done {dashboard?.byStatus.Done ?? 0}</p>
          </div>
          <div className="progress-bar">
            <span style={{ width: `${completion}%` }} />
          </div>
        </article>

        <article className="action-panel">
          <h2>Quick actions</h2>
          <button onClick={() => setActiveView("projects")}><FolderKanban size={17} /> Manage projects</button>
          <button onClick={() => setActiveView("tasks")}><ClipboardList size={17} /> Review tasks</button>
          <button onClick={() => setActiveView("team")}><Users size={17} /> View team</button>
        </article>
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-title">
            <h2>Recent work</h2>
            <span>{recentTasks.length} tasks</span>
          </div>
          <div className="list">
            {recentTasks.map((task) => <TaskItem key={task._id} task={task} onStatus={onStatus} compact />)}
            {!recentTasks.length && <p className="empty">No tasks yet.</p>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <h2>Needs attention</h2>
            <span>{overdueTasks.length} overdue</span>
          </div>
          <div className="list">
            {overdueTasks.map((task) => <TaskItem key={task._id} task={task} onStatus={onStatus} compact />)}
            {!overdueTasks.length && <p className="empty">Nothing overdue right now.</p>}
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>Active projects</h2>
          <span>{projects.length} total</span>
        </div>
        <div className="project-row">
          {projects.slice(0, 4).map((project) => <ProjectItem key={project._id} project={project} compact />)}
          {!projects.length && <p className="empty">No projects yet.</p>}
        </div>
      </section>
    </>
  );
}

function ProjectsView({ isAdmin, users, projects, projectForm, setProjectForm, createProject }) {
  return (
    <section className="content-grid projects-page">
      <section className="panel form-panel">
        <div className="panel-title">
          <h2>{isAdmin ? "Create project" : "Project access"}</h2>
          <span>{isAdmin ? "Admin" : "Member"}</span>
        </div>
        {isAdmin ? (
          <form className="editor single" onSubmit={createProject}>
            <label>
              Project name
              <input placeholder="Website redesign" value={projectForm.name} onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })} required />
            </label>
            <label>
              Description
              <textarea placeholder="Goals, scope, or delivery notes" value={projectForm.description} onChange={(event) => setProjectForm({ ...projectForm, description: event.target.value })} />
            </label>
            <label>
              Team members
              <select multiple value={projectForm.members} onChange={(event) => setProjectForm({ ...projectForm, members: Array.from(event.target.selectedOptions).map((option) => option.value) })}>
                {users.map((member) => <option key={member._id} value={member._id}>{member.name} - {member.role}</option>)}
              </select>
            </label>
            <button className="primary" type="submit"><Plus size={16} /> Create Project</button>
          </form>
        ) : (
          <p className="empty">Members can view assigned projects. Admins create projects and manage teams.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>Project portfolio</h2>
          <span>{projects.length} projects</span>
        </div>
        <div className="list">
          {projects.map((project) => <ProjectItem key={project._id} project={project} />)}
          {!projects.length && <p className="empty">No projects yet.</p>}
        </div>
      </section>
    </section>
  );
}

function TasksView({ isAdmin, users, projects, tasks, taskForm, setTaskForm, createTask, taskSearch, setTaskSearch, onStatus }) {
  return (
    <section className="tasks-layout">
      {isAdmin && (
        <section className="panel form-panel">
          <div className="panel-title">
            <h2>Create task</h2>
            <span>Admin</span>
          </div>
          <form className="editor task-editor" onSubmit={createTask}>
            <label>
              Title
              <input placeholder="Prepare launch checklist" value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} required />
            </label>
            <label>
              Project
              <select value={taskForm.project} onChange={(event) => setTaskForm({ ...taskForm, project: event.target.value })} required>
                <option value="">Choose project</option>
                {projects.map((project) => <option key={project._id} value={project._id}>{project.name}</option>)}
              </select>
            </label>
            <label>
              Assignee
              <select value={taskForm.assignee} onChange={(event) => setTaskForm({ ...taskForm, assignee: event.target.value })} required>
                <option value="">Choose assignee</option>
                {users.map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}
              </select>
            </label>
            <label>
              Priority
              <select value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </label>
            <label>
              Due date
              <input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })} required />
            </label>
            <label className="span-all">
              Details
              <textarea placeholder="Acceptance notes or context" value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} />
            </label>
            <button className="primary" type="submit"><Plus size={16} /> Create Task</button>
          </form>
        </section>
      )}

      <section className="panel">
        <div className="panel-title">
          <h2>{isAdmin ? "All tasks" : "My tasks"}</h2>
          <span>{tasks.length} shown</span>
        </div>
        <div className="search-box">
          <Search size={17} />
          <input placeholder="Search by title, project, assignee, status" value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} />
        </div>
        <div className="task-columns">
          {["Todo", "In Progress", "Done"].map((status) => (
            <section className="task-column" key={status}>
              <h3>{status}</h3>
              {tasks.filter((task) => task.status === status).map((task) => <TaskItem key={task._id} task={task} onStatus={onStatus} />)}
            </section>
          ))}
        </div>
      </section>
    </section>
  );
}

function TeamView({ users, projects, tasks, isAdmin }) {
  return (
    <section className="team-grid">
      <section className="panel">
        <div className="panel-title">
          <h2>Team directory</h2>
          <span>{users.length} people</span>
        </div>
        <div className="member-list">
          {users.map((member) => {
            const assigned = tasks.filter((task) => task.assignee?._id === member._id);
            const done = assigned.filter((task) => task.status === "Done").length;
            return (
              <article className="member-card" key={member._id}>
                <div className="avatar">{member.name.slice(0, 1).toUpperCase()}</div>
                <div>
                  <h3>{member.name}</h3>
                  <p>{member.email}</p>
                </div>
                <span className="role-pill">{member.role}</span>
                <div className="member-stats">
                  <span>{assigned.length} assigned</span>
                  <span>{done} done</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>Project teams</h2>
          <span>{isAdmin ? "Full access" : "Visible teams"}</span>
        </div>
        <div className="list">
          {projects.map((project) => (
            <article className="item" key={project._id}>
              <div className="item-head">
                <h3>{project.name}</h3>
                <span>{project.members.length} members</span>
              </div>
              <div className="chips">
                {project.members.map((member) => <span key={member._id}>{member.name}</span>)}
              </div>
            </article>
          ))}
          {!projects.length && <p className="empty">No teams yet.</p>}
        </div>
      </section>
    </section>
  );
}

function Metric({ icon, label, value, tone = "" }) {
  return (
    <article className={`metric ${tone}`}>
      <span>{React.cloneElement(icon, { size: 20 })}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function ProjectItem({ project, compact = false }) {
  return (
    <article className={`item project-card ${compact ? "compact" : ""}`}>
      <div className="item-head">
        <h3>{project.name}</h3>
        <span>{project.members.length} members</span>
      </div>
      <p>{project.description || "No description yet."}</p>
      <div className="chips">
        {project.members.slice(0, compact ? 3 : 6).map((member) => <span key={member._id}>{member.name}</span>)}
      </div>
    </article>
  );
}

function TaskItem({ task, onStatus, compact = false }) {
  const overdue = isOverdue(task);
  return (
    <article className={`item task ${compact ? "compact" : ""}`}>
      <div className="item-head">
        <h3>{task.title}</h3>
        <span className={`status ${task.status.toLowerCase().replaceAll(" ", "-")}`}>{task.status}</span>
      </div>
      {!compact && <p>{task.description || "No details added."}</p>}
      <div className="chips">
        <span>{task.project?.name || "Project"}</span>
        <span><UserRound size={13} /> {task.assignee?.name || "Unassigned"}</span>
        <span>{task.priority}</span>
        <span className={overdue ? "overdue" : ""}>Due {new Date(task.dueDate).toLocaleDateString()}</span>
      </div>
      <select value={task.status} onChange={(event) => onStatus(task._id, event.target.value)}>
        <option>Todo</option>
        <option>In Progress</option>
        <option>Done</option>
      </select>
    </article>
  );
}

function isOverdue(task) {
  return task.status !== "Done" && new Date(task.dueDate) < new Date();
}

createRoot(document.getElementById("root")).render(<App />);
