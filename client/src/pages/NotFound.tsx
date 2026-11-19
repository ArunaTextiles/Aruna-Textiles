import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="page"><div className="wrap" style={{ textAlign: 'center', padding: '120px 0' }}>
      <span className="kicker">404</span>
      <h1 className="h-xl">This thread is lost.</h1>
      <p className="lead" style={{ margin: '18px auto' }}>The page you’re looking for isn’t in our collection.</p>
      <Link className="btn" to="/">Back home</Link>
    </div></div>
  )
}
