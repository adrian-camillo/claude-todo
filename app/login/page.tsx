import { login } from '@/app/actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <>
      <div className="dot-pattern" />

      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh' }}>
        <header className="app-header">
          <div className="logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" fill="#D97757"/>
              <path d="M11 16.5C11 16.5 13 19 16 19C19 19 21 16.5 21 16.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="13" r="1.5" fill="white"/>
              <circle cx="20" cy="13" r="1.5" fill="white"/>
            </svg>
            <h1>Claude Todo</h1>
          </div>
          <p className="subtitle">Inicia sesión para continuar</p>
        </header>

        <form action={login} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="input-wrapper" style={{ padding: '6px 6px 6px 18px' }}>
            <input
              className="todo-input"
              type="text"
              name="username"
              placeholder="Usuario"
              autoComplete="username"
              required
            />
          </div>

          <div className="input-wrapper" style={{ padding: '6px 6px 6px 18px' }}>
            <input
              className="todo-input"
              type="password"
              name="password"
              placeholder="Contraseña"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p style={{ fontSize: '13px', color: 'var(--claude-danger)', textAlign: 'center', padding: '4px 0' }}>
              Usuario o contraseña incorrectos
            </p>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'var(--claude-terracotta)',
              color: 'white',
              fontSize: '15px',
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'background var(--transition)',
            }}
          >
            Entrar
          </button>
        </form>
      </div>
    </>
  )
}
