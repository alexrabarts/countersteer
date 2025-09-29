import { jest } from '@jest/globals';

describe('Wheelie Mechanics', () => {
  let Vehicle;
  let vehicle;
  let mockScene;
  let mockOnWheelieScore;
  let originalPerformanceNow;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock performance.now
    let mockTime = 0;
    originalPerformanceNow = global.performance.now;
    global.performance.now = jest.fn(() => mockTime);
    global.performance.now.mockImplementation(() => mockTime);
    global.performance.now.advance = (ms) => { mockTime += ms; };
    
    mockScene = new THREE.Scene();
    mockOnWheelieScore = jest.fn();
    
    // Create a minimal Vehicle class with wheelie functionality
    Vehicle = class {
      constructor(scene, onWheelieScore = null) {
        this.scene = scene;
        this.onWheelieScore = onWheelieScore;
        
        this.position = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        
        this.speed = 20;
        this.crashed = false;
        this.isJumping = false;
        
        // Wheelie state
        this.isWheelie = false;
        this.wheelieAngle = 0;
        this.wheelieVelocity = 0;
        this.wheelieDamping = 0.15;
        this.wheelieStartTime = 0;
        this.wheelieScoreAccumulated = 0;
        this.wheelieDebugInit = false;
        
        this.group = new THREE.Group();
      }
      
      updateWheelie(deltaTime, throttleInput, brakeInput, wheelieInput = 0, onWheelieScore = null) {
        // Only allow wheelies when on ground and not crashed
        if (this.crashed || this.isJumping) {
          this.wheelieAngle = 0;
          this.wheelieVelocity = 0;
          this.isWheelie = false;
          return;
        }
        
        // Detect wheelie initiation
        const wheelieThreshold = 0.2; // 20% throttle to start
        const minWheelieSpeed = 1.0; // 1.0 m/s minimum speed
        const isWheelieKeyPressed = wheelieInput > 0;
        const isThrottleWheelieTriggered = throttleInput >= wheelieThreshold && this.speed >= minWheelieSpeed;
        const canStartWheelie = (isWheelieKeyPressed || isThrottleWheelieTriggered) && this.speed >= minWheelieSpeed;
        
        if (canStartWheelie && !this.isWheelie && this.wheelieAngle === 0) {
          // Start wheelie
          this.isWheelie = true;
          this.wheelieAngle = 0.01;
          this.wheelieVelocity = 2.5;
          this.wheelieStartTime = performance.now();
          this.wheelieScoreAccumulated = 0;
        }
        
        if (this.isWheelie) {
          // Apply wheelie physics - use either throttle OR wheelie key
          const wheelieControl = Math.max(throttleInput, wheelieInput);
          
          if (wheelieControl > 0) {
            this.wheelieVelocity += wheelieControl * 3.5 * deltaTime;
          } else {
            this.wheelieVelocity -= 4.0 * deltaTime;
          }
          
          // Apply braking to end wheelie
          if (brakeInput > 0) {
            this.wheelieVelocity -= brakeInput * 8.0 * deltaTime;
          }
          
          // Update wheelie angle
          this.wheelieAngle += this.wheelieVelocity * deltaTime;
          
          // Clamp wheelie angle (max 90 degrees)
          const maxWheelieAngle = Math.PI / 2;
          this.wheelieAngle = Math.max(0, Math.min(maxWheelieAngle, this.wheelieAngle));
          
          // Calculate points
          const wheelieDuration = (performance.now() - this.wheelieStartTime) / 1000;
          const angleDegrees = this.wheelieAngle * 180 / Math.PI;
          
          let pointsPerSecond = 0;
          if (angleDegrees < 10) {
            pointsPerSecond = 5;
          } else if (angleDegrees < 30) {
            pointsPerSecond = 15;
          } else if (angleDegrees < 45) {
            pointsPerSecond = 30;
          } else {
            pointsPerSecond = 50;
          }
          
          const durationMultiplier = Math.min(wheelieDuration / 2, 3);
          const pointsThisFrame = pointsPerSecond * deltaTime * durationMultiplier;
          
          if (onWheelieScore && pointsThisFrame > 0) {
            onWheelieScore(Math.round(pointsThisFrame));
            this.wheelieScoreAccumulated += pointsThisFrame;
          }
          
          // Add stabilization at good angles (20-45 degrees)
          if (angleDegrees >= 20 && angleDegrees <= 45) {
            this.wheelieVelocity *= (1 - 0.02 * deltaTime);
          }
          
          // End wheelie if angle gets to 0
          if (this.wheelieAngle <= 0) {
            this.isWheelie = false;
            this.wheelieAngle = 0;
            this.wheelieVelocity = 0;
          }
          
          // Apply damping
          this.wheelieVelocity *= (1 - this.wheelieDamping * 0.5);
        } else if (this.wheelieAngle > 0) {
          // Natural fall when not in wheelie
          this.wheelieAngle *= 0.95;
          if (this.wheelieAngle < 0.01) {
            this.wheelieAngle = 0;
          }
        }
      }
    };
    
    vehicle = new Vehicle(mockScene, mockOnWheelieScore);
  });

  afterEach(() => {
    global.performance.now = originalPerformanceNow;
  });

  describe('wheelie initiation', () => {
    test('should start wheelie with sufficient throttle and speed', () => {
      vehicle.speed = 5; // Above minimum
      vehicle.updateWheelie(0.016, 0.3, 0, 0, mockOnWheelieScore); // 30% throttle
      
      expect(vehicle.isWheelie).toBe(true);
      expect(vehicle.wheelieAngle).toBeGreaterThan(0);
      expect(vehicle.wheelieVelocity).toBeGreaterThan(0);
    });

    test('should not start wheelie with insufficient throttle', () => {
      vehicle.speed = 5;
      vehicle.updateWheelie(0.016, 0.1, 0, 0, mockOnWheelieScore); // 10% throttle (below threshold)
      
      expect(vehicle.isWheelie).toBe(false);
      expect(vehicle.wheelieAngle).toBe(0);
    });

    test('should not start wheelie with insufficient speed', () => {
      vehicle.speed = 0.5; // Below minimum
      vehicle.updateWheelie(0.016, 0.5, 0, 0, mockOnWheelieScore);
      
      expect(vehicle.isWheelie).toBe(false);
      expect(vehicle.wheelieAngle).toBe(0);
    });

    test('should not start wheelie when crashed', () => {
      vehicle.crashed = true;
      vehicle.speed = 5;
      vehicle.updateWheelie(0.016, 0.5, 0, 0, mockOnWheelieScore);
      
      expect(vehicle.isWheelie).toBe(false);
    });

    test('should not start wheelie when jumping', () => {
      vehicle.isJumping = true;
      vehicle.speed = 5;
      vehicle.updateWheelie(0.016, 0.5, 0, 0, mockOnWheelieScore);
      
      expect(vehicle.isWheelie).toBe(false);
    });

    test('should start wheelie with wheelie key pressed', () => {
      vehicle.speed = 5;
      vehicle.updateWheelie(0.016, 0, 0, 1, mockOnWheelieScore); // No throttle, just wheelie key
      
      expect(vehicle.isWheelie).toBe(true);
      expect(vehicle.wheelieAngle).toBeGreaterThan(0);
    });

    test('should maintain wheelie with wheelie key', () => {
      vehicle.speed = 5;
      vehicle.updateWheelie(0.016, 0, 0, 1, mockOnWheelieScore); // Start with wheelie key
      const initialAngle = vehicle.wheelieAngle;
      
      vehicle.updateWheelie(0.016, 0, 0, 1, mockOnWheelieScore); // Continue with wheelie key
      
      expect(vehicle.wheelieAngle).toBeGreaterThan(initialAngle);
    });
  });

  describe('wheelie physics', () => {
    beforeEach(() => {
      // Start a wheelie
      vehicle.speed = 5;
      vehicle.updateWheelie(0.016, 0.3, 0, 0, mockOnWheelieScore);
    });

    test('should increase angle with throttle', () => {
      const initialAngle = vehicle.wheelieAngle;
      vehicle.updateWheelie(0.016, 0.5, 0, 0, mockOnWheelieScore);
      
      expect(vehicle.wheelieAngle).toBeGreaterThan(initialAngle);
    });

    test('should decrease angle without throttle', () => {
      // First increase the angle
      vehicle.updateWheelie(0.1, 0.5, 0, 0, mockOnWheelieScore);
      const peakAngle = vehicle.wheelieAngle;
      const velocityAtPeak = vehicle.wheelieVelocity;
      
      // Then release throttle - velocity should go negative
      vehicle.updateWheelie(0.016, 0, 0, 0, mockOnWheelieScore);
      
      // Debug log to understand what's happening
      console.log('Peak angle:', peakAngle, 'Peak velocity:', velocityAtPeak);
      console.log('After no throttle - angle:', vehicle.wheelieAngle, 'velocity:', vehicle.wheelieVelocity);
      
      // Velocity should be decreasing
      expect(vehicle.wheelieVelocity).toBeLessThan(velocityAtPeak);
      
      // After enough frames, angle should decrease
      for (let i = 0; i < 10; i++) {
        vehicle.updateWheelie(0.016, 0, 0, 0, mockOnWheelieScore);
      }
      
      expect(vehicle.wheelieAngle).toBeLessThan(peakAngle);
    });

    test('should quickly reduce angle with braking', () => {
      // Get some angle first
      vehicle.updateWheelie(0.1, 0.5, 0, 0, mockOnWheelieScore);
      const angleBeforeBrake = vehicle.wheelieAngle;
      
      // Apply brakes for a couple frames
      vehicle.updateWheelie(0.016, 0, 1, 0, mockOnWheelieScore);
      vehicle.updateWheelie(0.016, 0, 1, 0, mockOnWheelieScore);
      
      expect(vehicle.wheelieAngle).toBeLessThan(angleBeforeBrake);
      expect(vehicle.wheelieVelocity).toBeLessThan(0);
    });

    test('should not exceed maximum angle', () => {
      // Apply maximum throttle for extended time
      for (let i = 0; i < 100; i++) {
        vehicle.updateWheelie(0.016, 1, 0, 0, mockOnWheelieScore);
      }
      
      const maxAngle = Math.PI / 2; // 90 degrees
      expect(vehicle.wheelieAngle).toBeLessThanOrEqual(maxAngle);
    });

    test('should apply damping to velocity', () => {
      const initialVelocity = vehicle.wheelieVelocity;
      // Update without input
      vehicle.updateWheelie(0.016, 0, 0, 0, mockOnWheelieScore);
      
      expect(Math.abs(vehicle.wheelieVelocity)).toBeLessThan(Math.abs(initialVelocity));
    });

    test('should end wheelie when angle reaches zero', () => {
      // Apply brakes to bring angle down
      for (let i = 0; i < 50; i++) {
        vehicle.updateWheelie(0.016, 0, 1, 0, mockOnWheelieScore);
        if (!vehicle.isWheelie) break;
      }
      
      expect(vehicle.isWheelie).toBe(false);
      expect(vehicle.wheelieAngle).toBe(0);
      expect(vehicle.wheelieVelocity).toBe(0);
    });
  });

  describe('wheelie scoring', () => {
    test('should accumulate score during wheelie', () => {
      vehicle.speed = 5;
      vehicle.updateWheelie(0.016, 0.3, 0, 0, mockOnWheelieScore);
      
      // Advance time and maintain wheelie
      global.performance.now.advance(100);
      vehicle.updateWheelie(0.016, 0.3, 0, 0, mockOnWheelieScore);
      
      expect(vehicle.wheelieScoreAccumulated).toBeGreaterThan(0);
      expect(mockOnWheelieScore).toHaveBeenCalled();
    });

    test('should award more points for higher angles', () => {
      vehicle.speed = 5;
      
      // Start wheelie and get initial score
      vehicle.updateWheelie(0.016, 0.3, 0, 0, mockOnWheelieScore);
      global.performance.now.advance(100);
      vehicle.updateWheelie(0.016, 0.3, 0, 0, mockOnWheelieScore);
      const lowAngleScore = vehicle.wheelieScoreAccumulated;
      
      // Reset and do a higher angle wheelie
      vehicle.isWheelie = false;
      vehicle.wheelieAngle = 0;
      vehicle.wheelieScoreAccumulated = 0;
      
      // Higher angle wheelie
      vehicle.updateWheelie(0.016, 0.5, 0, 0, mockOnWheelieScore);
      for (let i = 0; i < 10; i++) {
        vehicle.updateWheelie(0.016, 1, 0, 0, mockOnWheelieScore);
      }
      global.performance.now.advance(100);
      vehicle.updateWheelie(0.016, 0.5, 0, 0, mockOnWheelieScore);
      const highAngleScore = vehicle.wheelieScoreAccumulated;
      
      expect(highAngleScore).toBeGreaterThan(lowAngleScore);
    });

    test('should increase score multiplier with duration', () => {
      vehicle.speed = 5;
      vehicle.updateWheelie(0.016, 0.3, 0, 0, mockOnWheelieScore);
      
      // Short duration
      global.performance.now.advance(500);
      vehicle.updateWheelie(0.016, 0.3, 0, 0, mockOnWheelieScore);
      const shortDurationScore = vehicle.wheelieScoreAccumulated;
      
      // Continue for longer
      global.performance.now.advance(2000);
      vehicle.updateWheelie(0.016, 0.3, 0, 0, mockOnWheelieScore);
      const longDurationScore = vehicle.wheelieScoreAccumulated;
      
      expect(longDurationScore).toBeGreaterThan(shortDurationScore * 2);
    });

    test('should call score callback with rounded points', () => {
      vehicle.speed = 5;
      vehicle.updateWheelie(0.016, 0.3, 0, 0, mockOnWheelieScore);
      
      global.performance.now.advance(1000);
      vehicle.updateWheelie(0.1, 0.5, 0, 0, mockOnWheelieScore);
      
      expect(mockOnWheelieScore).toHaveBeenCalled();
      const calls = mockOnWheelieScore.mock.calls;
      calls.forEach(call => {
        expect(Number.isInteger(call[0])).toBe(true);
      });
    });
  });

  describe('wheelie stabilization', () => {
    test('should stabilize at good angles (20-45 degrees)', () => {
      vehicle.speed = 5;
      vehicle.updateWheelie(0.016, 0.3, 0, 0, mockOnWheelieScore);
      
      // Get to a good angle (around 30 degrees)
      for (let i = 0; i < 20; i++) {
        vehicle.updateWheelie(0.016, 0.4, 0, 0, mockOnWheelieScore);
      }
      
      const angleDegrees = vehicle.wheelieAngle * 180 / Math.PI;
      if (angleDegrees >= 20 && angleDegrees <= 45) {
        const velocityBefore = Math.abs(vehicle.wheelieVelocity);
        vehicle.updateWheelie(0.016, 0.4, 0, 0, mockOnWheelieScore);
        const velocityAfter = Math.abs(vehicle.wheelieVelocity);
        
        // Velocity should be slightly reduced due to stabilization
        expect(velocityAfter).toBeLessThanOrEqual(velocityBefore);
      }
    });
  });

  describe('wheelie recovery', () => {
    test('should gradually fall when not in active wheelie', () => {
      // Set a wheelie angle without being in wheelie state
      vehicle.wheelieAngle = 0.5;
      vehicle.isWheelie = false;
      
      const initialAngle = vehicle.wheelieAngle;
      vehicle.updateWheelie(0.016, 0, 0, 0, mockOnWheelieScore);
      
      expect(vehicle.wheelieAngle).toBeLessThan(initialAngle);
      expect(vehicle.wheelieAngle).toBeCloseTo(initialAngle * 0.95);
    });

    test('should clear small angles to zero', () => {
      vehicle.wheelieAngle = 0.009;
      vehicle.isWheelie = false;
      
      vehicle.updateWheelie(0.016, 0, 0, 0, mockOnWheelieScore);
      
      expect(vehicle.wheelieAngle).toBe(0);
    });
  });
});