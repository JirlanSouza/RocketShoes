import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const setNewCart = (newCart: Product[]) => {
    setCart(newCart);
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
  };

  const getProductStock = async (productId: number) => {
    const getProductStockResult = await api.get<Stock>(`/stock/${productId}`);

    if (getProductStockResult.status !== 200) {
      throw new Error();
    }

    return getProductStockResult.data.amount;
  };

  const addProduct = async (productId: number) => {
    try {
      const productStock = await getProductStock(productId);

      const existProductInCartIndex = cart.findIndex(
        (product) => product.id === productId
      );

      if (existProductInCartIndex === -1) {
        const getProductResult = await api.get<Product>(
          `/products/${productId}`
        );

        if (getProductResult.status !== 200 || productStock < 1) {
          throw new Error();
        }

        const product = getProductResult.data;
        const newCart = [...cart, { ...product, amount: 1 }];

        setNewCart(newCart);

        return;
      }

      if (productStock < cart[existProductInCartIndex].amount + 1) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      cart[existProductInCartIndex].amount += 1;

      setNewCart([...cart]);
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const existProductInCartIndex = cart.findIndex(
        (product) => product.id === productId
      );

      if (existProductInCartIndex === -1) {
        throw new Error("This product not exist in cart");
      }
      const newCart = cart.filter((product) => product.id !== productId);
      setNewCart(newCart);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const productStock = await getProductStock(productId);

      const existProductInCartIndex = cart.findIndex(
        (product) => product.id === productId
      );

      if (existProductInCartIndex === -1) {
        throw new Error();
      }

      if (productStock < amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      cart[existProductInCartIndex].amount = amount;

      setNewCart([...cart]);
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
