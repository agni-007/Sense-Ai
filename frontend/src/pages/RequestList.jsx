import React, { useState } from 'react';
import { useRequests } from '../hooks/useRequests';
import FilterBar from '../components/FilterBar';
import RequestCard from '../components/RequestCard';
import { api } from '../lib/api';
import { Inbox, ChevronLeft, ChevronRight, Loader2, RefreshCw, Trash2 } from 'lucide-react';

const initialFilters = {
  status: 'ALL',
  priority: 'ALL',
  category: 'ALL',
  q: '',
};

const RequestList = () => {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [isClearing, setIsClearing] = useState(false);

  // Parse User details
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { role: 'AGENT' };

  // Fetch paginated requests with filters
  const { data, isLoading, error, refetch, isFetching } = useRequests(filters, page);

  const handleClearPipeline = async () => {
    const confirmed = window.confirm(
      '🚨 WARNING: Are you absolutely sure you want to permanently delete ALL customer requests, internal notes, AI classifications, and timeline events in the pipeline?\n\nThis action cannot be undone!'
    );
    if (!confirmed) return;

    setIsClearing(true);
    try {
      await api.delete('/requests');
      console.log('🗑️ Request pipeline cleared successfully.');
      refetch();
    } catch (err) {
      console.error('Failed to clear pipeline:', err);
      alert(err.response?.data?.error || 'Failed to clear the request pipeline.');
    } finally {
      setIsClearing(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPage(1); // Reset to first page on filter change
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
    setPage(1);
  };

  const handlePrevPage = () => {
    if (page > 1) setPage((prev) => prev - 1);
  };

  const handleNextPage = () => {
    if (data && page < data.pages) setPage((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Title section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white select-none">
            Customer Requests Pipeline
          </h1>
          <p className="text-dark-400 text-sm mt-1 select-none">
            Monitor, prioritize, and classify inbound user support queues.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {/* Sync refresh button */}
          <button
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="flex items-center gap-2 border border-dark-800 bg-dark-900 hover:bg-dark-800 text-dark-300 hover:text-white px-3.5 py-2 rounded-xl text-sm transition-colors disabled:opacity-50 select-none shrink-0 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh Cache</span>
          </button>

          {/* Admin-only Clear Pipeline button */}
          {user.role === 'ADMIN' && (
            <button
              onClick={handleClearPipeline}
              disabled={isLoading || isClearing}
              className="flex items-center gap-2 border border-red-950 bg-red-950/25 hover:bg-red-950/45 text-red-400 hover:text-red-300 px-3.5 py-2 rounded-xl text-sm disabled:opacity-50 select-none shrink-0 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Pipeline</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and search controllers */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Requests Display block */}
      {isLoading ? (
        <div className="min-h-[400px] flex flex-col justify-center items-center select-none">
          <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
          <p className="text-dark-400 text-sm">Loading incoming ticket pipeline...</p>
        </div>
      ) : error ? (
        <div className="min-h-[400px] flex flex-col justify-center items-center text-center p-8 select-none">
          <div className="w-16 h-16 rounded-full bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400 mb-4">
            ⚠️
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Failed to Load Requests</h3>
          <p className="text-dark-400 text-sm max-w-sm">
            {error.response?.data?.error || 'Database connection error. Please ensure database and redis endpoints are running.'}
          </p>
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="min-h-[400px] glass rounded-3xl border border-dark-900 flex flex-col justify-center items-center text-center p-8 select-none">
          <div className="w-14 h-14 rounded-2xl bg-dark-900 border border-dark-800 flex items-center justify-center text-dark-400 mb-4">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Pipeline is Empty</h3>
          <p className="text-dark-400 text-sm max-w-xs leading-relaxed">
            No customer requests match your selected status, category, or priority filters.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Responsive Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.data.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>

          {/* Pagination controls */}
          {data.pages > 1 && (
            <div className="flex items-center justify-between border-t border-dark-900 pt-6 mt-4 select-none">
              <div className="text-sm text-dark-400">
                Showing <span className="font-semibold text-white">{data.data.length}</span> of{' '}
                <span className="font-semibold text-white">{data.total}</span> entries
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={page === 1}
                  className="flex items-center justify-center gap-1 bg-dark-900 border border-dark-800 hover:bg-dark-800 text-dark-300 disabled:opacity-40 disabled:pointer-events-none px-3.5 py-2 rounded-xl text-sm transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
                
                <div className="flex items-center justify-center px-4 rounded-xl bg-dark-900/60 border border-dark-900 text-sm font-semibold text-white">
                  {page} / {data.pages}
                </div>

                <button
                  onClick={handleNextPage}
                  disabled={page === data.pages}
                  className="flex items-center justify-center gap-1 bg-dark-900 border border-dark-800 hover:bg-dark-800 text-dark-300 disabled:opacity-40 disabled:pointer-events-none px-3.5 py-2 rounded-xl text-sm transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RequestList;
