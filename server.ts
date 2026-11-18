import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  addCustomerCard,
  authenticateCompany,
  cancelCustomerSubscription,
  cancelRental,
  completeRental,
  createBike,
  createRental,
  deleteBike,
  finishActiveRide,
  getCustomerAccount,
  getState,
  logoutCompanyToken,
  lookupCustomerRentals,
  removeCustomerCard,
  settleRentalPayment,
  STATIONS,
  subscribeCustomerPlan,
  topUpCustomerWallet,
  unlockBikeByQr,
  updateBike,
  verifyCompanyToken,
} from './server/store';

function extractBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return undefined;
  return authHeader.slice(7).trim();
}

function requireCompanyAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  const session = verifyCompanyToken(token);
  if (!session) {
    res.status(401).json({ error: 'Acesso restrito à empresa. Faça login para continuar.' });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Company authentication routes
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      const session = authenticateCompany(email || '', password || '');
      res.json({ token: session.token, email: session.email });
    } catch (error) {
      res.status(401).json({ error: error instanceof Error ? error.message : 'Credenciais inválidas.' });
    }
  });

  app.get('/api/auth/me', (req, res) => {
    const token = extractBearerToken(req);
    const session = verifyCompanyToken(token);
    if (!session) {
      res.status(401).json({ authenticated: false });
      return;
    }
    res.json({ authenticated: true, email: session.email });
  });

  app.post('/api/auth/logout', (req, res) => {
    logoutCompanyToken(extractBearerToken(req));
    res.json({ ok: true });
  });

  // Public customer storefront + map stations + customer wallet & rides
  app.get('/api/public/state', (req, res) => {
    try {
      const state = getState();
      const codesParam = typeof req.query.codes === 'string' ? req.query.codes : '';
      const queryParam = typeof req.query.q === 'string' ? req.query.q : '';
      const codes = codesParam ? codesParam.split(',') : [];
      const rentals = lookupCustomerRentals(codes, queryParam);
      res.json({
        bikes: state.bikes,
        stations: state.stations || STATIONS,
        rentals,
        customerAccount: getCustomerAccount(state),
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao carregar dados.' });
    }
  });

  // Customer Wallet, Saved Cards, Subscriptions & QR Ride endpoints
  app.post('/api/customer/wallet/topup', (req, res) => {
    try {
      const { amount, method } = req.body as { amount?: number; method?: 'pix' | 'cartao' };
      const result = topUpCustomerWallet(Number(amount), method || 'pix');
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Erro ao recarregar carteira.' });
    }
  });

  app.post('/api/customer/cards', (req, res) => {
    try {
      const customerAccount = addCustomerCard(req.body);
      res.status(201).json({ customerAccount });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Erro ao cadastrar cartão.' });
    }
  });

  app.delete('/api/customer/cards/:id', (req, res) => {
    try {
      const customerAccount = removeCustomerCard(req.params.id);
      res.json({ customerAccount });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Erro ao remover cartão.' });
    }
  });

  app.post('/api/customer/subscriptions', (req, res) => {
    try {
      const { planId, paymentMethod } = req.body as {
        planId: 'mensal-urbano' | 'mensal-eletrico';
        paymentMethod: 'carteira' | 'pix' | 'cartao';
      };
      const customerAccount = subscribeCustomerPlan(planId, paymentMethod || 'carteira');
      res.status(201).json({ customerAccount });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Erro ao ativar assinatura.' });
    }
  });

  app.post('/api/customer/subscriptions/cancel', (_req, res) => {
    try {
      const customerAccount = cancelCustomerSubscription();
      res.json({ customerAccount });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Erro ao cancelar assinatura.' });
    }
  });

  app.post('/api/rides/unlock', (req, res) => {
    try {
      const { qrInput, paymentMethod } = req.body as {
        qrInput?: string;
        paymentMethod?: 'carteira' | 'pix' | 'cartao' | 'assinatura';
      };
      const result = unlockBikeByQr({
        qrInput: qrInput || '',
        paymentMethod: paymentMethod || 'carteira',
      });
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Erro ao desbloquear bicicleta.' });
    }
  });

  app.post('/api/rides/:id/finish', (req, res) => {
    try {
      const { endStationId, elapsedMinutesOverride } = req.body as {
        endStationId?: string;
        elapsedMinutesOverride?: number;
      };
      const result = finishActiveRide({
        rideId: req.params.id,
        endStationId,
        elapsedMinutesOverride,
      });
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Erro ao encerrar viagem.' });
    }
  });

  // Protected company state (full fleet, all rentals, financial transactions)
  app.get('/api/company/state', requireCompanyAuth, (_req, res) => {
    try {
      const state = getState();
      res.json({
        bikes: state.bikes,
        stations: state.stations || STATIONS,
        rentals: state.rentals,
        transactions: state.transactions,
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao carregar dados.' });
    }
  });

  app.get('/api/bikes', (_req, res) => {
    res.json(getState().bikes);
  });

  app.post('/api/bikes', requireCompanyAuth, (req, res) => {
    try {
      const bike = createBike(req.body);
      res.status(201).json(bike);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Erro ao criar bicicleta.' });
    }
  });

  app.patch('/api/bikes/:id', requireCompanyAuth, (req, res) => {
    try {
      const bike = updateBike(req.params.id, req.body);
      res.json(bike);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar bicicleta.';
      const status = message.includes('não encontrada') ? 404 : 400;
      res.status(status).json({ error: message });
    }
  });

  app.delete('/api/bikes/:id', requireCompanyAuth, (req, res) => {
    try {
      deleteBike(req.params.id);
      res.json({ deleted: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao excluir bicicleta.';
      const status = message.includes('não encontrada') ? 404 : 400;
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/rentals', (req, res) => {
    try {
      const result = createRental(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Erro ao criar reserva.' });
    }
  });

  app.post('/api/rentals/:id/pay', (req, res) => {
    try {
      const { method, installments, cardLast4 } = req.body;
      const result = settleRentalPayment(req.params.id, method, installments, cardLast4);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Erro ao processar pagamento.' });
    }
  });

  app.post('/api/rentals/:id/complete', requireCompanyAuth, (req, res) => {
    try {
      const rental = completeRental(req.params.id);
      res.json(rental);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Erro ao concluir devolução.' });
    }
  });

  app.post('/api/rentals/:id/cancel', (req, res) => {
    try {
      const rental = cancelRental(req.params.id);
      res.json(rental);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Erro ao cancelar reserva.' });
    }
  });

  app.get('/api/transactions', requireCompanyAuth, (_req, res) => {
    res.json(getState().transactions);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LocuBikes server listening on http://localhost:${PORT}`);
  });
}

startServer();
