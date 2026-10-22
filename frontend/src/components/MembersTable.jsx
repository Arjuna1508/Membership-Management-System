
function MembersTable({ members, onSelectMember }) {
  return (
    <div className="table-wrapper">
      <table className="members-table">
        <thead>
          <tr>
            <th>MEMBER</th>
            <th>DESIGNATION</th>
            <th>DEPARTMENT</th>
            <th>TEAM</th>
            <th>DATE JOINED</th>
            <th>STATUS</th>
            <th />
          </tr>
        </thead>

        <tbody>
          {members.map((member) => (
            <tr
              key={member.id}
              className="clickable-row"
              onClick={() => onSelectMember(member)}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onSelectMember(member)
                }
              }}
              aria-label={`View details for ${member.name}`}
            >
              <td>
                <div className="member-cell">
                  <div className="member-avatar">
                    {member.initials ?? member.name?.split(/\s+/).map((part) => part[0]).join('').toUpperCase() ?? '?'}
                  </div>

                  <div className="member-details">
                    <strong>{member.name}</strong>
                    <span>{member.email}</span>
                  </div>
                </div>
              </td>

              <td>{member.designation || '—'}</td>

              <td>
                <div className="department-cell">
                  <strong>{member.department}</strong>
                  <span>{member.year}</span>
                </div>
              </td>

              <td>{member.team}</td>
              <td>{member.dateJoined || '—'}</td>

              <td>
                <span
                  className={`status-badge ${(member.status ?? member.membership_status ?? 'Active').toLowerCase()}`}
                >
                  <span className="status-dot" />
                  {member.status ?? member.membership_status ?? 'Active'}
                </span>
              </td>

              <td className="row-menu">
                <span aria-hidden="true">···</span>
              </td>
            </tr>
          ))}

          {members.length === 0 && (
              <tr key="empty-state">
              <td colSpan={7} className="empty-state">
                <strong>No members found</strong>
                <span>Try changing your search or filters, or select Clear all.</span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default MembersTable
