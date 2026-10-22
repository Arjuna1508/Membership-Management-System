
function DashboardHeader({
  activePage,
  searchQuery,
  onSearchChange,
  onAddMember,
  canAddMember,
}) {
  const pageInfo = {
    Overview: {
      title: 'Good morning, Admin.',
      description: "Here's what's happening in your community.",
    },
    Members: {
      title: 'Members',
      description: 'View and manage your community members.',
    },
    'Teams & SIGs': {
      title: 'Teams & SIGs',
      description: 'Explore the teams across your community.',
    },
  }

  const currentPage = pageInfo[activePage] ?? pageInfo.Overview

  return (
    <header className="dashboard-header">
      <div className="page-heading">
        <p className="eyebrow">ACM NITK / {activePage.toUpperCase()}</p>
        <h2>{currentPage.title}</h2>
        <p className="page-description">{currentPage.description}</p>
      </div>

      <div className="header-actions">
        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label="Search members"
          />
          <kbd>/</kbd>
        </label>

        {canAddMember && (
          <button className="primary-button" onClick={onAddMember}>
            <span>+</span> Add member
          </button>
        )}
      </div>
    </header>
  )
}

export default DashboardHeader
