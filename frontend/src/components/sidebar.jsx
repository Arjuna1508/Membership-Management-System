
const navigation = [
  { label: 'Overview', symbol: '◫' },
  { label: 'Members', symbol: '♙' },
  { label: 'Teams & SIGs', symbol: '⌘' },
]

function Sidebar({ activePage, onNavigate, user }) {
  const visibleNavigation = navigation.filter(
    (item) => user?.role === 'admin' || item.label !== 'Teams & SIGs'
  )

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">m.</div>
        <div>
          <h1>MemberHub</h1>
          <p>ACM NITK</p>
        </div>
      </div>

      <p className="nav-label">WORKSPACE</p>

      <nav className="navigation">
        {visibleNavigation.map((item) => (
          <button
            key={item.label}
            className={`nav-item ${
              activePage === item.label ? 'active' : ''
            }`}
            onClick={() => onNavigate(item.label)}
          >
            <span className="nav-symbol">{item.symbol}</span>
            <span>{item.label}</span>
            {activePage === item.label && (
              <span className="active-indicator" />
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="workspace-note">
          <span className="status-dot" />
          <div>
            <strong>ACM Workspace</strong>
            <p>Membership portal</p>
          </div>
        </div>

        <div className="profile">
          <div className="profile-avatar">AD</div>
          <div className="profile-info">
            <strong>{user?.name || 'User'}</strong>
            <p>{user?.role === 'admin' ? 'Administrator' : 'Member'}</p>
          </div>
          <span className="profile-menu">···</span>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
