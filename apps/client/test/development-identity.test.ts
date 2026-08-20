import assert from "node:assert/strict";
import test from "node:test";

import { getGuestLanguageByCountryCode } from "../src/shared/lib/development-identity.ts";

test("keeps guest participant language derived from country", () => {
  assert.equal(getGuestLanguageByCountryCode("KR"), "ko");
  assert.equal(getGuestLanguageByCountryCode("VN"), "vi");
});
