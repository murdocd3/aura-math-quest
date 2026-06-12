import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Rich telemetry production logging
    console.error(
      `%c 🚨 [AURA TELEMETRY ERR] ERROR CAPTURED AT ${new Date().toISOString()} 🚨 `,
      'background: #f43f5e; color: #fff; font-weight: bold; font-size: 12px; padding: 4px; border-radius: 4px;'
    );
    console.error('Message:', error.message);
    console.error('Stack Trace:', error.stack);
    console.error('Component Stack:', errorInfo.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetState = () => {
    if (window.confirm('Atenção: Isso irá limpar o progresso salvo localmente e deslogar sua conta para corrigir corrupções críticas. Deseja continuar?')) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'radial-gradient(circle at 50% 50%, #111827 0%, #030712 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: "'Outfit', sans-serif",
          color: '#f3f4f6',
          boxSizing: 'border-box'
        }}>
          <div className="cyber-card" style={{
            maxWidth: '600px',
            width: '100%',
            borderColor: 'var(--neon-pink)',
            boxShadow: '0 0 30px rgba(244, 63, 94, 0.25)',
            padding: '36px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            boxSizing: 'border-box'
          }}>
            <div style={{
              fontSize: '4.5rem',
              animation: 'pulse-ring 1s infinite alternate',
              filter: 'drop-shadow(0 0 10px var(--neon-pink))'
            }}>
              🚨
            </div>

            <h1 className="text-glow-pink" style={{
              color: 'var(--neon-pink)',
              fontSize: '2rem',
              fontWeight: 800,
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Desvio na Matriz de Dados!
            </h1>

            <p style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '1.05rem', lineHeight: '1.6rem', margin: 0 }}>
              Ocorreu uma instabilidade no processamento matemático do sistema. Não se preocupe, a segurança do portal e seus dados foram preservados!
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '10px' }}>
              <button 
                className="cyber-btn cyber-btn-cyan" 
                onClick={this.handleReload}
                style={{ padding: '12px 24px', fontSize: '0.95rem', minWidth: '180px' }}
              >
                🔄 Restaurar Portal
              </button>
              <button 
                className="cyber-btn cyber-btn-pink" 
                onClick={this.handleResetState}
                style={{ padding: '12px 24px', fontSize: '0.95rem', minWidth: '180px' }}
              >
                ⚠️ Resetar Matriz
              </button>
            </div>

            <div style={{ textAlign: 'left', marginTop: '10px' }}>
              <button
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0
                }}
              >
                {this.state.showDetails ? 'Ocultar Relatório de Erro ▲' : 'Exibir Relatório de Erro ▼'}
              </button>

              {this.state.showDetails && (
                <div style={{
                  marginTop: '12px',
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1.5px solid rgba(244, 63, 94, 0.3)',
                  borderRadius: '8px',
                  padding: '16px',
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: '0.75rem',
                  color: '#f43f5e',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)'
                }}>
                  <strong>Erro:</strong> {this.state.error?.message || 'Nenhum detalhe extra disponível'}<br/><br/>
                  <strong>Pilha:</strong> {this.state.error?.stack || 'Sem rastreamento'}<br/><br/>
                  <strong>Estrutura:</strong> {this.state.errorInfo?.componentStack || 'Sem pilha de componentes'}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
