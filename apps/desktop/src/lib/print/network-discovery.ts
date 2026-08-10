/**
 * mDNS/Bonjour discovery for LAN thermal printers (Capacitor native).
 */

import { Capacitor } from "@capacitor/core";

/** Common Bonjour types advertised by ESC/POS and office printers. */
export const PRINTER_MDNS_TYPES = [
  "_pdl-datastream._tcp.",
  "_printer._tcp.",
  "_ipp._tcp.",
  "_jetdirect._tcp.",
  "_http._tcp.",
] as const;

export type DiscoveredNetworkPrinter = {
  name: string;
  host: string;
  port: number;
  serviceType: string;
};

type MdnsServiceLike = {
  name: string;
  type: string;
  port: number;
  hosts: string[];
};

export function canDiscoverNetworkPrinters(): boolean {
  return Capacitor.isNativePlatform();
}

/** Prefer IPv4; ignore link-local IPv6 for ESC/POS TCP. */
export function pickPrinterHost(hosts: string[]): string | null {
  const ipv4 = hosts.find((h) => /^\d{1,3}(\.\d{1,3}){3}$/.test(h));
  if (ipv4) return ipv4;
  const plain = hosts.find((h) => !h.includes(":"));
  return plain ?? hosts[0] ?? null;
}

/** Map raw mDNS rows to connectable printer endpoints. */
export function normalizeMdnsServices(
  services: MdnsServiceLike[]
): DiscoveredNetworkPrinter[] {
  const seen = new Set<string>();
  const out: DiscoveredNetworkPrinter[] = [];

  for (const svc of services) {
    const host = pickPrinterHost(svc.hosts);
    if (!host) continue;

    let port = svc.port;
    if (port <= 0) port = 9100;
    if (svc.type.includes("_ipp.") && port === 631) {
      // IPP port — raw ESC/POS often still on 9100; keep advertised port but note IPP
      port = 9100;
    }

    const key = `${host}:${port}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      name: svc.name.replace(/\s*\(\d+\)\s*$/, "").trim() || host,
      host,
      port,
      serviceType: svc.type,
    });
  }

  return out.sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

export async function discoverNetworkPrinters(
  timeoutMs = 4500
): Promise<DiscoveredNetworkPrinter[]> {
  if (!canDiscoverNetworkPrinters()) return [];

  const { mDNS } = await import("@byrds/capacitor-mdns");
  const batches = await Promise.all(
    PRINTER_MDNS_TYPES.map(async (type) => {
      try {
        const result = await mDNS.discover({ type, timeout: timeoutMs });
        if (result.error && !result.services.length) return [];
        return result.services;
      } catch {
        return [];
      }
    })
  );

  return normalizeMdnsServices(batches.flat());
}
