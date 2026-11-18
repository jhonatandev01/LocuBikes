import { useCallback, useEffect, useState } from 'react';
import {
  addCustomerCardApi,
  cancelRentalApi,
  cancelSubscriptionApi,
  completeRentalApi,
  createBikeApi,
  createRentalApi,
  deleteBikeApi,
  fetchCompanyState,
  fetchPublicState,
  finishActiveRideApi,
  loginCompanyApi,
  logoutCompanyApi,
  removeCustomerCardApi,
  settleRentalPaymentApi,
  subscribePlanApi,
  topUpWalletApi,
  unlockBikeByQrApi,
  updateBikeApi,
  verifyCompanySessionApi,
} from './api/client';
import { BikeFormModal } from './components/BikeFormModal';
import { BookingModal } from './components/BookingModal';
import { CompanyLoginModal } from './components/CompanyLoginModal';
import { CustomerMapView } from './components/CustomerMapView';
import { FleetManagerView } from './components/FleetManagerView';
import { FloatingBikeOverlay } from './components/FloatingBikeOverlay';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Navbar, type AppSection, type ThemeMode } from './components/Navbar';
import { PaymentsView } from './components/PaymentsView';
import { QrUnlockModal } from './components/QrUnlockModal';
import { ReservationsView } from './components/ReservationsView';
import { RideHistoryView } from './components/RideHistoryView';
import { StorefrontView } from './components/StorefrontView';
import { WalletPaymentsView } from './components/WalletPaymentsView';
import type {
  Bike,
  BikeStatus,
  CreateBikeInput,
  CreateRentalInput,
  CustomerAccountState,
  PaymentMethod,
  Rental,
  RideRecord,
  Station,
  SubscriptionPlan,
  Transaction,
} from './types/bike';

const MY_CODES_KEY = 'locubikes-my-codes';

const EMPTY_CUSTOMER_ACCOUNT: CustomerAccountState = {
  walletBalance: 0,
  savedCards: [],
  activeSubscription: null,
  subscriptionPlans: [],
  activeRide: null,
  rides: [],
};

function getInitialTheme(): ThemeMode {
  try {
    return localStorage.getItem('locubikes-theme') === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function getStoredCustomerCodes(): string[] {
  try {
    const raw = localStorage.getItem(MY_CODES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomerCode(code: string): string[] {
  const existing = getStoredCustomerCodes();
  const next = Array.from(new Set([code, ...existing])).slice(0, 20);
  try {
    localStorage.setItem(MY_CODES_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors
  }
  return next;
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [companyEmail, setCompanyEmail] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<AppSection>('mapa');

  const [bikes, setBikes] = useState<Bike[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customerAccount, setCustomerAccount] = useState<CustomerAccountState>(
    EMPTY_CUSTOMER_ACCOUNT
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [bookingBike, setBookingBike] = useState<Bike | null>(null);
  const [settlingRental, setSettlingRental] = useState<Rental | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrTargetBike, setQrTargetBike] = useState<Bike | null>(null);
  const [bikeFormOpen, setBikeFormOpen] = useState(false);
  const [editingBike, setEditingBike] = useState<Bike | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const isCompanyMode = Boolean(companyEmail);

  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem('locubikes-theme', theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  const loadData = useCallback(async (lookupQuery?: string, defaultToCompanyFleet = false) => {
    setLoading(true);
    setLoadError('');
    try {
      const authCheck = await verifyCompanySessionApi();
      if (authCheck.authenticated && authCheck.email) {
        setCompanyEmail(authCheck.email);
        const companyState = await fetchCompanyState();
        setBikes(companyState.bikes);
        setStations(companyState.stations);
        setRentals(companyState.rentals);
        setTransactions(companyState.transactions);
        if (defaultToCompanyFleet) {
          setActiveSection('frota');
        }
      } else {
        setCompanyEmail(null);
        const publicState = await fetchPublicState(getStoredCustomerCodes(), lookupQuery);
        setBikes(publicState.bikes);
        setStations(publicState.stations);
        setRentals(publicState.rentals);
        setCustomerAccount(publicState.customerAccount);
        setTransactions([]);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erro ao carregar dados do servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(undefined, true);
  }, [loadData]);

  const handleCompanyLogin = async (email: string, password: string) => {
    const session = await loginCompanyApi(email, password);
    setCompanyEmail(session.email);
    const companyState = await fetchCompanyState();
    setBikes(companyState.bikes);
    setStations(companyState.stations);
    setRentals(companyState.rentals);
    setTransactions(companyState.transactions);
    setActiveSection('frota');
  };

  const handleCompanyLogout = async () => {
    await logoutCompanyApi();
    setCompanyEmail(null);
    setActiveSection('mapa');
    await loadData();
  };

  const handleNavigate = (section: AppSection) => {
    if (!isCompanyMode && (section === 'frota' || section === 'pagamentos')) {
      setLoginModalOpen(true);
      return;
    }
    setActiveSection(section);
  };

  const handleOpenQrScanner = (bike?: Bike) => {
    if (customerAccount.activeRide) {
      setActiveSection('mapa');
      return;
    }
    setQrTargetBike(bike ?? null);
    setQrModalOpen(true);
  };

  const handlePrimaryAction = () => {
    if (isCompanyMode) {
      handleCompanyLogout();
      return;
    }
    handleOpenQrScanner();
  };

  const handleLookupCustomerRentals = async (query: string) => {
    const publicState = await fetchPublicState(getStoredCustomerCodes(), query);
    setBikes(publicState.bikes);
    setStations(publicState.stations);
    setRentals(publicState.rentals);
    setCustomerAccount(publicState.customerAccount);
  };

  // --- Customer Mobile Mobility Handlers ---
  const handleUnlockBikeByQr = async (
    qrInput: string,
    paymentMethod: 'carteira' | 'pix' | 'cartao' | 'nupay' | 'assinatura'
  ) => {
    const result = await unlockBikeByQrApi({ qrInput, paymentMethod });
    setCustomerAccount(result.customerAccount);
    setBikes((prev) => prev.map((b) => (b.id === result.bike.id ? result.bike : b)));
    setActiveSection('mapa');
  };

  const handleFinishRide = async (
    rideId: string,
    endStationId: string,
    elapsedMinutesOverride: number
  ): Promise<RideRecord> => {
    const result = await finishActiveRideApi({
      rideId,
      endStationId,
      elapsedMinutesOverride,
    });
    setCustomerAccount(result.customerAccount);
    setBikes((prev) => prev.map((b) => (b.id === result.bike.id ? result.bike : b)));
    return result.completedRide;
  };

  const handleTopUpWallet = async (amount: number, method: 'pix' | 'cartao' | 'nupay') => {
    const result = await topUpWalletApi(amount, method);
    setCustomerAccount(result.customerAccount);
  };

  const handleAddCard = async (input: {
    cardNumber: string;
    cardHolder: string;
    expiry: string;
    cvv: string;
  }) => {
    const result = await addCustomerCardApi(input);
    setCustomerAccount(result.customerAccount);
  };

  const handleRemoveCard = async (cardId: string) => {
    const result = await removeCustomerCardApi(cardId);
    setCustomerAccount(result.customerAccount);
  };

  const handleSubscribePlan = async (
    planId: SubscriptionPlan['id'],
    paymentMethod: 'carteira' | 'pix' | 'cartao' | 'nupay'
  ) => {
    const result = await subscribePlanApi(planId, paymentMethod);
    setCustomerAccount(result.customerAccount);
  };

  const handleCancelSubscription = async () => {
    const result = await cancelSubscriptionApi();
    setCustomerAccount(result.customerAccount);
  };

  // --- Company Fleet & Rental Handlers ---
  const handleSaveBike = async (input: CreateBikeInput, editingId?: string) => {
    if (editingId) {
      const updated = await updateBikeApi(editingId, input);
      setBikes((prev) => prev.map((b) => (b.id === editingId ? updated : b)));
    } else {
      const created = await createBikeApi(input);
      setBikes((prev) => [created, ...prev]);
    }
  };

  const handleToggleBikeStatus = async (bike: Bike, nextStatus: BikeStatus) => {
    const updated = await updateBikeApi(bike.id, {
      status: nextStatus,
      maintenanceNote:
        nextStatus === 'manutencao' ? 'Em revisão preventiva' : 'Pronta para retirada',
    });
    setBikes((prev) => prev.map((b) => (b.id === bike.id ? updated : b)));
  };

  const handleDeleteBike = async (bikeId: string) => {
    await deleteBikeApi(bikeId);
    setBikes((prev) => prev.filter((b) => b.id !== bikeId));
  };

  const handleSubmitNewRental = async (payload: CreateRentalInput): Promise<Rental> => {
    const { rental, transaction } = await createRentalApi(payload);
    saveCustomerCode(rental.reservationCode);
    setRentals((prev) => [rental, ...prev]);
    if (isCompanyMode) {
      setTransactions((prev) => [transaction, ...prev]);
    }
    setBikes((prev) =>
      prev.map((b) =>
        b.id === rental.bikeId
          ? {
              ...b,
              status: 'alugada',
              maintenanceNote:
                rental.paymentStatus === 'pago'
                  ? 'Em locação ativa'
                  : 'Reservada (aguardando retirada)',
            }
          : b
      )
    );
    return rental;
  };

  const handleSettlePendingPayment = async (
    rentalId: string,
    method: PaymentMethod,
    installments: number,
    cardLast4?: string
  ): Promise<Rental> => {
    const { rental, transaction } = await settleRentalPaymentApi(
      rentalId,
      method,
      installments,
      cardLast4
    );
    setRentals((prev) => prev.map((r) => (r.id === rentalId ? rental : r)));
    if (isCompanyMode) {
      setTransactions((prev) => {
        const exists = prev.some((t) => t.id === transaction.id);
        if (exists) {
          return prev.map((t) => (t.id === transaction.id ? transaction : t));
        }
        return [transaction, ...prev];
      });
    }
    return rental;
  };

  const handleCompleteRental = async (rentalId: string) => {
    const updated = await completeRentalApi(rentalId);
    setRentals((prev) => prev.map((r) => (r.id === rentalId ? updated : r)));
    await loadData();
  };

  const handleCancelRental = async (rentalId: string) => {
    const updated = await cancelRentalApi(rentalId);
    setRentals((prev) => prev.map((r) => (r.id === rentalId ? updated : r)));
    await loadData();
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      <Navbar
        isCompanyMode={isCompanyMode}
        activeSection={activeSection}
        onNavigate={handleNavigate}
        onPrimaryAction={handlePrimaryAction}
        primaryActionLabel={
          isCompanyMode
            ? 'Sair'
            : customerAccount.activeRide
              ? 'Em viagem'
              : 'Escanear QR'
        }
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
      />

      <main className="flex-1">
        {loading ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
            <div className="h-64 bg-zinc-200/70 dark:bg-zinc-800/70 rounded-2xl animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-60 bg-zinc-200/70 dark:bg-zinc-800/70 rounded-2xl animate-pulse" />
              <div className="h-60 bg-zinc-200/70 dark:bg-zinc-800/70 rounded-2xl animate-pulse" />
              <div className="h-60 bg-zinc-200/70 dark:bg-zinc-800/70 rounded-2xl animate-pulse" />
            </div>
          </div>
        ) : loadError ? (
          <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
            <p className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Não foi possível carregar os dados
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{loadError}</p>
            <button
              type="button"
              onClick={() => loadData()}
              className="px-4 py-2 text-xs font-medium text-white dark:text-zinc-950 bg-zinc-900 dark:bg-zinc-100 rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <>
            {!isCompanyMode && activeSection === 'mapa' && (
              <CustomerMapView
                bikes={bikes}
                stations={stations}
                customerAccount={customerAccount}
                onScanQrForBike={handleOpenQrScanner}
                onRentBikeHourly={(bike) => {
                  setSettlingRental(null);
                  setBookingBike(bike);
                }}
                onFinishRide={handleFinishRide}
                onOpenWallet={() => setActiveSection('carteira')}
                onOpenHistory={() => setActiveSection('corridas')}
              />
            )}

            {activeSection === 'alugar' && (
              <StorefrontView
                bikes={bikes}
                onRentBike={(bike) => {
                  setSettlingRental(null);
                  setBookingBike(bike);
                }}
                onOpenReservations={
                  isCompanyMode ? undefined : () => setActiveSection('reservas')
                }
                onOpenWallet={isCompanyMode ? undefined : () => setActiveSection('carteira')}
              />
            )}

            {activeSection === 'reservas' && (
              <ReservationsView
                isCompanyMode={isCompanyMode}
                rentals={rentals}
                onCompleteRental={handleCompleteRental}
                onCancelRental={handleCancelRental}
                onPayPendingRental={(rental) => {
                  setBookingBike(null);
                  setSettlingRental(rental);
                }}
                onBrowseBikes={() => setActiveSection('alugar')}
                onLookupCustomerRentals={handleLookupCustomerRentals}
              />
            )}

            {!isCompanyMode && activeSection === 'carteira' && (
              <WalletPaymentsView
                customerAccount={customerAccount}
                onTopUpWallet={handleTopUpWallet}
                onAddCard={handleAddCard}
                onRemoveCard={handleRemoveCard}
                onSubscribePlan={handleSubscribePlan}
                onCancelSubscription={handleCancelSubscription}
              />
            )}

            {!isCompanyMode && activeSection === 'corridas' && (
              <RideHistoryView
                rides={customerAccount.rides}
                onGoToMap={() => setActiveSection('mapa')}
              />
            )}

            {isCompanyMode && activeSection === 'frota' && (
              <FleetManagerView
                bikes={bikes}
                onAddBike={() => {
                  setEditingBike(null);
                  setBikeFormOpen(true);
                }}
                onEditBike={(bike) => {
                  setEditingBike(bike);
                  setBikeFormOpen(true);
                }}
                onToggleStatus={handleToggleBikeStatus}
                onDeleteBike={handleDeleteBike}
              />
            )}

            {isCompanyMode && activeSection === 'pagamentos' && (
              <PaymentsView transactions={transactions} />
            )}
          </>
        )}
      </main>

      <footer
        className={`border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 transition-colors ${
          !isCompanyMode ? 'pb-16 md:pb-0' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <span>
            {isCompanyMode
              ? `LocuBikes · Painel da empresa (${companyEmail})`
              : 'LocuBikes · Mobilidade urbana por bicicleta'}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {isCompanyMode ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveSection('frota')}
                  className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  Frota
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('reservas')}
                  className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  Locações
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('pagamentos')}
                  className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  Pagamentos
                </button>
                <button
                  type="button"
                  onClick={handleCompanyLogout}
                  className="font-medium text-zinc-800 dark:text-zinc-200 hover:underline underline-offset-4 transition-colors"
                >
                  Sair da empresa
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setActiveSection('mapa')}
                  className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  Mapa
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('alugar')}
                  className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  Explorar
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('reservas')}
                  className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  Minhas Reservas
                </button>
                <button
                  type="button"
                  onClick={() => setLoginModalOpen(true)}
                  className="font-medium text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white underline-offset-4 hover:underline transition-colors"
                >
                  Entrar pela empresa
                </button>
              </>
            )}
          </div>
        </div>
      </footer>

      {!isCompanyMode && (
        <MobileBottomNav
          activeSection={activeSection}
          hasActiveRide={Boolean(customerAccount.activeRide)}
          onNavigate={handleNavigate}
          onOpenQr={() => handleOpenQrScanner()}
        />
      )}

      {qrModalOpen && (
        <QrUnlockModal
          bikes={bikes}
          initialBike={qrTargetBike}
          customerAccount={customerAccount}
          onClose={() => {
            setQrModalOpen(false);
            setQrTargetBike(null);
          }}
          onUnlock={handleUnlockBikeByQr}
          onGoToWallet={() => setActiveSection('carteira')}
        />
      )}

      {(bookingBike || settlingRental) && (
        <BookingModal
          bike={bookingBike}
          pendingRental={settlingRental}
          onClose={() => {
            setBookingBike(null);
            setSettlingRental(null);
          }}
          onSuccess={() => {
            // State is already updated optimistically by handlers
          }}
          onSubmitNewRental={handleSubmitNewRental}
          onSettlePendingPayment={handleSettlePendingPayment}
        />
      )}

      {isCompanyMode && bikeFormOpen && (
        <BikeFormModal
          initialBike={editingBike}
          onClose={() => {
            setBikeFormOpen(false);
            setEditingBike(null);
          }}
          onSave={handleSaveBike}
        />
      )}

      {loginModalOpen && (
        <CompanyLoginModal
          onClose={() => setLoginModalOpen(false)}
          onLogin={handleCompanyLogin}
        />
      )}

      <FloatingBikeOverlay />
    </div>
  );
}
