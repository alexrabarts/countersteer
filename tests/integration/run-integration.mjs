#!/usr/bin/env node
import puppeteer from 'puppeteer';
import { spawn } from 'child_process';

const PORT = 8080;
const BASE_URL = `http://localhost:${PORT}`;

let server;
let browser;
let testsPassed = 0;
let testsFailed = 0;

async function startServer() {
  return new Promise((resolve) => {
    server = spawn('python3', ['-m', 'http.server', PORT.toString()], {
      cwd: process.cwd()
    });
    setTimeout(resolve, 2000);
  });
}

async function runTest(name, testFn) {
  try {
    await testFn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.error(`   ${error.message}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('Starting integration tests...\n');

  await startServer();
  browser = await puppeteer.launch({
    headless: false, // Make it visible so we can see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  // Skip other tests for debugging

  // Test: Debug cliff falling
  await runTest('Debug cliff falling', async () => {
    await page.goto(`${BASE_URL}/debug.html`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 5000)); // Give time for game to load and run

    // Just check that the page loaded and game initialized
    const gameLoaded = await page.evaluate(() => {
      return typeof window.game !== 'undefined' && window.game.scene !== undefined;
    });

    if (!gameLoaded) {
      throw new Error('Game did not load properly');
    }

    console.log('Game loaded, check console output above for perpDistance values');
    return true;
  });

  // Clean up
  await browser.close();
  server.kill();
  
  // Report results
  console.log('\n=========================');
  console.log(`Tests Passed: ${testsPassed}`);
  console.log(`Tests Failed: ${testsFailed}`);
  console.log('=========================\n');
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Test runner failed:', error);
  if (browser) browser.close();
  if (server) server.kill();
  process.exit(1);
});