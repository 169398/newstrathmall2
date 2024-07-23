'use client'

import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Sheet, SheetTrigger } from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { addItemToCart, removeItemFromCart } from '@/lib/actions/cart.actions'
import { formatCurrency } from '@/lib/utils'
import { Cart } from '@/types'
import { ArrowRight, Loader, Minus, Plus } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export default function CartForm({ cart }: { cart?: Cart }) {
  const router = useRouter()

  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  return (
    <>
      <Sheet>
          <h1 className="py-4 h2-bold">Shopping Cart</h1>

          {!cart || cart.items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center space-y-2 mb-5">
              <div
                aria-hidden="true"
                className="relative mb-4 h-60 w-60 text-muted-foreground"
              >
                <Image
                  src="/emptycart.png"
                 fill
                  alt="empty shopping cart hippo"
                />
              </div>
              <div className="text-xl font-semibold">Your cart is empty</div>
              <SheetTrigger asChild>
                <Link
                  href="/search"
                  className={buttonVariants({
                    variant: "link",
                    size: "sm",
                    className: "text-sm text-muted-foreground",
                  })}
                >
                  Add items to your cart to checkout
                </Link>
              </SheetTrigger>
            </div>
          ) : (
            <div className="grid md:grid-cols-4 md:gap-5">
              <div className="overflow-x-auto md:col-span-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.items.map((item) => (
                      <TableRow key={item.slug}>
                        <TableCell>
                          <Link
                            href={`/product/${item.slug}`}
                            className="flex items-center"
                          >
                            <Image
                              src={item.image}
                              alt={item.name}
                              width={50}
                              height={50}
                            ></Image>
                            <span className="px-2">{item.name}</span>
                          </Link>
                        </TableCell>
                        <TableCell className="flex-center gap-2">
                          <Button
                            disabled={isPending}
                            variant="outline"
                            type="button"
                            onClick={() =>
                              startTransition(async () => {
                                const res = await removeItemFromCart(
                                  item.productId
                                );
                                if (!res.success) {
                                  toast({
                                    variant: "destructive",
                                    description: res.message,
                                  });
                                }
                              })
                            }
                          >
                            {isPending ? (
                              <Loader className="w-4 h-4  animate-spin" />
                            ) : (
                              <Minus className="w-4 h-4" />
                            )}
                          </Button>
                          <span>{item.qty}</span>
                          <Button
                            disabled={isPending}
                            variant="outline"
                            type="button"
                            onClick={() =>
                              startTransition(async () => {
                                const res = await addItemToCart(item);
                                if (!res.success) {
                                  toast({
                                    variant: "destructive",
                                    description: res.message,
                                  });
                                }
                              })
                            }
                          >
                            {isPending ? (
                              <Loader className="w-4 h-4  animate-spin" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div>
                <Card>
                  <CardContent className="p-4 gap-4">
                    <div className="pb-3 text-xl">
                      Subtotal ({cart.items.reduce((a, c) => a + c.qty, 0)}):
                      {formatCurrency(cart.itemsPrice)}
                    </div>
                    <Button
                      onClick={() =>
                        startTransition(() => router.push("/shipping-address"))
                      }
                      className="w-full"
                      disabled={isPending}
                    >
                      {isPending ? (
                        <Loader className="animate-spin w-4 h-4" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                      Proceed to Checkout
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
      </Sheet>
    </>
  );
}
