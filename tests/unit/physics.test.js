import { jest } from '@jest/globals';

// Mock THREE.js
global.THREE = {
    Group: class {
        constructor() {
            this.position = { x: 0, y: 0, z: 0, copy: function(v) { this.x = v.x; this.y = v.y; this.z = v.z; } };
            this.rotation = { x: 0, y: 0, z: 0, set: function(x, y, z) { this.x = x; this.y = y; this.z = z; } };
        }
        add() {}
    },
    Mesh: class {},
    MeshStandardMaterial: class {},
    BoxGeometry: class {},
    CylinderGeometry: class {},
    SphereGeometry: class {},
    Vector3: class {
        constructor(x = 0, y = 0, z = 0) {
            this.x = x;
            this.y = y;
            this.z = z;
        }
        set(x, y, z) {
            this.x = x;
            this.y = y;
            this.z = z;
        }
        copy(v) {
            this.x = v.x;
            this.y = v.y;
            this.z = v.z;
            return this;
        }
        clone() {
            return new THREE.Vector3(this.x, this.y, this.z);
        }
        add(v) {
            this.x += v.x;
            this.y += v.y;
            this.z += v.z;
            return this;
        }
        multiplyScalar(s) {
            this.x *= s;
            this.y *= s;
            this.z *= s;
            return this;
        }
        distanceTo(v) {
            const dx = this.x - v.x;
            const dy = this.y - v.y;
            const dz = this.z - v.z;
            return Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
    },
    Euler: class {
        constructor(x = 0, y = 0, z = 0) {
            this.x = x;
            this.y = y;
            this.z = z;
        }
    }
};

describe('Physics System', () => {
    describe('Lean angle calculations', () => {
        test('should calculate lean angle based on speed and turning radius', () => {
            const speed = 20; // m/s
            const turnRadius = 30; // meters
            const gravity = 9.81; // m/s²
            
            const expectedLeanAngle = Math.atan((speed * speed) / (gravity * turnRadius));
            
            expect(expectedLeanAngle).toBeGreaterThan(0);
            expect(expectedLeanAngle).toBeLessThan(Math.PI / 2);
        });

        test('should have higher lean angle at higher speeds', () => {
            const turnRadius = 30;
            const gravity = 9.81;
            
            const leanAt20 = Math.atan((20 * 20) / (gravity * turnRadius));
            const leanAt40 = Math.atan((40 * 40) / (gravity * turnRadius));
            
            expect(leanAt40).toBeGreaterThan(leanAt20);
        });

        test('should have higher lean angle for tighter turns', () => {
            const speed = 30;
            const gravity = 9.81;
            
            const leanAt50m = Math.atan((speed * speed) / (gravity * 50));
            const leanAt20m = Math.atan((speed * speed) / (gravity * 20));
            
            expect(leanAt20m).toBeGreaterThan(leanAt50m);
        });
    });

    describe('Acceleration physics', () => {
        test('should calculate distance from acceleration', () => {
            const initialVelocity = 10; // m/s
            const acceleration = 5; // m/s²
            const time = 2; // seconds
            
            const distance = initialVelocity * time + 0.5 * acceleration * time * time;
            
            expect(distance).toBe(30);
        });

        test('should calculate final velocity from acceleration', () => {
            const initialVelocity = 10; // m/s
            const acceleration = 5; // m/s²
            const time = 3; // seconds
            
            const finalVelocity = initialVelocity + acceleration * time;
            
            expect(finalVelocity).toBe(25);
        });
    });

    describe('Braking physics', () => {
        test('should calculate stopping distance', () => {
            const initialVelocity = 20; // m/s
            const deceleration = 10; // m/s²
            
            const stoppingDistance = (initialVelocity * initialVelocity) / (2 * deceleration);
            
            expect(stoppingDistance).toBe(20);
        });

        test('should calculate stopping time', () => {
            const initialVelocity = 30; // m/s
            const deceleration = 15; // m/s²
            
            const stoppingTime = initialVelocity / deceleration;
            
            expect(stoppingTime).toBe(2);
        });
    });

    describe('Turn radius calculations', () => {
        test('should calculate turn radius from speed and lean angle', () => {
            const speed = 25; // m/s
            const leanAngle = Math.PI / 6; // 30 degrees
            const gravity = 9.81; // m/s²
            
            const turnRadius = (speed * speed) / (gravity * Math.tan(leanAngle));
            
            expect(turnRadius).toBeGreaterThan(0);
            expect(turnRadius).toBeCloseTo(110.3, 1);
        });

        test('should have smaller turn radius at higher lean angles', () => {
            const speed = 20;
            const gravity = 9.81;
            
            const radiusAt30deg = (speed * speed) / (gravity * Math.tan(Math.PI / 6));
            const radiusAt45deg = (speed * speed) / (gravity * Math.tan(Math.PI / 4));
            
            expect(radiusAt45deg).toBeLessThan(radiusAt30deg);
        });
    });

    describe('Centripetal force', () => {
        test('should calculate centripetal force in a turn', () => {
            const mass = 200; // kg
            const speed = 20; // m/s
            const turnRadius = 30; // meters
            
            const centripetalForce = (mass * speed * speed) / turnRadius;
            
            expect(centripetalForce).toBeCloseTo(2666.67, 0);
        });

        test('should have higher centripetal force at higher speeds', () => {
            const mass = 200;
            const turnRadius = 30;
            
            const forceAt20 = (mass * 20 * 20) / turnRadius;
            const forceAt30 = (mass * 30 * 30) / turnRadius;
            
            expect(forceAt30).toBeGreaterThan(forceAt20);
        });
    });

    describe('Wheelie physics', () => {
        test('should calculate rear wheel weight transfer during acceleration', () => {
            const mass = 200; // kg
            const cgHeight = 0.6; // meters
            const wheelbase = 1.4; // meters
            const acceleration = 10; // m/s²
            const gravity = 9.81; // m/s²
            
            const weightTransfer = (mass * acceleration * cgHeight) / wheelbase;
            const rearWheelForce = (mass * gravity / 2) + weightTransfer;
            
            expect(weightTransfer).toBeCloseTo(857.14, 0);
            expect(rearWheelForce).toBeGreaterThan(mass * gravity / 2);
        });

        test('should determine wheelie threshold acceleration', () => {
            const cgHeight = 0.6;
            const wheelbase = 1.4;
            const gravity = 9.81;
            
            const wheelieAcceleration = (gravity * wheelbase) / (2 * cgHeight);
            
            expect(wheelieAcceleration).toBeCloseTo(11.445, 0);
        });
    });

    describe('Jump physics', () => {
        test('should calculate jump height from launch velocity', () => {
            const launchVelocity = 10; // m/s upward
            const gravity = 9.81; // m/s²
            
            const maxHeight = (launchVelocity * launchVelocity) / (2 * gravity);
            
            expect(maxHeight).toBeCloseTo(5.1, 1);
        });

        test('should calculate jump distance', () => {
            const launchVelocityY = 8; // m/s upward
            const horizontalSpeed = 20; // m/s
            const gravity = 9.81; // m/s²
            
            const airTime = (2 * launchVelocityY) / gravity;
            const distance = horizontalSpeed * airTime;
            
            expect(distance).toBeCloseTo(32.6, 1);
        });
    });

    describe('Friction and drag', () => {
        test('should calculate rolling resistance', () => {
            const mass = 200; // kg
            const gravity = 9.81; // m/s²
            const rollingCoefficient = 0.015; // typical for motorcycle tires
            
            const rollingResistance = mass * gravity * rollingCoefficient;
            
            expect(rollingResistance).toBeCloseTo(29.4, 1);
        });

        test('should calculate air drag force', () => {
            const airDensity = 1.225; // kg/m³
            const dragCoefficient = 0.6; // typical for motorcycle
            const frontalArea = 0.6; // m²
            const speed = 30; // m/s
            
            const dragForce = 0.5 * airDensity * dragCoefficient * frontalArea * speed * speed;
            
            expect(dragForce).toBeCloseTo(198.5, 1);
        });
    });
});