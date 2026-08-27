import React, { useState, useRef } from 'react';
import { Popover, Button, Badge, Input, Select, Switch, Tag, Space } from 'antd';
import { FilterOutlined, SearchOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { CategoryItem } from '../services/categoryService';
import { TagItem } from '../services/tagService';
import { useTranslation } from 'react-i18next';

const { Option } = Select;

interface CalendarFilterPopoverProps {
  isAdmin: boolean;
  categoriesList: CategoryItem[];
  tagsList?: TagItem[];
  usersList: { _id: string; username: string }[];
  onFilterChange: (filters: {
    keyword?: string;
    categories?: string[];
    priority?: string[];
    status?: string[];
    tags?: string[];
    startTime?: string;
    endTime?: string;
    creator?: string;
  }) => void;
  currentRange: { start: string; end: string } | null;
  searchInputRef?: React.RefObject<any>;
}

export const CalendarFilterPopover: React.FC<CalendarFilterPopoverProps> = ({
  isAdmin,
  categoriesList,
  tagsList = [],
  usersList,
  onFilterChange,
  currentRange,
  searchInputRef: externalSearchRef,
}) => {
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [priority, setPriority] = useState<string[]>([]);
  const [status, setStatus] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<string | undefined>(undefined);
  const [hideCompleted, setHideCompleted] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const internalSearchRef = useRef<any>(null);
  const searchRef = externalSearchRef || internalSearchRef;

  const activeFilterCount =
    (keyword.trim() ? 1 : 0) +
    (categories.length > 0 ? 1 : 0) +
    (priority.length > 0 ? 1 : 0) +
    (status.length > 0 ? 1 : 0) +
    (selectedTags.length > 0 ? 1 : 0) +
    (selectedCreator ? 1 : 0) +
    (hideCompleted ? 1 : 0);

  const triggerFilterChange = (
    newKeyword: string,
    newCats: string[],
    newPriorities: string[],
    range: typeof currentRange,
    newCreator?: string,
    newStatus?: string[],
    newTags?: string[]
  ) => {
    const effectiveStatus = newStatus ?? status;
    onFilterChange({
      keyword: newKeyword || undefined,
      categories: newCats.length > 0 ? newCats : undefined,
      priority: newPriorities.length > 0 ? newPriorities : undefined,
      status: effectiveStatus.length > 0 ? effectiveStatus : undefined,
      tags: (newTags ?? selectedTags).length > 0 ? (newTags ?? selectedTags) : undefined,
      startTime: range?.start || undefined,
      endTime: range?.end || undefined,
      creator: newCreator !== undefined ? (newCreator || undefined) : selectedCreator,
    });
  };

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKeyword(value);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      triggerFilterChange(value, categories, priority, currentRange);
    }, 500);
  };

  const handleCategoriesChange = (value: string[]) => {
    setCategories(value);
    triggerFilterChange(keyword, value, priority, currentRange);
  };

  const handlePriorityChange = (value: string[]) => {
    setPriority(value);
    triggerFilterChange(keyword, categories, value, currentRange);
  };

  const handleStatusChange = (value: string[]) => {
    setStatus(value);
    setHideCompleted(false);
    triggerFilterChange(keyword, categories, priority, currentRange, undefined, value);
  };

  const handleTagsChange = (value: string[]) => {
    setSelectedTags(value);
    triggerFilterChange(keyword, categories, priority, currentRange, undefined, undefined, value);
  };

  const handleHideCompletedChange = (checked: boolean) => {
    setHideCompleted(checked);
    if (checked) {
      const newStatus = ['pending', 'cancelled'];
      setStatus(newStatus);
      triggerFilterChange(keyword, categories, priority, currentRange, undefined, newStatus);
    } else {
      setStatus([]);
      triggerFilterChange(keyword, categories, priority, currentRange, undefined, []);
    }
  };

  const handleCreatorChange = (value: string | undefined) => {
    setSelectedCreator(value);
    triggerFilterChange(keyword, categories, priority, currentRange, value);
  };

  const handleClearFilters = () => {
    setKeyword('');
    setCategories([]);
    setPriority([]);
    setStatus([]);
    setSelectedTags([]);
    setSelectedCreator(undefined);
    setHideCompleted(false);
    triggerFilterChange('', [], [], currentRange, '', [], []);
  };

  const popoverContent = (
    <div style={{ width: 300, padding: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px', color: '#1f2937' }}>
          <FilterOutlined style={{ color: '#1890ff' }} />
          <span>{t('calendar.filterTitle')}</span>
        </div>
        {activeFilterCount > 0 && (
          <Button
            type="link"
            danger
            size="small"
            onClick={handleClearFilters}
            style={{ padding: 0, fontSize: '12px' }}
          >
            {t('calendar.clearFilters')}
          </Button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: '#595959', marginBottom: '4px' }}>{t('calendar.keyword')}</div>
          <Input
            ref={searchRef}
            placeholder={t('calendar.keywordPlaceholder')}
            value={keyword}
            onChange={handleKeywordChange}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            allowClear
            size="small"
            style={{ borderRadius: '6px' }}
          />
        </div>

        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: '#595959', marginBottom: '4px' }}>{t('calendar.category')}</div>
          <Select
            mode="multiple"
            placeholder={t('calendar.category')}
            value={categories}
            onChange={handleCategoriesChange}
            style={{ width: '100%' }}
            size="small"
            maxTagCount="responsive"
            allowClear
          >
            {categoriesList.map((cat) => (
              <Option key={cat._id} value={cat.name}>
                {cat.icon ? `${cat.icon} ${cat.name}` : cat.name}
              </Option>
            ))}
          </Select>
        </div>

        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: '#595959', marginBottom: '4px' }}>{t('calendar.priority')}</div>
          <Select
            mode="multiple"
            placeholder={t('calendar.priority')}
            value={priority}
            onChange={handlePriorityChange}
            style={{ width: '100%' }}
            size="small"
            maxTagCount="responsive"
            allowClear
          >
            <Option value="low">{t('calendar.priorityLow')}</Option>
            <Option value="medium">{t('calendar.priorityMedium')}</Option>
            <Option value="high">{t('calendar.priorityHigh')}</Option>
          </Select>
        </div>

        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: '#595959', marginBottom: '4px' }}>{t('calendar.statusFilter', 'Trạng thái')}</div>
          <Select
            mode="multiple"
            placeholder={t('calendar.statusFilter', 'Trạng thái')}
            value={status}
            onChange={handleStatusChange}
            style={{ width: '100%' }}
            size="small"
            maxTagCount="responsive"
            allowClear
          >
            <Option value="pending">
              <Space size={4}><ClockCircleOutlined style={{ color: '#faad14' }} />{t('calendar.statusPending')}</Space>
            </Option>
            <Option value="completed">
              <Space size={4}><CheckCircleOutlined style={{ color: '#52c41a' }} />{t('calendar.statusCompleted')}</Space>
            </Option>
            <Option value="cancelled">
              <Space size={4}><CloseCircleOutlined style={{ color: '#ff4d4f' }} />{t('calendar.statusCancelled', 'Đã hủy')}</Space>
            </Option>
          </Select>
        </div>

        {tagsList.length > 0 && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#595959', marginBottom: '4px' }}>{t('calendar.tagsFilter', 'Thẻ tag')}</div>
            <Select
              mode="multiple"
              placeholder={t('calendar.tagsFilter', 'Thẻ tag')}
              value={selectedTags}
              onChange={handleTagsChange}
              style={{ width: '100%' }}
              size="small"
              maxTagCount="responsive"
              allowClear
            >
              {tagsList.map((tag) => (
                <Option key={tag._id} value={tag.name}>
                  <Tag color={tag.color} style={{ borderRadius: '4px', margin: 0 }}>{tag.name}</Tag>
                </Option>
              ))}
            </Select>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px solid #f0f0f0' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#595959' }}>{t('calendar.hideCompleted', 'Ẩn sự kiện đã hoàn thành')}</span>
          <Switch size="small" checked={hideCompleted} onChange={handleHideCompletedChange} />
        </div>

        {isAdmin && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#595959', marginBottom: '4px' }}>{t('calendar.creator')}</div>
            <Select
              placeholder={t('calendar.creator')}
              value={selectedCreator}
              onChange={handleCreatorChange}
              style={{ width: '100%' }}
              size="small"
              allowClear
            >
              {usersList.map((user) => (
                <Option key={user._id} value={user._id}>
                  {user.username}
                </Option>
              ))}
            </Select>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Popover content={popoverContent} trigger="click" placement="bottomLeft">
      <Badge count={activeFilterCount} overflowCount={99} size="small">
        <Button
          icon={<FilterOutlined style={{ color: activeFilterCount > 0 ? '#1890ff' : undefined }} />}
          style={{ borderRadius: '6px', fontWeight: 500 }}
        >
          {t('calendar.filterTitle')}
        </Button>
      </Badge>
    </Popover>
  );
};
