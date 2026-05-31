import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

// Fetch requests with filters & pagination
export const useRequests = (filters, page = 1) => {
  return useQuery({
    queryKey: ['requests', filters, page],
    queryFn: async () => {
      const params = {
        ...filters,
        page,
        limit: 12, // Fetch 12 items per page for request cards grid
      };
      
      const response = await api.get('/requests', { params });
      return response.data;
    },
    placeholderData: (previousData) => previousData, // keep previous page data while loading new page
  });
};

// Fetch single request detail by ID
export const useRequest = (id) => {
  return useQuery({
    queryKey: ['request', id],
    queryFn: async () => {
      const response = await api.get(`/requests/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

// Update request status mutation
export const useUpdateStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }) => {
      const response = await api.patch(`/requests/${id}/status`, { status });
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate both detail and list queries to sync data
      queryClient.invalidateQueries({ queryKey: ['request', data.id] });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });
};

// Add internal note mutation
export const useAddNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, body }) => {
      const response = await api.post(`/requests/${id}/notes`, { body });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate the request detail query to refresh notes list
      queryClient.invalidateQueries({ queryKey: ['request', variables.id] });
    },
  });
};

// Retry AI classification mutation
export const useRetryClassification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const response = await api.post(`/requests/${id}/retry-classification`);
      return response.data;
    },
    onSuccess: (data, id) => {
      // Invalidate detail and list to show status = QUEUED immediately
      queryClient.invalidateQueries({ queryKey: ['request', id] });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });
};
