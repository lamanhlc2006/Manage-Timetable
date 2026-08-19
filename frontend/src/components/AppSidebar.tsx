import React from 'react';
import { Layout, Menu } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

const { Sider } = Layout;

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  menuItems: any[];
  activeKeys: string[];
  theme: 'light' | 'dark';
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  collapsed,
  onToggle,
  menuItems,
  activeKeys,
  theme,
}) => {
  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      theme={theme}
      width={200}
      collapsedWidth={80}
      style={{
        position: 'fixed',
        top: '64px',
        left: 0,
        height: 'calc(100vh - 64px)',
        boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)',
        zIndex: 900,
        borderRight: theme === 'dark' ? '1px solid #303030' : '1px solid #f0f0f0',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Collapse Toggle Button */}
      <button
        type="button"
        onClick={onToggle}
        aria-label="Toggle Sidebar"
        style={{
          position: 'absolute',
          right: -12, bottom: 24, zIndex: 950,
          width: 24, height: 24, minWidth: 24, minHeight: 24,
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          border: theme === 'dark' ? '1px solid #434343' : '1px solid #d9d9d9',
          background: theme === 'dark' ? '#1f1f1f' : '#ffffff',
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.85)' : '#595959',
          cursor: 'pointer', padding: 0, margin: 0, outline: 'none', lineHeight: 1,
          transition: 'all 0.2s ease',
        }}
      >
        {collapsed ? (
          <RightOutlined style={{ fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
        ) : (
          <LeftOutlined style={{ fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
        )}
      </button>
      <Menu
        mode="inline"
        theme={theme}
        selectedKeys={activeKeys}
        items={menuItems}
        style={{ borderRight: 0, marginTop: '12px', flex: 1 }}
      />
    </Sider>
  );
};
