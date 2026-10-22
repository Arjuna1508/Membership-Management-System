
import { useEffect, useMemo, useState } from 'react'
import Sidebar from './components/sidebar'
import DashboardHeader from './components/DashboardHeader'
import StatCard from './components/Statcard'
import MembersTable from './components/MembersTable'
import SigDirectory from './components/SigDirectory'
import {
  createMember,
  getMembers,
  updateMember,
  deleteMember,
  getDashboardStats,
} from './api'
import './App.css'
import MemberDetails from './components/MemberDetails'

const API_URL = 'http://localhost:8000'

function Dashboard({ user }) {
  const [activePage, setActivePage] = useState('Overview')
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dashboardStats, setDashboardStats] = useState(null)
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
  const isAdmin = user.role === 'admin'
  const visiblePage =
    !isAdmin && activePage === 'Teams & SIGs'
      ? 'Overview'
      : activePage

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

  useEffect(() => {
    async function loadDashboardStats() {
      try {
        const data = await getDashboardStats()
        setDashboardStats(data)
      } catch (err) {
        console.error('Failed to load dashboard stats:', err)
      }
    }

    loadDashboardStats()
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
      ].some((value) =>
        String(value ?? '').toLowerCase().includes(query)
      )
    )
  }, [members, searchQuery])

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
    const matchesFilters = filteredMembers.filter(
      (member) =>
        (!teamFilter || member.team === teamFilter) &&
        (!designationFilter || member.designation === designationFilter) &&
        (!departmentFilter || member.department === departmentFilter) &&
        (!yearFilter || String(member.year) === yearFilter) &&
        (!statusFilter || member.status === statusFilter)
    )

    const getYearNumber = (year) => {
      const yearNumber = Number.parseInt(
        String(year ?? '').match(/\d+/)?.[0],
        10
      )
      return Number.isNaN(yearNumber) ? null : yearNumber
    }

    const compareMissingLast = (left, right, compareValues) => {
      const leftMissing =
        left === null || left === undefined || left === ''
      const rightMissing =
        right === null || right === undefined || right === ''

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
          (left, right) =>
            left.localeCompare(right, undefined, {
              sensitivity: 'base',
            })
        )
      }

      return comparison || a.id - b.id
    })
  }, [
    filteredMembers,
    teamFilter,
    designationFilter,
    departmentFilter,
    yearFilter,
    statusFilter,
    sortBy,
  ])

  const totalPages = Math.ceil(
    directoryMembers.length / membersPerPage
  )
  const pageCount = Math.max(totalPages, 1)
  const validPage = Math.min(currentPage, pageCount)
  const pageMembers = directoryMembers.slice(
    (validPage - 1) * membersPerPage,
    validPage * membersPerPage
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [
    searchQuery,
    teamFilter,
    designationFilter,
    departmentFilter,
    yearFilter,
    statusFilter,
    sortBy,
  ])

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
    if (!isAdmin) throw new Error('Admin access required.')

    const updatedMember = await updateMember(id, updates)

    setMembers((previous) =>
      previous.map((member) =>
        member.id === id ? updatedMember : member
      )
    )

    setSelectedMember(updatedMember)
  }

  async function handleDeleteMember(id) {
    if (!isAdmin) throw new Error('Admin access required.')

    await deleteMember(id)

    setMembers((previous) =>
      previous.filter((member) => member.id !== id)
    )

    setSelectedMember(null)
  }

  function handleAddMember() {
    if (!isAdmin) return

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

    if (
      !newMember.name.trim() ||
      !newMember.email.trim() ||
      !newMember.department.trim() ||
      !newMember.year
    ) {
      setFormError(
        'Please fill in name, email, department, and year.'
      )
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
        activePage={visiblePage}
        user={user}
        onNavigate={setActivePage}
      />

      <main className="main-content">
        <DashboardHeader
          activePage={visiblePage}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAddMember={handleAddMember}
          canAddMember={isAdmin}
        />

        {error && (
          <div role="alert" className="form-error">
            Could not load members: {error}
          </div>
        )}

        {loading && <p>Loading members...</p>}

        {visiblePage === 'Overview' && (
          <>
            <section className="stats-grid">
              {dashboardStats &&
                [
                  {
                    label: 'Total Members',
                    value: dashboardStats.total_members,
                  },
                  {
                    label: 'Active Members',
                    value: dashboardStats.active_members,
                  },
                  {
                    label: 'Inactive Members',
                    value: dashboardStats.inactive_members,
                  },
                  {
                    label: 'Teams & SIGs',
                    value: dashboardStats.total_teams,
                  },
                ]
                  .filter((stat) => isAdmin || stat.label !== 'Teams & SIGs')
                  .map((stat, index) => (
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

        {visiblePage === 'Members' && (
          <section className="content-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">DIRECTORY</p>
                <h3>All members</h3>
                <p className="panel-description">
                  {directoryMembers.length} member
                  {directoryMembers.length !== 1 ? 's' : ''} found.
                </p>
              </div>

              <button
                className="secondary-button clear-filters-button"
                onClick={clearMemberControls}
              >
                Clear all
              </button>
            </div>

            <div
              className="member-controls"
              aria-label="Member filters and sorting"
            >
              <label className="filter-control">
                <span>Team</span>
                <select
                  value={teamFilter}
                  onChange={(event) =>
                    setTeamFilter(event.target.value)
                  }
                >
                  <option value="">All teams</option>
                  {filterOptions.teams.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-control">
                <span>Designation</span>
                <select
                  value={designationFilter}
                  onChange={(event) =>
                    setDesignationFilter(event.target.value)
                  }
                >
                  <option value="">All designations</option>
                  {filterOptions.designations.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-control">
                <span>Department</span>
                <select
                  value={departmentFilter}
                  onChange={(event) =>
                    setDepartmentFilter(event.target.value)
                  }
                >
                  <option value="">All departments</option>
                  {filterOptions.departments.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-control">
                <span>Year</span>
                <select
                  value={yearFilter}
                  onChange={(event) =>
                    setYearFilter(event.target.value)
                  }
                >
                  <option value="">All years</option>
                  {filterOptions.years.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-control">
                <span>Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                >
                  <option value="">All statuses</option>
                  {filterOptions.statuses.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-control sort-control">
                <span>Sort by</span>
                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value)
                  }
                >
                  <option value="name">Name (A–Z)</option>
                  <option value="year">
                    Year (earliest first)
                  </option>
                  <option value="dateJoined">
                    Date joined (newest first)
                  </option>
                </select>
              </label>
            </div>

            <MembersTable
              members={pageMembers}
              onSelectMember={setSelectedMember}
            />

            {directoryMembers.length > 0 && (
              <div
                className="pagination-controls"
                aria-label="Member pages"
              >
                <span>
                  Page {validPage} of {totalPages}
                </span>

                <div>
                  <button
                    className="secondary-button"
                    onClick={() =>
                      setCurrentPage(validPage - 1)
                    }
                    disabled={validPage === 1}
                  >
                    Previous
                  </button>

                  <button
                    className="secondary-button"
                    onClick={() =>
                      setCurrentPage(validPage + 1)
                    }
                    disabled={validPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {isAdmin && visiblePage === 'Teams & SIGs' && <SigDirectory />}

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

              <form
                onSubmit={handleSubmitMember}
                className="add-member-form"
              >
                <label>
                  Full name *
                  <input
                    required
                    value={newMember.name}
                    onChange={(event) =>
                      setNewMember({
                        ...newMember,
                        name: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Email *
                  <input
                    required
                    type="email"
                    value={newMember.email}
                    onChange={(event) =>
                      setNewMember({
                        ...newMember,
                        email: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Department *
                  <input
                    required
                    placeholder="e.g. EEE"
                    value={newMember.department}
                    onChange={(event) =>
                      setNewMember({
                        ...newMember,
                        department: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Year *
                  <select
                    required
                    value={newMember.year}
                    onChange={(event) =>
                      setNewMember({
                        ...newMember,
                        year: event.target.value,
                      })
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
                    onChange={(event) =>
                      setNewMember({
                        ...newMember,
                        designation: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Team
                  <input
                    value={newMember.team}
                    onChange={(event) =>
                      setNewMember({
                        ...newMember,
                        team: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Date joined
                  <input
                    type="date"
                    value={newMember.date_joined}
                    onChange={(event) =>
                      setNewMember({
                        ...newMember,
                        date_joined: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Membership status
                  <select
                    value={newMember.membership_status}
                    onChange={(event) =>
                      setNewMember({
                        ...newMember,
                        membership_status: event.target.value,
                      })
                    }
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>

                {formError && (
                  <p role="alert" className="form-error">
                    {formError}
                  </p>
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
        canManage={isAdmin}
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

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem('access_token') || ''
  )
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function checkSession() {
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error(
            'Your session expired. Please log in again.'
          )
        }

        const currentUser = await response.json()

        if (!cancelled) {
          setUser(currentUser)
          setError('')
        }
      } catch (err) {
        localStorage.removeItem('access_token')

        if (!cancelled) {
          setToken('')
          setUser(null)
          setError(
            err.message || 'Please log in again.'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    checkSession()

    return () => {
      cancelled = true
    }
  }, [token])

  async function handleLogin(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const formData = new URLSearchParams()
      formData.set('username', email.trim())
      formData.set('password', password)

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed.')
      }

      localStorage.setItem('access_token', data.access_token)
      setPassword('')
      setToken(data.access_token)
      setLoading(true)
    } catch (err) {
      setError(err.message || 'Unable to log in.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('access_token')
    setToken('')
    setUser(null)
    setPassword('')
    setError('')
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ padding: 40 }}>
        Checking your session...
      </div>
    )
  }

  if (!user) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: '#f5f7fb',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <form
          onSubmit={handleLogin}
          style={{
            width: '100%',
            maxWidth: 380,
            boxSizing: 'border-box',
            padding: 32,
            borderRadius: 16,
            background: '#fff',
            boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          }}
        >
          <h1 style={{ marginTop: 0 }}>MemberHub</h1>
          <p>Sign in to ACM NITK Membership Management</p>

          <label style={{ display: 'block', marginTop: 24 }}>
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              style={{
                display: 'block',
                boxSizing: 'border-box',
                width: '100%',
                padding: 12,
                marginTop: 8,
              }}
            />
          </label>

          <label style={{ display: 'block', marginTop: 16 }}>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              style={{
                display: 'block',
                boxSizing: 'border-box',
                width: '100%',
                padding: 12,
                marginTop: 8,
              }}
            />
          </label>

          {error && (
            <p role="alert" style={{ color: '#b91c1c' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: 12,
              marginTop: 24,
              border: 0,
              borderRadius: 8,
              background: '#1d4ed8',
              color: '#fff',
              cursor: submitting ? 'wait' : 'pointer',
            }}
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </main>
    )
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 12,
          padding: '10px 24px',
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <span>
          {user.name} ({user.role})
        </span>

        <button type="button" onClick={handleLogout}>
          Log out
        </button>
      </div>

      <Dashboard user={user} />
    </div>
  )
}

export default App
