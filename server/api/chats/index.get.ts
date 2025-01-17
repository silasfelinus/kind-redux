// /server/api/chats/index.get.ts
import { defineEventHandler } from 'h3'
import type { ChatExchange } from '@prisma/client'
import { errorHandler } from '../utils/error'
import prisma from '../utils/prisma'

export default defineEventHandler(async () => {
  try {
    const chatExchanges = await fetchAllChatExchanges()
    return { success: true, chatExchanges }
  }
  catch (error: unknown) {
    return errorHandler(error)
  }
})

// Function to fetch all Chat Exchanges
export async function fetchAllChatExchanges(): Promise<ChatExchange[]> {
  return await prisma.chatExchange.findMany()
}
