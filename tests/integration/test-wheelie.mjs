#!/usr/bin/env node
import puppeteer from 'puppeteer';
import { spawn } from 'child_process';

const PORT = 8083;
const BASE_URL = `http://localhost:${PORT}`;

async function testWheelie() {
  let server;
  let browser;
  
  try {
    // Start server
    console.log('Starting server...');
    server = spawn('python3', ['-m', 'http.server', PORT.toString()], {
      cwd: process.cwd()
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Launch browser
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: false, // Set to false to watch the test
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('Loading wheelie test page...');
    await page.goto(`${BASE_URL}/wheelie-test.html`, { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    
    // Wait for game to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n=== Testing Wheelie Mechanics ===\n');
    
    // Test 1: Wheelie with Shift key
    console.log('Test 1: Initiating wheelie with Shift key...');
    await page.keyboard.down('Shift');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let wheelieState = await page.evaluate(() => {
      const game = window.game;
      return {
        isWheelie: game.vehicle.isWheelie,
        angle: (game.vehicle.wheelieAngle * 180 / Math.PI).toFixed(1),
        speed: game.vehicle.speed.toFixed(1)
      };
    });
    
    console.log(`  Wheelie active: ${wheelieState.isWheelie}`);
    console.log(`  Angle: ${wheelieState.angle}°`);
    console.log(`  Speed: ${wheelieState.speed} m/s`);
    
    await page.keyboard.up('Shift');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Wheelie with Space key
    console.log('\nTest 2: Initiating wheelie with Space key...');
    await page.keyboard.press('r'); // Reset first
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await page.keyboard.down('Space');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    wheelieState = await page.evaluate(() => {
      const game = window.game;
      return {
        isWheelie: game.vehicle.isWheelie,
        angle: (game.vehicle.wheelieAngle * 180 / Math.PI).toFixed(1),
        speed: game.vehicle.speed.toFixed(1),
        score: Math.round(game.totalScore)
      };
    });
    
    console.log(`  Wheelie active: ${wheelieState.isWheelie}`);
    console.log(`  Angle: ${wheelieState.angle}°`);
    console.log(`  Score: ${wheelieState.score}`);
    
    await page.keyboard.up('Space');
    
    // Test 3: Wheelie with throttle
    console.log('\nTest 3: Wheelie control with throttle...');
    await page.keyboard.press('r'); // Reset
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Accelerate to get speed
    await page.keyboard.down('w');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Start wheelie with Shift
    await page.keyboard.down('Shift');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Release Shift but keep throttle
    await page.keyboard.up('Shift');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    wheelieState = await page.evaluate(() => {
      const game = window.game;
      return {
        isWheelie: game.vehicle.isWheelie,
        angle: (game.vehicle.wheelieAngle * 180 / Math.PI).toFixed(1),
        velocity: game.vehicle.wheelieVelocity.toFixed(2)
      };
    });
    
    console.log(`  With throttle - Angle: ${wheelieState.angle}°`);
    console.log(`  Velocity: ${wheelieState.velocity}`);
    
    // Release throttle
    await page.keyboard.up('w');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    wheelieState = await page.evaluate(() => {
      const game = window.game;
      return {
        isWheelie: game.vehicle.isWheelie,
        angle: (game.vehicle.wheelieAngle * 180 / Math.PI).toFixed(1),
        velocity: game.vehicle.wheelieVelocity.toFixed(2)
      };
    });
    
    console.log(`  After release - Angle: ${wheelieState.angle}°`);
    console.log(`  Velocity: ${wheelieState.velocity}`);
    
    // Test 4: Brake to end wheelie
    console.log('\nTest 4: Using brake to end wheelie...');
    await page.keyboard.down('Shift');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('  Applying brakes...');
    await page.keyboard.down('s');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    wheelieState = await page.evaluate(() => {
      const game = window.game;
      return {
        isWheelie: game.vehicle.isWheelie,
        angle: (game.vehicle.wheelieAngle * 180 / Math.PI).toFixed(1),
        velocity: game.vehicle.wheelieVelocity.toFixed(2)
      };
    });
    
    console.log(`  With brake - Wheelie: ${wheelieState.isWheelie}`);
    console.log(`  Angle: ${wheelieState.angle}°`);
    console.log(`  Velocity: ${wheelieState.velocity}`);
    
    await page.keyboard.up('s');
    await page.keyboard.up('Shift');
    
    console.log('\n=== Test Complete ===\n');
    
    // Keep browser open for 3 seconds to observe
    await new Promise(resolve => setTimeout(resolve, 3000));
    
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
}

testWheelie().catch(console.error);