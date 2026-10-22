import { useEffect, useMemo, useState } from 'react'
import Sidebar from './components/sidebar'
import DashboardHeader from './components/DashboardHeader'
import StatCard from './components/Statcard'
import MembersTable from './components/MembersTable'
import { stats } from './data/mockData'
import { createMember, getMembers, updateMember,deleteMember} from './api'
import './App.css'
import MemberDetails from './components/MemberDetails'

function App() {
  const [activePage, setActivePage] = useState('Overview')
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)
  const [teamFilter, setTeamFilter] = useState('')
  const [designationFilter, setDesignationFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    department: '',
    year: '',
    designation: '',
    team: '',
    date_joined: new Date().toISOString().slice(0, 10),
    membership_status: 'Active',
  })
  const [formError, setFormError] = useState('')
  const [savingMember, setSavingMember] = useState(false)
  const membersPerPage = 3
  
  useEffect(() => {
  async function loadMembers() {
    try {
      const data = await getMembers()
      setMembers(data)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  loadMembers()
  }, [])
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
  }, [members,searchQuery])

  const filterOptions = useMemo(() => {
    const valuesFor = (field) =>
    [...new Set(members.map((member) => member[field]).filter(Boolean))]
    .map(String)
    .sort((a, b) => a.localeCompare(b))
    return {
      teams: valuesFor('team'),
      designations: valuesFor('designation'),
      departments: valuesFor('department'),
      years: valuesFor('year'),
      statuses: valuesFor('status'),
    }
  }, [members])

  const directoryMembers = useMemo(() => {
    const matchesFilters = filteredMembers.filter((member) =>
      (!teamFilter || member.team === teamFilter) &&
      (!designationFilter || member.designation === designationFilter) &&
      (!departmentFilter || member.department === departmentFilter) &&
      (!yearFilter || String(member.year) === yearFilter) &&
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
  
  async function handleSaveMember(id, updates) {
    const updatedMember = await updateMember(id, updates)

    setMembers((previous) =>
      previous.map((member) =>
        member.id === id ? updatedMember : member
      )
    )

    setSelectedMember(updatedMember)
  }

  async function handleDeleteMember(id) {
    await deleteMember(id)

    setMembers((previous) =>
      previous.filter((member) => member.id !== id)
    )

    setSelectedMember(null)
  }

  function handleAddMember() {
    setFormError('')
    setNewMember({
    name: '',
    email: '',
    department: '',
    year: '',
    designation: '',
    team: '',
    date_joined: new Date().toISOString().slice(0, 10),
    membership_status: 'Active',
  })
  setShowAddMember(true)
  }
  
  
  async function handleSubmitMember(event) {
    event.preventDefault()
    setFormError('')

    if (!newMember.name.trim() || !newMember.email.trim() ||
        !newMember.department.trim() || !newMember.year) {
      setFormError('Please fill in name, email, department, and year.')
      return
    }

    setSavingMember(true)

    try {
      const createdMember = await createMember({
        ...newMember,
        name: newMember.name.trim(),
        email: newMember.email.trim(),
        department: newMember.department.trim(),
        year: Number(newMember.year),
        designation: newMember.designation.trim() || null,
        team: newMember.team.trim() || null,
      })

      setMembers((previous) => [createdMember, ...previous])
      setShowAddMember(false)
      setSelectedMember(null)
      setActivePage('Members')
      setCurrentPage(1)
      setNewMember({
        name: '',
        email: '',
        department: '',
        year: '',
        designation: '',
        team: '',
        date_joined: new Date().toISOString().slice(0, 10),
        membership_status: 'Active',
      })
    } catch (err) {
      setFormError(err.message || 'Could not create member.')
    } finally {
      setSavingMember(false)
    }
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

        
{showAddMember && (
  <div className="member-modal-backdrop">
    <section
      className="member-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-member-title"
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">MEMBERSHIP</p>
          <h3 id="add-member-title">Add member</h3>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setShowAddMember(false)}
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmitMember} className="add-member-form">
        <label>
          Full name *
          <input
            required
            value={newMember.name}
            onChange={(e) =>
              setNewMember({ ...newMember, name: e.target.value })
            }
          />
        </label>

        <label>
          Email *
          <input
            required
            type="email"
            value={newMember.email}
            onChange={(e) =>
              setNewMember({ ...newMember, email: e.target.value })
            }
          />
        </label>

        <label>
          Department *
          <input
            required
            placeholder="e.g. EEE"
            value={newMember.department}
            onChange={(e) =>
              setNewMember({ ...newMember, department: e.target.value })
            }
          />
        </label>

        <label>
          Year *
          <select
            required
            value={newMember.year}
            onChange={(e) =>
              setNewMember({ ...newMember, year: e.target.value })
            }
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
            value={newMember.designation}
            onChange={(e) =>
              setNewMember({ ...newMember, designation: e.target.value })
            }
          />
        </label>

        <label>
          Team
          <input
            value={newMember.team}
            onChange={(e) =>
              setNewMember({ ...newMember, team: e.target.value })
            }
          />
        </label>

        <label>
          Date joined
          <input
            type="date"
            value={newMember.date_joined}
            onChange={(e) =>
              setNewMember({ ...newMember, date_joined: e.target.value })
            }
          />
        </label>

        <label>
          Membership status
          <select
            value={newMember.membership_status}
            onChange={(e) =>
              setNewMember({
                ...newMember,
                membership_status: e.target.value,
              })
            }
          >
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Inactive">Inactive</option>
          </select>
        </label>

        {formError && (
          <p role="alert" className="form-error">{formError}</p>
        )}

        <button
          type="submit"
          className="primary-button"
          disabled={savingMember}
        >
          {savingMember ? 'Saving...' : 'Save member'}
        </button>
      </form>
    </section>
  </div>
)}


        <footer className="app-footer">
          <span>MemberHub · ACM NITK</span>
          <span>Membership management</span>
        </footer>
          </main>
        <MemberDetails
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onSave={(updates) => {
            if (!selectedMember) return Promise.resolve()
            return handleSaveMember(selectedMember.id, updates)
          }}
          onDelete={handleDeleteMember}
        />

    </div>
  )
}

export default App
