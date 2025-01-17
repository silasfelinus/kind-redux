// /server/api/carts/[id].get.ts
import { defineEventHandler } from 'h3'
import type { CartItem } from '@prisma/client'
import prisma from '../utils/prisma'
import { errorHandler } from '../utils/error'

export default defineEventHandler(async (event) => {
  try {
    const cartId = Number(event.context.params?.cartId)
    const items = await fetchCartItems(cartId)
    return { success: true, items }
  }
  catch (error: unknown) {
    return errorHandler(error)
  }
})

// Function to fetch all CartItems for a specific Cart
export async function fetchCartItems(cartId: number): Promise<CartItem[]> {
  try {
    return await prisma.cartItem.findMany({
      where: {
        cartId, // Add this line to filter by cartId
      },
    })
  }
  catch (error: unknown) {
    throw errorHandler(error)
  }
}
