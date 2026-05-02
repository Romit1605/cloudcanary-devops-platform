import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const STATUS_COLORS = {
  PENDING: 'badge-PENDING',
  DEPLOYING: 'badge-DEPLOYING',
  SUCCESS: 'badge-SUCCESS',
  FAILED: 'badge-FAILED',
  ROLLED_BACK: 'badge-ROLLED_BACK',
};

function LogsPanel({ deploymentId, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getDeploymentLogs(deploymentId)
      .then(setLogs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [deploymentId]);

  return (
    <tr>
      <td colSpan={8} style={{ padding: 0 }}>
        <div className="logs-panel">
          <div className="logs-panel-header">
            <span>Deployment Logs</span>
            <button className="logs-close-btn" onClick={onClose}>✕ Close</button>
          </div>
          {loading && <p className="logs-empty">Loading logs…</p>}
          {error && <p className="logs-empty" style={{ color: 'var(--red)' }}>{error}</p>}
          {!loading && !error && logs.length === 0 && (
            <p className="logs-empty">No logs recorded for this deployment.</p>
          )}
          {logs.map((log) => (
            <div key={log.id} className="log-line">
              <span className="log-time">{new Date(log.created_at).toLocaleTimeString()}</span>
              <span className="log-msg">{log.message}</span>
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
}

function Deployments() {
  const [deployments, setDeployments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [d, p] = await Promise.all([
        api.getDeployments(filterProject || undefined),
        api.getProjects(),
      ]);
      setDeployments(d);
      setProjects(p);
    } catch (err) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [filterProject]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeploy = async () => {
    if (!selectedProject) {
      setError('Please select a project to deploy.');
      return;
    }
    setDeploying(true);
    setError('');
    try {
      await api.createDeployment({ project_id: selectedProject });
      await fetchData();
    } catch (err) {
      setError('Deploy error: ' + err.message);
    } finally {
      setDeploying(false);
    }
  };

  const handleRollback = async (deploymentId) => {
    if (!window.confirm('Trigger a rollback for this deployment?')) return;
    setError('');
    try {
      await api.rollbackDeployment(deploymentId);
      await fetchData();
    } catch (err) {
      setError('Rollback error: ' + err.message);
    }
  };

  const toggleLogs = (id) => {
    setExpandedLogs((prev) => (prev === id ? null : id));
  };

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  if (loading) {
    return <div className="empty-state"><div className="icon">⏳</div><p>Loading deployments…</p></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Deployments</h2>
        <p>Track and trigger deployments across your projects</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Deploy Controls */}
      <div className="table-container" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
            <label>Select Project to Deploy</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="select-input"
            >
              <option value="">— Choose a project —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleDeploy} disabled={deploying}>
            {deploying ? '⏳ Deploying…' : '🚀 Deploy Now'}
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Filter by project:</span>
        <select
          value={filterProject}
          onChange={(e) => { setFilterProject(e.target.value); setExpandedLogs(null); }}
          className="select-input"
          style={{ width: 200 }}
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Deployment History Table */}
      <div className="table-container">
        <h3>Deployment History ({deployments.length})</h3>
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
                <th>Status</th>
                <th>Commit</th>
                <th>Image</th>
                <th>Started</th>
                <th>Finished</th>
                <th>Rollback Reason</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deployments.map((d) => (
                <>
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600 }}>{projectMap[d.project_id] || d.project_id.slice(0, 8)}</td>
                    <td><span className={`badge ${STATUS_COLORS[d.status] || 'badge-PENDING'}`}>{d.status}</span></td>
                    <td><code style={{ fontSize: '0.8rem' }}>{d.commit_hash ? d.commit_hash.slice(0, 8) : '—'}</code></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{d.image_tag || '—'}</td>
                    <td style={{ fontSize: '0.8rem' }}>{new Date(d.started_at).toLocaleString()}</td>
                    <td style={{ fontSize: '0.8rem' }}>{d.finished_at ? new Date(d.finished_at).toLocaleString() : '—'}</td>
                    <td style={{ color: 'var(--orange)', fontSize: '0.8rem' }}>{d.rollback_reason || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                          onClick={() => toggleLogs(d.id)}
                        >
                          {expandedLogs === d.id ? 'Hide Logs' : 'Logs'}
                        </button>
                        {(d.status === 'SUCCESS' || d.status === 'FAILED' || d.status === 'DEPLOYING') && (
                          <button
                            className="btn btn-danger"
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                            onClick={() => handleRollback(d.id)}
                          >
                            Rollback
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedLogs === d.id && (
                    <LogsPanel
                      key={`logs-${d.id}`}
                      deploymentId={d.id}
                      onClose={() => setExpandedLogs(null)}
                    />
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Deployments;

