import { describe, expect, it } from "vitest";
import {
  normalizeMdnsServices,
  pickPrinterHost,
} from "./network-discovery";

describe("network-discovery", () => {
  it("prefers ipv4 host", () => {
    expect(pickPrinterHost(["fe80::1", "192.168.0.50"])).toBe("192.168.0.50");
  });

  it("dedupes mdns services by host:port", () => {
    const rows = normalizeMdnsServices([
      {
        name: "XP-58",
        type: "_pdl-datastream._tcp.",
        port: 9100,
        hosts: ["192.168.1.20"],
      },
      {
        name: "XP-58 (2)",
        type: "_printer._tcp.",
        port: 9100,
        hosts: ["192.168.1.20"],
      },
      {
        name: "Office",
        type: "_ipp._tcp.",
        port: 631,
        hosts: ["192.168.1.30"],
      },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.host === "192.168.1.20")?.port).toBe(9100);
    expect(rows.find((r) => r.host === "192.168.1.30")?.port).toBe(9100);
  });
});
