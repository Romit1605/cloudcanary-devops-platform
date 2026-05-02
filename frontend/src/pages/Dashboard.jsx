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

  const healthyCount = deployments.filter((d) => d.status === 'healthy').length;
  const failedCount = deployments.filter((d) => ['failed', 'unhealthy'].includes(d.status)).length;
  const rolledBackCount = deployments.filter((d) => d.status === 'rolled_back').length;

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
          <div className="label">Healthy Deploys</div>
          <div className="value green">{healthyCount}</div>
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
                <th>Version</th>
                <th>Status</th>
                <th>Trigger</th>
                <th>Commit</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {deployments.slice(0, 10).map((d) => (
                <tr key={d.id}>
                  <td>v{d.version}</td>
                  <td><span className={`badge ${d.status}`}>{d.status}</span></td>
                  <td>{d.trigger}</td>
                  <td>{d.commit_sha ? d.commit_sha.slice(0, 8) : '—'}</td>
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

export default Dashboard;
