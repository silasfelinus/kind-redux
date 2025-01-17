import { defineEventHandler, readBody } from 'h3'
import { errorHandler } from '../utils/error'
import prisma from '../utils/prisma'
import { generateSillyName } from '@/utils/useRandomName'
import { saveImage } from '@/server/api/utils/saveImage'


console.log('🚀 Starting up the art generation engine! Let\'s create something amazing!')

type GenerateImageResponse = {
  images: string[]
  error?: string
}
type RequestData = {
  title?: string // if we need to make a pitch
  prompt: string // the art prompt, very important
  description?: string
  flavorText?: string
  userId?: number // 0 if username is not given.
  promptId?: number // may have already been made, otherwise, we make one using "prompt"
  pitchId?: number // if doesn't exist, make if given "pitchName"
  channelId?: number // make if not existing using channelLabel
  galleryId?: number // if not given, make with galleryName (or use 21)
  designerName?: string // same as username if not given, or generate a random name
  channelName?: string // to make channel if channel is not given
  userName?: string // to make a user if userId is not given
  pitchName?: string // to make pitch if pitchId is not given
  galleryName?: string // to make gallery if no galleryId
  isMature?: boolean // for entry in multiple models
  isPublic?: boolean // for entry in multiple models
  isOrphan?: boolean // for entry in Art
  highlightImage?: string
}

type validatedData = {
  title: string
  prompt: string
  description: string
  flavorText: string
  userId: number
  promptId: number
  pitchId: number
  channelId: number
  galleryId: number
  designerName: string
  channelName: string
  userName: string
  pitchName: string
  galleryName: string
  isMature: boolean
  isPublic: boolean
  isOrphan: boolean
  highlightImage?: string
}

async function validateAndLoadUserId(data: RequestData, validatedData: Partial<validatedData>): Promise<number> {
  console.log('🔍 Validating and loading User ID...');

  // If neither userName nor userId is provided, return 0
  if (!data.userName && !data.userId) {
    console.warn('No userName or userId provided.');
    return 0;
  }

  // If userName is provided, upsert the user using userName as a unique identifier
  if (data.userName) {
    const user = await prisma.user.upsert({
      where: { username: data.userName }, // Ensure 'username' is marked as unique in your Prisma schema
      update: {},
      create: {
        username: data.userName,
        createdAt: new Date(), // Set the creation timestamp
        Role: 'USER', // Assuming 'USER' is a default role, replace with appropriate enum or value
      },
    });
    validatedData.userName = user.username;
    return user.id;
  }

  // If userId is provided but userName is not, simply return the userId
  if (data.userId) {
    return data.userId;
  }

  // If we reach this point, something went wrong
  return 0;
}



async function validateAndLoadPromptId(data: RequestData): Promise<number> {
  console.log('🔍 Validating and loading Prompt ID...');

  // Check if prompt is provided
  if (!data.prompt) {
    console.warn('No prompt provided.');
    throw new Error('Something went wrong');
  }

  // Check if an ArtPrompt with the given prompt already exists
  const existingPrompt = await prisma.artPrompt.findFirst({
    where: { prompt: data.prompt },
  });

  if (existingPrompt) {
    return existingPrompt.id; // Return the existing promptId
  } else {
    // Create a new ArtPrompt using "prompt"
    const newPrompt = await prisma.artPrompt.create({
      data: {
        prompt: data.prompt,
        userId: data.userId ?? 0, // Default to 0 if not provided
        galleryId: data.galleryId ?? 0, // Default to 0 if not provided
        pitch: data.title,
        pitchId: data.pitchId ?? 0, // Default to 0 if not provided
        createdAt: new Date(), // Add a creation timestamp
        updatedAt: new Date(), // Add an updated timestamp
        DB_ROW_HASH_1: BigInt(0), // This would typically be generated, but defaulting for example
      },
    });
    return newPrompt.id; // Return the new promptId
  }
}


async function validateAndLoadPitchId(data: RequestData): Promise<number> {
  console.log('🔍 Validating and loading pitch ID...')

  // If pitchId is provided, return it immediately
  if (data.pitchId) {
    return data.pitchId
  }

  try {
    if (!data.title && !data.pitchId) {
      console.warn('No pitch title or pitchId provided.')
      return 0
    }

    if (data.title) {
      const existingPitch = await prisma.pitch.findUnique({
        where: { title: data.title },
      })

      if (existingPitch) {
        return existingPitch.id
      }

      const newPitch = await prisma.pitch.create({
        data: {
          title: data.title ?? 'Untitled', // Provide a default title if none is provided
          pitch: data.pitchName || 'masterpiece', // Provide a default pitch name
          designer: data.designerName ?? 'Anonymous', // Provide a default designer name
          channelId: data.channelId ?? 0, // Use default value from schema if not provided
          userId: data.userId ?? 0, // Use default value from schema if not provided
          isOrphan: data.isOrphan ?? false, // Use default value from schema
          isPublic: data.isPublic ?? false,  // Use default value from schema
          creatorId: data.userId ?? 0, // Use default value from schema
          isMature: data.isMature ?? false, // Use default value from schema
          flavorText: data.flavorText ?? '', // Optional, but providing an empty string as default
          createdAt: new Date(), // Set to current timestamp
          highlightImage: data.highlightImage ?? '', // Provide a default or an empty string
        },
      
      })

      return newPitch.id
    }

    return data.pitchId ?? 0
  }
  catch (error) {
    console.error('Error validating and loading pitch ID:', error)
    return 0 // You can't return errorHandler here as it doesn't return a number
  }
}

async function validateAndLoadChannelId(data: RequestData): Promise<number> {
  console.log('🔍 Validating and loading channel ID...')

  // If channelId is provided, return it as the source of truth
  if (data.channelId) {
    return data.channelId
  }

  try {
    const labelToSearch = data.channelName ?? data.pitchName

    if (!labelToSearch) {
      console.warn('No channelName or pitchName provided.')
      return 1 // Default channel ID
    }

    const existingChannel = await prisma.channel.findUnique({
      where: { label: labelToSearch },
    })

    if (existingChannel) {
      return existingChannel.id // Return the existing channelId
    }

    // Create a new Channel
    const newChannel = await prisma.channel.create({
      data: {
        label: labelToSearch, // This should be defined earlier in your code
        title: data.title ?? undefined,
        pitchId: data.pitchId ?? undefined,
        description: data.description ?? undefined,
        userId: data.userId ?? undefined,
        createdAt: new Date(), // Set to the current timestamp
      },
    })

    return newChannel.id
  }
  catch (error) {
    console.error('Error validating and loading channel ID:', error)
    return 1
  }
}

async function validateAndLoadGalleryId(data: RequestData): Promise<number> {
  console.log('🔍 Validating and loading gallery ID...');

  if (data.galleryId === undefined) {
    const galleryName = data.galleryName ?? 'cafefred';

    // Try to find an existing Gallery by name
    const existingGallery = await prisma.gallery.findFirst({
      where: { name: galleryName },
    });

    if (existingGallery) {
      // If gallery exists, return its ID
      return existingGallery.id;
    } else {
      // If gallery doesn't exist, create a new one with required fields
      const newGallery = await prisma.gallery.create({
        data: {
          name: galleryName,
          createdAt: new Date(), // Set to the current timestamp
          content: '', // Provide a default value for content, could be an empty string or placeholder
        },
      });
      return newGallery.id;
    }
  }
  return data.galleryId ?? 21;
}


function validateAndLoadDesignerName(data: RequestData): string {
  console.log('🔍 Validating and loading designer name...')

  return data.designerName ?? data.userName ?? generateSillyName() ?? 'Kind Guest'
}

export default defineEventHandler(async (event) => {
  try {
    console.log('🌟 Event triggered! Reading request body...')
    const requestData: RequestData = await readBody(event)
    console.log('📬 Request data received:', requestData)

    console.log('🔐 Initializing validated data object...')
    const validatedData: Partial<validatedData> = {}

    // Validate and load each field, updating the validatedData object
    validatedData.userId = await validateAndLoadUserId(requestData, validatedData)
    validatedData.promptId = await validateAndLoadPromptId(requestData)
    validatedData.pitchId = await validateAndLoadPitchId(requestData)
    validatedData.channelId = await validateAndLoadChannelId(requestData)
    validatedData.galleryId = await validateAndLoadGalleryId(requestData)
    validatedData.designerName = await validateAndLoadDesignerName(requestData)

    console.log('🎉 All validations passed! Generating image...')
    const response: GenerateImageResponse = await generateImage(requestData.prompt, validatedData.designerName!)
    console.log('🖼 Image generated! Response:', response)

    // Declare base64Image variable here
    let base64Image: string

    // Validate the image generation response
    if (Array.isArray(response)) {
      if (!response.length) {
        throw new Error('No images were generated. Please validate the prompt and user.')
      }
      base64Image = response[0] // Directly assign the first element if response is an array
    }
    else {
      if (!response.images || !response.images.length) {
        if (response.error) {
          throw new Error(`Image generation failed due to: ${response.error}`)
        }
        throw new Error('No images were generated. Please validate the prompt and user.')
      }
      base64Image = response.images[0] // Use the first image from the images array if response is an object
    }
    // Save the image and get its path
    let imagePath = await saveImage(base64Image, 'cafefred')

    // Remove '/public' or 'public' prefix from imagePath
    if (imagePath.startsWith('/public') || imagePath.startsWith('public')) {
      imagePath = imagePath.replace(/^\/?public/, '')
    }

    console.log('🎨 Creating new Art entry...')

    // Create the new Art entry using Prisma
    const newArt = await prisma.art.create({
      data: {
        path: imagePath,
        prompt: requestData.prompt,
        pitchId: validatedData.pitchId,
        userId: validatedData.userId,
        galleryId: validatedData.galleryId || 21,
        artPromptId: validatedData.promptId,
        pitch: requestData.pitchName,
        isMature: requestData.isMature,
        isOrphan: requestData.isOrphan,
        isPublic: requestData.isPublic,
        channelId: validatedData.channelId,
        designer: validatedData.designerName,
      },
    })

    return { success: true, newArt } // Return the result
  }
  catch (error: unknown) {
    console.error('Art Generation Error:', error)
    return errorHandler({
      error,
      context: `Art Generation - Prompt`,
    })
  }
})

export async function generateImage(prompt: string, user: string): Promise<{ images: string[] }> {
  console.log('📸 Starting image generation...')
  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
  }

  const requestBody = {
    prompt,
    n: 1,
    size: '256x256',
    response_format: 'url',
    user,
  }

  try {
    const response = await fetch('https://lola.acrocatranch.com/sdapi/v1/txt2img', {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`)
    }

    const responseData = await response.json()
    const generatedImageUrl = responseData.images // Assuming the images field contains the URL
    console.log('📷 Image generation complete!')
    return generatedImageUrl
  }
  catch (error: unknown) {
    throw errorHandler({ error, context: 'Image Generation with Cafe Fred' })
  }
}
