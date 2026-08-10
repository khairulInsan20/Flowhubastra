import axios from "axios";

const api = axios.create({
  baseURL: "https://flowhubastra.vercel.app/api",
});

/*
 * Normalisasi response list.
 *
 * Backend bisa mengembalikan:
 *   [...]
 *
 * atau:
 *   { data: [...] }
 *
 * atau:
 *   { trips: [...] }
 *
 * atau:
 *   { profiles: [...] }
 *
 * Fungsi ini memastikan frontend selalu menerima ARRAY
 * untuk endpoint yang memang berupa daftar.
 */
const asArray = (response) => {
  const data = response.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.trips)) {
    return data.trips;
  }

  if (Array.isArray(data?.profiles)) {
    return data.profiles;
  }

  if (Array.isArray(data?.notifications)) {
    return data.notifications;
  }

  if (Array.isArray(data?.submissions)) {
    return data.submissions;
  }

  return [];
};

/*
 * Dashboard tetap dikembalikan sebagai OBJECT,
 * karena Dashboard membutuhkan:
 *
 * data.summary
 * data.trips
 */
export const getDashboard = () =>
  api.get("/dashboard").then((response) => response.data);

/*
 * Semua halaman yang menggunakan getTrips()
 * sekarang selalu menerima ARRAY.
 */
export const getTrips = () =>
  api.get("/trips").then(asArray);

/*
 * PIC Profiles selalu ARRAY.
 */
export const getPicProfiles = () =>
  api.get("/profiles/pics").then(asArray);

export const createSchedule = (payload) =>
  api
    .post(
      "/trips/schedule",
      payload.data,
      {
        params: payload.params,
      }
    )
    .then((response) => response.data);

export const setAllocation = (tripId, payload) =>
  api
    .patch(`/trips/${tripId}/allocation`, payload)
    .then((response) => response.data);

export const getNotifications = (profileId) =>
  api
    .get("/notifications", {
      params: {
        profile_id: profileId,
      },
    })
    .then(asArray);

export const getRabSubmissions = () =>
  api.get("/rab-submissions").then(asArray);

export const actionRabSubmission = (id, payload) =>
  api
    .post(
      `/rab-submissions/${id}/action`,
      payload
    )
    .then((response) => response.data);

export const resubmitRabSubmission = (id) =>
  api
    .post(`/rab-submissions/${id}/resubmit`)
    .then((response) => response.data);

export const completeRabRealization = (id) =>
  api
    .post(
      `/rab-submissions/${id}/realization-complete`
    )
    .then((response) => response.data);

export const actionRabRealization = (id, payload) =>
  api
    .post(
      `/rab-submissions/${id}/realization-action`,
      payload
    )
    .then((response) => response.data);

export const createTrip = (payload) =>
  api
    .post("/trips", payload)
    .then((response) => response.data);

export const submitTrip = (
  tripId,
  profileId = ""
) =>
  api
    .post(
      `/trips/${tripId}/submit`,
      null,
      {
        params: {
          actor_role: "PIC Accounting",
          pic_profile_id: profileId,
        },
      }
    )
    .then((response) => response.data);

export const getRecommendations = (payload) =>
  api
    .post("/recommendations", payload)
    .then((response) => response.data);

export const addAttachment = (tripId, payload) =>
  api
    .post(
      `/trips/${tripId}/attachments`,
      payload
    )
    .then((response) => response.data);

export const reviewTrip = (tripId, payload) =>
  api
    .post(
      `/trips/${tripId}/approval`,
      payload
    )
    .then((response) => response.data);

export const confirmBooking = (tripId, payload) =>
  api
    .post(
      `/trips/${tripId}/booking`,
      payload
    )
    .then((response) => response.data);

export const submitRealization = (
  tripId,
  payload
) =>
  api
    .post(
      `/trips/${tripId}/realization`,
      payload
    )
    .then((response) => response.data);
