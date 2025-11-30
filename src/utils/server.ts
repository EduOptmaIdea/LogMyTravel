export function serverPath(endpoint: string) {
  const dev = import.meta.env.DEV
  if (dev) return `/accounts/${endpoint}`
  return `/.netlify/functions/accounts-${endpoint}`
}

