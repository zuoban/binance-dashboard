#!/usr/bin/env node

/**
 * 环境检查脚本
 *
 * 在部署前验证环境和配置
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

type ColorType = keyof typeof colors;

function log(message: string, color: ColorType = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message: string) {
  log(`✓ ${message}`, 'green');
}

function error(message: string) {
  log(`✗ ${message}`, 'red');
}

function warn(message: string) {
  log(`⚠ ${message}`, 'yellow');
}

function info(message: string) {
  log(`ℹ ${message}`, 'blue');
}

function checkCommand(command: string, name: string): boolean {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    success(`${name} is installed`);
    return true;
  } catch {
    error(`${name} is not installed`);
    return false;
  }
}

function checkFile(path: string, name: string): boolean {
  try {
    const fullPath = resolve(process.cwd(), path);
    readFileSync(fullPath, 'utf-8');
    success(`${name} exists`);
    return true;
  } catch {
    error(`${name} not found`);
    return false;
  }
}

function checkEnvFile(): boolean {
  try {
    const envPath = resolve(process.cwd(), '.env.local');
    const content = readFileSync(envPath, 'utf-8');

    // 检查必需的环境变量
    const requiredVars = [
      'BINANCE_API_KEY',
      'BINANCE_API_SECRET',
    ];

    let hasPlaceholders = false;

    for (const varName of requiredVars) {
      const regex = new RegExp(`^${varName}=.+`, 'm');
      if (!regex.test(content)) {
        error(`${varName} is not set in .env.local`);
        hasPlaceholders = true;
      } else if (content.includes(`${varName}=your_`) || content.includes(`${varName}=`) && !content.match(new RegExp(`^${varName}=[^\\s]`, 'm'))) {
        warn(`${varName} is set to placeholder value`);
        hasPlaceholders = true;
      } else {
        success(`${varName} is configured`);
      }
    }

    // 不返回 false，只是警告
    if (hasPlaceholders) {
      warn('Environment variables contain placeholder values');
      warn('This is okay for CI/CD, but configure them for local development');
    }

    return true; // 总是返回 true，不阻止构建
  } catch {
    warn('.env.local file not found (run: cp .env.example .env.local)');
    warn('Using placeholder values for CI/CD');
    return true; // 不阻止构建
  }
}

function main() {
  log('\n==========================================', 'blue');
  log('  Binance Dashboard Pre-deployment Check', 'blue');
  log('==========================================\n', 'blue');

  let hasError = false;

  // 检查 Node.js 版本
  info('Checking Node.js version...');
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion >= 18) {
    success(`Node.js version: ${nodeVersion}`);
  } else {
    error(`Node.js version ${nodeVersion} is too old (require >= 18.17.0)`);
    hasError = true;
  }

  // 检查 pnpm
  console.log();
  info('Checking package manager...');
  if (!checkCommand('pnpm', 'pnpm')) {
    hasError = true;
  }

  // 检查必需文件
  console.log();
  info('Checking required files...');
  const requiredFiles = [
    ['package.json', 'package.json'],
    ['next.config.ts', 'Next.js config'],
    ['tsconfig.json', 'TypeScript config'],
    ['postcss.config.mjs', 'PostCSS config (Tailwind CSS 4.x)'],
    ['.env.example', 'Environment template'],
  ];

  for (const [file, name] of requiredFiles) {
    if (!checkFile(file, name)) {
      hasError = true;
    }
  }

  // 检查环境变量
  console.log();
  info('Checking environment variables...');
  if (!checkEnvFile()) {
    warn('Environment variables not properly configured');
    warn('This is okay for CI/CD, but required for local development');
  }

  // 检查依赖
  console.log();
  info('Checking dependencies...');
  try {
    execSync('test -d node_modules', { stdio: 'ignore' });
    success('Dependencies installed');
  } catch {
    warn('Dependencies not installed (run: pnpm install)');
  }

  // 总结
  console.log();
  log('==========================================', 'blue');
  if (hasError) {
    error('Pre-deployment check FAILED!');
    log('Please fix the errors above before deploying.\n', 'red');
    process.exit(1);
  } else {
    success('Pre-deployment check PASSED!');
    log('You are ready to deploy!\n', 'green');
    process.exit(0);
  }
}

main();
