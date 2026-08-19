import React, { useState, useRef } from 'react';
import { Popover, Button, Badge, Input, Select } from 'antd';
import { FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { CategoryItem } from '../services/categoryService';
import { useTranslation } from 'react-i18next';

const { Option } = Select;

interface CalendarFilterPopoverProps {
  isAdmin: boolean;
  categoriesList: CategoryItem[];
  usersList: { _id: string; username: string }[];
  onFilterChange: (filters: {
    keyword?: string;
    categories?: string[];
    priority?: string[];
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
  usersList,
  onFilterChange,
  currentRange,
  searchInputRef: externalSearchRef,
}) => {
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [priority, setPriority] = useState<string[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<string | undefined>(undefined);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const internalSearchRef = useRef<any>(null);
  const searchRef = externalSearchRef || internalSearchRef;

  const activeFilterCount =
    (keyword.trim() ? 1 : 0) +
    (categories.length > 0 ? 1 : 0) +
    (priority.length > 0 ? 1 : 0) +
    (selectedCreator ? 1 : 0);

  const triggerFilterChange = (
    newKeyword: string,
    newCats: string[],
    newPriorities: string[],
    range: typeof currentRange,
    newCreator?: string
  ) => {
    onFilterChange({
      keyword: newKeyword || undefined,
      categories: newCats.length > 0 ? newCats : undefined,
      priority: newPriorities.length > 0 ? newPriorities : undefined,
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

  const handleCreatorChange = (value: string | undefined) => {
    setSelectedCreator(value);
    triggerFilterChange(keyword, categories, priority, currentRange, value);
  };

  const handleClearFilters = () => {
    setKeyword('');
    setCategories([]);
    setPriority([]);
    setSelectedCreator(undefined);
    triggerFilterChange('', [], [], currentRange, '');
  };

  const popoverContent = (
    <div style={{ width: 280, padding: '4px' }}>
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
