import React from 'react';

const statusConfig = {
  NEW: {
    label: 'New',
    bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  },
  QUEUED: {
    label: 'Queued',
    bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  },
  CLASSIFYING: {
    label: 'Classifying...',
    bg: 'bg-purple-500/10 border-purple-500/30 text-purple-400 animate-pulse',
  },
  CLASSIFIED: {
    label: 'Classified',
    bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    bg: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
  },
  RESOLVED: {
    label: 'Resolved',
    bg: 'bg-teal-500/15 border-teal-500/40 text-teal-400',
  },
  SPAM: {
    label: 'Spam',
    bg: 'bg-red-500/10 border-red-500/20 text-red-400/80',
  },
  FAILED: {
    label: 'Failed',
    bg: 'bg-red-950/40 border-red-500/40 text-red-400',
  },
};

const StatusBadge = ({ status }) => {
  const config = statusConfig[status] || {
    label: status,
    bg: 'bg-dark-800 border-dark-700 text-dark-300',
  };

  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${config.bg} inline-flex items-center justify-center select-none`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
