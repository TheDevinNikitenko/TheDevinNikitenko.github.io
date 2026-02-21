export function throttle(fn, waitMs) {
  let last = 0;
  let t = null;

  return (...args) => {
    const now = Date.now();
    const remaining = waitMs - (now - last);

    if (remaining <= 0) {
      last = now;
      fn(...args);
      return;
    }

    if (t) return;
    t = setTimeout(() => {
      t = null;
      last = Date.now();
      fn(...args);
    }, remaining);
  };
}