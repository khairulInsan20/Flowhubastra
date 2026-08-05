import axios from "axios";

const api = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`,
});

export const getDashboard = () => api.get("/dashboard").then((response) => response.data);
export const getTrips = () => api.get("/trips").then((response) => response.data);
export const createTrip = (payload) => api.post("/trips", payload).then((response) => response.data);
export const submitTrip = (tripId) => api.post(`/trips/${tripId}/submit`, null, { params: { actor_role: "PIC Accounting" } }).then((response) => response.data);
export const getRecommendations = (payload) => api.post("/recommendations", payload).then((response) => response.data);
export const addAttachment = (tripId, payload) => api.post(`/trips/${tripId}/attachments`, payload).then((response) => response.data);
export const reviewTrip = (tripId, payload) => api.post(`/trips/${tripId}/approval`, payload).then((response) => response.data);
export const confirmBooking = (tripId, payload) => api.post(`/trips/${tripId}/booking`, payload).then((response) => response.data);
export const submitRealization = (tripId, payload) => api.post(`/trips/${tripId}/realization`, payload).then((response) => response.data);