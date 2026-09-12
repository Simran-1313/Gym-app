import api from './api';
import { ActiveSubscription, ApiResponse, Invoice, Meta, PaymentOrder } from '../types';

// Endpoints per docs/CLASENDRA_MEMBER_MOBILE_APP.md §4.4/§4.5/§4.8. The backend
// for these does not exist yet (confirmed absent — see the engineering audit),
// so every call site here is expected to catch and fall back, the same way
// ClassesScreen and NotificationsScreen already fall back to sample content
// when their endpoints aren't ready.

export const getSubscription = async (): Promise<ActiveSubscription | null> => {
  const res = await api.get<ApiResponse<{ subscription: ActiveSubscription | null }>>('/member/subscription');
  if (!res.data.success) throw new Error('Failed to fetch subscription');
  return res.data.data?.subscription ?? null;
};

export const getSubscriptionHistory = async (page = 1, limit = 10): Promise<{ history: ActiveSubscription[]; meta: Meta }> => {
  const res = await api.get<ApiResponse<{ history: ActiveSubscription[]; meta: Meta }>>('/member/subscription/history', {
    params: { page, limit },
  });
  if (!res.data.success || !res.data.data) throw new Error('Failed to fetch subscription history');
  return res.data.data;
};

export const getInvoices = async (page = 1, limit = 10): Promise<{ invoices: Invoice[]; meta: Meta }> => {
  const res = await api.get<ApiResponse<{ invoices: Invoice[]; meta: Meta }>>('/member/invoices', {
    params: { page, limit },
  });
  if (!res.data.success || !res.data.data) throw new Error('Failed to fetch invoices');
  return res.data.data;
};

export const createPaymentOrder = async (planId: string, type: 'RENEWAL' | 'NEW'): Promise<PaymentOrder> => {
  const res = await api.post<ApiResponse<PaymentOrder>>('/member/payments/create-order', { planId, type });
  if (!res.data.success || !res.data.data) throw new Error(res.data.message ?? 'Could not start checkout');
  return res.data.data;
};

export interface VerifyPaymentPayload {
  orderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export const verifyPayment = async (payload: VerifyPaymentPayload): Promise<{ subscription: ActiveSubscription; invoiceId: string }> => {
  const res = await api.post<ApiResponse<{ subscription: ActiveSubscription; invoiceId: string }>>('/member/payments/verify', payload);
  if (!res.data.success || !res.data.data) throw new Error(res.data.message ?? 'Payment verification failed');
  return res.data.data;
};

export const requestFreeze = async (): Promise<void> => {
  const res = await api.post<ApiResponse<null>>('/member/subscription/freeze-request');
  if (!res.data.success) throw new Error(res.data.message ?? 'Freeze request failed');
};
