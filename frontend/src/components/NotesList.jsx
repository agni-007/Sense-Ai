import React from 'react';
import { formatTimeAgo } from './RequestCard';
import { MessageSquare, User } from 'lucide-react';

const NotesList = ({ notes }) => {
  if (!notes || notes.length === 0) {
    return (
      <div className="p-6 border border-dark-900 bg-dark-900/10 rounded-2xl text-center text-dark-500 text-sm select-none">
        <MessageSquare className="w-5 h-5 mx-auto mb-2 text-dark-600" />
        No internal operator notes added to this request yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <div key={note.id} className="glass rounded-2xl p-4 border border-dark-900 transition-colors hover:border-dark-800">
          <div className="flex justify-between items-center mb-2">
            {/* Note Author Context */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-brand-400" />
              </div>
              <span className="text-xs font-bold text-white">
                {note.author?.name || 'Operator'}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-dark-900 border border-dark-800 text-[8px] font-bold text-dark-400 uppercase tracking-wider">
                {note.author?.role || 'AGENT'}
              </span>
            </div>
            {/* Note Date Context */}
            <span className="text-[10px] text-dark-500 font-semibold">
              {formatTimeAgo(note.createdAt)}
            </span>
          </div>
          {/* Note content */}
          <p className="text-dark-200 text-sm leading-relaxed pl-8 break-words select-text">
            {note.body}
          </p>
        </div>
      ))}
    </div>
  );
};

export default NotesList;
