/** Delays `fn` until `ms` pass without a new call, keeping only the last value. */
export function debounce<T>(fn: (value: T) => void, ms: number): ((value: T) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => clearTimeout(timer);

  return Object.assign((value: T) => {
    cancel();
    timer = setTimeout(() => fn(value), ms);
  }, { cancel });
}
