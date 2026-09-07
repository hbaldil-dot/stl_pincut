import React from 'react';

/**
 * Top-level application Error Boundary.
 * Catches any uncaught runtime/rendering errors and presents a recovery interface
 * instead of a blank black screen.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[STL PinCut 3D] Uncaught Application Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Could not clear storage:', e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#030712',
          color: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            backgroundColor: '#111827',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                fontSize: '22px'
              }}>
                ⚠️
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>
                  Uygulama Başlatılırken Bir Sorun Oluştu
                </h2>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                  STL PinCut 3D kurtarma ekranı
                </span>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#d1d5db', lineHeight: '1.6', marginBottom: '16px' }}>
              Tarayıcınızın WebGL desteği veya eski bir önbellek kaydı uygulamanın açılmasını engellemiş olabilir.
            </p>

            {this.state.error && (
              <div style={{
                backgroundColor: '#030712',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                border: '1px solid #374151',
                fontSize: '11px',
                color: '#f87171',
                fontFamily: 'monospace',
                overflowX: 'auto',
                maxHeight: '140px'
              }}>
                {this.state.error.toString()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Sayfayı Yenile
              </button>
              <button
                type="button"
                onClick={this.handleResetAndReload}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#374151',
                  color: '#e5e7eb',
                  border: '1px solid #4b5563',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Önbelleği Temizle & Yeniden Başlat
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
