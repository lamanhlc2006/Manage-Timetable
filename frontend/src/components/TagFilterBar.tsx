import React from 'react';
import { Tag, Space, Typography, Tooltip } from 'antd';
import { TagsOutlined, CloseOutlined } from '@ant-design/icons';
import { TagItem } from '../services/tagService';
import { useTranslation } from 'react-i18next';

interface TagFilterBarProps {
  tagsList: TagItem[];
  activeTags: string[];
  onToggleTag: (tagName: string) => void;
  onClearAll: () => void;
}

export const TagFilterBar: React.FC<TagFilterBarProps> = ({
  tagsList,
  activeTags,
  onToggleTag,
  onClearAll,
}) => {
  const { t } = useTranslation();

  if (tagsList.length === 0) return null;

  return (
    <div
      style={{
        marginBottom: '12px',
        padding: '8px 12px',
        background: '#fafafa',
        borderRadius: '8px',
        border: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
      }}
    >
      <Typography.Text
        type="secondary"
        style={{ fontSize: 12, fontWeight: 500, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <TagsOutlined /> {t('calendar.filterByTag', 'Lọc theo tag')}:
      </Typography.Text>

      <Space size={[4, 4]} wrap>
        {tagsList.map((tag) => {
          const isActive = activeTags.includes(tag.name);
          return (
            <Tag
              key={tag._id}
              color={isActive ? tag.color : undefined}
              style={{
                cursor: 'pointer',
                borderRadius: '12px',
                fontSize: '12px',
                padding: '1px 10px',
                userSelect: 'none',
                transition: 'all 0.2s',
                opacity: activeTags.length > 0 && !isActive ? 0.45 : 1,
                border: isActive ? `1px solid ${tag.color}` : '1px solid #d9d9d9',
                fontWeight: isActive ? 600 : 400,
              }}
              onClick={() => onToggleTag(tag.name)}
            >
              {isActive && '✓ '}{tag.name}
            </Tag>
          );
        })}
      </Space>

      {activeTags.length > 0 && (
        <Tooltip title={t('calendar.clearTagFilter', 'Bỏ lọc tag')}>
          <Tag
            style={{
              cursor: 'pointer',
              borderRadius: '12px',
              fontSize: '11px',
              padding: '1px 8px',
              borderStyle: 'dashed',
            }}
            onClick={onClearAll}
          >
            <CloseOutlined style={{ fontSize: 10 }} /> {t('calendar.clearAll', 'Xóa')}
          </Tag>
        </Tooltip>
      )}
    </div>
  );
};
