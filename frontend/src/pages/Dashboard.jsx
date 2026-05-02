import { useState, useEffect } from 'react';
import api from '../api/client';

function Dashboard() {
  const [health, setHealth] = useState(null);
  const [projects, setProjects] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [h, p, d] = await Promise.allSettled([
          api.getHealth(),
          api.getProjects(),
          api.getDeployments(),
        ]);
        if (h.status === 'fulfilled') setHealth(h.value);
        if (p.status === 'fulfilled') setProjects(p.value);
        if (d.status === 'fulfilled') setDeployments(d.value);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const successCount = deployments.filter((d) => d.status === 'SUCCESS').length;
  const failedCount = deployments.filter((d) => d.status === 'FAILED').length;
  const rolledBackCount = deployments.filter((d) => d.status === 'ROLLED_BACK').length;

  if (loading) {
    return (
      <div className="empty-state">
        <div className="icon">⏳</div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Overview of your CloudCanary deployment platform</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Backend Status</div>
          <div className={`value ${health?.status === 'healthy' ? 'green' : 'red'}`}>
            {health?.status === 'healthy' ? '● Online' : '● Offline'}
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Total Projects</div>
          <div className="value blue">{projects.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Deployments</div>
          <div className="value blue">{deployments.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Successful Deploys</div>
          <div className="value green">{successCount}</div>
        </div>
        <div className="stat-card">
          <div className="label">Failed Deploys</div>
          <div className="value red">{failedCount}</div>
        </div>
        <div className="stat-card">
          <div className="label">Rollbacks</div>
          <div className="value orange">{rolledBackCount}</div>
        </div>
      </div>

      <div className="table-container">
        <h3>Recent Deployments</h3>
        {deployments.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📦</div>
            <p>No deployments yet. Create a project and trigger your first deploy.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Project ID</th>
                <th>Status</th>
                <th>Commit</th>
                <th>Image</th>
                <th>Started</th>
                <th>Finished</th>
              </tr>
            </thead>
            <tbody>
              {deployments.slice(0, 10).map((d) => (
                <tr key={d.id}>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{d.project_id.slice(0, 8)}…</td>
                  <td><span className={`badge badge-${d.status}`}>{d.status}</span></td>
                  <td>{d.commit_hash ? d.commit_hash.slice(0, 8) : '—'}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{d.image_tag || '—'}</td>
                  <td>{new Date(d.started_at).toLocaleString()}</td>
                  <td>{d.finished_at ? new Date(d.finished_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Dashboard;


 