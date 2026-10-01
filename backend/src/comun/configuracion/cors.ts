/** Orígenes autorizados para HTTP y Socket.IO. */
export function origenesCors(): boolean | string[] {
  if (process.env.NODE_ENV !== 'production') return true;

  return (process.env.FRONTEND_URLS ?? '')
    .split(',')
    .map((origen) => origen.trim())
    .filter(Boolean);
}
