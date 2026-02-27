import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Add JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password });
export const register = (name, email, password) => api.post('/auth/register', { name, email, password });
export const getMe = () => api.get('/auth/me');
export const getProfile = () => api.get('/auth/profile');
export const updateProfile = (data) => api.put('/auth/profile', data);
export const updatePassword = (data) => api.put('/auth/password', data);

// Communities
export const getCommunities = () => api.get('/communities');
export const createCommunity = (data) => api.post('/communities', data);
export const joinCommunity = (inviteCode) => api.post('/communities/join', { inviteCode });
export const getCommunity = (id) => api.get(`/communities/${id}`);
export const updateCommunity = (id, data) => api.put(`/communities/${id}`, data);
export const deleteCommunity = (id) => api.delete(`/communities/${id}`);
export const regenerateInviteCode = (id) => api.post(`/communities/${id}/regenerate-code`);
export const leaveCommunity = (id) => api.post(`/communities/${id}/leave`);

// Community Members
export const getPendingMembers = (communityId) => api.get(`/communities/${communityId}/members/pending`);
export const acceptMember = (communityId, userId) => api.post(`/communities/${communityId}/members/${userId}/accept`);
export const rejectMember = (communityId, userId) => api.post(`/communities/${communityId}/members/${userId}/reject`);
export const updateMemberRole = (communityId, userId, role) => api.put(`/communities/${communityId}/members/${userId}/role`, { role });
export const removeMember = (communityId, userId) => api.delete(`/communities/${communityId}/members/${userId}`);

// Potlucks
export const getPotlucks = (communityId) => api.get(`/communities/${communityId}/potlucks`);
export const createPotluck = (communityId, data) => api.post(`/communities/${communityId}/potlucks`, data);
export const getPotluck = (communityId, id) => api.get(`/communities/${communityId}/potlucks/${id}`);
export const updatePotluck = (communityId, id, data) => api.put(`/communities/${communityId}/potlucks/${id}`, data);
export const deletePotluck = (communityId, id) => api.delete(`/communities/${communityId}/potlucks/${id}`);
export const createPotluckSignup = (communityId, potluckId, data) => api.post(`/communities/${communityId}/potlucks/${potluckId}/signups`, data);
export const updatePotluckSignup = (communityId, potluckId, signupId, data) => api.put(`/communities/${communityId}/potlucks/${potluckId}/signups/${signupId}`, data);
export const deletePotluckSignup = (communityId, potluckId, signupId) => api.delete(`/communities/${communityId}/potlucks/${potluckId}/signups/${signupId}`);

// Suggestions
export const getSuggestions = (communityId) => api.get(`/communities/${communityId}/suggestions`);
export const createSuggestion = (communityId, data) => api.post(`/communities/${communityId}/suggestions`, data);
export const updateSuggestion = (communityId, id, data) => api.put(`/communities/${communityId}/suggestions/${id}`, data);
export const deleteSuggestion = (communityId, id) => api.delete(`/communities/${communityId}/suggestions/${id}`);
export const updateSuggestionStatus = (communityId, id, status) => api.put(`/communities/${communityId}/suggestions/${id}/status`, { status });
export const toggleUpvote = (communityId, id) => api.post(`/communities/${communityId}/suggestions/${id}/upvote`);

// Board Questions
export const getQuestions = (communityId) => api.get(`/communities/${communityId}/questions`);
export const createQuestion = (communityId, data) => api.post(`/communities/${communityId}/questions`, data);
export const getQuestion = (communityId, id) => api.get(`/communities/${communityId}/questions/${id}`);
export const createQuestionResponse = (communityId, questionId, data) => api.post(`/communities/${communityId}/questions/${questionId}/responses`, data);
export const updateQuestionVisibility = (communityId, id, isPublic) => api.put(`/communities/${communityId}/questions/${id}/visibility`, { is_public: isPublic });

// Calendar
export const getCalendarEvents = (communityId, month) => api.get(`/communities/${communityId}/calendar`, { params: { month } });
export const createCalendarEvent = (communityId, data) => api.post(`/communities/${communityId}/calendar`, data);
export const updateCalendarEvent = (communityId, id, data) => api.put(`/communities/${communityId}/calendar/${id}`, data);
export const deleteCalendarEvent = (communityId, id) => api.delete(`/communities/${communityId}/calendar/${id}`);

// Polls
export const getPolls = (communityId) => api.get(`/communities/${communityId}/polls`);
export const createPoll = (communityId, data) => api.post(`/communities/${communityId}/polls`, data);
export const getPoll = (communityId, id) => api.get(`/communities/${communityId}/polls/${id}`);
export const updatePoll = (communityId, id, data) => api.put(`/communities/${communityId}/polls/${id}`, data);
export const deletePoll = (communityId, id) => api.delete(`/communities/${communityId}/polls/${id}`);
export const castVote = (communityId, pollId, optionIds) => api.post(`/communities/${communityId}/polls/${pollId}/vote`, { optionIds });
export const getPollResults = (communityId, pollId) => api.get(`/communities/${communityId}/polls/${pollId}/results`);

export default api;
