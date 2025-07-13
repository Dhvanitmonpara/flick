import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'], // or 'cjs' depending on your project
  dts: true,
  outDir: 'dist',
  splitting: false,
  silent: true,
  sourcemap: true,
  clean: true,
  external: [
    'uuid',
    'mongoose',
    'nodemailer',
    'socket.io',
    'rate-limiter-flexible',
    'ioredis',
    'axios',
    'express',
    'jsonwebtoken',
    'dotenv',
    'cookie-parser',
    'cors',
    'ua-parser-js',
    'bcryptjs'
  ],
})