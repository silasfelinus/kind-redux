// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },
  modules: ['@nuxt/content', "@nuxt/eslint", "@nuxt/image", "@nuxt/icon",  '@pinia/nuxt', '@nuxtjs/tailwindcss', 
    '@unlok-co/nuxt-stripe',],
    stripe: {
      // Server
      server: {
        key: 'sk_test_123',
        options: {
          // your api options override for stripe server side
          apiVersion: '2024-04-10', 
        },
        // CLIENT
      },
      client: {
        key: 'pk_test_123',
        // your api options override for stripe client side
        options: {},
      },
    },
    css: ['~/assets/css/tailwind.css'],
    runtimeConfig: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      GITHUB_ID: process.env.GITHUB_ID,
      GITHUB_SECRET: process.env.GITHUB_SECRET,
      GOOGLE_ID_KEY: process.env.GOOGLE_ID,
      GOOGLE_SECRET: process.env.GOOGLE_SECRET,
      AUTH_SECRET: process.env.AUTH_SECRET,
      JWT_SECRET: process.env.JWT_SECRET,
    },
  routeRules: {
    '/': { prerender: true }
  },

    content: {
    documentDriven: true,
  },
})