
const API_URL = "http://localhost:8000";

// Read the JWT saved after login.
function getAuthHeaders() {
  const token = localStorage.getItem("access_token");

  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

// Normalize backend data so every frontend component gets consistent fields.
function normalizeMember(member) {
  return {
    ...member,
    status: member.membership_status ?? member.status ?? "Active",
    dateJoined: member.date_joined ?? member.dateJoined ?? "",
    initials:
      member.initials ??
      member.name?.split(/\s+/).map((part) => part[0]).join("").toUpperCase() ??
      "?",
  };
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : `Request failed (${response.status})`
    );
  }

  return data;
}

export async function getMembers() {
  const data = await apiRequest("/members");
  return data.map(normalizeMember);
}

export async function createMember(member) {
  return normalizeMember(
    await apiRequest("/members", {
      method: "POST",
      body: JSON.stringify(member),
    })
  );
}

export async function updateMember(id, updates) {
  return normalizeMember(
    await apiRequest(`/members/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    })
  );
}

export async function deleteMember(id) {
  return apiRequest(`/members/${id}`, {
    method: "DELETE",
  });
}

export async function getDashboardStats() {
  return apiRequest("/dashboard/stats");
}

// SIG directory
export async function getTeams() {
  return apiRequest("/teams");
}

export async function createTeam(team) {
  return apiRequest("/teams", {
    method: "POST",
    body: JSON.stringify(team),
  });
}

export async function updateTeam(id, updates) {
  return apiRequest(`/teams/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteTeam(id) {
  return apiRequest(`/teams/${id}`, {
    method: "DELETE",
  });
}

// Member-to-SIG assignments
export async function getMemberships() {
  return apiRequest("/memberships");
}

export async function createMembership(assignment) {
  return apiRequest("/memberships", {
    method: "POST",
    body: JSON.stringify(assignment),
  });
}

export async function updateMembership(id, updates) {
  return apiRequest(`/memberships/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteMembership(id) {
  return apiRequest(`/memberships/${id}`, {
    method: "DELETE",
  });
}
