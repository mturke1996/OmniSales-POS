import { describe, expect, it } from "vitest";
import { shouldAttemptEscpos } from "./print-routing";

describe("print-routing", () => {
  it("auto mode depends on runtime printer state (boolean)", () => {
    expect(typeof shouldAttemptEscpos("auto")).toBe("boolean");
  });
});
