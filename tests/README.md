# Testing Architecture

## Overview
This testing architecture provides comprehensive coverage for the Countersteer motorcycle racing game using Jest for unit tests and Puppeteer for integration tests.

## Structure

```
tests/
├── unit/           # Unit tests for individual modules
│   ├── vehicle.test.js
│   └── input.test.js
├── integration/    # Integration tests using Puppeteer
│   └── puppeteer.test.js
├── fixtures/       # Test data and fixtures
├── mocks/         # Mock implementations
└── setup.js       # Jest setup and global mocks
```

## Test Types

### Unit Tests
- Test individual classes and functions in isolation
- Mock Three.js and browser APIs
- Focus on game logic, physics calculations, and state management
- Located in `tests/unit/`

### Integration Tests
- Test the full application in a real browser environment
- Use Puppeteer for browser automation
- Test user interactions, rendering, and cross-component functionality
- Located in `tests/integration/`

## Running Tests

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Writing Tests

### Unit Test Example
```javascript
import { jest } from '@jest/globals';

describe('Vehicle', () => {
  test('should accelerate correctly', () => {
    const vehicle = new Vehicle();
    const initialSpeed = vehicle.speed;
    vehicle.accelerate(0.1);
    expect(vehicle.speed).toBeGreaterThan(initialSpeed);
  });
});
```

### Integration Test Example
```javascript
test('should respond to keyboard input', async () => {
  await page.goto('http://localhost:8081/index.html');
  await page.keyboard.down('ArrowUp');
  const accelerating = await page.evaluate(() => {
    return window.game.input.isAccelerating();
  });
  expect(accelerating).toBe(true);
});
```

## Mocking Strategy

### Three.js Mocks
The `setup.js` file provides comprehensive mocks for Three.js objects including:
- Vector3 with basic math operations
- Group, Mesh, and Scene classes
- Geometry and Material classes
- Clock for timing

### Browser API Mocks
- localStorage with full functionality
- document methods and properties
- window dimensions and event listeners
- performance.now() for timing

## Coverage Goals

Target coverage metrics:
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

Focus areas for testing:
1. Vehicle physics and state management
2. Input handling (keyboard and touch)
3. Collision detection
4. Score calculation
5. Game state transitions
6. UI updates

## CI/CD Integration

The test suite is designed to be easily integrated into CI/CD pipelines:
1. Unit tests run quickly without browser dependencies
2. Integration tests can run headless using Puppeteer
3. Coverage reports in multiple formats (text, lcov, html)

## Best Practices

1. **Isolation**: Each test should be independent
2. **Clarity**: Test names should clearly describe what is being tested
3. **Speed**: Unit tests should run in milliseconds
4. **Coverage**: Aim for high coverage but focus on critical paths
5. **Maintenance**: Update tests when features change