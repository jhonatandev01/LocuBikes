export type BikeCategory = 'Urbana' | 'Elétrica' | 'Gravel' | 'Estrada';

export type BikeStatus = 'disponivel' | 'alugada' | 'manutencao';

export type FrameSize = 'P' | 'M' | 'G' | 'Único';

export type RentalUnit = 'hora' | 'dia';

export type PaymentMethod = 'pix' | 'cartao' | 'nupay' | 'presencial' | 'carteira' | 'assinatura';

export type NuPayFundingSource = 'saldo_nu' | 'credito_nu';

export interface NuPayConfirmation {
  transactionId: string;
  fundingSource: NuPayFundingSource;
  installments: number;
  authorizedAt: string;
}

export type PaymentStatus = 'pago' | 'pendente' | 'estornado';

export type RentalStatus = 'ativa' | 'pendente' | 'concluida' | 'cancelada';

export interface Station {
  id: string;
  name: string;
  neighborhood: string;
  address: string;
  lat: number;
  lng: number;
  totalDocks: number;
}

export interface Bike {
  id: string;
  code: string;
  model: string;
  brand: string;
  category: BikeCategory;
  frameSize: FrameSize;
  hourlyRate: number;
  dailyRate: number;
  status: BikeStatus;
  specs: string;
  mileageKm: number;
  maintenanceNote: string;
  imageUrl: string;
  updatedAt: string;
  stationId?: string;
  stationName?: string;
  lat?: number;
  lng?: number;
  qrToken?: string;
  batteryPercent?: number;
}

export interface CreateBikeInput {
  code: string;
  model: string;
  brand: string;
  category: BikeCategory;
  frameSize: FrameSize;
  hourlyRate: number;
  dailyRate: number;
  status: BikeStatus;
  specs: string;
  mileageKm: number;
  maintenanceNote: string;
  imageUrl: string;
  stationId?: string;
}

export interface Rental {
  id: string;
  reservationCode: string;
  bikeId: string;
  bikeModel: string;
  bikeBrand: string;
  bikeCode: string;
  bikeImageUrl: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpf: string;
  rentalUnit: RentalUnit;
  duration: number;
  pickupDate: string;
  includeInsurance: boolean;
  includePhoneMount: boolean;
  paymentMethod: PaymentMethod;
  installments: number;
  paymentStatus: PaymentStatus;
  rentalStatus: RentalStatus;
  subtotal: number;
  extrasTotal: number;
  discountTotal: number;
  totalAmount: number;
  pixCode?: string;
  cardLast4?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Transaction {
  id: string;
  rentalId: string;
  reservationCode: string;
  customerName: string;
  bikeModel: string;
  method: PaymentMethod;
  installments: number;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
}

export interface CreateRentalInput {
  bikeId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpf: string;
  rentalUnit: RentalUnit;
  duration: number;
  pickupDate: string;
  includeInsurance: boolean;
  includePhoneMount: boolean;
  paymentMethod: PaymentMethod;
  installments?: number;
  cardLast4?: string;
}

export interface SavedCard {
  id: string;
  brand: 'Visa' | 'Mastercard' | 'Elo';
  last4: string;
  holderName: string;
  expiry: string;
  isDefault: boolean;
}

export interface SubscriptionPlan {
  id: 'mensal-urbano' | 'mensal-eletrico';
  name: string;
  description: string;
  priceMonthly: number;
  freeMinutesPerRide: number;
  includesElectric: boolean;
  extraMinuteDiscountPct: number;
}

export interface ActiveSubscription {
  planId: SubscriptionPlan['id'];
  planName: string;
  priceMonthly: number;
  freeMinutesPerRide: number;
  includesElectric: boolean;
  extraMinuteDiscountPct: number;
  startedAt: string;
  expiresAt: string;
  paymentMethod: 'carteira' | 'pix' | 'cartao' | 'nupay';
}

export type RideBillingMode = 'tempo' | 'assinatura';

export interface RideRecord {
  id: string;
  bikeId: string;
  bikeCode: string;
  bikeModel: string;
  bikeBrand: string;
  bikeCategory: BikeCategory;
  bikeImageUrl: string;
  stationStartId: string;
  stationStartName: string;
  stationEndId?: string;
  stationEndName?: string;
  startedAt: string;
  endedAt?: string;
  durationMinutes: number;
  distanceKm: number;
  caloriesBurned: number;
  co2SavedKg: number;
  billingMode: RideBillingMode;
  paymentMethod: 'carteira' | 'pix' | 'cartao' | 'nupay' | 'assinatura';
  amountPaid: number;
  status: 'em_andamento' | 'concluida';
}

export interface CustomerAccountState {
  walletBalance: number;
  savedCards: SavedCard[];
  activeSubscription: ActiveSubscription | null;
  subscriptionPlans: SubscriptionPlan[];
  activeRide: RideRecord | null;
  rides: RideRecord[];
}
