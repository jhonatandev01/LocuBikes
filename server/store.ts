import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  ActiveSubscription,
  Bike,
  CreateBikeInput,
  CreateRentalInput,
  CustomerAccountState,
  PaymentMethod,
  Rental,
  RideRecord,
  SavedCard,
  Station,
  SubscriptionPlan,
  Transaction,
} from '../src/types/bike';
import {
  calculateRideCost,
  calculateRideStats,
  detectCardBrand,
  haversineDistanceKm,
  parseBikeQrCode,
} from '../src/utils/mobility';
import {
  calculateRentalBreakdown,
  generatePixPayload,
  onlyDigits,
  roundCurrency,
  validateBikeInput,
  validateCardPayment,
  validateCustomerForm,
} from '../src/utils/pricing';

export interface CompanySession {
  token: string;
  email: string;
  createdAt: string;
}

export interface StoredCustomerAccount {
  walletBalance: number;
  savedCards: SavedCard[];
  activeSubscription: ActiveSubscription | null;
  activeRide: RideRecord | null;
  rides: RideRecord[];
}

export interface DatabaseState {
  bikes: Bike[];
  stations?: Station[];
  rentals: Rental[];
  transactions: Transaction[];
  sessions?: CompanySession[];
  customerAccount?: StoredCustomerAccount;
}

const COMPANY_EMAIL = (process.env.COMPANY_ADMIN_EMAIL || 'admin@locubikes.com.br').toLowerCase();
const COMPANY_PASSWORD = process.env.COMPANY_ADMIN_PASSWORD || 'locubikes2026';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'locubikes-db.json');

export const STATIONS: Station[] = [
  {
    id: 'st-paulista',
    name: 'Estação Paulista · Trianon',
    neighborhood: 'Bela Vista',
    address: 'Av. Paulista, 1578 · Em frente ao MASP',
    lat: -23.5614,
    lng: -46.6559,
    totalDocks: 14,
  },
  {
    id: 'st-jardins',
    name: 'Estação Oscar Freire',
    neighborhood: 'Jardins',
    address: 'Rua Oscar Freire, 820 · Esq. Haddock Lobo',
    lat: -23.5632,
    lng: -46.6691,
    totalDocks: 12,
  },
  {
    id: 'st-ibirapuera',
    name: 'Estação Ibirapuera · Portão 3',
    neighborhood: 'Moema / Parque',
    address: 'Av. Pedro Álvares Cabral · Portão 3',
    lat: -23.5844,
    lng: -46.6576,
    totalDocks: 18,
  },
  {
    id: 'st-farialima',
    name: 'Estação Faria Lima',
    neighborhood: 'Pinheiros',
    address: 'Av. Brig. Faria Lima, 2100 · Ciclovia',
    lat: -23.5698,
    lng: -46.6884,
    totalDocks: 16,
  },
  {
    id: 'st-vilamariana',
    name: 'Estação Ana Rosa · Ciclovia',
    neighborhood: 'Vila Mariana',
    address: 'Av. Vergueiro, 2240 · Próximo ao Metrô',
    lat: -23.5812,
    lng: -46.6389,
    totalDocks: 10,
  },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'mensal-urbano',
    name: 'Passe Urbano Mensal',
    description: 'Viagens ilimitadas de até 45 min em bikes Urbanas, Gravel e Estrada sem taxa de desbloqueio.',
    priceMonthly: 49.9,
    freeMinutesPerRide: 45,
    includesElectric: false,
    extraMinuteDiscountPct: 10,
  },
  {
    id: 'mensal-eletrico',
    name: 'Passe Elétrico Pro',
    description: 'Viagens ilimitadas de até 60 min incluindo bicicletas Elétricas + 20% de desconto em minutos extras.',
    priceMonthly: 89.9,
    freeMinutesPerRide: 60,
    includesElectric: true,
    extraMinuteDiscountPct: 20,
  },
];

const SEED_CUSTOMER_ACCOUNT: StoredCustomerAccount = {
  walletBalance: 85.0,
  savedCards: [
    {
      id: 'card-seed-1',
      brand: 'Visa',
      last4: '4242',
      holderName: 'MARINA SILVA',
      expiry: '08/29',
      isDefault: true,
    },
  ],
  activeSubscription: null,
  activeRide: null,
  rides: [
    {
      id: 'ride-303',
      bikeId: 'bike-2',
      bikeCode: 'LOC-02',
      bikeModel: 'C4 Classic',
      bikeBrand: 'Cowboy',
      bikeCategory: 'Elétrica',
      bikeImageUrl: '/src/assets/images/bike_electric_city_1795025971955.jpg',
      stationStartId: 'st-paulista',
      stationStartName: 'Estação Paulista · Trianon',
      stationEndId: 'st-ibirapuera',
      stationEndName: 'Estação Ibirapuera · Portão 3',
      startedAt: '2026-11-17T17:10:00.000Z',
      endedAt: '2026-11-17T17:34:00.000Z',
      durationMinutes: 24,
      distanceKm: 6.4,
      caloriesBurned: 94,
      co2SavedKg: 1.22,
      billingMode: 'tempo',
      paymentMethod: 'carteira',
      amountPaid: 20.5,
      status: 'concluida',
    },
    {
      id: 'ride-302',
      bikeId: 'bike-1',
      bikeCode: 'LOC-01',
      bikeModel: 'Bad Boy 3 Urban',
      bikeBrand: 'Cannondale',
      bikeCategory: 'Urbana',
      bikeImageUrl: '/src/assets/images/bike_urban_matte_1795025971122.jpg',
      stationStartId: 'st-jardins',
      stationStartName: 'Estação Oscar Freire',
      stationEndId: 'st-paulista',
      stationEndName: 'Estação Paulista · Trianon',
      startedAt: '2026-11-15T08:40:00.000Z',
      endedAt: '2026-11-15T09:12:00.000Z',
      durationMinutes: 32,
      distanceKm: 7.8,
      caloriesBurned: 205,
      co2SavedKg: 1.48,
      billingMode: 'tempo',
      paymentMethod: 'pix',
      amountPaid: 16.56,
      status: 'concluida',
    },
    {
      id: 'ride-301',
      bikeId: 'bike-3',
      bikeCode: 'LOC-03',
      bikeModel: 'Diverge E5 Elite',
      bikeBrand: 'Specialized',
      bikeCategory: 'Gravel',
      bikeImageUrl: '/src/assets/images/bike_gravel_sand_1795025972849.jpg',
      stationStartId: 'st-farialima',
      stationStartName: 'Estação Faria Lima',
      stationEndId: 'st-ibirapuera',
      stationEndName: 'Estação Ibirapuera · Portão 3',
      startedAt: '2026-11-12T10:15:00.000Z',
      endedAt: '2026-11-12T10:57:00.000Z',
      durationMinutes: 42,
      distanceKm: 12.2,
      caloriesBurned: 328,
      co2SavedKg: 2.32,
      billingMode: 'tempo',
      paymentMethod: 'cartao',
      amountPaid: 31.9,
      status: 'concluida',
    },
  ],
};

const SEED_STATE: DatabaseState = {
  stations: STATIONS,
  customerAccount: SEED_CUSTOMER_ACCOUNT,
  bikes: [
    {
      id: 'bike-1',
      code: 'LOC-01',
      model: 'Bad Boy 3 Urban',
      brand: 'Cannondale',
      category: 'Urbana',
      frameSize: 'M',
      hourlyRate: 28,
      dailyRate: 110,
      status: 'disponivel',
      specs: 'Correia dentada · Freio hidráulico · Quadro alumínio fosco',
      mileageKm: 420,
      maintenanceNote: 'Revisão completa em Nov/2026',
      imageUrl: '/src/assets/images/bike_urban_matte_1795025971122.jpg',
      updatedAt: '2026-11-15T10:00:00.000Z',
      stationId: 'st-paulista',
      stationName: 'Estação Paulista · Trianon',
      lat: -23.5612,
      lng: -46.6556,
      qrToken: 'LOCUBIKE-LOC-01',
    },
    {
      id: 'bike-2',
      code: 'LOC-02',
      model: 'C4 Classic',
      brand: 'Cowboy',
      category: 'Elétrica',
      frameSize: 'M',
      hourlyRate: 45,
      dailyRate: 175,
      status: 'disponivel',
      specs: 'Motor 250W · Autonomia 75 km · Bateria integrada removível',
      mileageKm: 680,
      maintenanceNote: 'Bateria 98% de saúde',
      imageUrl: '/src/assets/images/bike_electric_city_1795025971955.jpg',
      updatedAt: '2026-11-16T09:30:00.000Z',
      stationId: 'st-jardins',
      stationName: 'Estação Oscar Freire',
      lat: -23.5634,
      lng: -46.6689,
      qrToken: 'LOCUBIKE-LOC-02',
      batteryPercent: 98,
    },
    {
      id: 'bike-3',
      code: 'LOC-03',
      model: 'Diverge E5 Elite',
      brand: 'Specialized',
      category: 'Gravel',
      frameSize: 'G',
      hourlyRate: 42,
      dailyRate: 165,
      status: 'disponivel',
      specs: 'Shimano GRX 20v · Pneus 42mm · Garfo de carbono FACT',
      mileageKm: 890,
      maintenanceNote: 'Pneus tubeless recalibrados',
      imageUrl: '/src/assets/images/bike_gravel_sand_1795025972849.jpg',
      updatedAt: '2026-11-14T16:15:00.000Z',
      stationId: 'st-ibirapuera',
      stationName: 'Estação Ibirapuera · Portão 3',
      lat: -23.5841,
      lng: -46.6579,
      qrToken: 'LOCUBIKE-LOC-03',
    },
    {
      id: 'bike-4',
      code: 'LOC-04',
      model: 'Tarmac SL7 Pro',
      brand: 'Specialized',
      category: 'Estrada',
      frameSize: 'M',
      hourlyRate: 58,
      dailyRate: 230,
      status: 'alugada',
      specs: 'Quadro carbono FACT 10r · Rodas perfil 50mm · Grupo 12v',
      mileageKm: 1240,
      maintenanceNote: 'Em locação ativa',
      imageUrl: '/src/assets/images/bike_road_carbon_1795025972364.jpg',
      updatedAt: '2026-11-18T08:15:00.000Z',
      stationId: 'st-farialima',
      stationName: 'Estação Faria Lima',
      lat: -23.5698,
      lng: -46.6884,
      qrToken: 'LOCUBIKE-LOC-04',
    },
    {
      id: 'bike-5',
      code: 'LOC-05',
      model: 'Metro City S9',
      brand: 'Sense',
      category: 'Urbana',
      frameSize: 'P',
      hourlyRate: 24,
      dailyRate: 95,
      status: 'disponivel',
      specs: 'Cubo interno 8v · Para-lamas integrados · Iluminação LED',
      mileageKm: 310,
      maintenanceNote: 'Pronta para retirada',
      imageUrl: '/src/assets/images/bike_urban_matte_1795025971122.jpg',
      updatedAt: '2026-11-17T11:20:00.000Z',
      stationId: 'st-vilamariana',
      stationName: 'Estação Ana Rosa · Ciclovia',
      lat: -23.581,
      lng: -46.6392,
      qrToken: 'LOCUBIKE-LOC-05',
    },
    {
      id: 'bike-6',
      code: 'LOC-06',
      model: 'Vado SL 4.0 EQ',
      brand: 'Specialized',
      category: 'Elétrica',
      frameSize: 'G',
      hourlyRate: 48,
      dailyRate: 190,
      status: 'manutencao',
      specs: 'Assistência 240W leve · 14,9 kg · Bagageiro traseiro',
      mileageKm: 1520,
      maintenanceNote: 'Troca preventiva de pastilhas de freio',
      imageUrl: '/src/assets/images/bike_electric_city_1795025971955.jpg',
      updatedAt: '2026-11-18T07:40:00.000Z',
      stationId: 'st-paulista',
      stationName: 'Estação Paulista · Trianon',
      lat: -23.5618,
      lng: -46.6563,
      qrToken: 'LOCUBIKE-LOC-06',
      batteryPercent: 86,
    },
  ],
  rentals: [
    {
      id: 'rent-101',
      reservationCode: 'LOC-4810',
      bikeId: 'bike-4',
      bikeModel: 'Tarmac SL7 Pro',
      bikeBrand: 'Specialized',
      bikeCode: 'LOC-04',
      bikeImageUrl: '/src/assets/images/bike_road_carbon_1795025972364.jpg',
      customerName: 'Rafael Mendes',
      customerEmail: 'rafael.mendes@exemplo.com.br',
      customerPhone: '(11) 99123-4567',
      customerCpf: '345.678.910-11',
      rentalUnit: 'dia',
      duration: 2,
      pickupDate: '2026-11-18',
      includeInsurance: true,
      includePhoneMount: false,
      paymentMethod: 'pix',
      installments: 1,
      paymentStatus: 'pago',
      rentalStatus: 'ativa',
      subtotal: 460,
      extrasTotal: 36,
      discountTotal: 24.8,
      totalAmount: 471.2,
      pixCode: generatePixPayload('LOC-4810', 471.2),
      createdAt: '2026-11-18T08:15:00.000Z',
    },
    {
      id: 'rent-100',
      reservationCode: 'LOC-4795',
      bikeId: 'bike-2',
      bikeModel: 'C4 Classic',
      bikeBrand: 'Cowboy',
      bikeCode: 'LOC-02',
      bikeImageUrl: '/src/assets/images/bike_electric_city_1795025971955.jpg',
      customerName: 'Camila Duarte',
      customerEmail: 'camila.duarte@exemplo.com.br',
      customerPhone: '(11) 98444-3210',
      customerCpf: '221.456.789-00',
      rentalUnit: 'hora',
      duration: 4,
      pickupDate: '2026-11-16',
      includeInsurance: false,
      includePhoneMount: true,
      paymentMethod: 'cartao',
      installments: 2,
      paymentStatus: 'pago',
      rentalStatus: 'concluida',
      subtotal: 180,
      extrasTotal: 12,
      discountTotal: 0,
      totalAmount: 192,
      cardLast4: '4821',
      createdAt: '2026-11-16T14:00:00.000Z',
      completedAt: '2026-11-16T18:10:00.000Z',
    },
  ],
  transactions: [
    {
      id: 'tx-202',
      rentalId: 'rent-101',
      reservationCode: 'LOC-4810',
      customerName: 'Rafael Mendes',
      bikeModel: 'Specialized Tarmac SL7 Pro',
      method: 'pix',
      installments: 1,
      amount: 471.2,
      status: 'pago',
      createdAt: '2026-11-18T08:15:00.000Z',
    },
    {
      id: 'tx-201',
      rentalId: 'rent-100',
      reservationCode: 'LOC-4795',
      customerName: 'Camila Duarte',
      bikeModel: 'Cowboy C4 Classic',
      method: 'cartao',
      installments: 2,
      amount: 192,
      status: 'pago',
      createdAt: '2026-11-16T14:00:00.000Z',
    },
  ],
};

function enrichBikeGeo(bike: Bike, index: number): Bike {
  const station =
    STATIONS.find((s) => s.id === bike.stationId) || STATIONS[index % STATIONS.length];
  const jitterLat = ((index % 3) - 1) * 0.00025;
  const jitterLng = (((index + 1) % 3) - 1) * 0.00025;
  return {
    ...bike,
    stationId: bike.stationId || station.id,
    stationName: bike.stationName || station.name,
    lat: bike.lat ?? roundCurrency(station.lat * 100 + jitterLat * 100) / 100,
    lng: bike.lng ?? roundCurrency(station.lng * 100 + jitterLng * 100) / 100,
    qrToken: bike.qrToken || `LOCUBIKE-${bike.code.toUpperCase()}`,
    batteryPercent:
      bike.category === 'Elétrica' ? (bike.batteryPercent ?? 92) : bike.batteryPercent,
  };
}

function ensureDbExists(): DatabaseState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(SEED_STATE, null, 2), 'utf-8');
    return structuredClone(SEED_STATE);
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseState;
    if (!Array.isArray(parsed.bikes) || !Array.isArray(parsed.rentals) || !Array.isArray(parsed.transactions)) {
      throw new Error('Invalid DB structure');
    }
    parsed.stations = Array.isArray(parsed.stations) && parsed.stations.length > 0 ? parsed.stations : structuredClone(STATIONS);
    parsed.bikes = parsed.bikes.map((b, idx) => enrichBikeGeo(b, idx));
    if (!parsed.customerAccount) {
      parsed.customerAccount = structuredClone(SEED_CUSTOMER_ACCOUNT);
    }
    return parsed;
  } catch {
    fs.writeFileSync(DB_PATH, JSON.stringify(SEED_STATE, null, 2), 'utf-8');
    return structuredClone(SEED_STATE);
  }
}

function saveDb(state: DatabaseState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_PATH);
}

export function getState(): DatabaseState {
  return ensureDbExists();
}

export function getCustomerAccount(db?: DatabaseState): CustomerAccountState {
  const state = db ?? ensureDbExists();
  const acc = state.customerAccount ?? SEED_CUSTOMER_ACCOUNT;
  return {
    walletBalance: acc.walletBalance,
    savedCards: acc.savedCards,
    activeSubscription: acc.activeSubscription,
    subscriptionPlans: SUBSCRIPTION_PLANS,
    activeRide: acc.activeRide,
    rides: acc.rides,
  };
}

export function createBike(input: CreateBikeInput): Bike {
  const errors = validateBikeInput({
    code: input.code,
    model: input.model,
    brand: input.brand,
    hourlyRate: Number(input.hourlyRate),
    dailyRate: Number(input.dailyRate),
    specs: input.specs,
  });
  if (Object.keys(errors).length > 0) {
    const firstMsg = Object.values(errors)[0];
    throw new Error(firstMsg);
  }

  const db = ensureDbExists();
  const normalizedCode = input.code.trim().toUpperCase();
  if (db.bikes.some((b) => b.code.toUpperCase() === normalizedCode)) {
    throw new Error(`Já existe uma bicicleta com o código ${normalizedCode}.`);
  }

  const station =
    (db.stations || STATIONS).find((s) => s.id === input.stationId) || (db.stations || STATIONS)[0];

  const newBike: Bike = {
    id: `bike-${Date.now()}`,
    code: normalizedCode,
    model: input.model.trim(),
    brand: input.brand.trim(),
    category: input.category,
    frameSize: input.frameSize,
    hourlyRate: Number(input.hourlyRate),
    dailyRate: Number(input.dailyRate),
    status: input.status === 'alugada' ? 'disponivel' : input.status,
    specs: input.specs.trim(),
    mileageKm: Math.max(0, Number(input.mileageKm) || 0),
    maintenanceNote: (input.maintenanceNote || '').trim() || 'Pronta para retirada',
    imageUrl: input.imageUrl.trim() || '/src/assets/images/bike_urban_matte_1795025971122.jpg',
    updatedAt: new Date().toISOString(),
    stationId: station.id,
    stationName: station.name,
    lat: station.lat + 0.0002,
    lng: station.lng - 0.0002,
    qrToken: `LOCUBIKE-${normalizedCode}`,
    batteryPercent: input.category === 'Elétrica' ? 100 : undefined,
  };

  db.bikes.unshift(newBike);
  saveDb(db);
  return newBike;
}

export function updateBike(id: string, patch: Partial<CreateBikeInput>): Bike {
  const db = ensureDbExists();
  const index = db.bikes.findIndex((b) => b.id === id);
  if (index === -1) {
    throw new Error('Bicicleta não encontrada.');
  }

  const current = db.bikes[index];
  const nextStation = patch.stationId
    ? (db.stations || STATIONS).find((s) => s.id === patch.stationId)
    : undefined;
  const nextCode = patch.code !== undefined ? patch.code.trim().toUpperCase() : current.code;

  const merged: Bike = {
    ...current,
    code: nextCode,
    model: patch.model !== undefined ? patch.model.trim() : current.model,
    brand: patch.brand !== undefined ? patch.brand.trim() : current.brand,
    category: patch.category !== undefined ? patch.category : current.category,
    frameSize: patch.frameSize !== undefined ? patch.frameSize : current.frameSize,
    hourlyRate: patch.hourlyRate !== undefined ? Number(patch.hourlyRate) : current.hourlyRate,
    dailyRate: patch.dailyRate !== undefined ? Number(patch.dailyRate) : current.dailyRate,
    status: patch.status !== undefined ? patch.status : current.status,
    specs: patch.specs !== undefined ? patch.specs.trim() : current.specs,
    mileageKm: patch.mileageKm !== undefined ? Math.max(0, Number(patch.mileageKm)) : current.mileageKm,
    maintenanceNote:
      patch.maintenanceNote !== undefined ? patch.maintenanceNote.trim() : current.maintenanceNote,
    imageUrl: patch.imageUrl !== undefined ? patch.imageUrl.trim() : current.imageUrl,
    stationId: nextStation ? nextStation.id : current.stationId,
    stationName: nextStation ? nextStation.name : current.stationName,
    lat: nextStation ? nextStation.lat : current.lat,
    lng: nextStation ? nextStation.lng : current.lng,
    qrToken: `LOCUBIKE-${nextCode}`,
    updatedAt: new Date().toISOString(),
  };

  const errors = validateBikeInput({
    code: merged.code,
    model: merged.model,
    brand: merged.brand,
    hourlyRate: merged.hourlyRate,
    dailyRate: merged.dailyRate,
    specs: merged.specs,
  });
  if (Object.keys(errors).length > 0) {
    throw new Error(Object.values(errors)[0]);
  }

  if (db.bikes.some((b) => b.id !== id && b.code.toUpperCase() === merged.code.toUpperCase())) {
    throw new Error(`Já existe outra unidade com o código ${merged.code}.`);
  }

  db.bikes[index] = merged;
  saveDb(db);
  return merged;
}

export function deleteBike(id: string): void {
  const db = ensureDbExists();
  const bike = db.bikes.find((b) => b.id === id);
  if (!bike) {
    throw new Error('Bicicleta não encontrada.');
  }
  const hasActiveRental = db.rentals.some(
    (r) => r.bikeId === id && (r.rentalStatus === 'ativa' || r.rentalStatus === 'pendente')
  );
  const hasActiveRide = db.customerAccount?.activeRide?.bikeId === id;
  if (hasActiveRental || hasActiveRide || bike.status === 'alugada') {
    throw new Error('Não é possível excluir uma bicicleta com locação ou corrida ativa.');
  }
  db.bikes = db.bikes.filter((b) => b.id !== id);
  saveDb(db);
}

export function createRental(input: CreateRentalInput): { rental: Rental; transaction: Transaction } {
  const customerErrors = validateCustomerForm({
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    customerCpf: input.customerCpf,
    pickupDate: input.pickupDate,
    duration: Number(input.duration),
  });
  if (Object.keys(customerErrors).length > 0) {
    throw new Error(Object.values(customerErrors)[0]);
  }

  const db = ensureDbExists();
  const bikeIndex = db.bikes.findIndex((b) => b.id === input.bikeId);
  if (bikeIndex === -1) {
    throw new Error('Bicicleta não encontrada.');
  }
  const bike = db.bikes[bikeIndex];
  if (bike.status !== 'disponivel') {
    throw new Error(`A bicicleta ${bike.model} não está disponível para aluguel no momento.`);
  }

  const breakdown = calculateRentalBreakdown({
    hourlyRate: bike.hourlyRate,
    dailyRate: bike.dailyRate,
    rentalUnit: input.rentalUnit,
    duration: Number(input.duration),
    includeInsurance: Boolean(input.includeInsurance),
    includePhoneMount: Boolean(input.includePhoneMount),
    paymentMethod: input.paymentMethod,
  });

  const codeNumber = 4820 + db.rentals.length + Math.floor(Math.random() * 80);
  const reservationCode = `LOC-${codeNumber}`;
  const isImmediatePay = input.paymentMethod === 'pix' || input.paymentMethod === 'cartao';
  const nowIso = new Date().toISOString();

  const rental: Rental = {
    id: `rent-${Date.now()}`,
    reservationCode,
    bikeId: bike.id,
    bikeModel: bike.model,
    bikeBrand: bike.brand,
    bikeCode: bike.code,
    bikeImageUrl: bike.imageUrl,
    customerName: input.customerName.trim(),
    customerEmail: input.customerEmail.trim(),
    customerPhone: input.customerPhone.trim(),
    customerCpf: input.customerCpf.trim(),
    rentalUnit: input.rentalUnit,
    duration: Math.max(1, Math.floor(Number(input.duration))),
    pickupDate: input.pickupDate,
    includeInsurance: Boolean(input.includeInsurance),
    includePhoneMount: Boolean(input.includePhoneMount),
    paymentMethod: input.paymentMethod,
    installments: input.paymentMethod === 'cartao' ? Math.max(1, Math.min(6, input.installments || 1)) : 1,
    paymentStatus: isImmediatePay ? 'pago' : 'pendente',
    rentalStatus: isImmediatePay ? 'ativa' : 'pendente',
    subtotal: breakdown.subtotal,
    extrasTotal: breakdown.extrasTotal,
    discountTotal: breakdown.discountTotal,
    totalAmount: breakdown.totalAmount,
    pixCode: input.paymentMethod === 'pix' ? generatePixPayload(reservationCode, breakdown.totalAmount) : undefined,
    cardLast4: input.paymentMethod === 'cartao' ? input.cardLast4 || '0000' : undefined,
    createdAt: nowIso,
  };

  const transaction: Transaction = {
    id: `tx-${Date.now()}`,
    rentalId: rental.id,
    reservationCode: rental.reservationCode,
    customerName: rental.customerName,
    bikeModel: `${bike.brand} ${bike.model}`,
    method: rental.paymentMethod,
    installments: rental.installments,
    amount: rental.totalAmount,
    status: rental.paymentStatus,
    createdAt: nowIso,
  };

  db.bikes[bikeIndex] = {
    ...bike,
    status: 'alugada',
    maintenanceNote: isImmediatePay ? 'Em locação ativa' : 'Reservada (aguardando retirada)',
    updatedAt: nowIso,
  };
  db.rentals.unshift(rental);
  db.transactions.unshift(transaction);
  saveDb(db);

  return { rental, transaction };
}

export function settleRentalPayment(
  rentalId: string,
  method: PaymentMethod,
  installments = 1,
  cardLast4?: string
): { rental: Rental; transaction: Transaction } {
  const db = ensureDbExists();
  const rIdx = db.rentals.findIndex((r) => r.id === rentalId);
  if (rIdx === -1) {
    throw new Error('Reserva não encontrada.');
  }
  const rental = db.rentals[rIdx];
  if (rental.paymentStatus === 'pago') {
    throw new Error('Esta reserva já está paga.');
  }
  if (rental.rentalStatus === 'cancelada') {
    throw new Error('Não é possível pagar uma reserva cancelada.');
  }

  const nowIso = new Date().toISOString();
  const updatedRental: Rental = {
    ...rental,
    paymentMethod: method,
    installments: method === 'cartao' ? Math.max(1, Math.min(6, installments)) : 1,
    paymentStatus: 'pago',
    rentalStatus: 'ativa',
    pixCode: method === 'pix' ? generatePixPayload(rental.reservationCode, rental.totalAmount) : rental.pixCode,
    cardLast4: method === 'cartao' ? cardLast4 || '0000' : rental.cardLast4,
  };

  db.rentals[rIdx] = updatedRental;

  const tIdx = db.transactions.findIndex((t) => t.rentalId === rentalId);
  let updatedTx: Transaction;
  if (tIdx !== -1) {
    updatedTx = {
      ...db.transactions[tIdx],
      method,
      installments: updatedRental.installments,
      status: 'pago',
      createdAt: nowIso,
    };
    db.transactions[tIdx] = updatedTx;
  } else {
    updatedTx = {
      id: `tx-${Date.now()}`,
      rentalId: updatedRental.id,
      reservationCode: updatedRental.reservationCode,
      customerName: updatedRental.customerName,
      bikeModel: `${updatedRental.bikeBrand} ${updatedRental.bikeModel}`,
      method,
      installments: updatedRental.installments,
      amount: updatedRental.totalAmount,
      status: 'pago',
      createdAt: nowIso,
    };
    db.transactions.unshift(updatedTx);
  }

  saveDb(db);
  return { rental: updatedRental, transaction: updatedTx };
}

export function completeRental(rentalId: string): Rental {
  const db = ensureDbExists();
  const rIdx = db.rentals.findIndex((r) => r.id === rentalId);
  if (rIdx === -1) {
    throw new Error('Locação não encontrada.');
  }
  const rental = db.rentals[rIdx];
  if (rental.rentalStatus === 'concluida' || rental.rentalStatus === 'cancelada') {
    throw new Error('Esta locação já foi encerrada.');
  }

  const nowIso = new Date().toISOString();
  const updatedRental: Rental = {
    ...rental,
    rentalStatus: 'concluida',
    paymentStatus: 'pago',
    completedAt: nowIso,
  };
  db.rentals[rIdx] = updatedRental;

  const tIdx = db.transactions.findIndex((t) => t.rentalId === rentalId);
  if (tIdx !== -1 && db.transactions[tIdx].status === 'pendente') {
    db.transactions[tIdx] = { ...db.transactions[tIdx], status: 'pago' };
  }

  const bIdx = db.bikes.findIndex((b) => b.id === rental.bikeId);
  if (bIdx !== -1) {
    const estimatedKm = rental.rentalUnit === 'dia' ? rental.duration * 25 : rental.duration * 8;
    db.bikes[bIdx] = {
      ...db.bikes[bIdx],
      status: 'disponivel',
      mileageKm: db.bikes[bIdx].mileageKm + estimatedKm,
      maintenanceNote: 'Devolvida e inspecionada',
      updatedAt: nowIso,
    };
  }

  saveDb(db);
  return updatedRental;
}

export function cancelRental(rentalId: string): Rental {
  const db = ensureDbExists();
  const rIdx = db.rentals.findIndex((r) => r.id === rentalId);
  if (rIdx === -1) {
    throw new Error('Reserva não encontrada.');
  }
  const rental = db.rentals[rIdx];
  if (rental.rentalStatus === 'concluida' || rental.rentalStatus === 'cancelada') {
    throw new Error('Esta reserva não pode ser cancelada.');
  }

  const nowIso = new Date().toISOString();
  const updatedRental: Rental = {
    ...rental,
    rentalStatus: 'cancelada',
    paymentStatus: rental.paymentStatus === 'pago' ? 'estornado' : 'pendente',
  };
  db.rentals[rIdx] = updatedRental;

  const tIdx = db.transactions.findIndex((t) => t.rentalId === rentalId);
  if (tIdx !== -1) {
    db.transactions[tIdx] = {
      ...db.transactions[tIdx],
      status: updatedRental.paymentStatus,
    };
  }

  const bIdx = db.bikes.findIndex((b) => b.id === rental.bikeId);
  if (bIdx !== -1 && db.bikes[bIdx].status === 'alugada') {
    db.bikes[bIdx] = {
      ...db.bikes[bIdx],
      status: 'disponivel',
      maintenanceNote: 'Reserva cancelada · Disponível',
      updatedAt: nowIso,
    };
  }

  saveDb(db);
  return updatedRental;
}

// --- Customer Mobile Mobility Actions ---

export function topUpCustomerWallet(
  amount: number,
  method: 'pix' | 'cartao'
): { customerAccount: CustomerAccountState; transaction: Transaction } {
  if (!Number.isFinite(amount) || amount < 10 || amount > 1000) {
    throw new Error('Informe um valor entre R$ 10,00 e R$ 1.000,00 para recarga.');
  }
  const db = ensureDbExists();
  const acc = db.customerAccount!;
  if (method === 'cartao' && acc.savedCards.length === 0) {
    throw new Error('Cadastre um cartão de crédito antes de recarregar via cartão.');
  }

  const safeAmount = roundCurrency(amount);
  acc.walletBalance = roundCurrency(acc.walletBalance + safeAmount);
  const nowIso = new Date().toISOString();
  const tx: Transaction = {
    id: `tx-${Date.now()}`,
    rentalId: `wallet-${Date.now()}`,
    reservationCode: `CART-${String(Date.now()).slice(-4)}`,
    customerName: 'Recarga Carteira App',
    bikeModel: 'Crédito Carteira Digital',
    method,
    installments: 1,
    amount: safeAmount,
    status: 'pago',
    createdAt: nowIso,
  };
  db.transactions.unshift(tx);
  saveDb(db);
  return { customerAccount: getCustomerAccount(db), transaction: tx };
}

export function addCustomerCard(input: {
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvv: string;
}): CustomerAccountState {
  const errors = validateCardPayment(input);
  if (Object.keys(errors).length > 0) {
    throw new Error(Object.values(errors)[0]);
  }
  const db = ensureDbExists();
  const acc = db.customerAccount!;
  const digits = onlyDigits(input.cardNumber);
  const last4 = digits.slice(-4);
  if (acc.savedCards.some((c) => c.last4 === last4 && c.expiry === input.expiry.trim())) {
    throw new Error('Este cartão já está cadastrado na sua conta.');
  }
  const newCard: SavedCard = {
    id: `card-${Date.now()}`,
    brand: detectCardBrand(digits),
    last4,
    holderName: input.cardHolder.trim().toUpperCase(),
    expiry: input.expiry.trim(),
    isDefault: acc.savedCards.length === 0,
  };
  acc.savedCards.push(newCard);
  saveDb(db);
  return getCustomerAccount(db);
}

export function removeCustomerCard(cardId: string): CustomerAccountState {
  const db = ensureDbExists();
  const acc = db.customerAccount!;
  acc.savedCards = acc.savedCards.filter((c) => c.id !== cardId);
  if (acc.savedCards.length > 0 && !acc.savedCards.some((c) => c.isDefault)) {
    acc.savedCards[0].isDefault = true;
  }
  saveDb(db);
  return getCustomerAccount(db);
}

export function subscribeCustomerPlan(
  planId: SubscriptionPlan['id'],
  paymentMethod: 'carteira' | 'pix' | 'cartao'
): CustomerAccountState {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
  if (!plan) {
    throw new Error('Plano de assinatura não encontrado.');
  }
  const db = ensureDbExists();
  const acc = db.customerAccount!;

  if (paymentMethod === 'carteira') {
    if (acc.walletBalance < plan.priceMonthly) {
      throw new Error('Saldo insuficiente na carteira digital para assinar este plano.');
    }
    acc.walletBalance = roundCurrency(acc.walletBalance - plan.priceMonthly);
  } else if (paymentMethod === 'cartao' && acc.savedCards.length === 0) {
    throw new Error('Cadastre um cartão de crédito para assinar via cartão.');
  }

  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  acc.activeSubscription = {
    planId: plan.id,
    planName: plan.name,
    priceMonthly: plan.priceMonthly,
    freeMinutesPerRide: plan.freeMinutesPerRide,
    includesElectric: plan.includesElectric,
    extraMinuteDiscountPct: plan.extraMinuteDiscountPct,
    startedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    paymentMethod,
  };

  db.transactions.unshift({
    id: `tx-${Date.now()}`,
    rentalId: `sub-${Date.now()}`,
    reservationCode: `PASS-${String(Date.now()).slice(-4)}`,
    customerName: 'Assinante App',
    bikeModel: plan.name,
    method: paymentMethod,
    installments: 1,
    amount: plan.priceMonthly,
    status: 'pago',
    createdAt: now.toISOString(),
  });

  saveDb(db);
  return getCustomerAccount(db);
}

export function cancelCustomerSubscription(): CustomerAccountState {
  const db = ensureDbExists();
  db.customerAccount!.activeSubscription = null;
  saveDb(db);
  return getCustomerAccount(db);
}

export function unlockBikeByQr(input: {
  qrInput: string;
  paymentMethod: 'carteira' | 'pix' | 'cartao' | 'assinatura';
}): { activeRide: RideRecord; bike: Bike; customerAccount: CustomerAccountState } {
  const parsedCode = parseBikeQrCode(input.qrInput);
  if (!parsedCode) {
    throw new Error('QR Code inválido. Informe um código como LOC-01 ou LOCUBIKE-LOC-01.');
  }

  const db = ensureDbExists();
  const acc = db.customerAccount!;
  if (acc.activeRide) {
    throw new Error('Você já possui uma viagem em andamento. Encerre-a antes de desbloquear outra bike.');
  }

  const bikeIndex = db.bikes.findIndex((b) => b.code.toUpperCase() === parsedCode);
  if (bikeIndex === -1) {
    throw new Error(`Nenhuma bicicleta encontrada com o código ${parsedCode}.`);
  }
  const bike = db.bikes[bikeIndex];
  if (bike.status !== 'disponivel') {
    throw new Error(`A bicicleta ${bike.code} (${bike.model}) está indisponível no momento.`);
  }

  if (input.paymentMethod === 'assinatura') {
    if (!acc.activeSubscription) {
      throw new Error('Você não possui assinatura mensal ativa.');
    }
    if (bike.category === 'Elétrica' && !acc.activeSubscription.includesElectric) {
      throw new Error('Seu Passe Urbano Mensal não cobre bicicletas Elétricas. Escolha Carteira, PIX ou Cartão.');
    }
  } else if (input.paymentMethod === 'carteira' && acc.walletBalance < 5) {
    throw new Error('Saldo mínimo de R$ 5,00 na carteira necessário para iniciar a corrida.');
  } else if (input.paymentMethod === 'cartao' && acc.savedCards.length === 0) {
    throw new Error('Cadastre um cartão de crédito na aba Carteira para usar esta opção.');
  }

  const station =
    (db.stations || STATIONS).find((s) => s.id === bike.stationId) || (db.stations || STATIONS)[0];
  const nowIso = new Date().toISOString();

  const ride: RideRecord = {
    id: `ride-${Date.now()}`,
    bikeId: bike.id,
    bikeCode: bike.code,
    bikeModel: bike.model,
    bikeBrand: bike.brand,
    bikeCategory: bike.category,
    bikeImageUrl: bike.imageUrl,
    stationStartId: station.id,
    stationStartName: station.name,
    startedAt: nowIso,
    durationMinutes: 0,
    distanceKm: 0,
    caloriesBurned: 0,
    co2SavedKg: 0,
    billingMode: input.paymentMethod === 'assinatura' ? 'assinatura' : 'tempo',
    paymentMethod: input.paymentMethod,
    amountPaid: 0,
    status: 'em_andamento',
  };

  const updatedBike: Bike = {
    ...bike,
    status: 'alugada',
    maintenanceNote: 'Em viagem via QR Code',
    updatedAt: nowIso,
  };

  db.bikes[bikeIndex] = updatedBike;
  acc.activeRide = ride;
  saveDb(db);

  return {
    activeRide: ride,
    bike: updatedBike,
    customerAccount: getCustomerAccount(db),
  };
}

export function finishActiveRide(input: {
  rideId: string;
  endStationId?: string;
  elapsedMinutesOverride?: number;
}): { completedRide: RideRecord; bike: Bike; customerAccount: CustomerAccountState } {
  const db = ensureDbExists();
  const acc = db.customerAccount!;
  const activeRide = acc.activeRide;
  if (!activeRide || activeRide.id !== input.rideId) {
    throw new Error('Viagem ativa não encontrada.');
  }

  const bikeIndex = db.bikes.findIndex((b) => b.id === activeRide.bikeId);
  if (bikeIndex === -1) {
    throw new Error('Bicicleta da viagem não encontrada.');
  }
  const bike = db.bikes[bikeIndex];
  const stations = db.stations || STATIONS;
  const startStation = stations.find((s) => s.id === activeRide.stationStartId) || stations[0];
  const endStation = stations.find((s) => s.id === input.endStationId) || stations[1] || startStation;

  const actualElapsedMins = Math.max(
    1,
    Math.round((Date.now() - new Date(activeRide.startedAt).getTime()) / 60000)
  );
  // Allow demo/UI to pass simulated ride minutes (minimum 12 min when finishing fast demo ride)
  const durationMinutes = Math.max(
    1,
    Math.round(input.elapsedMinutesOverride ?? actualElapsedMins)
  );

  const stationDist = haversineDistanceKm(
    startStation.lat,
    startStation.lng,
    endStation.lat,
    endStation.lng
  );
  const stats = calculateRideStats({
    durationMinutes,
    category: bike.category,
    distanceKmOverride: stationDist > 0.3 ? Math.max(stationDist, Math.round((durationMinutes * 0.28) * 10) / 10) : undefined,
  });

  const amountPaid = calculateRideCost({
    hourlyRate: bike.hourlyRate,
    elapsedMinutes: durationMinutes,
    billingMode: activeRide.billingMode,
    freeMinutesIncluded: acc.activeSubscription?.freeMinutesPerRide,
    extraMinuteDiscountPct: acc.activeSubscription?.extraMinuteDiscountPct,
    paymentMethod: activeRide.paymentMethod,
  });

  if (activeRide.paymentMethod === 'carteira' && amountPaid > 0) {
    acc.walletBalance = Math.max(0, roundCurrency(acc.walletBalance - amountPaid));
  }

  const nowIso = new Date().toISOString();
  const completedRide: RideRecord = {
    ...activeRide,
    stationEndId: endStation.id,
    stationEndName: endStation.name,
    endedAt: nowIso,
    durationMinutes,
    distanceKm: stats.distanceKm,
    caloriesBurned: stats.caloriesBurned,
    co2SavedKg: stats.co2SavedKg,
    amountPaid,
    status: 'concluida',
  };

  const updatedBike: Bike = {
    ...bike,
    status: 'disponivel',
    stationId: endStation.id,
    stationName: endStation.name,
    lat: endStation.lat + 0.00015,
    lng: endStation.lng - 0.00015,
    mileageKm: Math.round(bike.mileageKm + stats.distanceKm),
    maintenanceNote: `Devolvida em ${endStation.name}`,
    updatedAt: nowIso,
  };

  db.bikes[bikeIndex] = updatedBike;
  acc.activeRide = null;
  acc.rides.unshift(completedRide);

  db.transactions.unshift({
    id: `tx-${Date.now()}`,
    rentalId: completedRide.id,
    reservationCode: `QR-${bike.code}`,
    customerName: 'Corrida App (QR Code)',
    bikeModel: `${bike.brand} ${bike.model}`,
    method: completedRide.paymentMethod,
    installments: 1,
    amount: amountPaid,
    status: 'pago',
    createdAt: nowIso,
  });

  saveDb(db);
  return {
    completedRide,
    bike: updatedBike,
    customerAccount: getCustomerAccount(db),
  };
}

export function authenticateCompany(email: string, password: string): CompanySession {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (normalizedEmail !== COMPANY_EMAIL || password !== COMPANY_PASSWORD) {
    throw new Error('E-mail ou senha inválidos.');
  }
  const db = ensureDbExists();
  const session: CompanySession = {
    token: crypto.randomBytes(24).toString('hex'),
    email: normalizedEmail,
    createdAt: new Date().toISOString(),
  };
  db.sessions = [...(db.sessions || []).slice(-19), session];
  saveDb(db);
  return session;
}

export function verifyCompanyToken(token: string | undefined): CompanySession | null {
  if (!token) return null;
  const db = ensureDbExists();
  return (db.sessions || []).find((s) => s.token === token) ?? null;
}

export function logoutCompanyToken(token: string | undefined): void {
  if (!token) return;
  const db = ensureDbExists();
  db.sessions = (db.sessions || []).filter((s) => s.token !== token);
  saveDb(db);
}

export function lookupCustomerRentals(codes: string[], query?: string): Rental[] {
  const db = ensureDbExists();
  const normalizedCodes = new Set(codes.map((c) => c.trim().toUpperCase()).filter(Boolean));
  const q = (query || '').trim().toUpperCase();

  return db.rentals.filter((r) => {
    if (q) {
      return (
        r.reservationCode.toUpperCase() === q ||
        r.customerCpf.replace(/\D/g, '') === q.replace(/\D/g, '')
      );
    }
    return normalizedCodes.has(r.reservationCode.toUpperCase());
  });
}
