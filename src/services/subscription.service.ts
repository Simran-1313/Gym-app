import api from './api';
import { ApiResponse, FreezeRequest, Invoice, Membership, MembershipPlanSummary, Meta } from '../types';

// The member's membership, read-only. There are no payments in the app: dues
// are paid at the gym and recorded by staff, so these show what's owed and the
// gym's contact details rather than a checkout.

export const getMembership = async (): Promise<Membership> => {
  const res = await api.get<ApiResponse<Membership>>('/member/subscription');
  if (!res.data.success || !res.data.data) throw new Error('Failed to load your membership');
  return res.data.data;
};

export const getInvoices = async (page = 1, limit = 10): Promise<{ invoices: Invoice[]; meta: Meta }> => {
  const res = await api.get<ApiResponse<{ invoices: Invoice[]; meta: Meta }>>('/member/invoices', {
    params: { page, limit },
  });
  if (!res.data.success || !res.data.data) throw new Error('Failed to load invoices');
  return res.data.data;
};

/** What the gym sells. Switching plans happens at the front desk. */
export const getPlans = async (): Promise<MembershipPlanSummary[]> => {
  const res = await api.get<ApiResponse<{ plans: MembershipPlanSummary[] }>>('/member/plans');
  if (!res.data.success || !res.data.data) throw new Error('Failed to load plans');
  return res.data.data.plans;
};

export interface FreezeRequestInput {
  /** IST calendar date, YYYY-MM-DD. */
  startDate: string;
  days: number;
  reason?: string;
}

/** Asks the gym to pause the membership. Nothing changes until they approve. */
export const requestFreeze = async (input: FreezeRequestInput): Promise<FreezeRequest> => {
  const res = await api.post<ApiResponse<{ request: FreezeRequest }>>('/member/subscription/freeze-requests', input);
  if (!res.data.success || !res.data.data) throw new Error(res.data.message ?? 'Could not send the request');
  return res.data.data.request;
};

export const cancelFreezeRequest = async (id: string): Promise<void> => {
  const res = await api.delete<ApiResponse<{ request: FreezeRequest }>>(`/member/subscription/freeze-requests/${id}`);
  if (!res.data.success) throw new Error(res.data.message ?? 'Could not withdraw the request');
};
