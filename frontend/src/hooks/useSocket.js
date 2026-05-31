import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

const socketURL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Establish Socket.io connection with JWT authorization token
    const socketInstance = io(socketURL, {
      auth: { token },
      transports: ['websocket', 'polling'], // ensure fallback compatibility
    });

    socketInstance.on('connect', () => {
      console.log('🔌 Socket connected to backend server.');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Socket connection closed.');
      setConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('🔌 Socket handshake failed:', err.message);
      setConnected(false);
    });

    // 1. request:created — Prepend to list or trigger list refresh
    socketInstance.on('request:created', (newRequest) => {
      console.log('🔔 [Realtime] Inbound Customer Request:', newRequest);
      // Invalidate requests list cache to pull in the new card
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    });

    // 2. request:updated — Sync status modifications in-place
    socketInstance.on('request:updated', (data) => {
      console.log('🔔 [Realtime] Request Status Change:', data);

      // Mutate detail cache directly
      queryClient.setQueryData(['request', data.id], (oldData) => {
        if (!oldData) return oldData;
        return { ...oldData, status: data.status };
      });

      // Refresh list elements
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    });

    // 3. request:classified — Dynamically render classification results
    socketInstance.on('request:classified', (data) => {
      console.log('🔔 [Realtime] Request AI Classified:', data);

      // Inject full classification details inside the detail cache
      queryClient.setQueryData(['request', data.id], (oldData) => {
        if (!oldData) return oldData;
        
        const currentClassifications = oldData.classifications || [];
        const isDuplicate = currentClassifications.some(c => c.summary === data.summary);
        
        const newClassification = {
          id: `temp-${Date.now()}`,
          category: data.category,
          priority: data.priority,
          summary: data.summary,
          createdAt: new Date().toISOString(),
          provider: 'claude',
        };

        return {
          ...oldData,
          status: 'CLASSIFIED',
          categorySnapshot: data.category,
          prioritySnapshot: data.priority,
          classifications: isDuplicate ? currentClassifications : [newClassification, ...currentClassifications],
        };
      });

      // Refresh list to show categories & priority in real-time
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    });

    // 4. note:added — Thread client note feeds live
    socketInstance.on('note:added', (data) => {
      console.log('🔔 [Realtime] Note Thread Updated:', data);

      queryClient.setQueryData(['request', data.requestId], (oldData) => {
        if (!oldData) return oldData;
        const currentNotes = oldData.notes || [];
        const isDuplicate = currentNotes.some(n => n.id === data.note.id);
        
        return {
          ...oldData,
          notes: isDuplicate ? currentNotes : [data.note, ...currentNotes],
        };
      });
    });

    // 5. requests:cleared — Handle Admin clearing all requests
    socketInstance.on('requests:cleared', () => {
      console.log('🔔 [Realtime] Pipeline Cleared by Admin');
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    });

    setSocket(socketInstance);

    return () => {
      console.log('🔌 Cleaning up socket client instance...');
      socketInstance.disconnect();
    };
  }, [queryClient]);

  return { socket, connected };
};
