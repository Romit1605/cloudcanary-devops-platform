/**
 * API client for CloudCanary backend.
 */

const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Request failed: ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  // Health
  getHealth: () => fetch('/health').then((r) => r.json()),

  // Projects
  getProjects: () => request('/projects/'),
  getProject: (id) => request(`/projects/${id}`),
  createProject: (data) => request('/projects/', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id, data) => request(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),

  // Deployments
  getDeployments: (projectId) => {
    const query = projectId ? `?project_id=${projectId}` : '';
    return request(`/deployments/${query}`);
  },
  getDeployment: (id) => request(`/deployments/${id}`),
  createDeployment: (data) => request('/deployments/', { method: 'POST', body: JSON.stringify(data) }),
};

export default api;
