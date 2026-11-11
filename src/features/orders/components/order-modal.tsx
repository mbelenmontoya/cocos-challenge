import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '@/components/theme';
import { formatCurrency } from '@/utils/format';

import { useOrderSubmission } from '../hooks/use-order-submission';
import type { OrderAccount, OrderBody, OrderInstrument } from '../types/order';
import { type Availability, checkAvailability } from '../utils/availability';
import { maxSharesForAmount, parseExactShares, parseLimitPrice } from '../utils/order-quantity';
import type { SubmissionState } from '../utils/order-submitter';

type Side = OrderBody['side'];
type OrderType = OrderBody['type'];
type QuantityMode = 'shares' | 'amount';

type Option<T extends string> = { value: T; label: string };

function Choice<T extends string>({ label, options, value, onChange }: { label: string; options: Option<T>[]; value: T; onChange: (value: T) => void }) {
  return (
    <View style={styles.choice} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={[styles.choiceOption, selected && styles.choiceSelected]}
          >
            <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const amountMessage = (result: ReturnType<typeof maxSharesForAmount>) => {
  switch (result.status) {
    case 'ok': return result.shares === 1 ? 'Se enviará 1 acción' : `Se enviarán ${result.shares} acciones`;
    case 'insufficient': return 'El monto no alcanza para una acción.';
    case 'price_unavailable': return 'No hay último precio para calcular la cantidad.';
    case 'invalid_amount': return 'Ingresá un monto válido, con hasta 2 decimales.';
  }
};

const stateMessage = (state: SubmissionState): { text: string; tone: 'ok' | 'error' | 'muted' } | null => {
  switch (state.kind) {
    case 'created': return {
      text: `Orden #${state.order.id}: ${state.order.status}${state.confirmedByHistory ? '. Confirmada por historial.' : ''}`,
      tone: 'ok',
    };
    case 'rejected': return { text: state.message, tone: 'error' };
    case 'not_sent': return { text: 'No pudimos preparar la orden. No se envió.', tone: 'error' };
    case 'uncertain': return { text: 'No pudimos confirmar tu orden. No la vuelvas a enviar.', tone: 'error' };
    case 'not_created': return { text: 'La orden no se registró.', tone: 'error' };
    case 'checking': return { text: 'Verificando la orden anterior…', tone: 'muted' };
    default: return null;
  }
};

const availabilityMessage = (availability: Availability) => {
  switch (availability.status) {
    case 'insufficient_cash': return `Saldo insuficiente: la orden cuesta ${formatCurrency(availability.cost)} y tenés ${formatCurrency(availability.cash)} disponibles.`;
    case 'insufficient_shares': return availability.held === 1
      ? 'Tenés 1 acción disponible para vender.'
      : `Tenés ${availability.held} acciones disponibles para vender.`;
    default: return null;
  }
};

type OrderFormProps = {
  instrument: OrderInstrument;
  account?: OrderAccount;
  onClose: () => void;
  onOrderCreated?: () => void;
};

type OrderModalProps = Omit<OrderFormProps, 'instrument'> & { instrument: OrderInstrument | null };

/** The order form for one instrument. A new instrument mounts a fresh form. */
export function OrderModal({ instrument, ...props }: OrderModalProps) {
  if (!instrument) return null;
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={props.onClose}>
      <OrderForm key={instrument.id} instrument={instrument} {...props} />
    </Modal>
  );
}

function OrderForm({ instrument, account, onClose, onOrderCreated }: OrderFormProps) {
  const { state, submit, resume, dismiss } = useOrderSubmission();
  const [side, setSide] = useState<Side>('BUY');
  const [type, setType] = useState<OrderType>('MARKET');
  const [mode, setMode] = useState<QuantityMode>('shares');
  const [quantityText, setQuantityText] = useState('');
  const [priceText, setPriceText] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  // Clears the last result and confirms an order left pending, even from a previous app session.
  useEffect(() => {
    dismiss();
    void resume();
  }, [dismiss, resume]);

  // A created order changes cash and holdings, so the caller reads them again.
  useEffect(() => {
    if (state.kind === 'created') onOrderCreated?.();
  }, [state, onOrderCreated]);

  const amount = mode === 'amount' ? maxSharesForAmount(quantityText, instrument.last_price) : null;
  const quantity = amount ? (amount.status === 'ok' ? amount.shares : null) : parseExactShares(quantityText);
  const price = type === 'LIMIT' ? parseLimitPrice(priceText) : null;
  const quantityError = mode === 'shares' && quantity === null ? 'Ingresá una cantidad entera mayor que cero.' : null;
  const priceError = type === 'LIMIT' && price === null ? 'Ingresá un precio mayor que cero, con hasta 2 decimales.' : null;
  const working = state.kind === 'sending' || state.kind === 'checking';
  const message = stateMessage(state);
  const body: OrderBody | null = quantity === null || (type === 'LIMIT' && price === null)
    ? null
    : { instrument_id: instrument.id, side, type, quantity, ...(type === 'LIMIT' && price !== null ? { price } : {}) };
  const availability = body ? checkAvailability(body, instrument.last_price, account) : null;
  const availabilityError = availability ? availabilityMessage(availability) : null;

  // The same text means pesos in one mode and shares in the other, so it is never carried over.
  const changeMode = (next: QuantityMode) => {
    setMode(next);
    setQuantityText('');
    setShowErrors(false);
  };

  const send = () => {
    if (!body || availabilityError) {
      setShowErrors(true);
      return;
    }
    void submit(body);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={styles.close}>
        <Text style={styles.closeText}>Cerrar</Text>
      </Pressable>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>{instrument.ticker}</Text>
        <Text style={styles.muted}>Último precio: {formatCurrency(instrument.last_price)}</Text>
      </View>

      <Choice label="Operación" value={side} onChange={setSide} options={[{ value: 'BUY', label: 'Comprar' }, { value: 'SELL', label: 'Vender' }]} />
      <Choice label="Tipo de orden" value={type} onChange={setType} options={[{ value: 'MARKET', label: 'Market' }, { value: 'LIMIT', label: 'Limit' }]} />
      <Choice label="Cargar por" value={mode} onChange={changeMode} options={[{ value: 'shares', label: 'Acciones' }, { value: 'amount', label: 'Monto en pesos' }]} />

      <TextInput
        accessibilityLabel={mode === 'shares' ? 'Cantidad de acciones' : 'Monto a invertir'}
        placeholder={mode === 'shares' ? 'Cantidad de acciones' : 'Monto a invertir'}
        placeholderTextColor={colors.muted}
        keyboardType={mode === 'shares' ? 'number-pad' : 'decimal-pad'}
        value={quantityText}
        onChangeText={setQuantityText}
        style={styles.input}
      />
      {amount && quantityText.trim() !== '' && <Text style={amount.status === 'ok' ? styles.muted : styles.error}>{amountMessage(amount)}</Text>}
      {showErrors && quantityError && <Text style={styles.error}>{quantityError}</Text>}
      {showErrors && amount && quantityText.trim() === '' && <Text style={styles.error}>{amountMessage(amount)}</Text>}

      {type === 'LIMIT' && (
        <>
          <TextInput
            accessibilityLabel="Precio límite"
            placeholder="Precio límite"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            value={priceText}
            onChangeText={setPriceText}
            style={styles.input}
          />
          {showErrors && priceError && <Text style={styles.error}>{priceError}</Text>}
        </>
      )}
      {availabilityError && <Text accessibilityRole="alert" style={styles.error}>{availabilityError}</Text>}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Enviar orden"
        accessibilityState={{ disabled: working, busy: working }}
        disabled={working}
        onPress={send}
        style={[styles.submit, working && styles.submitDisabled]}
      >
        <Text style={styles.submitText}>{state.kind === 'sending' ? 'Enviando…' : state.kind === 'checking' ? 'Verificando…' : 'Enviar orden'}</Text>
      </Pressable>

      {message && (
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.result, message.tone === 'ok' ? styles.ok : message.tone === 'error' ? styles.error : styles.muted]}>
          {message.text}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 16, backgroundColor: colors.surface, flexGrow: 1 },
  header: { gap: 4, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  close: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  closeText: { fontSize: 16, color: colors.text, fontWeight: '600' },
  choice: { flexDirection: 'row', backgroundColor: colors.input, borderRadius: 12, padding: 4 },
  choiceOption: { flex: 1, minHeight: 44, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  choiceSelected: { backgroundColor: colors.surface },
  choiceText: { fontSize: 15, color: colors.muted, fontWeight: '600' },
  choiceTextSelected: { color: colors.text },
  input: { minHeight: 52, borderRadius: 12, backgroundColor: colors.input, paddingHorizontal: 16, fontSize: 17, color: colors.text },
  submit: { minHeight: 52, borderRadius: 12, backgroundColor: colors.text, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: colors.surface, fontSize: 16, fontWeight: '700' },
  result: { fontSize: 15, lineHeight: 22 },
  muted: { fontSize: 14, color: colors.muted },
  ok: { color: colors.positive, fontWeight: '600' },
  error: { fontSize: 14, color: colors.negative },
});
