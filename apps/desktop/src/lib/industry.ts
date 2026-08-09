import type { BranchSettings, IndustryKey } from "./types";

export function industryCaps(_industry?: IndustryKey | string | undefined) {
  return {
    track_serial: true,
    track_imei: true,
    track_expiry: true,
    weight_scale: true,
    vehicle_fitment: true,
    modifiers: true,
    tables: true,
  };
}

export function promptSerialMeta(
  settings: BranchSettings,
  productName: string
): { imei?: string; serial?: string } | null {
  const caps = industryCaps(settings.industry);
  const meta: { imei?: string; serial?: string } = {};

  if (caps.track_imei) {
    const imei = window.prompt(`IMEI للصنف: ${productName}`, "");
    if (imei === null) return null;
    const cleaned = imei.replace(/\D/g, "");
    if (cleaned.length < 14) {
      alert("IMEI غير صالح (14–16 رقم)");
      return null;
    }
    meta.imei = cleaned;
  }

  if (caps.track_serial) {
    const serial = window.prompt(`الرقم التسلسلي للصنف: ${productName}`, "");
    if (serial === null) return null;
    if (!serial.trim()) {
      alert("الرقم التسلسلي مطلوب");
      return null;
    }
    meta.serial = serial.trim();
  }

  return meta;
}
