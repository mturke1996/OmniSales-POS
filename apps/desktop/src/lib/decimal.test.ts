import { describe, expect, it } from "vitest";
import {
  decimalFieldValue,
  parseDecimal,
  sanitizeDecimalInput,
} from "./decimal";

describe("sanitizeDecimalInput", () => {
  it("keeps a trailing decimal point so 12. can become 12.5", () => {
    expect(sanitizeDecimalInput("12.")).toBe("12.");
    expect(sanitizeDecimalInput("12,")).toBe("12.");
  });

  it("accepts comma and Arabic separators", () => {
    expect(sanitizeDecimalInput("12,50")).toBe("12.50");
    expect(sanitizeDecimalInput("12٫5")).toBe("12.5");
    expect(sanitizeDecimalInput("12،25")).toBe("12.25");
  });

  it("maps Arabic-Indic digits", () => {
    expect(sanitizeDecimalInput("١٢.٥")).toBe("12.5");
  });

  it("drops a second separator", () => {
    expect(sanitizeDecimalInput("1.2.3")).toBe("1.23");
  });
});

describe("parseDecimal", () => {
  it("parses western and Arabic decimals", () => {
    expect(parseDecimal("12.5")).toBe(12.5);
    expect(parseDecimal("12,5")).toBe(12.5);
    expect(parseDecimal("١٢٫٥")).toBe(12.5);
  });

  it("returns fallback for empty / incomplete input", () => {
    expect(parseDecimal("", 0)).toBe(0);
    expect(parseDecimal(".", 0)).toBe(0);
    expect(parseDecimal("-", 3)).toBe(3);
  });
});

describe("decimalFieldValue", () => {
  it("renders stored prices without forcing integers", () => {
    expect(decimalFieldValue(12.5)).toBe("12.5");
    expect(decimalFieldValue(0)).toBe("0");
  });
});
