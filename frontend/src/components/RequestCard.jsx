import React from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { MessageSquare, Calendar, Phone, Mail, Globe, Layers } from 'lucide-react';

// Channel configurations
const channelConfig = {
  API: { label: 'API', icon: Layers, color: 'text-indigo-400 border-indigo-500/25 bg-indigo-500/5' },
  WEBHOOK_WHATSAPP: { label: 'WhatsApp', icon: Phone, color: 'text-green-400 border-green-500/25 bg-green-500/5' },
  WEBHOOK_EMAIL: { label: 'Email', icon: Mail, color: 'text-orange-400 border-orange-500/25 bg-orange-500/5' },
  WEBSITE_FORM: { label: 'Web Form', icon: Globe, color: 'text-sky-400 border-sky-500/25 bg-sky-500/5' },
};

// Priority styles
const priorityStyles = {
  HIGH: 'border-red-500/30 hover:border-red-500/50 bg-red-950/5 text-red-400',
  MEDIUM: 'border-amber-500/30 hover:border-amber-500/50 bg-amber-950/5 text-amber-400',
  LOW: 'border-dark-800 hover:border-dark-700 bg-dark-900/10 text-dark-400',
};

export const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const RequestCard = ({ request }) => {
  const navigate = useNavigate();
  const { id, customerName, message, sourceChannel, status, prioritySnapshot, categorySnapshot, createdAt } = request;

  const channel = channelConfig[sourceChannel] || { label: sourceChannel, icon: MessageSquare, color: 'text-dark-400 border-dark-800' };
  const ChannelIcon = channel.icon;

  const priorityClass = priorityStyles[prioritySnapshot] || 'border-dark-800 hover:border-dark-700 text-dark-300';

  const handleCardClick = () => {
    navigate(`/requests/${id}`);
  };

  // Truncate message to 100 chars
  const messagePreview = message.length > 100 ? `${message.substring(0, 100).trim()}...` : message;

  return (
    <div
      onClick={handleCardClick}
      className={`glass rounded-2xl p-5 border cursor-pointer transition-all duration-300 group hover:-translate-y-0.5 hover:shadow-lg ${priorityClass} ${status === 'FAILED' ? 'bg-red-950/5 border-red-950/40' : ''}`}
    >
      <div className="flex justify-between items-start gap-4 mb-3">
        {/* Customer & Channel */}
        <div>
          <h3 className="font-semibold text-white group-hover:text-brand-400 transition-colors text-base truncate max-w-[200px]">
            {customerName}
          </h3>
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 mt-1 rounded-md border text-[10px] font-medium tracking-wide uppercase ${channel.color}`}>
            <ChannelIcon className="w-3 h-3" />
            {channel.label}
          </span>
        </div>

        {/* Time Ago */}
        <div className="flex items-center gap-1.5 text-xs text-dark-400">
          <Calendar className="w-3.5 h-3.5 text-dark-500" />
          <span>{formatTimeAgo(createdAt)}</span>
        </div>
      </div>

      {/* Message Preview */}
      <p className="text-dark-300 text-sm leading-relaxed mb-4 min-h-[40px] break-words">
        "{messagePreview}"
      </p>

      {/* Badges footer */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-dark-900/60 items-center justify-between">
        <StatusBadge status={status} />

        <div className="flex gap-2">
          {/* Category snapshot badge */}
          {categorySnapshot && (
            <span className="px-2.5 py-0.5 rounded-md bg-dark-900 border border-dark-800 text-[10px] font-semibold text-dark-300 tracking-wide uppercase">
              {categorySnapshot}
            </span>
          )}

          {/* Priority snapshot badge */}
          {prioritySnapshot && (
            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider uppercase border border-current/20 ${
              prioritySnapshot === 'HIGH' ? 'text-red-400 bg-red-950/20' : 
              prioritySnapshot === 'MEDIUM' ? 'text-amber-400 bg-amber-950/20' : 
              'text-dark-400 bg-dark-900/50'
            }`}>
              {prioritySnapshot}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestCard;
