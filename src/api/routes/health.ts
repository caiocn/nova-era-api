export function createHealthResponse(version: string) {
  return {
    status: 200,
    service: 'nova-era-api',
    version,
  };
}
