import { debounce } from './debounce';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('ejecuta una sola vez con el último valor cuando pasa el plazo sin llamadas nuevas', () => {
  const received: string[] = [];
  const debounced = debounce((value: string) => received.push(value), 300);

  debounced('D');
  jest.advanceTimersByTime(299);
  debounced('DY');
  jest.advanceTimersByTime(299);
  debounced('DYC');
  jest.advanceTimersByTime(299);
  expect(received).toEqual([]);

  jest.advanceTimersByTime(1);
  expect(received).toEqual(['DYC']);
});

it('cancel evita la ejecución pendiente', () => {
  const received: string[] = [];
  const debounced = debounce((value: string) => received.push(value), 300);

  debounced('DYC');
  debounced.cancel();
  jest.advanceTimersByTime(1_000);

  expect(received).toEqual([]);
});
