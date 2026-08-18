// api.js
//
// Every function that will eventually call your friend's Django REST
// Framework backend lives here — and ONLY here. Components never call
// fetch() directly; they call these functions instead.
//
// Right now everything is mocked with local data, so the frontend
// works standalone. When the backend is ready, we only need to change
// the *inside* of these functions — every component using them stays
// the same.

import { mockSchedule } from '../utils/mockData.js'

const BASE_URL = '/api' // placeholder for the future Django endpoint

export async function getSchedule() {
  // Later: return fetch(`${BASE_URL}/schedule/`).then(r => r.json())
  return Promise.resolve(mockSchedule)
}

export async function saveSchedule(schedule) {
  // Later: POST schedule to Django.
  console.log('[mock api] saveSchedule called with', schedule)
  return Promise.resolve({ ok: true })
}

export async function updateSchedule(schedule) {
  // Later: PUT/PATCH to Django.
  console.log('[mock api] updateSchedule called with', schedule)
  return Promise.resolve({ ok: true })
}

export async function completeTask(taskId) {
  // Later: POST to Django, e.g. /api/tasks/:id/complete/
  console.log('[mock api] completeTask called for', taskId)
  return Promise.resolve({ ok: true, taskId })
}
