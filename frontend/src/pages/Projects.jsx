import { useState, useEffect } from 'react';
import api from '../api/client';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', repo_url: '', branch: 'main', health_check_url: '', description: '' });

  const fetchProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('Failed to load projects: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.createProject(form);
      setForm({ name: '', repo_url: '', branch: 'main', health_check_url: '', description: '' });
      setShowForm(false);
      fetchProjects();
    } catch (err) {
      setError('Error creating project: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete project "${name}" and all its deployments?`)) return;
    try {
      await api.deleteProject(id);
      fetchProjects();
    } catch (err) {
      setError('Error deleting project: ' + err.message);
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
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setError(''); }}>
          {showForm ? 'Cancel' : '+ New Project'}
        </button>
      </div>

      {error && (
        <div className="error-banner">{error}</div>
      )}

      {showForm && (
        <div className="table-container" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>New Project</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Project Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="my-app"
                  required
                />
              </div>
              <div className="form-group">
                <label>Repository URL *</label>
                <input
                  value={form.repo_url}
                  onChange={(e) => setForm({ ...form, repo_url: e.target.value })}
                  placeholder="https://github.com/user/repo"
                  required
                />
              </div>
              <div className="form-group">
                <label>Branch</label>
                <input
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  placeholder="main"
                />
              </div>
              <div className="form-group">
                <label>Health Check URL</label>
                <input
                  value={form.health_check_url}
                  onChange={(e) => setForm({ ...form, health_check_url: e.target.value })}
                  placeholder="http://localhost:5000/health"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Project'}
            </button>
          </form>
        </div>
      )}

      <div className="table-container">
        <h3>All Projects ({projects.length})</h3>
        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📁</div>
            <p>No projects registered yet. Click "+ New Project" to get started.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Repository</th>
                <th>Branch</th>
                <th>Health URL</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <a href={p.repo_url} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>{p.repo_url}</a>
                  </td>
                  <td><code style={{ background: 'var(--bg-primary)', padding: '0.15rem 0.4rem', borderRadius: 4, fontSize: '0.8rem' }}>{p.branch}</code></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{p.health_check_url || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      onClick={() => handleDelete(p.id, p.name)}
                    >
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


  