import { useState, useEffect } from 'react';
import api from '../api/client';

function Deployments() {
  const [deployments, setDeployments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');

  const fetchData = async () => {
    try {
      const [d, p] = await Promise.all([api.getDeployments(), api.getProjects()]);
      setDeployments(d);
      setProjects(p);
    } catch (err) {
      console.error('Failed to load deployments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDeploy = async () => {
    if (!selectedProject) {
      alert('Please select a project first.');
      return;
    }
    try {
      await api.createDeployment({ project_id: selectedProject, trigger: 'manual' });
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) {
    return <div className="empty-state"><div className="icon">⏳</div><p>Loading deployments...</p></div>;
  }

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  return (
    <div>
      <div className="page-header">
        <h2>Deployments</h2>
        <p>Track and trigger deployments across your projects</p>
      </div>

      <div className="table-container" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <label>Select Project</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
              }}
            >
              <option value="">— Choose a project —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleDeploy}>
            🚀 Deploy Now
          </button>
        </div>
      </div>

      <div className="table-container">
        <h3>Deployment History</h3>
        {deployments.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🚀</div>
            <p>No deployments yet. Select a project and hit Deploy.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Version</th>
                <th>Status</th>
                <th>Trigger</th>
                <th>Commit</th>
                <th>Image</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {deployments.map((d) => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600 }}>{projectMap[d.project_id] || d.project_id}</td>
                  <td>v{d.version}</td>
                  <td><span className={`badge ${d.status}`}>{d.status}</span></td>
                  <td>{d.trigger}</td>
                  <td>{d.commit_sha ? d.commit_sha.slice(0, 8) : '—'}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{d.image_tag || '—'}</td>
                  <td>{new Date(d.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Deployments;
