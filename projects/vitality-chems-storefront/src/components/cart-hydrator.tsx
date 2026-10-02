import { useEffect } from "react";
import { useCart } from "@/lib/cart-store";

export function CartHydrator() {
  useEffect(() => {
    void useCart.persist.rehydrate();
  }, []);
  return null;
}
