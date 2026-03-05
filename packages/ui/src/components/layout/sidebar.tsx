'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Brain,
  Box,
  Database,
  Settings,
  Activity,
  Zap,
  Radio,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/training', label: 'Training Jobs', icon: Brain },
  { href: '/models', label: 'Models', icon: Box },
  { href: '/datasets', label: 'Datasets', icon: Database },
  { href: '/live', label: 'Live Agent', icon: Radio },
];

const bottomItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={20} color="white" />
        </div>
        <h1>ATP AI Training</h1>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">Main</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}

        <div style={{ flex: 1 }} />

        <div className="nav-section">System</div>
        {bottomItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname === item.href ? 'active' : ''}`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Connection indicator */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        color: 'var(--text-muted)',
      }}>
        <Activity size={14} />
        <span>v0.1.0</span>
      </div>
    </aside>
  );
}
