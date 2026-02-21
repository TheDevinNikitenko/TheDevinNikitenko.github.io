export function fmtTime(x) {
  try { return new Date(x).toLocaleString(); }
  catch { return "—"; }
}