
import { useCallback, useEffect, useState } from 'react'
import {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  getMembers,
  getMemberships,
  createMembership,
  deleteMembership,
} from '../api'

const emptyTeam = { name: '', description: '', lead: '' }

export default function SigDirectory() {
  const [teams, setTeams] = useState([])
  const [members, setMembers] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editingTeam, setEditingTeam] = useState(null)
  const [teamForm, setTeamForm] = useState(emptyTeam)
  const [showTeamForm, setShowTeamForm] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState('')
  const [memberId, setMemberId] = useState('')
  const [designation, setDesignation] = useState('')
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [teamData, memberData, assignmentData] = await Promise.all([
        getTeams(),
        getMembers(),
        getMemberships(),
      ])
      setTeams(teamData)
      setMembers(memberData)
      setAssignments(assignmentData)
    } catch (err) {
      setError(err.message || 'Could not load SIG information.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  function openCreateForm() {
    setEditingTeam(null)
    setTeamForm(emptyTeam)
    setShowTeamForm(true)
    setError('')
    setNotice('')
  }

  function openEditForm(team) {
    setEditingTeam(team)
    setTeamForm({
      name: team.name,
      description: team.description || '',
      lead: team.lead || '',
    })
    setShowTeamForm(true)
    setError('')
    setNotice('')
  }

  async function handleSaveTeam(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    try {
      const payload = {
        name: teamForm.name.trim(),
        description: teamForm.description.trim() || null,
        lead: teamForm.lead.trim() || null,
      }

      if (!payload.name) throw new Error('SIG name is required.')

      if (editingTeam) {
        await updateTeam(editingTeam.id, payload)
        setNotice('SIG updated successfully.')
      } else {
        await createTeam(payload)
        setNotice('SIG created successfully.')
      }

      setShowTeamForm(false)
      await loadData()
    } catch (err) {
      setError(err.message || 'Could not save SIG.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTeam(team) {
    if (
      !window.confirm(
        `Delete ${team.name}? Its member assignments may also be deleted.`
      )
    ) return

    setError('')
    setNotice('')
    try {
      await deleteTeam(team.id)
      if (String(selectedTeam) === String(team.id)) setSelectedTeam('')
      setNotice(`${team.name} deleted.`)
      await loadData()
    } catch (err) {
      setError(err.message || 'Could not delete SIG.')
    }
  }

  async function handleAssign(event) {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!memberId || !selectedTeam) {
      setError('Select both a member and a SIG.')
      return
    }

    const alreadyAssigned = assignments.some(
      (item) =>
        String(item.member_id) === String(memberId) &&
        String(item.team_id) === String(selectedTeam)
    )

    if (alreadyAssigned) {
      setError('This member is already assigned to that SIG.')
      return
    }

    setSaving(true)
    try {
      await createMembership({
        member_id: Number(memberId),
        team_id: Number(selectedTeam),
        designation: designation.trim() || null,
        start_date: startDate || null,
      })

      setMemberId('')
      setDesignation('')
      setNotice('Member assigned to SIG successfully.')
      await loadData()
    } catch (err) {
      setError(err.message || 'Could not assign member.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveAssignment(assignment) {
    if (
      !window.confirm(
        `Remove ${assignment.member_name} from ${assignment.team_name}?`
      )
    ) return

    setError('')
    setNotice('')
    try {
      await deleteMembership(assignment.id)
      setNotice('SIG membership removed.')
      await loadData()
    } catch (err) {
      setError(err.message || 'Could not remove assignment.')
    }
  }

  const visibleAssignments = assignments.filter(
    (item) =>
      !selectedTeam || String(item.team_id) === String(selectedTeam)
  )

  return (
    <div className="sig-page">
      <section className="content-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">ORGANIZATION</p>
            <h3>Teams &amp; SIGs</h3>
            <p className="panel-description">
              Manage special interest groups and their members.
            </p>
          </div>
          <button className="primary-button" onClick={openCreateForm}>
            + Add SIG
          </button>
        </div>

        {error && <p className="sig-message sig-error" role="alert">{error}</p>}
        {notice && <p className="sig-message sig-success" role="status">{notice}</p>}

        {loading ? (
          <p className="sig-feedback">Loading SIGs...</p>
        ) : teams.length === 0 ? (
          <div className="sig-feedback">
            <h3>No SIGs found</h3>
            <p>Add a SIG to get started.</p>
          </div>
        ) : (
          <div className="sig-grid">
            {teams.map((team) => {
              const teamAssignments = assignments.filter(
                (item) => item.team_id === team.id
              )

              return (
                <article className="sig-card" key={team.id}>
                  <div className="sig-card-top">
                    <div className="teams-icon">⌘</div>
                    <span className="sig-count">
                      {teamAssignments.length} member
                      {teamAssignments.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <h3>{team.name}</h3>
                  <p className="sig-description">
                    {team.description || 'No description provided.'}
                  </p>
                  <p className="sig-lead">
                    Lead: <strong>{team.lead || 'Not specified'}</strong>
                  </p>

                  <div className="sig-card-actions">
                    <button
                      className="secondary-button"
                      onClick={() => setSelectedTeam(String(team.id))}
                    >
                      View members
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => openEditForm(team)}
                    >
                      Edit
                    </button>
                    <button
                      className="secondary-button sig-delete"
                      onClick={() => handleDeleteTeam(team)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {showTeamForm && (
        <section className="content-panel sig-form-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">SIG DETAILS</p>
              <h3>{editingTeam ? 'Edit SIG' : 'Create SIG'}</h3>
            </div>
            <button
              className="secondary-button"
              onClick={() => setShowTeamForm(false)}
            >
              Cancel
            </button>
          </div>

          <form className="sig-form" onSubmit={handleSaveTeam}>
            <label>
              SIG name *
              <input
                required
                maxLength={100}
                value={teamForm.name}
                onChange={(e) =>
                  setTeamForm({ ...teamForm, name: e.target.value })
                }
              />
            </label>
            <label>
              Description
              <input
                value={teamForm.description}
                onChange={(e) =>
                  setTeamForm({ ...teamForm, description: e.target.value })
                }
              />
            </label>
            <label>
              SIG lead
              <input
                value={teamForm.lead}
                onChange={(e) =>
                  setTeamForm({ ...teamForm, lead: e.target.value })
                }
              />
            </label>
            <button className="primary-button" disabled={saving}>
              {saving ? 'Saving...' : 'Save SIG'}
            </button>
          </form>
        </section>
      )}

      <section className="content-panel sig-form-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">MEMBERSHIP</p>
            <h3>Assign a member to a SIG</h3>
            <p className="panel-description">
              A member can belong to multiple SIGs, with a separate designation
              for each assignment.
            </p>
          </div>
        </div>

        <form className="sig-form" onSubmit={handleAssign}>
          <label>
            Member *
            <select
              required
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
            >
              <option value="">Select member</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} — {member.email}
                </option>
              ))}
            </select>
          </label>

          <label>
            SIG *
            <select
              required
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
            >
              <option value="">Select SIG</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Designation in this SIG
            <input
              placeholder="e.g. Coordinator"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
            />
          </label>

          <label>
            Start date
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>

          <button
            className="primary-button"
            disabled={saving || !members.length || !teams.length}
          >
            {saving ? 'Saving...' : 'Assign member'}
          </button>
        </form>
      </section>

      <section className="content-panel sig-form-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">DIRECTORY</p>
            <h3>SIG memberships</h3>
            <p className="panel-description">
              {visibleAssignments.length} assignment
              {visibleAssignments.length !== 1 ? 's' : ''}
            </p>
          </div>
          <label className="sig-filter">
            Filter by SIG
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
            >
              <option value="">All SIGs</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="table-wrapper">
          <table className="members-table">
            <thead>
              <tr>
                <th>MEMBER</th>
                <th>SIG</th>
                <th>DESIGNATION</th>
                <th>START DATE</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {visibleAssignments.map((item) => (
                <tr key={item.id}>
                  <td>{item.member_name}</td>
                  <td>{item.team_name}</td>
                  <td>{item.designation || 'Member'}</td>
                  <td>{item.start_date || '—'}</td>
                  <td>
                    <button
                      className="secondary-button"
                      onClick={() => handleRemoveAssignment(item)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {visibleAssignments.length === 0 && (
                <tr>
                  <td colSpan="5" className="empty-state">
                    <strong>No memberships found</strong>
                    <span>Assign a member to a SIG above.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
