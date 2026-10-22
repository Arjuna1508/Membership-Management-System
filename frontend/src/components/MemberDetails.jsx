import { useEffect, useState } from 'react'

function MemberDetails({ member, onClose, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name ?? '',
        email: member.email ?? '',
        department: member.department ?? '',
        year: String(member.year ?? ''),
        designation: member.designation ?? '',
        date_joined: member.date_joined ?? member.dateJoined ?? '',
        membership_status:
          member.membership_status ?? member.status ?? 'Active',
      })
      setEditing(false)
      setError('')
    }
  }, [member])

  if (!member) return null

  function changeField(event) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    })
  }

  async function handleSave(event) {
    event.preventDefault()
    setError('')

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.department.trim() ||
      !formData.year
    ) {
      setError('Name, email, department, and year are required.')
      return
    }

    setSaving(true)

    try {
      await onSave({
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim(),
        department: formData.department.trim(),
        year: Number(formData.year),
        designation: formData.designation.trim() || null,
      })
      setEditing(false)
    } catch (err) {
      setError(err.message || 'Could not update member.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete ${member.name}? This cannot be undone.`
    )
    if (!confirmed) return

    setError('')
    setSaving(true)

    try {
      await onDelete(member.id)
    } catch (err) {
      setError(err.message || 'Could not delete member.')
    } finally {
      setSaving(false)
    }
  }

  const sigs = member.sigs ?? []

  return (
    <div className="detail-overlay" onClick={onClose}>
      <section
        className="detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="detail-close"
          onClick={onClose}
          aria-label="Close member details"
        >
          ×
        </button>

        <div className="detail-avatar">
          {member.initials ||
            member.name
              ?.split(/\s+/)
              .map((part) => part[0])
              .join('')
              .slice(0, 2)}
        </div>

        <p className="eyebrow">MEMBER PROFILE</p>
        <h2 id="member-detail-title">{member.name}</h2>
        <p className="detail-email">{member.email}</p>

        <span
          className={`status-badge ${(
            member.status ||
            member.membership_status ||
            'Active'
          ).toLowerCase()}`}
        >
          <span className="status-dot" />
          {member.status || member.membership_status || 'Active'}
        </span>

        <div className="detail-divider" />

        {editing ? (
          <form className="add-member-form" onSubmit={handleSave}>
            <h3>Edit member</h3>

            <label>
              Full name *
              <input
                name="name"
                required
                value={formData.name || ''}
                onChange={changeField}
              />
            </label>

            <label>
              Email *
              <input
                name="email"
                type="email"
                required
                value={formData.email || ''}
                onChange={changeField}
              />
            </label>

            <label>
              Department *
              <input
                name="department"
                required
                value={formData.department || ''}
                onChange={changeField}
              />
            </label>

            <label>
              Year *
              <select
                name="year"
                required
                value={formData.year || ''}
                onChange={changeField}
              >
                <option value="">Select year</option>
                <option value="1">1st year</option>
                <option value="2">2nd year</option>
                <option value="3">3rd year</option>
                <option value="4">4th year</option>
              </select>
            </label>

            <label>
              Designation
              <input
                name="designation"
                value={formData.designation || ''}
                onChange={changeField}
              />
            </label>

            <label>
              Date joined
              <input
                name="date_joined"
                type="date"
                value={formData.date_joined || ''}
                onChange={changeField}
              />
            </label>

            <label>
              Membership status
              <select
                name="membership_status"
                value={formData.membership_status || 'Active'}
                onChange={changeField}
              >
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>

            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}

            <div className="detail-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>

              <button
                type="button"
                className="secondary-button"
                disabled={saving}
                onClick={() => {
                  setEditing(false)
                  setError('')
                }}
              >
                Cancel edit
              </button>
            </div>
          </form>
        ) : (
          <>
            <h3>Personal information</h3>

            <div className="detail-field">
              <span>Designation</span>
              <strong>{member.designation || '—'}</strong>
            </div>

            <div className="detail-field">
              <span>Department</span>
              <strong>{member.department || '—'}</strong>
            </div>

            <div className="detail-field">
              <span>Academic year</span>
              <strong>{member.year ?? '—'}</strong>
            </div>

            <div className="detail-field">
              <span>Email address</span>
              <strong>{member.email}</strong>
            </div>

            <div className="detail-field">
              <span>Date joined</span>
              <strong>
                {member.dateJoined || member.date_joined || '—'}
              </strong>
            </div>

            <div className="detail-divider" />

            <h3>SIG memberships</h3>

            {sigs.length > 0 ? (
              <div className="sig-membership-list">
                {sigs.map((sig) => (
                  <div
                    className="team-membership"
                    key={sig.membership_id}
                  >
                    <span className="team-membership-icon">⌘</span>

                    <div>
                      <strong>{sig.name}</strong>
                      <p>
                        {sig.designation || 'Member'}
                        {sig.start_date
                          ? ` · Joined ${sig.start_date}`
                          : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="team-membership">
                <span className="team-membership-icon">⌘</span>
                <div>
                  <strong>No SIGs assigned</strong>
                  <p>
                    Assign this member through the Teams &amp; SIGs section.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}

            <div className="detail-actions">
              <button
                className="primary-button"
                disabled={saving}
                onClick={() => setEditing(true)}
              >
                Edit member
              </button>

              <button
                className="secondary-button"
                disabled={saving}
                onClick={handleDelete}
              >
                {saving ? 'Please wait...' : 'Delete member'}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default MemberDetails
