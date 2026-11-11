import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { MarketScreen } from '@/features/markets/screens/market-screen';
import type { Instrument } from '@/features/markets/types/instrument';
import { OrderModal } from '@/features/orders/components/order-modal';
import { isTradable } from '@/features/orders/utils/is-tradable';
import { portfolioQueryOptions } from '@/features/portfolio/api/portfolio-query';

export default function MarketRoute() {
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  // Read only while the modal is open; staleTime 0 makes every opening read it again.
  const portfolio = useQuery({ ...portfolioQueryOptions, enabled: instrument !== null });
  const holding = instrument && portfolio.data?.holdings.find((item) => item.instrument_id === instrument.id);
  const account = instrument && portfolio.data
    ? { cash: portfolio.data.cash, heldShares: holding ? holding.quantity : 0 }
    : undefined;

  return (
    <>
      <MarketScreen onSelectInstrument={setInstrument} canSelect={isTradable} />
      <OrderModal
        instrument={instrument}
        account={account}
        onClose={() => setInstrument(null)}
        onOrderCreated={portfolio.refetch}
      />
    </>
  );
}
