import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Deployments from './pages/Deployments';

function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">🐤</span>
          <h1>CloudCanary</h1>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Dashboard
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Projects
          </NavLink>
          <NavLink to="/deployments" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Deployments
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <span>v0.1.0</span>
        </div>
      </aside>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/deployments" element={<Deployments />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
