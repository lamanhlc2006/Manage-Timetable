import React from 'react';
import {
  CalendarOutlined,
  BarChartOutlined,
  SettingOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';

interface MobileBottomNavProps {
  isAdmin: boolean;
  theme: 'light' | 'dark';
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ isAdmin, theme }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { key: '/dashboard', icon: <CalendarOutlined style={{ fontSize: '19px', marginBottom: '2px' }} />, label: t('nav.timetable') },
    { key: '/analytics', icon: <BarChartOutlined style={{ fontSize: '19px', marginBottom: '2px' }} />, label: t('nav.analytics') },
    ...(isAdmin ? [{ key: '/create-schedule', icon: <PlusCircleOutlined style={{ fontSize: '19px', marginBottom: '2px' }} />, label: t('nav.createSchedule') }] : []),
    { key: '/settings', icon: <SettingOutlined style={{ fontSize: '19px', marginBottom: '2px' }} />, label: t('nav.settings') },
  ];

  return (
    <div
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, width: '100%', height: '62px',
        background: theme === 'dark' ? '#1f1f1f' : '#ffffff',
        borderTop: theme === 'dark' ? '1px solid #303030' : '1px solid #f0f0f0',
        display: 'grid',
        gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
        alignItems: 'center', zIndex: 1000,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.key;
        return (
          <div
            key={tab.key}
            onClick={() => navigate(tab.key)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: '100%', cursor: 'pointer',
              color: isActive ? '#1890ff' : (theme === 'dark' ? '#a0a0a0' : '#8c8c8c'),
              borderTop: isActive ? '2px solid #1890ff' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            {tab.icon}
            <span style={{ fontSize: '11px', fontWeight: isActive ? 600 : 400 }}>{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
};
