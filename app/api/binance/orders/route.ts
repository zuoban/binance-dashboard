/**
 * 币安订单信息 API Route
 *
 * 代理前端请求到币安 API，隐藏 API Secret
 */

import { NextRequest, NextResponse } from 'next/server';
import { BinanceRestClient } from '@/lib/binance/rest-client';
import { getServerConfig } from '@/lib/config';
import { checkRateLimit } from '@/lib/middleware/rate-limit';
import {
  validateQueryParams,
  validationErrorResponse,
  ordersQuerySchema,
} from '@/lib/validations/api';

/**
 * GET /api/binance/orders?symbol=BTCUSDT&limit=50
 * 获取订单信息
 */
export async function GET(request: NextRequest) {
  try {
    // 检查速率限制
    const rateLimitResult = await checkRateLimit(request);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.error!;
    }

    // 验证查询参数
    const validation = validateQueryParams(
      request.nextUrl.searchParams,
      ordersQuerySchema
    );

    if (!validation.success) {
      const errorResponse = validationErrorResponse(validation);
      if (errorResponse) return errorResponse;
    }

    const params = validation.data!;

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

    // 如果没有提供 symbol，返回空数组
    if (!params.symbol) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // 创建 REST 客户端
    const client = new BinanceRestClient({
      apiKey: config.binance.apiKey,
      apiSecret: config.binance.apiSecret,
      baseUrl: config.binance.restApi,
      enableLog: config.app.isDevelopment,
    });

    // 查询所有订单（使用验证后的参数）
    const orders = await client.getAllOrders(params.symbol, {
      limit: params.limit,
      startTime: params.startTime,
      endTime: params.endTime,
    });

    // 返回结果
    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    console.error('[Orders API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code || -1,
          message: error.message || 'Failed to fetch orders',
        },
      },
      { status: error.code === -1021 ? 401 : 500 }
    );
  }
}
