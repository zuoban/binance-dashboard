/**
 * 币安看板统一数据 API Route
 *
 * 一次性返回账户、持仓、订单的所有数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { BinanceRestClient } from '@/lib/binance/rest-client';
import { getServerConfig } from '@/lib/config';
import { checkRateLimit } from '@/lib/middleware/rate-limit';
import { mapBinancePosition } from '@/lib/utils/binance-mapper';
import { mapBinanceAccount } from '@/lib/utils/account-mapper';

/**
 * 默认订单时间范围（1小时）
 */
const DEFAULT_ORDER_TIME_RANGE = 60 * 60 * 1000;

/**
 * GET /api/binance/dashboard
 * 获取看板所需的所有数据
 */
export async function GET(request: NextRequest) {
  try {
    // 检查速率限制
    const rateLimitResult = await checkRateLimit(request);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.error!;
    }

    // 获取订单时间范围参数（毫秒）
    const searchParams = request.nextUrl.searchParams;
    const orderTimeRange = searchParams.get('orderTimeRange')
      ? parseInt(searchParams.get('orderTimeRange')!, 10)
      : DEFAULT_ORDER_TIME_RANGE;

    // 获取服务端配置
    const config = getServerConfig();

    // 验证 API 配置
    if (!config.binance.apiKey || !config.binance.apiSecret) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: -1,
            message: 'Binance API credentials not configured',
          },
        },
        { status: 500 }
      );
    }

    // 创建 REST 客户端
    const client = new BinanceRestClient({
      apiKey: config.binance.apiKey,
      apiSecret: config.binance.apiSecret,
      baseUrl: config.binance.restApi,
      enableLog: config.app.isDevelopment,
    });

    // 并发获取所有数据
    const [accountInfo, positionsInfo] = await Promise.all([
      // 获取账户信息
      client.getAccountInfo(),
      // 获取持仓信息
      client.getPositions(),
    ]);

    // 映射账户数据
    const account = mapBinanceAccount(accountInfo);

    // 映射持仓数据，过滤掉空仓位
    const positions = positionsInfo
      .map((p: any) => mapBinancePosition(p))
      .filter((p: any) => parseFloat(p.positionAmount) !== 0);

    // 获取持仓中所有唯一的 symbol
    const symbols = Array.from(new Set(positions.map((p: any) => p.symbol)));

    // 计算订单查询的起始时间
    const orderStartTime = Date.now() - orderTimeRange;

    // 为每个 symbol 查询订单
    const allOrders: any[] = [];
    await Promise.all(
      symbols.map(async (symbol: string) => {
        try {
          const orders = await client.getAllOrders(symbol, { limit: 50 });
          allOrders.push(...orders);
        } catch (error) {
          console.error(`Failed to fetch orders for ${symbol}:`, error);
        }
      })
    );

    // 按时间排序（最新的在前）
    allOrders.sort((a, b) => b.time - a.time);

    // 筛选指定时间范围内的已成交订单
    const orders = allOrders.filter((order: any) =>
      order.time >= orderStartTime && order.status === 'FILLED'
    );

    // 统计最近一小时的订单
    const orderStats = {
      total: orders.length,
      buy: orders.filter((o: any) => o.side === 'BUY').length,
      sell: orders.filter((o: any) => o.side === 'SELL').length,
      filled: orders.filter((o: any) => o.status === 'FILLED').length,
      totalVolume: orders.reduce((sum: number, o: any) => {
        if (o.status === 'FILLED') {
          return sum + parseFloat(o.executedQty) * parseFloat(o.price || 0);
        }
        return sum;
      }, 0),
    };

    // 返回结果
    return NextResponse.json({
      success: true,
      data: {
        account,
        positions,
        orders,
        orderStats,
        timestamp: Date.now(),
      },
    });
  } catch (error: any) {
    console.error('[Dashboard API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code || -1,
          message: error.message || 'Failed to fetch dashboard data',
        },
      },
      { status: error.code === -1021 ? 401 : 500 }
    );
  }
}
