import { nativeTokens, type ShadowKind } from "../index";
import { shadowStyle } from "../shadow";

describe("shadowStyle", () => {
  it("returns token shadows for native platforms", () => {
    const kind: ShadowKind = "card";

    expect(shadowStyle(kind)).toEqual(nativeTokens.shadow.card);
  });
});
