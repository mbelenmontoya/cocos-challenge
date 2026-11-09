import { QueryList } from '@/components/query-list';
import { Screen } from '@/components/screen';

import { HoldingRow } from '../components/holding-row';
import { usePortfolio } from '../hooks/use-portfolio';
import type { Portfolio } from '../types/holding';

const getNotice = ({ incomplete, omitted }: Portfolio) => (incomplete > 0 || omitted > 0
  ? `Información incompleta: ${incomplete} activos con datos no disponibles. ${omitted} registros no pudieron mostrarse.`
  : null);

export function PortfolioScreen() {
  const portfolio = usePortfolio();

  return (
    <Screen title="Portfolio" subtitle="Tus activos · Precios en pesos">
      <QueryList
        query={portfolio}
        items={portfolio.data?.holdings}
        keyExtractor={(item) => String(item.instrument_id)}
        renderItem={(item) => <HoldingRow holding={item} />}
        emptyMessage="No tenés activos en tu portfolio."
        loadingMessage="Cargando portfolio…"
        listLabel="Lista de activos"
        getNotice={getNotice}
      />
    </Screen>
  );
}
