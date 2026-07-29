/**
 * 账户数据映射回归测试
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateAccountMarginBalance,
  calculateAvailableMargin,
  mapBinanceAccount,
} from '../lib/utils/account-mapper'
import type { BinanceAccountInfo } from '../types/binance-api'

test('保证金余额使用币安账户汇总字段', () => {
  const account = mapBinanceAccount({
    totalMarginBalance: '1234.56',
    marginBalance: '1',
    availableBalance: '987.65',
    assets: [],
  } as unknown as BinanceAccountInfo)

  assert.equal(account.marginBalance, '1234.56')
  assert.equal(account.availableBalance, '987.65')
})

test('汇总保证金缺失时使用钱包余额与未实现盈亏', () => {
  assert.equal(
    calculateAccountMarginBalance({
      marginBalance: '0',
      totalWalletBalance: '240.68',
      unrealizedProfit: '-0.5',
    }),
    '240.18'
  )
})

test('可用保证金会扣除持仓与挂单初始保证金', () => {
  assert.equal(
    calculateAvailableMargin(
      {
        totalWalletBalance: '242.48',
        unrealizedProfit: '-1.24',
        totalPositionInitialMargin: '0',
        totalOpenOrderInitialMargin: '3',
      },
      78.35
    ),
    '159.89'
  )
})
