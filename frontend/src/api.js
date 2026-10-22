
const API_URL = "http://localhost:8000";

export async function getMembers() {
  const response = await fetch(`${API_URL}/members`);

  if (!response.ok) {
    throw new Error("Failed to fetch members");
  }

  const data = await response.json();

  return data.map((member) => ({
    ...member,
    status: member.membership_status,
    dateJoined: member.date_joined,
  }));
}


export async function createMember(member) {
  const response = await fetch("http://localhost:8000/members", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(member),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Failed to create member"
    );
  }

  return {
    ...data,
    status: data.membership_status,
    dateJoined: data.date_joined,
  };
}


export async function updateMember(id, updates) {
  const response = await fetch(`http://localhost:8000/members/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Failed to update member"
    );
  }

  return {
    ...data,
    status: data.membership_status,
    dateJoined: data.date_joined,
  };
}

export async function deleteMember(id) {
  const response = await fetch(`http://localhost:8000/members/${id}`, {
    method: "DELETE",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Failed to delete member"
    );
  }

  return data;
}


