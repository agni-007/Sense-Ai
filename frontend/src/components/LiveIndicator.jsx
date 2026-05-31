import React from 'react';

const LiveIndicator = ({ connected }) => {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-900 border border-dark-800 select-none">
      <span className="relative flex h-2 w-2">
        {connected ? (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </>
        ) : (
          <span className="relative inline-flex rounded-full h-2 w-2 bg-dark-500"></span>
        )}
      </span>
      <span className="text-[10px] font-semibold tracking-wider uppercase text-dark-300">
        {connected ? 'Realtime Live' : 'Disconnected'}
      </span>
    </div>
  );
};

export default LiveIndicator;
