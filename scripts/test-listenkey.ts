/**
 * Listen Key API 测试脚本
 *
 * 用于测试 Listen Key 获取流程是否正常
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// 首先加载环境变量
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '../.env.local')

console.log('Loading environment from:', envPath)
const result = dotenv.config({ path: envPath })

if (result.error) {
  console.error('Error loading .env.local:', result.error)
  process.exit(1)
}

console.log('Environment loaded successfully')
console.log('  - BINANCE_API_KEY:', process.env.BINANCE_API_KEY ? 'SET' : 'NOT SET')
console.log('  - BINANCE_API_SECRET:', process.env.BINANCE_API_SECRET ? 'SET' : 'NOT SET')

// 动态导入其他模块(确保环境变量已加载)
async function main() {
  const { BinanceRestClient } = await import('../lib/binance/rest-client.js')
  const { getServerConfig } = await import('../lib/config.js')

  async function testListenKeyAPI() {
    console.log('\n========================================')
    console.log('🧪 Listen Key API Test')
    console.log('========================================\n')

    try {
      // 获取配置
      console.log('Step 1: Loading configuration...')
      const config = getServerConfig()

      console.log('Config loaded:')
      console.log(
        '  - API Key:',
        config.binance.apiKey ? `${config.binance.apiKey.substring(0, 10)}...` : 'NOT SET'
      )
      console.log('  - API Secret:', config.binance.apiSecret ? '***SET***' : 'NOT SET')
      console.log('  - REST API:', config.binance.restApi)
      console.log('  - WebSocket API:', config.binance.wsApi)
      console.log('  - Development:', config.app.isDevelopment)

      if (!config.binance.apiKey || !config.binance.apiSecret) {
        console.error('\n❌ Error: API credentials not configured!')
        console.error('Please set BINANCE_API_KEY and BINANCE_API_SECRET in .env.local')
        process.exit(1)
      }

      // 创建 REST 客户端
      console.log('\nStep 2: Creating REST client...')
      const client = new BinanceRestClient({
        apiKey: config.binance.apiKey,
        apiSecret: config.binance.apiSecret,
        baseUrl: config.binance.restApi,
        enableLog: true,
      })

      // 获取 Listen Key
      console.log('\nStep 3: Fetching Listen Key from Binance API...')
      const listenKeyResult = await client.getListenKey()

      console.log('\n✅ Success! Listen Key obtained:')
      console.log('  - Listen Key:', listenKeyResult.listenKey.substring(0, 20) + '...')
      console.log('  - Full length:', listenKeyResult.listenKey.length)

      // 测试刷新 Listen Key
      console.log('\nStep 4: Testing Listen Key keep-alive...')
      await client.keepAliveListenKey(listenKeyResult.listenKey)
      console.log('✅ Keep-alive successful!')

      console.log('\n========================================')
      console.log('✅ All tests passed!')
      console.log('========================================\n')

      console.log('📝 Next steps:')
      console.log('  1. Open http://localhost:3000 in your browser')
      console.log('  2. Check browser console for WebSocket connection logs')
      console.log('  3. Look for messages starting with [WebSocketProvider]')
    } catch (error: unknown) {
      console.error('\n========================================')
      console.error('❌ Test failed!')
      console.error('========================================\n')
      const message = error instanceof Error ? error.message : 'Unknown error'
      const code =
        error instanceof Error && 'code' in error ? (error as { code: string }).code : 'UNKNOWN'
      console.error('Error:', message)
      console.error('Code:', code)
      console.error('\nPossible issues:')
      console.error('  1. API Key or Secret is incorrect')
      console.error('  2. API Key does not have "Enable Reading" permission')
      console.error('  3. Network connectivity issues')
      console.error('  4. Binance API is temporarily unavailable')
      console.error('\nSolutions:')
      console.error(
        '  - Check your API credentials at https://www.binance.com/en/my/settings/api-management'
      )
      console.error('  - Ensure API Key has "Enable Reading" permission enabled')
      console.error('  - Verify .env.local file exists and contains correct values')
      process.exit(1)
    }
  }

  // 运行测试
  await testListenKeyAPI()
}

main().catch(console.error)
