import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div>
      <header className="header">
        <div className="container header-content">
          <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>
            <h1>🏢 物业公共收益公示系统</h1>
          </Link>
          <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
            透明化 · 规范化 · 可追溯
          </div>
        </div>
      </header>
      <main className="main">
        <div className="container">
          {children}
        </div>
      </main>
      <footer className="footer">
        <div className="container">
          © 2024 物业公共收益公示系统 | 保障业主知情权，维护公共利益
        </div>
      </footer>
    </div>
  );
}
