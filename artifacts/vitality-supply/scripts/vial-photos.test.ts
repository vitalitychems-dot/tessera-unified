import assert from "node:assert/strict";
import test from "node:test";
import { productImage } from "../src/lib/catalog";
import { GENERIC_VIAL, responsiveVialPhoto, vialPhotoSrcSet } from "../src/lib/vial-photos";

test("selects the generated 400w asset while preserving PHOTO_VERSION", () => {
  const canonical = productImage("Semaglutide", "10mg", "vial");
  assert.equal(
    responsiveVialPhoto(canonical),
    "/product-images/w400/semaglutide-10mg.webp?v=2",
  );
  assert.equal(
    vialPhotoSrcSet(canonical),
    "/product-images/w400/semaglutide-10mg.webp?v=2 400w, /product-images/semaglutide-10mg.webp?v=2 800w",
  );
});

test("supports the generic fallback but rejects non-image fallback URLs", () => {
  assert.equal(
    responsiveVialPhoto(GENERIC_VIAL),
    "/product-images/w400/generic-vial.webp?v=2",
  );
  assert.equal(responsiveVialPhoto("data:image/svg+xml,unavailable"), undefined);
  assert.equal(vialPhotoSrcSet("data:image/svg+xml,unavailable"), undefined);
});