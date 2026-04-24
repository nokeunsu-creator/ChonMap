import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { FamilyProvider } from './state/FamilyContext';
import './index.css';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ChonMap 앱 오류:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#FFF5E1', fontFamily: 'sans-serif', padding: 20, textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#127795;</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#3D2B1F', marginBottom: 8 }}>
            앱에 오류가 발생했습니다
          </h1>
          <p style={{ fontSize: 14, color: '#8B7355', marginBottom: 20 }}>
            데이터는 안전하게 저장되어 있습니다.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'linear-gradient(135deg, #8B6914, #C4961A)',
              color: 'white', border: 'none', borderRadius: 12,
              padding: '12px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <FamilyProvider>
        <App />
      </FamilyProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
