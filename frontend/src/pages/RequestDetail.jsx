import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  useRequest, 
  useUpdateStatus, 
  useAddNote, 
  useRetryClassification 
} from '../hooks/useRequests';
import NotesList from '../components/NotesList';
import EventTimeline from '../components/EventTimeline';
import StatusBadge from '../components/StatusBadge';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Mail, 
  Phone, 
  Cpu, 
  CheckCircle, 
  MessageSquare,
  Loader2,
  AlertOctagon,
  RefreshCw
} from 'lucide-react';

const statuses = [
  { value: 'NEW', label: 'New' },
  { value: 'QUEUED', label: 'Queued' },
  { value: 'CLASSIFYING', label: 'Classifying' },
  { value: 'CLASSIFIED', label: 'Classified' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'FAILED', label: 'Failed' },
];

const RequestDetail = () => {
  const { id } = useParams();
  const [statusVal, setStatusVal] = useState('');
  const [noteVal, setNoteVal] = useState('');

  // Queries & Mutations
  const { data: request, isLoading, error } = useRequest(id);
  const updateStatusMut = useUpdateStatus();
  const addNoteMut = useAddNote();
  const retryClassificationMut = useRetryClassification();

  // Initialize local status state once request loads
  React.useEffect(() => {
    if (request) {
      setStatusVal(request.status);
    }
  }, [request]);

  const handleStatusUpdate = async () => {
    if (!statusVal) return;
    try {
      await updateStatusMut.mutateAsync({ id, status: statusVal });
      console.log('Status updated successfully to', statusVal);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteVal.trim()) return;

    try {
      await addNoteMut.mutateAsync({ id, body: noteVal });
      setNoteVal('');
      console.log('Internal note added successfully');
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  };

  const handleRetryClassification = async () => {
    try {
      await retryClassificationMut.mutateAsync(id);
      console.log('AI manual retry triggered successfully');
    } catch (err) {
      console.error('Failed to retry classification:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex flex-col justify-center items-center select-none">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
        <p className="text-dark-400 text-sm">Fetching request details...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-[500px] flex flex-col justify-center items-center text-center p-8 select-none">
        <div className="w-16 h-16 rounded-full bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400 mb-4">
          ⚠️
        </div>
        <h3 className="text-lg font-bold text-white mb-1">Failed to Load Request</h3>
        <p className="text-dark-400 text-sm max-w-sm mb-6">
          Request details are missing or backend connection was interrupted.
        </p>
        <Link
          to="/"
          className="flex items-center gap-2 border border-dark-800 bg-dark-900 hover:bg-dark-800 text-white px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Pipeline Dashboard</span>
        </Link>
      </div>
    );
  }

  // Get active classification record (the latest classification result)
  const classification = request.classifications?.[0];

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Back button */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-dark-400 hover:text-white transition-colors select-none"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Pipeline Dashboard</span>
        </Link>
      </div>

      {/* Grid container layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Customer Metadata Card */}
          <div className="glass rounded-3xl p-6 border border-dark-900">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
              <div>
                <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest block mb-1">
                  Ticket Identity #{request.id.slice(-6).toUpperCase()}
                </span>
                <h2 className="text-2xl font-extrabold text-white leading-tight">
                  {request.customerName}
                </h2>
              </div>
              <div className="shrink-0">
                <StatusBadge status={request.status} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-dark-900/60 pt-4">
              <div className="flex items-center gap-2.5 text-sm text-dark-300">
                <Mail className="w-4 h-4 text-dark-500" />
                <span className="truncate select-all">{request.customerEmail || 'No email registered'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-dark-300">
                <Phone className="w-4 h-4 text-dark-500" />
                <span className="truncate select-all">{request.customerPhone || 'No phone registered'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-dark-300">
                <Calendar className="w-4 h-4 text-dark-500" />
                <span>{new Date(request.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
            </div>
          </div>

          {/* Original Message Text */}
          <div className="glass rounded-3xl p-6 border border-dark-900">
            <h3 className="text-sm font-bold text-dark-300 uppercase tracking-wider mb-3 select-none">
              Customer Message Content
            </h3>
            <div className="p-4 rounded-2xl bg-dark-950 border border-dark-900 text-white text-sm leading-relaxed whitespace-pre-wrap select-text">
              "{request.message}"
            </div>
          </div>

          {/* AI Classification Snapshot Card */}
          <div className="glass rounded-3xl p-6 border border-dark-900 relative overflow-hidden">
            {/* Background highlight glow */}
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-brand-500/5 blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-dark-900/60 pb-4 mb-4 select-none">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Cpu className="w-5 h-5 text-brand-400" />
                <span>AI Classification Analysis</span>
              </div>
              {/* Retry classification trigger */}
              {request.status === 'FAILED' && (
                <button
                  onClick={handleRetryClassification}
                  disabled={retryClassificationMut.isPending}
                  className="flex items-center gap-1.5 border border-red-500/30 bg-red-950/20 hover:bg-red-500/10 text-red-400 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold active:scale-95 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${retryClassificationMut.isPending ? 'animate-spin' : ''}`} />
                  <span>Retry AI Process</span>
                </button>
              )}
            </div>

            {request.status === 'FAILED' ? (
              <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/20 flex gap-3 text-red-300 text-sm">
                <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">AI Processing Encountered an Error</span>
                  <p className="text-red-400/80 text-xs mt-1">
                    Error Log: {classification?.errorState || 'Background process interrupted.'}
                  </p>
                </div>
              </div>
            ) : request.status === 'NEW' || request.status === 'QUEUED' || request.status === 'CLASSIFYING' ? (
              <div className="py-6 flex flex-col justify-center items-center text-center select-none">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-3" />
                <p className="text-dark-400 text-sm">
                  {request.status === 'CLASSIFYING' 
                    ? 'Claude is analyzing the customer intent now...' 
                    : 'Request queued in background scheduler. AI process starting soon.'}
                </p>
              </div>
            ) : classification ? (
              <div className="space-y-4">
                {/* Meta details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-dark-900/50 border border-dark-900 rounded-xl">
                    <span className="text-[10px] text-dark-500 font-bold uppercase tracking-wider block">Suggested Category</span>
                    <span className="text-sm font-bold text-white capitalize">{classification.category || 'other'}</span>
                  </div>
                  <div className="p-3 bg-dark-900/50 border border-dark-900 rounded-xl">
                    <span className="text-[10px] text-dark-500 font-bold uppercase tracking-wider block">Suggested Priority</span>
                    <span className={`text-sm font-extrabold tracking-wide uppercase ${
                      classification.priority === 'HIGH' ? 'text-red-400' :
                      classification.priority === 'MEDIUM' ? 'text-amber-400' : 'text-dark-300'
                    }`}>
                      {classification.priority || 'MEDIUM'}
                    </span>
                  </div>
                </div>

                {/* Progress bar confidence score */}
                {classification.confidence && (
                  <div>
                    <div className="flex justify-between items-center text-xs font-semibold mb-1.5 select-none">
                      <span className="text-dark-400 flex items-center gap-2">
                        AI Engine Confidence Score
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider uppercase border ${
                          classification.provider === 'gemini'
                            ? 'bg-blue-500/10 border-blue-500/25 text-blue-400'
                            : classification.provider === 'claude'
                            ? 'bg-purple-500/10 border-purple-500/25 text-purple-400'
                            : 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                        }`}>
                          {classification.provider === 'gemini' ? 'Gemini 3.5 Flash' :
                           classification.provider === 'claude' ? 'Claude 3.5 Sonnet' : 'Mock Fallback'}
                        </span>
                      </span>
                      <span className="text-brand-400 font-bold">{Math.round(classification.confidence * 100)}%</span>
                    </div>
                    <div className="w-full bg-dark-900 border border-dark-800 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-brand-600 to-indigo-500 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${classification.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* AI Summary */}
                {classification.summary && (
                  <div className="border-t border-dark-900/60 pt-3">
                    <span className="text-[10px] text-dark-500 font-bold uppercase tracking-wider block select-none">One-Sentence AI Summary</span>
                    <p className="text-sm text-dark-100 mt-1 select-text">
                      "{classification.summary}"
                    </p>
                  </div>
                )}

                {/* Reason */}
                {classification.reason && (
                  <div className="border-t border-dark-900/60 pt-3">
                    <span className="text-[10px] text-dark-500 font-bold uppercase tracking-wider block select-none">Engine Reason Log</span>
                    <p className="text-sm text-dark-300 mt-1 leading-relaxed select-text">
                      {classification.reason}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-dark-500 text-sm select-none">
                No classification records found.
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 select-none">
              <MessageSquare className="w-5 h-5 text-brand-400" />
              <span>Internal Operations Thread</span>
            </h3>

            {/* Add Note Input Form */}
            <form onSubmit={handleAddNote} className="glass rounded-3xl p-4 border border-dark-900 flex flex-col gap-3">
              <textarea
                value={noteVal}
                onChange={(e) => setNoteVal(e.target.value)}
                placeholder="Append internal operator note to this ticket..."
                rows="3"
                required
                className="w-full bg-dark-950 border border-dark-900/60 rounded-2xl p-4 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 transition-colors resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={addNoteMut.isPending}
                  className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 px-6 rounded-2xl active:scale-95 transition-all text-xs flex items-center justify-center gap-1.5"
                >
                  {addNoteMut.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Post Note</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* List Notes Thread */}
            <NotesList notes={request.notes} />
          </div>

        </div>

        {/* Right Column (1/3 width): Event Timeline */}
        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-[100px]">
          
          {/* Status Manual Editor */}
          <div className="glass rounded-3xl p-6 border border-dark-900 select-none">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Manual Triage Controls
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-dark-400 font-bold uppercase tracking-wider mb-2">
                  Update Request Status
                </label>
                <select
                  value={statusVal}
                  onChange={(e) => setStatusVal(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 cursor-pointer"
                >
                  {statuses.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleStatusUpdate}
                disabled={updateStatusMut.isPending || statusVal === request.status}
                className="w-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none text-xs flex items-center justify-center gap-1.5"
              >
                {updateStatusMut.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Commit Status Change</span>
                )}
              </button>
            </div>
          </div>

          {/* Event History Timeline */}
          <div className="glass rounded-3xl p-6 border border-dark-900">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 select-none">
              Operation History Log
            </h3>
            <EventTimeline events={request.events} />
          </div>

        </div>

      </div>
    </div>
  );
};

export default RequestDetail;
