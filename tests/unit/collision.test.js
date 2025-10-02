import { jest } from '@jest/globals';

describe('Collision Detection', () => {
    describe('Sphere-sphere collision', () => {
        test('should detect collision when spheres overlap', () => {
            const sphere1 = { x: 0, y: 0, z: 0, radius: 1 };
            const sphere2 = { x: 1, y: 0, z: 0, radius: 1 };
            
            const dx = sphere2.x - sphere1.x;
            const dy = sphere2.y - sphere1.y;
            const dz = sphere2.z - sphere1.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const minDistance = sphere1.radius + sphere2.radius;
            
            expect(distance).toBeLessThan(minDistance);
        });

        test('should not detect collision when spheres are far apart', () => {
            const sphere1 = { x: 0, y: 0, z: 0, radius: 1 };
            const sphere2 = { x: 5, y: 0, z: 0, radius: 1 };
            
            const dx = sphere2.x - sphere1.x;
            const dy = sphere2.y - sphere1.y;
            const dz = sphere2.z - sphere1.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const minDistance = sphere1.radius + sphere2.radius;
            
            expect(distance).toBeGreaterThan(minDistance);
        });

        test('should detect collision at exact boundary', () => {
            const sphere1 = { x: 0, y: 0, z: 0, radius: 1 };
            const sphere2 = { x: 2, y: 0, z: 0, radius: 1 };
            
            const dx = sphere2.x - sphere1.x;
            const dy = sphere2.y - sphere1.y;
            const dz = sphere2.z - sphere1.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const minDistance = sphere1.radius + sphere2.radius;
            
            expect(distance).toBeCloseTo(minDistance, 10);
        });
    });

    describe('AABB (Axis-Aligned Bounding Box) collision', () => {
        test('should detect collision when boxes overlap', () => {
            const box1 = { minX: 0, maxX: 2, minY: 0, maxY: 2, minZ: 0, maxZ: 2 };
            const box2 = { minX: 1, maxX: 3, minY: 1, maxY: 3, minZ: 1, maxZ: 3 };
            
            const collision = (
                box1.minX <= box2.maxX && box1.maxX >= box2.minX &&
                box1.minY <= box2.maxY && box1.maxY >= box2.minY &&
                box1.minZ <= box2.maxZ && box1.maxZ >= box2.minZ
            );
            
            expect(collision).toBe(true);
        });

        test('should not detect collision when boxes are separated', () => {
            const box1 = { minX: 0, maxX: 2, minY: 0, maxY: 2, minZ: 0, maxZ: 2 };
            const box2 = { minX: 5, maxX: 7, minY: 0, maxY: 2, minZ: 0, maxZ: 2 };
            
            const collision = (
                box1.minX <= box2.maxX && box1.maxX >= box2.minX &&
                box1.minY <= box2.maxY && box1.maxY >= box2.minY &&
                box1.minZ <= box2.maxZ && box1.maxZ >= box2.minZ
            );
            
            expect(collision).toBe(false);
        });
    });

    describe('Point-in-box collision', () => {
        test('should detect point inside box', () => {
            const point = { x: 1, y: 1, z: 1 };
            const box = { minX: 0, maxX: 2, minY: 0, maxY: 2, minZ: 0, maxZ: 2 };
            
            const inside = (
                point.x >= box.minX && point.x <= box.maxX &&
                point.y >= box.minY && point.y <= box.maxY &&
                point.z >= box.minZ && point.z <= box.maxZ
            );
            
            expect(inside).toBe(true);
        });

        test('should detect point outside box', () => {
            const point = { x: 5, y: 1, z: 1 };
            const box = { minX: 0, maxX: 2, minY: 0, maxY: 2, minZ: 0, maxZ: 2 };
            
            const inside = (
                point.x >= box.minX && point.x <= box.maxX &&
                point.y >= box.minY && point.y <= box.maxY &&
                point.z >= box.minZ && point.z <= box.maxZ
            );
            
            expect(inside).toBe(false);
        });
    });

    describe('Ray-sphere intersection', () => {
        test('should detect ray intersecting sphere', () => {
            const rayOrigin = { x: -5, y: 0, z: 0 };
            const rayDirection = { x: 1, y: 0, z: 0 }; // normalized
            const sphere = { x: 0, y: 0, z: 0, radius: 2 };
            
            const dx = sphere.x - rayOrigin.x;
            const dy = sphere.y - rayOrigin.y;
            const dz = sphere.z - rayOrigin.z;
            
            const dot = dx * rayDirection.x + dy * rayDirection.y + dz * rayDirection.z;
            const closestX = rayOrigin.x + rayDirection.x * dot;
            const closestY = rayOrigin.y + rayDirection.y * dot;
            const closestZ = rayOrigin.z + rayDirection.z * dot;
            
            const distX = sphere.x - closestX;
            const distY = sphere.y - closestY;
            const distZ = sphere.z - closestZ;
            const distance = Math.sqrt(distX * distX + distY * distY + distZ * distZ);
            
            expect(distance).toBeLessThan(sphere.radius);
        });
    });

    describe('Swept sphere collision (motion)', () => {
        test('should detect collision along movement path', () => {
            const sphere = { x: 0, y: 0, z: 0, radius: 1 };
            const velocity = { x: 5, y: 0, z: 0 };
            const obstacle = { x: 3, y: 0, z: 0, radius: 1 };
            
            const dx = obstacle.x - sphere.x;
            const dy = obstacle.y - sphere.y;
            const dz = obstacle.z - sphere.z;
            
            const vdx = velocity.x;
            const vdy = velocity.y;
            const vdz = velocity.z;
            
            const a = vdx * vdx + vdy * vdy + vdz * vdz;
            const b = 2 * (vdx * dx + vdy * dy + vdz * dz);
            const c = dx * dx + dy * dy + dz * dz - (sphere.radius + obstacle.radius) * (sphere.radius + obstacle.radius);
            
            const discriminant = b * b - 4 * a * c;
            
            expect(discriminant).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Vehicle-vehicle collision', () => {
        test('should detect motorcycle-car collision', () => {
            const motorcycle = { x: 0, y: 0, z: 0, width: 0.8, length: 2 };
            const car = { x: 1, y: 0, z: 0, width: 2, length: 4 };
            
            const dx = Math.abs(car.x - motorcycle.x);
            const dz = Math.abs(car.z - motorcycle.z);
            
            const collision = (
                dx < (car.width + motorcycle.width) / 2 &&
                dz < (car.length + motorcycle.length) / 2
            );
            
            expect(collision).toBe(true);
        });

        test('should not detect collision when vehicles are far apart', () => {
            const motorcycle = { x: 0, y: 0, z: 0, width: 0.8, length: 2 };
            const car = { x: 10, y: 0, z: 0, width: 2, length: 4 };
            
            const dx = Math.abs(car.x - motorcycle.x);
            const dz = Math.abs(car.z - motorcycle.z);
            
            const collision = (
                dx < (car.width + motorcycle.width) / 2 &&
                dz < (car.length + motorcycle.length) / 2
            );
            
            expect(collision).toBe(false);
        });
    });

    describe('Near-miss detection', () => {
        test('should detect near miss within threshold', () => {
            const vehicle1 = { x: 0, y: 0, z: 0 };
            const vehicle2 = { x: 2.5, y: 0, z: 0 };
            const nearMissThreshold = 3;
            
            const dx = vehicle2.x - vehicle1.x;
            const dy = vehicle2.y - vehicle1.y;
            const dz = vehicle2.z - vehicle1.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            expect(distance).toBeLessThan(nearMissThreshold);
        });

        test('should not detect near miss when too far', () => {
            const vehicle1 = { x: 0, y: 0, z: 0 };
            const vehicle2 = { x: 5, y: 0, z: 0 };
            const nearMissThreshold = 3;
            
            const dx = vehicle2.x - vehicle1.x;
            const dy = vehicle2.y - vehicle1.y;
            const dz = vehicle2.z - vehicle1.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            expect(distance).toBeGreaterThan(nearMissThreshold);
        });
    });
});