import { useState } from 'react';

import { QueryList } from '@/components/query-list';
import { Screen } from '@/components/screen';

import { InstrumentRow } from '../components/instrument-row';
import { SearchField } from '../components/search-field';
import { useMarket } from '../hooks/use-market';
import type { Market } from '../types/instrument';

const getNotice = ({ incomplete, omitted }: Market) => (incomplete > 0 || omitted > 0
  ? `Información incompleta: ${incomplete} instrumentos con datos no disponibles. ${omitted} registros no pudieron mostrarse.`
  : null);

export function MarketScreen() {
  const [query, setQuery] = useState('');
  const market = useMarket(query);

  return (
    <Screen title="Mercado" subtitle="Instrumentos · Precios en pesos" headerContent={<SearchField onSearch={setQuery} />}>
      <QueryList
        query={market}
        items={market.data?.instruments}
        keyExtractor={(item) => String(item.id)}
        renderItem={(item) => <InstrumentRow instrument={item} />}
        emptyMessage={query ? `No encontramos instrumentos para ${query}.` : 'No hay instrumentos disponibles.'}
        loadingMessage="Cargando instrumentos…"
        listLabel="Lista de instrumentos"
        getNotice={getNotice}
      />
    </Screen>
  );
}
