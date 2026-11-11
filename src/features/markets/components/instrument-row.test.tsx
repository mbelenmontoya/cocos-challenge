import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Instrument } from '../types/instrument';
import { InstrumentRow } from './instrument-row';

const dyca: Instrument = { id: 1, ticker: 'DYCA', name: 'Dycasa S.A.', type: 'ACCIONES', last_price: 45.72, close_price: 50.07 };
const ars: Instrument = { id: 26, ticker: 'ARS', name: 'Pesos', type: 'MONEDA', last_price: 1, close_price: 1 };

it('una fila con acción es un botón accesible que la ejecuta', async () => {
  const onPress = jest.fn();
  await render(<InstrumentRow instrument={dyca} onPress={onPress} />);

  await fireEvent.press(screen.getByRole('button', { name: 'Instrumento DYCA' }));

  expect(onPress).toHaveBeenCalledTimes(1);
});

it('una fila sin acción no se anuncia como botón', async () => {
  await render(<InstrumentRow instrument={ars} />);

  expect(screen.getByLabelText('Instrumento ARS')).toBeOnTheScreen();
  expect(screen.queryByRole('button')).not.toBeOnTheScreen();
});

it('muestra el retorno con su etiqueta', async () => {
  await render(<InstrumentRow instrument={dyca} />);

  expect(screen.getByText('Retorno: −8,69 %')).toBeOnTheScreen();
});
