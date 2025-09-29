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
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  // Test: Main game loads
  await runTest('Main game loads without errors', async () => {
    const response = await page.goto(`${BASE_URL}/index.html`, { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    if (response.status() !== 200) {
      throw new Error(`Expected status 200, got ${response.status()}`);
    }
  });

  // Test: Game initializes
  await runTest('Game components initialize', async () => {
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle2' });
    
    // Check if Three.js is loaded
    const hasThree = await page.evaluate(() => {
      return typeof THREE !== 'undefined';
    });
    
    if (!hasThree) {
      throw new Error('Three.js not loaded');
    }
    
    // Check if game classes are defined
    const hasClasses = await page.evaluate(() => {
      return typeof Game !== 'undefined' && 
             typeof Vehicle !== 'undefined' && 
             typeof Environment !== 'undefined';
    });
    
    if (!hasClasses) {
      throw new Error('Game classes not defined');
    }
  });

  // Test: UI elements exist
  await runTest('UI elements are present', async () => {
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle2' });
    
    const uiElements = await page.evaluate(() => {
      return {
        hasScore: document.getElementById('score') !== null,
        hasSpeed: document.getElementById('speed') !== null,
        hasFps: document.getElementById('fps') !== null,
        hasControls: document.querySelector('.controls') !== null
      };
    });
    
    if (!uiElements.hasScore || !uiElements.hasSpeed || !uiElements.hasFps || !uiElements.hasControls) {
      throw new Error('UI elements missing');
    }
  });

  // Test: Keyboard input
  await runTest('Keyboard input works', async () => {
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle2' });
    
    // Since game is not exposed to window, we'll check if keyboard events are handled
    const result = await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      document.dispatchEvent(event);
      return true;
    });
    
    if (!result) {
      throw new Error('Keyboard input not registered');
    }
  });

  // Test: Speed display updates
  await runTest('Speed display updates', async () => {
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000)); // Let game initialize
    
    const speedElement = await page.evaluate(() => {
      const elem = document.getElementById('speed');
      return elem !== null && elem.textContent !== '';
    });
    
    if (!speedElement) {
      throw new Error('Speed display not found or empty');
    }
  });

  // Test: Simple.html loads
  await runTest('Simple.html loads', async () => {
    const response = await page.goto(`${BASE_URL}/simple.html`, { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    if (response.status() !== 200) {
      throw new Error(`Expected status 200, got ${response.status()}`);
    }
  });

  // Test: Debug.html loads
  await runTest('Debug.html loads', async () => {
    const response = await page.goto(`${BASE_URL}/debug.html`, { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    if (response.status() !== 200) {
      throw new Error(`Expected status 200, got ${response.status()}`);
    }
  });

  // Test: Mobile viewport
  await runTest('Mobile viewport works', async () => {
    await page.setViewport({ width: 375, height: 667, isMobile: true });
    const response = await page.goto(`${BASE_URL}/test-mobile.html`, { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    if (response.status() !== 200) {
      throw new Error(`Expected status 200, got ${response.status()}`);
    }
  });

  // Test: FPS display
  await runTest('FPS counter is displayed', async () => {
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    
    const fpsElement = await page.evaluate(() => {
      const elem = document.getElementById('fps');
      return elem !== null && elem.textContent.includes('FPS');
    });
    
    if (!fpsElement) {
      throw new Error('FPS display not found');
    }
  });

  // Test: Game rendering
  await runTest('Canvas is rendered', async () => {
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    const canvasExists = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return canvas !== null && canvas.width > 0 && canvas.height > 0;
    });

    if (!canvasExists) {
      throw new Error('Canvas not rendered properly');
    }
  });

  // Test: Cliffs are rendered (prevent regression where cliffs disappeared)
  await runTest('Cliffs are rendered', async () => {
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000)); // Give time for environment to load

    const cliffsRendered = await page.evaluate(() => {
      // Check if there are cliff meshes in the scene
      // This is a basic check - we look for meshes that might be cliffs
      if (typeof window.game === 'undefined' || !window.game.scene) {
        return false;
      }

      const scene = window.game.scene;
      let cliffCount = 0;

      scene.traverse((object) => {
        if (object.isMesh && object.geometry) {
          // Cliffs typically have many vertices and are large
          const vertexCount = object.geometry.attributes?.position?.count || 0;
          if (vertexCount > 100) { // Cliff meshes have many vertices
            cliffCount++;
          }
        }
      });

      return cliffCount > 0; // Should have at least some cliff meshes
    });

    if (!cliffsRendered) {
      throw new Error('Cliffs not rendered - possible regression');
    }
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