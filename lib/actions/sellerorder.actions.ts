"use server";
import { auth } from "@/auth";
import { getMyCart } from "./sellercart.actions";
import { getUserById } from "./user.actions";
import { redirect } from "next/navigation";
import { insertOrderSchema,  } from "../validator";

import db from "@/db/drizzle";

import { count, desc, eq, sql, sum, and } from "drizzle-orm";
import { isRedirectError } from "next/dist/client/components/redirect";
import { formatError } from "../utils";
import { paypal } from "../paypal";
import { revalidatePath } from "next/cache";
import { PaymentResult } from "@/types/sellerindex";
import { PAGE_SIZE } from "../constants";
import { sendPurchaseReceipt } from "@/emails";
import { carts, orderItems, orders, products } from "@/db/schema";



export async function getSellerOrderSummary(sellerId: string) {
  const ordersCount = await db
    .select({ count: count() })
    .from(orders)
    .where(eq(orders.sellerId, sellerId));


  const productsCount = await db
    .select({ count: count() })
    .from(products)
    .where(eq(products.sellerId, sellerId));

  const ordersPrice = await db
    .select({ sum: sum(orders.totalPrice) })
    .from(orders)
    .where(eq(orders.sellerId, sellerId));

  const salesData = await db
    .select({
      months: sql<string>`to_char(${orders.createdAt}, 'MM/YY')`,
      totalSales: sql<number>`sum(${orders.totalPrice})`.mapWith(Number),
    })
    .from(orders)
    .where(eq(orders.sellerId, sellerId))
    .groupBy(sql`to_char(${orders.createdAt}, 'MM/YY')`);

  const latestOrders = await db.query.orders.findMany({
    where: eq(orders.sellerId, sellerId),
    orderBy: [desc(orders.createdAt)],
    with: {
      user: { columns: { name: true } },
    },
    limit: 6,
  });

  return {
    ordersCount: ordersCount[0]?.count || 0,
    productsCount: productsCount[0]?.count || 0,
    ordersPrice: ordersPrice[0]?.sum || 0,
    salesData,
    latestOrders,
  };
}

export async function getOrderSummary(sellerId: string) {
  const ordersCount = await db.select({ count: count() }).from(orders)
    .where(eq(orders.sellerId, sellerId));

  const productsCount = await db
    .select({ count: count() })
    .from(products)

  const ordersPrice = await db
    .select({ sum: sum(orders.totalPrice) })
    .from(orders)


  const salesData = await db
    .select({
      months: sql<string>`to_char(${orders.createdAt},'MM/YY')`,
      totalSales: sql<number>`sum(${orders.totalPrice})`.mapWith(Number),
    })
    .from(orders)
    .groupBy(sql`1`);

  const latestOrders = await db.query.orders.findMany({
    orderBy: [desc(orders.createdAt)],
    with: {
      user: { columns: { name: true } },
    },
    limit: 6,
  });
  return {
    ordersCount,
    productsCount,
    ordersPrice,
    salesData,
    latestOrders,
  };
}



export async function getAllSellerOrders({
  limit = PAGE_SIZE,
  page,
  sellerId,
}: {
  limit?: number;
  page: number;
  sellerId: string;
}) {
  const data = await db.query.orders.findMany({
    where: eq(orders.sellerId, sellerId),
    orderBy: [desc(orders.createdAt)],
    limit,
    offset: (page - 1) * limit,
    with: { user: { columns: { name: true } } },
  });

  const dataCount = await db
    .select({ count: count() })
    .from(orders)
    .where(eq(orders.sellerId, sellerId));

  return {
    data,
    totalPages: Math.ceil(dataCount[0].count / limit),
  };
}

// CREATE
export const createOrder = async () => {
  try {
    const session = await auth();
    if (!session) throw new Error("User is not authenticated");
    const cart = await getMyCart();
    const user = await getUserById(session?.user.id!);
    if (!cart || cart.items.length === 0) redirect("/cart");
    if (!user.address) redirect("/shipping-address");
    if (!user.paymentMethod) redirect("/payment-method");

    const order = insertOrderSchema.parse({
      userId: user.id,
      shippingAddress: user.address,
      paymentMethod: user.paymentMethod,
      itemsPrice: cart.itemsPrice,
      shippingPrice: cart.shippingPrice,
      totalPrice: cart.totalPrice,
      sellerId: user.id,
    });
    const insertedOrderId = await db.transaction(async (tx) => {
      const insertedOrder = await tx.insert(orders).values(order).returning();
      for (const item of cart.items) {
        await tx.insert(orderItems).values({
          ...item,
          price: item.price.toFixed(2),
          orderId: insertedOrder[0].id,
          sellerId: user.id,

        });
      }
      await db
        .update(carts)
        .set({
          items: [],
          totalPrice: "0",
          shippingPrice: "0",
          itemsPrice: "0",
        })
        .where(eq(carts.id, cart.id));
      return insertedOrder[0].id;
    });
    if (!insertedOrderId) throw new Error("Order not created");
    redirect(`/order/${insertedOrderId}`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    return { success: false, message: formatError(error) };
  }
};

// GET
export async function getOrderById(orderId: string) {
  return await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      orderItems: true,
      user: { columns: { name: true, email: true } },
    },
  })
}
// DELETE
export async function deleteSellerOrder(id: string, sellerId: string) {
  try {
    const orderExists = await db.query.orders.findFirst({
      where: and(eq(orders.id, id), eq(orders.sellerId, sellerId)),
    });
    if (!orderExists) throw new Error("Order not found");
    await db.delete(orders).where(eq(orders.id, id));
    revalidatePath("/seller/orders");
    return {
      success: true,
      message: "Order deleted successfully",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// UPDATE
export async function createPayPalOrder(orderId: string) {
  try {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    })
    if (order) {
      const paypalOrder = await paypal.createOrder(Number(order.totalPrice))
      await db
        .update(orders)
        .set({
          paymentResult: {
            id: paypalOrder.id,
            email_address: '',
            status: '',
            pricePaid: '0',
          },
        })
        .where(eq(orders.id, orderId))
      return {
        success: true,
        message: 'PayPal order created successfully',
        data: paypalOrder.id,
      }
    } else {
      throw new Error('Order not found')
    }
  } catch (err) {
    return { success: false, message: formatError(err) }
  }
}

export async function approvePayPalOrder(
  orderId: string,
  data: { orderID: string }
) {
  try {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    })
    if (!order) throw new Error('Order not found')

    const captureData = await paypal.capturePayment(data.orderID)
    if (
      !captureData ||
      captureData.id !== order.paymentResult?.id ||
      captureData.status !== 'COMPLETED'
    )
      throw new Error('Error in paypal payment')
    await updateOrderToPaid({
      orderId,
      paymentResult: {
        id: captureData.id,
        status: captureData.status,
        email_address: captureData.payer.email_address,
        pricePaid:
          captureData.purchase_units[0]?.payments?.captures[0]?.amount?.value,
      },
    })
    revalidatePath(`/order/${orderId}`)
    return {
      success: true,
      message: 'Your order has been successfully paid by PayPal',
    }
  } catch (err) {
    return { success: false, message: formatError(err) }
  }
}

export const handleDeleteOrder = async (id: string) => {
  const session = await auth();
  const sellerId = session?.user.id || "";
  return deleteSellerOrder(id, sellerId);
};

export const updateOrderToPaid = async ({
  orderId,
  paymentResult,
}: {
  orderId: string;
  paymentResult?: PaymentResult;
}) => {
  const order = await db.query.orders.findFirst({
    columns: { isPaid: true },
    where: and(eq(orders.id, orderId)),
    with: { orderItems: true },
  });
  if (!order) throw new Error("Order not found");
  if (order.isPaid) throw new Error("Order is already paid");
  await db.transaction(async (tx) => {
    for (const item of order.orderItems) {
      await tx
        .update(products)
        .set({
          stock: sql`${products.stock} - ${item.qty}`,
        })
        .where(eq(products.id, item.productId));
    }
    await tx
      .update(orders)
      .set({
        isPaid: true,
        paidAt: new Date(),
        paymentResult,
      })
      .where(eq(orders.id, orderId));
  });
  const updatedOrder = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      orderItems: true,
      user: { columns: { name: true, email: true } },
    },
  });
  if (!updatedOrder) {
    throw new Error("Order not found");
  }
  await sendPurchaseReceipt({
    order: updatedOrder
  });
};

export async function updateOrderToPaidByCOD(orderId: string) {
  try {
    await updateOrderToPaid({ orderId });
    revalidatePath(`/sellerOrder/${orderId}`);
    return { success: true, message: "Order paid successfully" };
  } catch (err) {
    return { success: false, message: formatError(err) };
  }
}

export async function deliverOrder(orderId: string) {
  try {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
    if (!order) throw new Error("Order not found");
    if (!order.isPaid) throw new Error("Order is not paid");

    await db
      .update(orders)
      .set({
        isDelivered: true,
        deliveredAt: new Date(),
      })
      .where(eq(orders.id, orderId));
    revalidatePath(`/order/${orderId}`);
    return { success: true, message: "Order delivered successfully" };
  } catch (err) {
    return { success: false, message: formatError(err) };
  }
}
