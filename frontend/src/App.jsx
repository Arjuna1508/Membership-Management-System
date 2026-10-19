import { useEffect, useMemo, useState } from 'react'
import Sidebar from './components/sidebar'
import DashboardHeader from './components/DashboardHeader'
import StatCard from './components/Statcard'
import MembersTable from './components/MembersTable'
import { stats, members } from './data/mockData'
import './App.css'
import MemberDetails from './components/MemberDetails'

function App() {
  const [activePage, setActivePage] = useState('Overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)
  const [teamFilter, setTeamFilter] = useState('')
  const [designationFilter, setDesignationFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [currentPage, setCurrentPage] = useState(1)
  const membersPerPage = 3

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) {
      return members
    }

    return members.filter((member) =>
      [
        member.name,
        member.email,
        member.department,
        member.year,
        member.team,
        member.designation,
        member.status,
      ].some((value) => String(value ?? '').toLowerCase().includes(query))
    )
  }, [searchQuery])

  const filterOptions = useMemo(() => {
    const valuesFor = (field) =>
      [...new Set(members.map((member) => member[field]).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b)
      )

    return {
      teams: valuesFor('team'),
      designations: valuesFor('designation'),
      departments: valuesFor('department'),
      years: valuesFor('year'),
      statuses: valuesFor('status'),
    }
  }, [])

  const directoryMembers = useMemo(() => {
    const matchesFilters = filteredMembers.filter((member) =>
      (!teamFilter || member.team === teamFilter) &&
      (!designationFilter || member.designation === designationFilter) &&
      (!departmentFilter || member.department === departmentFilter) &&
      (!yearFilter || member.year === yearFilter) &&
      (!statusFilter || member.status === statusFilter)
    )

    const getYearNumber = (year) => {
      const yearNumber = Number.parseInt(String(year ?? '').match(/\d+/)?.[0], 10)
      return Number.isNaN(yearNumber) ? null : yearNumber
    }
    const compareMissingLast = (left, right, compareValues) => {
      const leftMissing = left === null || left === undefined || left === ''
      const rightMissing = right === null || right === undefined || right === ''

      if (leftMissing || rightMissing) {
        return leftMissing === rightMissing ? 0 : leftMissing ? 1 : -1
      }

      return compareValues(left, right)
    }

    return [...matchesFilters].sort((a, b) => {
      let comparison = 0

      if (sortBy === 'year') {
        comparison = compareMissingLast(
          getYearNumber(a.year),
          getYearNumber(b.year),
          (left, right) => left - right
        )
      } else if (sortBy === 'dateJoined') {
        const joinedTime = (value) => {
          if (!value) return null
          const time = Date.parse(value)
          return Number.isNaN(time) ? null : time
        }

        comparison = compareMissingLast(
          joinedTime(a.dateJoined),
          joinedTime(b.dateJoined),
          (left, right) => right - left
        )
      } else {
        comparison = compareMissingLast(
          a.name,
          b.name,
          (left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' })
        )
      }

      return comparison || a.id - b.id
    })
  }, [filteredMembers, teamFilter, designationFilter, departmentFilter, yearFilter, statusFilter, sortBy])

  const totalPages = Math.ceil(directoryMembers.length / membersPerPage)
  const pageCount = Math.max(totalPages, 1)
  const validPage = Math.min(currentPage, pageCount)
  const pageMembers = directoryMembers.slice(
    (validPage - 1) * membersPerPage,
    validPage * membersPerPage
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, teamFilter, designationFilter, departmentFilter, yearFilter, statusFilter, sortBy])

  useEffect(() => {
    if (currentPage !== validPage) {
      setCurrentPage(validPage)
    }
  }, [currentPage, validPage])

  function clearMemberControls() {
    setSearchQuery('')
    setTeamFilter('')
    setDesignationFilter('')
    setDepartmentFilter('')
    setYearFilter('')
    setStatusFilter('')
    setSortBy('name')
    setCurrentPage(1)
  }

  function handleAddMember() {
    window.alert('The Add Member form will be implemented next.')
  }

  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
      />

      <main className="main-content">
        <DashboardHeader
          activePage={activePage}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAddMember={handleAddMember}
        />

        {activePage === 'Overview' && (
          <>
            <section className="stats-grid">
              {stats.map((stat, index) => (
                <StatCard
                  key={stat.label}
                  stat={stat}
                  index={index}
                />
              ))}
            </section>

            <section className="content-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">YOUR COMMUNITY</p>
                  <h3>Recent members</h3>
                  <p className="panel-description">
                    A quick look at the latest member records.
                  </p>
                </div>

                <button
                  className="secondary-button"
                  onClick={() => setActivePage('Members')}
                >
                  View all members <span>↗</span>
                </button>
              </div>

              <MembersTable
                members={filteredMembers.slice(0, 5)}
                onSelectMember={setSelectedMember}
              />
            </section>
          </>
        )}

        {activePage === 'Members' && (
          <section className="content-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">DIRECTORY</p>
                <h3>All members</h3>
                <p className="panel-description">
                  {directoryMembers.length} member{directoryMembers.length !== 1 ? 's' : ''} found.
                </p>
              </div>
              <button className="secondary-button clear-filters-button" onClick={clearMemberControls}>
                Clear all
              </button>
            </div>

            <div className="member-controls" aria-label="Member filters and sorting">
              <label className="filter-control">
                <span>Team</span>
                <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
                  <option value="">All teams</option>
                  {filterOptions.teams.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label className="filter-control">
                <span>Designation</span>
                <select value={designationFilter} onChange={(event) => setDesignationFilter(event.target.value)}>
                  <option value="">All designations</option>
                  {filterOptions.designations.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label className="filter-control">
                <span>Department</span>
                <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
                  <option value="">All departments</option>
                  {filterOptions.departments.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label className="filter-control">
                <span>Year</span>
                <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
                  <option value="">All years</option>
                  {filterOptions.years.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label className="filter-control">
                <span>Status</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="">All statuses</option>
                  {filterOptions.statuses.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label className="filter-control sort-control">
                <span>Sort by</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="name">Name (A–Z)</option>
                  <option value="year">Year (earliest first)</option>
                  <option value="dateJoined">Date joined (newest first)</option>
                </select>
              </label>
            </div>

            <MembersTable
              members={pageMembers}
              onSelectMember={setSelectedMember}
            />

            {directoryMembers.length > 0 && (
              <div className="pagination-controls" aria-label="Member pages">
                <span>Page {validPage} of {totalPages}</span>
                <div>
                  <button className="secondary-button" onClick={() => setCurrentPage(validPage - 1)} disabled={validPage === 1}>
                    Previous
                  </button>
                  <button className="secondary-button" onClick={() => setCurrentPage(validPage + 1)} disabled={validPage === totalPages}>
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {activePage === 'Teams & SIGs' && (
          <section className="content-panel teams-placeholder">
            <div className="teams-icon">⌘</div>
            <h3>Teams & SIGs</h3>
            <p>
              The teams directory will appear here once we build
              the teams section.
            </p>
          </section>
        )}

        <footer className="app-footer">
          <span>MemberHub · ACM NITK</span>
          <span>Membership management</span>
        </footer>
          </main>


            <MemberDetails
              member={selectedMember}
              onClose={() => setSelectedMember(null)}
            />
    </div>
  )
}

export default App
