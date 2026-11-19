import 'dotenv/config'
import { buildApp } from './app.js'
import { config } from './config.js'

const app = buildApp()

app.listen(config.port, () => {
  console.log(`\n  Aruna Textile API on http://localhost:${config.port}`)
  console.log(`  Supabase ready: ${!!(config.supabaseUrl && config.supabaseSecret)}`)
  console.log(`  Razorpay live:  ${!!(config.razorpay.keyId && config.razorpay.keySecret)}`)
  console.log(`  Brevo live:     ${!!(config.mail.brevoKey && config.mail.fromEmail)}`)
  console.log(`  health:         GET /health\n`)
})
