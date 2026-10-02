import { useEffect } from "react";
import { hydrateCart } from "@/lib/cart-store";

export function CartHydrator() {
  useEffect(() => {
    void hydrateCart();
  }, []);
  return null;
}
