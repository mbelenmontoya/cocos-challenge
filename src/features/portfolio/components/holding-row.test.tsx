import { render, screen } from '@testing-library/react-native';

import type { Holding } from '../types/holding';
import { HoldingRow } from './holding-row';

const holding = (avg_cost_price: number | null): Holding => ({ instrument_id: 1, ticker: 'DYCA', quantity: 3, last_price: 125, avg_cost_price });

it('muestra el rendimiento con su etiqueta', async () => {
  await render(<HoldingRow holding={holding(100)} />);

  expect(screen.getByText('Rendimiento: +25,00 %')).toBeOnTheScreen();
});

it('indica el rendimiento no disponible sin costo de compra', async () => {
  await render(<HoldingRow holding={holding(null)} />);

  expect(screen.getByText('Rendimiento: No disponible')).toBeOnTheScreen();
});
