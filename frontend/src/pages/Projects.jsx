import { useState, useEffect } from 'react';
import api from '../api/client';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', repo_url: '', branch: 'main', health_check_url: '', description: '' });

  const fetchProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createProject(form);
      setForm({ name: '', repo_url: '', branch: 'main', health_check_url: '', description: '' });
      setShowForm(false);
      fetchProjects();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project and all its deployments?')) return;
    try {
      await api.deleteProject(id);
      fetchProjects();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) {
    return <div className="empty-state"><div className="icon">⏳</div><p>Loading projects...</p></div>;
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Projects</h2>
          <p>Manage your registered applications</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Project'}
        </button>
      </div>

      {showForm && (
        <div className="table-container" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Project Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Repository URL</label>
                <input value={form.repo_url} onChange={(e) => setForm({ ...form, repo_url: e.target.value })} placeholder="https://github.com/user/repo" required />
              </div>
              <div className="form-group">
                <label>Branch</label>
                <input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Health Check URL</label>
                <input value={form.health_check_url} onChange={(e) => setForm({ ...form, health_check_url: e.target.value })} placeholder="http://localhost:5000/health" />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary">Create Project</button>
          </form>
        </div>
      )}

      <div className="table-container">
        <h3>All Projects</h3>
        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📁</div>
            <p>No projects registered yet.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Repository</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{p.repo_url}</td>
                  <td>{p.branch}</td>
                  <td><span className={`badge ${p.is_active ? 'healthy' : 'failed'}`}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => handleDelete(p.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Projects;
