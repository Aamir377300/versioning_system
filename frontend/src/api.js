import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/';

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Public instance — no auth header (for login, register)
const publicApi = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const login = async (username, password) => {
    const { data } = await publicApi.post('token/', { username, password });
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    return data;
};

export const registerUser = async (username, password, role) => {
    const { data } = await publicApi.post('register/', { username, password, role });
    return data;
};

export const fetchDocuments = async () => {
    const { data } = await api.get('documents/');
    return data;
};

export const fetchDocument = async (id) => {
    const { data } = await api.get(`documents/${id}/`);
    return data;
};

export const createDocument = async (title, content, changeNotes) => {
    const { data } = await api.post(`documents/`, {
        title,
        content,
        change_notes: changeNotes
    });
    return data;
};

export const updateDocument = async (id, title, content, changeNotes) => {
    const { data } = await api.put(`documents/${id}/`, {
        title,
        content,
        change_notes: changeNotes
    });
    return data;
};

export const deleteDocument = async (id) => {
    const { data } = await api.delete(`documents/${id}/`);
    return data;
};

export const rollbackDocument = async (id, versionId) => {
    const { data } = await api.post(`documents/${id}/rollback/`, {
        version_id: versionId
    });
    return data;
};

export const compareVersions = async (docId, v1, v2) => {
    const { data } = await api.get(`documents/${docId}/compare/?v1=${v1}&v2=${v2}`);
    return data.diff;
};

export const fetchUsers = async () => {
    const { data } = await api.get('users/');
    return data;
};

export const shareDocument = async (docId, username, role) => {
    const { data } = await api.post(`documents/${docId}/share/`, { username, role });
    return data;
};

export const unshareDocument = async (docId, username) => {
    const { data } = await api.post(`documents/${docId}/unshare/`, { username });
    return data;
};

export const fetchDocumentAccess = async (docId) => {
    const { data } = await api.get(`documents/${docId}/access/`);
    return data;
};

export default api;
