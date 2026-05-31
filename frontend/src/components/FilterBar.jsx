import React from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';

const statuses = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'QUEUED', label: 'Queued' },
  { value: 'CLASSIFYING', label: 'Classifying' },
  { value: 'CLASSIFIED', label: 'Classified' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'FAILED', label: 'Failed' },
];

const priorities = [
  { value: 'ALL', label: 'All Priorities' },
  { value: 'HIGH', label: 'High Priority' },
  { value: 'MEDIUM', label: 'Medium Priority' },
  { value: 'LOW', label: 'Low Priority' },
];

const categories = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'support', label: 'Support' },
  { value: 'sales', label: 'Sales' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Other' },
];

const FilterBar = ({ filters, onFilterChange, onReset }) => {
  const handleChange = (key, value) => {
    onFilterChange(key, value);
  };

  return (
    <div className="glass rounded-2xl p-4 border border-dark-900 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none mb-6">
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
        {/* Status Dropdown */}
        <div className="relative shrink-0">
          <select
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-sm text-dark-200 focus:outline-none focus:border-brand-500 cursor-pointer min-w-[130px]"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Dropdown */}
        <div className="relative shrink-0">
          <select
            value={filters.priority}
            onChange={(e) => handleChange('priority', e.target.value)}
            className="bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-sm text-dark-200 focus:outline-none focus:border-brand-500 cursor-pointer min-w-[130px]"
          >
            {priorities.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category Dropdown */}
        <div className="relative shrink-0">
          <select
            value={filters.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-sm text-dark-200 focus:outline-none focus:border-brand-500 cursor-pointer min-w-[130px]"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Filters Trigger */}
        <button
          onClick={onReset}
          title="Reset Filters"
          className="p-2 border border-dark-800 bg-dark-900 hover:bg-dark-800 hover:text-white rounded-xl text-dark-400 active:scale-95 transition-all shrink-0 flex items-center justify-center"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input block */}
      <div className="relative w-full md:w-80">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
        <input
          type="text"
          value={filters.q}
          onChange={(e) => handleChange('q', e.target.value)}
          placeholder="Search client name or text..."
          className="w-full bg-dark-900 border border-dark-800 rounded-xl py-2 pl-11 pr-4 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 transition-colors"
        />
      </div>
    </div>
  );
};

export default FilterBar;
