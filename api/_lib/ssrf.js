import dns from 'node:dns'
import net from 'node:net'

const NOT_ALLOWED = 'This base URL is not allowed'
const MAX_URL_LENGTH = 2048

export class BaseUrlError extends Error {
  constructor(message = NOT_ALLOWED) {
    super(message)
    this.name = 'BaseUrlError'
  }
}

// Kept as two lists: a single BlockList matches IPv4 addresses against
// ::ffff:0:0/96, which would block every IPv4 address.
const blockedIpv4 = new net.BlockList()
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
]) {
  blockedIpv4.addSubnet(network, prefix, 'ipv4')
}

// Every range that embeds an IPv4 address is blocked whole.
const blockedIpv6 = new net.BlockList()
for (const [network, prefix] of [
  ['::', 96], // unspecified, loopback, IPv4-compatible
  ['::ffff:0:0', 96], // IPv4-mapped
  ['64:ff9b::', 96], // NAT64
  ['64:ff9b:1::', 48], // local NAT64
  ['100::', 64], // discard
  ['2001::', 32], // Teredo
  ['2001:db8::', 32], // documentation
  ['2002::', 16], // 6to4
  ['fc00::', 7], // unique local
  ['fe80::', 10], // link local
  ['fec0::', 10], // site local
  ['ff00::', 8], // multicast
]) {
  blockedIpv6.addSubnet(network, prefix, 'ipv6')
}

export function isBlockedAddress(address) {
  try {
    const family = net.isIP(address)
    if (family === 4) return blockedIpv4.check(address, 'ipv4')
    if (family === 6) return blockedIpv6.check(address, 'ipv6')
  } catch {
    return true
  }
  return true
}

function isForbiddenHostname(hostname) {
  const host = hostname.toLowerCase().replace(/\.+$/, '')
  if (!host || host.startsWith('[') || net.isIP(host)) return true
  return host === 'localhost'
    || host.endsWith('.localhost')
    || host.endsWith('.local')
    || host.endsWith('.internal')
}

// Parsing with URL first normalises decimal, hex and octal IPv4 forms.
export function normalizeBaseUrl(input) {
  if (typeof input !== 'string' || !input.trim()) throw new BaseUrlError('Base URL is required')
  const value = input.trim()
  if (value.length > MAX_URL_LENGTH) throw new BaseUrlError('Base URL is too long')

  let url
  try {
    url = new URL(value)
  } catch {
    throw new BaseUrlError('Base URL is not a valid URL')
  }

  if (url.protocol !== 'https:') throw new BaseUrlError('Base URL must use HTTPS')
  if (url.username || url.password) throw new BaseUrlError('Base URL must not contain credentials')
  if (url.port) throw new BaseUrlError('Base URL must use the default HTTPS port')
  if (url.href.includes('?') || url.href.includes('#')) {
    throw new BaseUrlError('Base URL must not contain a query or fragment')
  }
  if (isForbiddenHostname(url.hostname)) throw new BaseUrlError()

  return url.origin + url.pathname.replace(/\/+$/, '')
}

const defaultResolver = (hostname) => dns.promises.lookup(hostname, { all: true })

async function resolvePublic(hostname, resolver) {
  if (isForbiddenHostname(hostname)) throw new BaseUrlError()

  let addresses
  try {
    addresses = await resolver(hostname)
  } catch {
    throw new BaseUrlError()
  }

  if (!Array.isArray(addresses) || addresses.length === 0) throw new BaseUrlError()
  if (addresses.some(({ address }) => isBlockedAddress(address))) throw new BaseUrlError()
  return addresses
}

export async function assertPublicHost(hostname, resolver = defaultResolver) {
  await resolvePublic(hostname, resolver)
}

// Passed to https.request so the address checked is the address connected to.
export function createValidatingLookup(resolver = defaultResolver) {
  return (hostname, options, callback) => {
    const done = typeof options === 'function' ? options : callback
    const opts = typeof options === 'object' && options !== null ? options : {}

    resolvePublic(hostname, resolver).then(
      (addresses) => {
        const usable = opts.family === 4 || opts.family === 6
          ? addresses.filter(({ family }) => family === opts.family)
          : addresses
        if (usable.length === 0) return done(new BaseUrlError())
        if (opts.all) return done(null, usable)
        return done(null, usable[0].address, usable[0].family)
      },
      (err) => done(err),
    )
  }
}
