
function StatCard({ stat, index }) {
  return (
    <article
      className="stat-card"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="stat-top">
        <span className="stat-label">{stat.label}</span>
        <span className="stat-symbol">{stat.symbol}</span>
      </div>

      <p className="stat-value">{stat.value}</p>
      <p className="stat-change">{stat.change}</p>
    </article>
  )
}

export default StatCard
