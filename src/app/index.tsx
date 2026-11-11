import { useState } from 'react';

import { MarketScreen } from '@/features/markets/screens/market-screen';
import type { Instrument } from '@/features/markets/types/instrument';
import { OrderModal } from '@/features/orders/components/order-modal';
import { isTradable } from '@/features/orders/utils/is-tradable';

export default function MarketRoute() {
  const [instrument, setInstrument] = useState<Instrument | null>(null);

  return (
    <>
      <MarketScreen onSelectInstrument={setInstrument} canSelect={isTradable} />
      <OrderModal instrument={instrument} onClose={() => setInstrument(null)} />
    </>
  );
}
