import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('FoodSafe Error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#f7f5f0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          fontFamily: "'DM Sans', sans-serif",
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌿</div>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 20,
            fontWeight: 600,
            color: '#1a3d2b',
            marginBottom: 8,
          }}>
            Something went wrong
          </div>
          <div style={{
            fontSize: 13,
            color: '#888',
            fontWeight: 300,
            marginBottom: 24,
            lineHeight: 1.6,
            maxWidth: 280,
          }}>
            An unexpected error occurred. Your scan history is safe.
          </div>
          {this.props.showError && this.state.error && (
            <div style={{
              fontSize: 10,
              color: '#aaa',
              background: '#fff',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #ece8df',
              marginBottom: 20,
              maxWidth: 320,
              wordBreak: 'break-all',
              textAlign: 'left',
            }}>
              {this.state.error.toString()}
            </div>
          )}
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.href = '/'
            }}
            style={{
              padding: '11px 28px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #1a3d2b, #2d6647)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ← Back to Home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}