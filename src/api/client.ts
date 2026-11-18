import type {
  Bike,
  CreateBikeInput,
  CreateRentalInput,
  CustomerAccountState,
  PaymentMethod,
  Rental,
  RideRecord,
  Station,
  SubscriptionPlan,
  Transaction,
} from '../types/bike';

export interface PublicStateResponse {
  bikes: Bike[];
  stations: Station[];
  rentals: Rental[];
  customerAccount: CustomerAccountState;
}

export interface CompanyStateResponse {
  bikes: Bike[];
  stations: Station[];
  rentals: Rental[];
  transactions: Transaction[];
}

export interface CompanyAuthSession {
  token: string;
  email: string;
}

const TOKEN_STORAGE_KEY = 'locubikes-company-token';

export function getStoredCompanyToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredCompanyToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

function authHeaders(): Record<string, string> {
  const token = getStoredCompanyToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Falha na comunicação com o servidor.');
  }
  return data as T;
}

export async function loginCompanyApi(email: string, password: string): Promise<CompanyAuthSession> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const session = await handleResponse<CompanyAuthSession>(res);
  setStoredCompanyToken(session.token);
  return session;
}

export async function verifyCompanySessionApi(): Promise<{ authenticated: boolean; email?: string }> {
  const token = getStoredCompanyToken();
  if (!token) return { authenticated: false };
  const res = await fetch('/api/auth/me', { headers: authHeaders() });
  if (!res.ok) {
    setStoredCompanyToken(null);
    return { authenticated: false };
  }
  return res.json();
}

export async function logoutCompanyApi(): Promise<void> {
  const token = getStoredCompanyToken();
  if (token) {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: authHeaders(),
    }).catch(() => undefined);
  }
  setStoredCompanyToken(null);
}

export async function fetchPublicState(
  reservationCodes: string[],
  lookupQuery?: string
): Promise<PublicStateResponse> {
  const params = new URLSearchParams();
  if (reservationCodes.length > 0) {
    params.set('codes', reservationCodes.join(','));
  }
  if (lookupQuery && lookupQuery.trim()) {
    params.set('q', lookupQuery.trim());
  }
  const qs = params.toString();
  const res = await fetch(`/api/public/state${qs ? `?${qs}` : ''}`);
  return handleResponse<PublicStateResponse>(res);
}

export async function fetchCompanyState(): Promise<CompanyStateResponse> {
  const res = await fetch('/api/company/state', { headers: authHeaders() });
  return handleResponse<CompanyStateResponse>(res);
}

export async function topUpWalletApi(
  amount: number,
  method: 'pix' | 'cartao'
): Promise<{ customerAccount: CustomerAccountState; transaction: Transaction }> {
  const res = await fetch('/api/customer/wallet/topup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, method }),
  });
  return handleResponse<{ customerAccount: CustomerAccountState; transaction: Transaction }>(res);
}

export async function addCustomerCardApi(input: {
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvv: string;
}): Promise<{ customerAccount: CustomerAccountState }> {
  const res = await fetch('/api/customer/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<{ customerAccount: CustomerAccountState }>(res);
}

export async function removeCustomerCardApi(
  cardId: string
): Promise<{ customerAccount: CustomerAccountState }> {
  const res = await fetch(`/api/customer/cards/${encodeURIComponent(cardId)}`, {
    method: 'DELETE',
  });
  return handleResponse<{ customerAccount: CustomerAccountState }>(res);
}

export async function subscribePlanApi(
  planId: SubscriptionPlan['id'],
  paymentMethod: 'carteira' | 'pix' | 'cartao'
): Promise<{ customerAccount: CustomerAccountState }> {
  const res = await fetch('/api/customer/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId, paymentMethod }),
  });
  return handleResponse<{ customerAccount: CustomerAccountState }>(res);
}

export async function cancelSubscriptionApi(): Promise<{ customerAccount: CustomerAccountState }> {
  const res = await fetch('/api/customer/subscriptions/cancel', {
    method: 'POST',
  });
  return handleResponse<{ customerAccount: CustomerAccountState }>(res);
}

export async function unlockBikeByQrApi(input: {
  qrInput: string;
  paymentMethod: 'carteira' | 'pix' | 'cartao' | 'assinatura';
}): Promise<{ activeRide: RideRecord; bike: Bike; customerAccount: CustomerAccountState }> {
  const res = await fetch('/api/rides/unlock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<{ activeRide: RideRecord; bike: Bike; customerAccount: CustomerAccountState }>(res);
}

export async function finishActiveRideApi(input: {
  rideId: string;
  endStationId?: string;
  elapsedMinutesOverride?: number;
}): Promise<{ completedRide: RideRecord; bike: Bike; customerAccount: CustomerAccountState }> {
  const res = await fetch(`/api/rides/${encodeURIComponent(input.rideId)}/finish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endStationId: input.endStationId,
      elapsedMinutesOverride: input.elapsedMinutesOverride,
    }),
  });
  return handleResponse<{ completedRide: RideRecord; bike: Bike; customerAccount: CustomerAccountState }>(res);
}

export async function createBikeApi(input: CreateBikeInput): Promise<Bike> {
  const res = await fetch('/api/bikes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  return handleResponse<Bike>(res);
}

export async function updateBikeApi(id: string, patch: Partial<CreateBikeInput>): Promise<Bike> {
  const res = await fetch(`/api/bikes/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(patch),
  });
  return handleResponse<Bike>(res);
}

export async function deleteBikeApi(id: string): Promise<void> {
  const res = await fetch(`/api/bikes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await handleResponse<{ deleted: boolean }>(res);
}

export async function createRentalApi(
  input: CreateRentalInput
): Promise<{ rental: Rental; transaction: Transaction }> {
  const res = await fetch('/api/rentals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<{ rental: Rental; transaction: Transaction }>(res);
}

export async function settleRentalPaymentApi(
  rentalId: string,
  method: PaymentMethod,
  installments = 1,
  cardLast4?: string
): Promise<{ rental: Rental; transaction: Transaction }> {
  const res = await fetch(`/api/rentals/${encodeURIComponent(rentalId)}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, installments, cardLast4 }),
  });
  return handleResponse<{ rental: Rental; transaction: Transaction }>(res);
}

export async function completeRentalApi(rentalId: string): Promise<Rental> {
  const res = await fetch(`/api/rentals/${encodeURIComponent(rentalId)}/complete`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse<Rental>(res);
}

export async function cancelRentalApi(rentalId: string): Promise<Rental> {
  const res = await fetch(`/api/rentals/${encodeURIComponent(rentalId)}/cancel`, {
    method: 'POST',
  });
  return handleResponse<Rental>(res);
}
