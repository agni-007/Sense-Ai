import React from 'react';
import { formatTimeAgo } from './RequestCard';
import { 
  ArrowRightLeft, 
  MessageSquarePlus, 
  Cpu, 
  FileText, 
  RotateCw, 
  AlertTriangle,
  History
} from 'lucide-react';

const eventConfig = {
  created: {
    color: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
    icon: MessageSquarePlus,
    description: (e) => 'Inbound request registered in pipeline.',
  },
  status_changed: {
    color: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
    icon: ArrowRightLeft,
    description: (e) => `Status changed from ${e.oldValue || 'NEW'} → ${e.newValue}.`,
  },
  note_added: {
    color: 'bg-teal-500/10 border-teal-500/30 text-teal-400',
    icon: FileText,
    description: (e) => 'Internal operator note appended.',
  },
  classified: {
    color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    icon: Cpu,
    description: (e) => `AI auto-classified category as ${e.newValue || 'classified'}.`,
  },
  retry: {
    color: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    icon: RotateCw,
    description: (e) => 'AI classification manual retry queued.',
  },
  classification_failed: {
    color: 'bg-red-500/10 border-red-500/30 text-red-400',
    icon: AlertTriangle,
    description: (e) => `AI classification process failed. Status updated → FAILED.`,
  },
};

const EventTimeline = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div className="p-6 border border-dark-900 bg-dark-900/10 rounded-2xl text-center text-dark-500 text-sm select-none">
        <History className="w-5 h-5 mx-auto mb-2 text-dark-600 animate-spin" />
        No event history logs recorded yet.
      </div>
    );
  }

  return (
    <div className="relative pl-6 border-l border-dark-900 space-y-6 select-none ml-2 pt-2">
      {events.map((event, index) => {
        const config = eventConfig[event.eventType] || {
          color: 'bg-dark-850 border-dark-700 text-dark-400',
          icon: History,
          description: (e) => `Event: ${e.eventType}`,
        };
        
        const Icon = config.icon;

        return (
          <div key={event.id} className="relative group">
            {/* Timeline bullet node */}
            <div className={`absolute -left-[38px] top-0 w-8 h-8 rounded-full border flex items-center justify-center shadow-md transition-all group-hover:scale-115 ${config.color}`}>
              <Icon className="w-4 h-4" />
            </div>

            {/* Event Description Card */}
            <div>
              <div className="flex justify-between items-baseline gap-2">
                <p className="text-sm font-bold text-white leading-tight">
                  {config.description(event)}
                </p>
                <span className="text-[10px] font-semibold text-dark-500 shrink-0">
                  {formatTimeAgo(event.createdAt)}
                </span>
              </div>
              
              {/* Event Metadata author */}
              {event.actor && (
                <span className="text-[10px] font-semibold text-dark-450 mt-1 block">
                  Logged by: {event.actor.name} ({event.actor.role})
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EventTimeline;
