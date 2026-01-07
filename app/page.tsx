/**
 * 根页面 - 重定向到交易看板
 */

import { redirect } from 'next/navigation';

export default function HomePage() {
  // 重定向到交易看板
  redirect('/dashboard');
}
