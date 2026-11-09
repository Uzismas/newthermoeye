import net from "node:net";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import tls from "node:tls";

const originalConnect = net.Socket.prototype.connect;
const originalNetConnect = net.connect;
const originalHttpRequest = http.request;
const originalHttpsRequest = https.request;
const originalTlsConnect = tls.connect;
const originalLookup = dns.lookup;
const originalPromiseLookup = dns.promises.lookup;

function isLoopback(host) {
  const value = String(host ?? "localhost").toLowerCase().replace(/^\[|\]$/g, "");
  return value === "localhost" || value === "::1" || (net.isIP(value) === 4 && value.startsWith("127."));
}

export function assertHost(host) {
  if (!isLoopback(host)) throw new Error(`Offline runtime guard blocked non-loopback network target ${host}.`);
}

function hostFromArgs(args) {
  const value = args[0];
  if (value && typeof value === "object") return value.hostname ?? value.host ?? (value.socketPath ? "localhost" : "localhost");
  return args[1] ?? "localhost";
}

function guardRequest(args) {
  const value = args[0];
  if (typeof value === "string" || value instanceof URL) assertHost(new URL(value).hostname);
  else if (value && typeof value === "object") assertHost(value.hostname ?? value.host ?? "localhost");
}

net.connect = function (...args) {
  assertHost(hostFromArgs(args));
  return originalNetConnect.apply(this, args);
};
net.createConnection = net.connect;
http.request = function (...args) {
  guardRequest(args);
  return originalHttpRequest.apply(this, args);
};
https.request = function (...args) {
  guardRequest(args);
  return originalHttpsRequest.apply(this, args);
};
tls.connect = function (...args) {
  assertHost(hostFromArgs(args));
  return originalTlsConnect.apply(this, args);
};

const originalFetch = globalThis.fetch;
globalThis.fetch = function (input, ...args) {
  const address = input instanceof Request ? input.url : String(input);
  try {
    assertHost(new URL(address).hostname);
  } catch (error) {
    return Promise.reject(error);
  }
  return originalFetch.call(this, input, ...args);
};

dns.lookup = function (host, ...args) {
  if (!isLoopback(host)) {
    const callback = args.at(-1);
    const error = new Error(`Offline runtime guard blocked DNS lookup for ${host}.`);
    if (typeof callback === "function") return process.nextTick(callback, error);
    throw error;
  }
  return originalLookup.call(this, host, ...args);
};
dns.promises.lookup = (host, ...args) => {
  if (!isLoopback(host)) return Promise.reject(new Error(`Offline runtime guard blocked DNS lookup for ${host}.`));
  return originalPromiseLookup.call(dns.promises, host, ...args);
};

net.Socket.prototype.connect = function (...args) {
  const first = args[0];
  if (first && typeof first === "object" && first.path) return originalConnect.apply(this, args);
  const options = typeof first === "object" && first ? first : { port: first, host: args[1] };
  assertHost(options.host ?? "localhost");
  return originalConnect.apply(this, args);
};
