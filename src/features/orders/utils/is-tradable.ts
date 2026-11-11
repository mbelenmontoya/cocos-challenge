/** Pesos are the account currency, not something to buy or sell. */
export const isTradable = (instrument: { type: string }): boolean => instrument.type !== 'MONEDA';
