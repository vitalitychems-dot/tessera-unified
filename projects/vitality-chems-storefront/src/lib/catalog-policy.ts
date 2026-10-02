/** Catalog eligibility rules shared by the storefront crawl surface and sitemap. */
export const NON_PROMOTED_CATEGORIES = new Set([
  "liquid-formulations",
  "encapsulated-formulations",
  "sarm-formulations",
]);

export function isIndexableCatalogProduct(product: {
  inStock: boolean;
  category: string;
}) {
  return product.inStock && !NON_PROMOTED_CATEGORIES.has(product.category);
}
