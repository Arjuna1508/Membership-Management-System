
function MemberDetails({ member, onClose }) {
  if (!member) return null

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
          {member.initials}
        </div>

        <p className="eyebrow">MEMBER PROFILE</p>
        <h2 id="member-detail-title">{member.name}</h2>
        <p className="detail-email">{member.email}</p>

        <span
          className={`status-badge ${member.status.toLowerCase()}`}
        >
          <span className="status-dot" />
          {member.status}
        </span>

        <div className="detail-divider" />

        <h3>Personal information</h3>

        <div className="detail-field">
          <span>Designation</span>
          <strong>{member.designation || '—'}</strong>
        </div>

        <div className="detail-field">
          <span>Department</span>
          <strong>{member.department}</strong>
        </div>

        <div className="detail-field">
          <span>Academic year</span>
          <strong>{member.year}</strong>
        </div>

        <div className="detail-field">
          <span>Email address</span>
          <strong>{member.email}</strong>
        </div>

        <div className="detail-field">
          <span>Date joined</span>
          <strong>{member.dateJoined || '—'}</strong>
        </div>

        <div className="detail-divider" />

        <h3>Team membership</h3>

        <div className="team-membership">
          <span className="team-membership-icon">⌘</span>
          <div>
            <strong>{member.team}</strong>
            <p>Team assignment</p>
          </div>
        </div>

        <p className="detail-note">
          This profile currently displays sample data.
          Editing and membership changes will be connected
          to the backend later.
        </p>
      </section>
    </div>
  )
}

export default MemberDetails
