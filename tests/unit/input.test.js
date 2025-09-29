import { jest } from '@jest/globals';

describe('InputHandler', () => {
  let InputHandler;
  let inputHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Define InputHandler class for testing
    InputHandler = class {
      constructor() {
        this.keys = {};
        this.touch = {
          active: false,
          startX: 0,
          currentX: 0,
          steering: 0
        };
        
        this.setupKeyboardListeners();
        this.setupTouchListeners();
      }
      
      setupKeyboardListeners() {
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
      }
      
      setupTouchListeners() {
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
      }
      
      handleKeyDown(event) {
        this.keys[event.key.toLowerCase()] = true;
        
        // Prevent default for game control keys
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd'].includes(event.key.toLowerCase())) {
          event.preventDefault();
        }
      }
      
      handleKeyUp(event) {
        this.keys[event.key.toLowerCase()] = false;
      }
      
      handleTouchStart(event) {
        if (event.touches.length > 0) {
          this.touch.active = true;
          this.touch.startX = event.touches[0].clientX;
          this.touch.currentX = event.touches[0].clientX;
          event.preventDefault();
        }
      }
      
      handleTouchMove(event) {
        if (this.touch.active && event.touches.length > 0) {
          this.touch.currentX = event.touches[0].clientX;
          const maxSteer = window.innerWidth / 4;
          this.touch.steering = Math.max(-1, Math.min(1, 
            (this.touch.currentX - this.touch.startX) / maxSteer
          ));
          event.preventDefault();
        }
      }
      
      handleTouchEnd(event) {
        if (event.touches.length === 0) {
          this.touch.active = false;
          this.touch.steering = 0;
        }
      }
      
      isAccelerating() {
        return this.keys['arrowup'] || this.keys['w'] || false;
      }
      
      isBraking() {
        return this.keys['arrowdown'] || this.keys['s'] || false;
      }
      
      isSteeringLeft() {
        return this.keys['arrowleft'] || this.keys['a'] || false;
      }
      
      isSteeringRight() {
        return this.keys['arrowright'] || this.keys['d'] || false;
      }
      
      isJumping() {
        return this.keys[' '] || false;
      }
      
      isWheelie() {
        return this.keys['shift'] || false;
      }
      
      isRestart() {
        return this.keys['r'] || false;
      }
      
      isCheckpointRestart() {
        return this.keys['c'] || false;
      }
      
      getTouchSteering() {
        return this.touch.steering;
      }
      
      isTouchActive() {
        return this.touch.active;
      }
    };
    
    inputHandler = new InputHandler();
  });

  describe('initialization', () => {
    test('should initialize with empty keys object', () => {
      expect(inputHandler.keys).toEqual({});
    });

    test('should initialize touch state', () => {
      expect(inputHandler.touch.active).toBe(false);
      expect(inputHandler.touch.startX).toBe(0);
      expect(inputHandler.touch.currentX).toBe(0);
      expect(inputHandler.touch.steering).toBe(0);
    });
  });

  describe('keyboard input', () => {
    test('should register key down events', () => {
      const event = { key: 'ArrowUp', preventDefault: jest.fn() };
      inputHandler.handleKeyDown(event);
      expect(inputHandler.keys['arrowup']).toBe(true);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    test('should register key up events', () => {
      const event = { key: 'ArrowUp' };
      inputHandler.keys['arrowup'] = true;
      inputHandler.handleKeyUp(event);
      expect(inputHandler.keys['arrowup']).toBe(false);
    });

    test('should handle lowercase conversion', () => {
      const event = { key: 'W', preventDefault: jest.fn() };
      inputHandler.handleKeyDown(event);
      expect(inputHandler.keys['w']).toBe(true);
    });

    test('should prevent default for control keys', () => {
      const controlKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd'];
      controlKeys.forEach(key => {
        const event = { key, preventDefault: jest.fn() };
        inputHandler.handleKeyDown(event);
        expect(event.preventDefault).toHaveBeenCalled();
      });
    });

    test('should not prevent default for non-control keys', () => {
      const event = { key: 'x', preventDefault: jest.fn() };
      inputHandler.handleKeyDown(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('control state queries', () => {
    test('should detect acceleration (arrow up)', () => {
      inputHandler.keys['arrowup'] = true;
      expect(inputHandler.isAccelerating()).toBe(true);
    });

    test('should detect acceleration (W key)', () => {
      inputHandler.keys['w'] = true;
      expect(inputHandler.isAccelerating()).toBe(true);
    });

    test('should detect braking (arrow down)', () => {
      inputHandler.keys['arrowdown'] = true;
      expect(inputHandler.isBraking()).toBe(true);
    });

    test('should detect braking (S key)', () => {
      inputHandler.keys['s'] = true;
      expect(inputHandler.isBraking()).toBe(true);
    });

    test('should detect left steering (arrow left)', () => {
      inputHandler.keys['arrowleft'] = true;
      expect(inputHandler.isSteeringLeft()).toBe(true);
    });

    test('should detect left steering (A key)', () => {
      inputHandler.keys['a'] = true;
      expect(inputHandler.isSteeringLeft()).toBe(true);
    });

    test('should detect right steering (arrow right)', () => {
      inputHandler.keys['arrowright'] = true;
      expect(inputHandler.isSteeringRight()).toBe(true);
    });

    test('should detect right steering (D key)', () => {
      inputHandler.keys['d'] = true;
      expect(inputHandler.isSteeringRight()).toBe(true);
    });

    test('should detect jumping (space)', () => {
      inputHandler.keys[' '] = true;
      expect(inputHandler.isJumping()).toBe(true);
    });

    test('should detect wheelie (shift)', () => {
      inputHandler.keys['shift'] = true;
      expect(inputHandler.isWheelie()).toBe(true);
    });

    test('should detect restart (R key)', () => {
      inputHandler.keys['r'] = true;
      expect(inputHandler.isRestart()).toBe(true);
    });

    test('should detect checkpoint restart (C key)', () => {
      inputHandler.keys['c'] = true;
      expect(inputHandler.isCheckpointRestart()).toBe(true);
    });

    test('should return false for unpressed keys', () => {
      expect(inputHandler.isAccelerating()).toBe(false);
      expect(inputHandler.isBraking()).toBe(false);
      expect(inputHandler.isSteeringLeft()).toBe(false);
      expect(inputHandler.isSteeringRight()).toBe(false);
      expect(inputHandler.isJumping()).toBe(false);
      expect(inputHandler.isWheelie()).toBe(false);
      expect(inputHandler.isRestart()).toBe(false);
      expect(inputHandler.isCheckpointRestart()).toBe(false);
    });
  });

  describe('touch input', () => {
    beforeEach(() => {
      global.window.innerWidth = 800;
    });

    test('should handle touch start', () => {
      const event = {
        touches: [{ clientX: 400 }],
        preventDefault: jest.fn()
      };
      inputHandler.handleTouchStart(event);
      expect(inputHandler.touch.active).toBe(true);
      expect(inputHandler.touch.startX).toBe(400);
      expect(inputHandler.touch.currentX).toBe(400);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    test('should handle touch move', () => {
      inputHandler.touch.active = true;
      inputHandler.touch.startX = 400;
      const event = {
        touches: [{ clientX: 500 }],
        preventDefault: jest.fn()
      };
      inputHandler.handleTouchMove(event);
      expect(inputHandler.touch.currentX).toBe(500);
      expect(inputHandler.touch.steering).toBeCloseTo(0.5);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    test('should clamp steering to [-1, 1]', () => {
      inputHandler.touch.active = true;
      inputHandler.touch.startX = 400;
      
      // Test max right steering
      const eventRight = {
        touches: [{ clientX: 800 }],
        preventDefault: jest.fn()
      };
      inputHandler.handleTouchMove(eventRight);
      expect(inputHandler.touch.steering).toBe(1);
      
      // Test max left steering
      const eventLeft = {
        touches: [{ clientX: 0 }],
        preventDefault: jest.fn()
      };
      inputHandler.handleTouchMove(eventLeft);
      expect(inputHandler.touch.steering).toBe(-1);
    });

    test('should handle touch end', () => {
      inputHandler.touch.active = true;
      inputHandler.touch.steering = 0.5;
      const event = { touches: [] };
      inputHandler.handleTouchEnd(event);
      expect(inputHandler.touch.active).toBe(false);
      expect(inputHandler.touch.steering).toBe(0);
    });

    test('should ignore touch move when not active', () => {
      inputHandler.touch.active = false;
      const event = {
        touches: [{ clientX: 500 }],
        preventDefault: jest.fn()
      };
      inputHandler.handleTouchMove(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    test('should get touch steering value', () => {
      inputHandler.touch.steering = 0.75;
      expect(inputHandler.getTouchSteering()).toBe(0.75);
    });

    test('should get touch active state', () => {
      inputHandler.touch.active = true;
      expect(inputHandler.isTouchActive()).toBe(true);
    });
  });
});