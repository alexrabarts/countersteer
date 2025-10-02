import { jest } from '@jest/globals';

describe('Spatial Partitioning', () => {
    describe('Grid cell calculation', () => {
        test('should calculate grid cell from position', () => {
            const x = 125;
            const z = 275;
            const cellSize = 100;
            
            const cellX = Math.floor(x / cellSize);
            const cellZ = Math.floor(z / cellSize);
            
            expect(cellX).toBe(1);
            expect(cellZ).toBe(2);
        });

        test('should handle negative coordinates', () => {
            const x = -125;
            const z = -275;
            const cellSize = 100;
            
            const cellX = Math.floor(x / cellSize);
            const cellZ = Math.floor(z / cellSize);
            
            expect(cellX).toBe(-2);
            expect(cellZ).toBe(-3);
        });

        test('should create cell key', () => {
            const cellX = 1;
            const cellZ = 2;
            
            const cellKey = `${cellX},${cellZ}`;
            
            expect(cellKey).toBe('1,2');
        });
    });

    describe('Object insertion', () => {
        test('should add object to cell', () => {
            const grid = new Map();
            const cellKey = '1,2';
            const object = { id: 1, x: 125, z: 275 };
            
            if (!grid.has(cellKey)) {
                grid.set(cellKey, []);
            }
            grid.get(cellKey).push(object);
            
            expect(grid.get(cellKey).length).toBe(1);
        });

        test('should handle multiple objects in cell', () => {
            const grid = new Map();
            const cellKey = '1,2';
            
            grid.set(cellKey, [
                { id: 1, x: 125, z: 275 },
                { id: 2, x: 130, z: 280 }
            ]);
            
            expect(grid.get(cellKey).length).toBe(2);
        });
    });

    describe('Neighbor cell queries', () => {
        test('should get 9 cells for 2D grid', () => {
            const cellX = 1;
            const cellZ = 2;
            const neighbors = [];
            
            for (let dx = -1; dx <= 1; dx++) {
                for (let dz = -1; dz <= 1; dz++) {
                    neighbors.push(`${cellX + dx},${cellZ + dz}`);
                }
            }
            
            expect(neighbors.length).toBe(9);
        });

        test('should include center cell', () => {
            const centerCell = '1,2';
            const neighbors = [];
            
            for (let dx = -1; dx <= 1; dx++) {
                for (let dz = -1; dz <= 1; dz++) {
                    neighbors.push(`${1 + dx},${2 + dz}`);
                }
            }
            
            expect(neighbors).toContain(centerCell);
        });
    });

    describe('Range queries', () => {
        test('should find objects in range', () => {
            const objects = [
                { x: 125, z: 275 },
                { x: 130, z: 280 },
                { x: 500, z: 500 }
            ];
            const queryX = 125;
            const queryZ = 275;
            const range = 20;
            
            const nearby = objects.filter(obj => {
                const dx = obj.x - queryX;
                const dz = obj.z - queryZ;
                return Math.sqrt(dx * dx + dz * dz) < range;
            });
            
            expect(nearby.length).toBe(2);
        });

        test('should exclude distant objects', () => {
            const objects = [
                { x: 125, z: 275 },
                { x: 500, z: 500 }
            ];
            const queryX = 125;
            const queryZ = 275;
            const range = 20;
            
            const nearby = objects.filter(obj => {
                const dx = obj.x - queryX;
                const dz = obj.z - queryZ;
                return Math.sqrt(dx * dx + dz * dz) < range;
            });
            
            expect(nearby.length).toBe(1);
        });
    });

    describe('Dynamic updates', () => {
        test('should remove object from old cell', () => {
            const grid = new Map();
            const oldCell = '1,2';
            grid.set(oldCell, [{ id: 1 }, { id: 2 }]);
            
            const filteredObjects = grid.get(oldCell).filter(obj => obj.id !== 1);
            grid.set(oldCell, filteredObjects);
            
            expect(grid.get(oldCell).length).toBe(1);
        });

        test('should add object to new cell', () => {
            const grid = new Map();
            const newCell = '2,3';
            const object = { id: 1, x: 225, z: 375 };
            
            if (!grid.has(newCell)) {
                grid.set(newCell, []);
            }
            grid.get(newCell).push(object);
            
            expect(grid.get(newCell).length).toBe(1);
        });

        test('should detect cell change', () => {
            const oldX = 125;
            const oldZ = 275;
            const newX = 225;
            const newZ = 375;
            const cellSize = 100;
            
            const oldCellX = Math.floor(oldX / cellSize);
            const oldCellZ = Math.floor(oldZ / cellSize);
            const newCellX = Math.floor(newX / cellSize);
            const newCellZ = Math.floor(newZ / cellSize);
            
            const cellChanged = oldCellX !== newCellX || oldCellZ !== newCellZ;
            
            expect(cellChanged).toBe(true);
        });
    });

    describe('Collision optimization', () => {
        test('should only check objects in nearby cells', () => {
            const grid = new Map();
            grid.set('1,2', [{ id: 1 }, { id: 2 }]);
            grid.set('2,2', [{ id: 3 }]);
            grid.set('10,10', [{ id: 4 }, { id: 5 }]);
            
            const nearCells = ['1,2', '2,2'];
            let nearbyObjects = [];
            
            nearCells.forEach(cell => {
                if (grid.has(cell)) {
                    nearbyObjects = nearbyObjects.concat(grid.get(cell));
                }
            });
            
            expect(nearbyObjects.length).toBe(3);
        });

        test('should reduce collision checks significantly', () => {
            const totalObjects = 100;
            const objectsPerCell = 5;
            const cellsToCheck = 9;
            
            const bruteForceChecks = totalObjects * (totalObjects - 1) / 2;
            const spatialChecks = cellsToCheck * objectsPerCell * (objectsPerCell - 1) / 2;
            
            expect(spatialChecks).toBeLessThan(bruteForceChecks);
        });
    });

    describe('Grid size optimization', () => {
        test('should balance cell size with object density', () => {
            const objectRadius = 5;
            const averageSpeed = 30;
            const updateRate = 60;
            
            const movementPerFrame = averageSpeed / updateRate;
            const optimalCellSize = objectRadius * 4 + movementPerFrame * 2;
            
            expect(optimalCellSize).toBeGreaterThan(0);
        });

        test('should avoid too small cells', () => {
            const cellSize = 50;
            const minCellSize = 10;
            
            expect(cellSize).toBeGreaterThan(minCellSize);
        });

        test('should avoid too large cells', () => {
            const cellSize = 100;
            const maxCellSize = 500;
            
            expect(cellSize).toBeLessThan(maxCellSize);
        });
    });

    describe('Boundary handling', () => {
        test('should handle objects at cell boundaries', () => {
            const x = 100; // Exactly on boundary
            const cellSize = 100;
            
            const cellX = Math.floor(x / cellSize);
            
            expect(cellX).toBe(1);
        });

        test('should check cells for objects near boundaries', () => {
            const x = 99;
            const objectRadius = 5;
            const cellSize = 100;
            
            const cellX = Math.floor(x / cellSize);
            const needsAdjacentCheck = (x % cellSize) < objectRadius || 
                                      (x % cellSize) > (cellSize - objectRadius);
            
            expect(needsAdjacentCheck).toBe(true);
        });
    });

    describe('Memory management', () => {
        test('should remove empty cells', () => {
            const grid = new Map();
            grid.set('1,2', []);
            grid.set('2,3', [{ id: 1 }]);
            
            const keysToDelete = [];
            grid.forEach((objects, key) => {
                if (objects.length === 0) {
                    keysToDelete.push(key);
                }
            });
            
            keysToDelete.forEach(key => grid.delete(key));
            
            expect(grid.has('1,2')).toBe(false);
            expect(grid.has('2,3')).toBe(true);
        });

        test('should track active cell count', () => {
            const grid = new Map();
            grid.set('1,2', [{ id: 1 }]);
            grid.set('2,3', [{ id: 2 }]);
            grid.set('3,4', [{ id: 3 }]);
            
            expect(grid.size).toBe(3);
        });
    });

    describe('Query performance', () => {
        test('should calculate query complexity', () => {
            const cellsToCheck = 9;
            const avgObjectsPerCell = 5;
            
            const operations = cellsToCheck * avgObjectsPerCell;
            
            expect(operations).toBe(45);
        });

        test('should batch queries', () => {
            const queries = [
                { x: 100, z: 200 },
                { x: 110, z: 210 },
                { x: 105, z: 205 }
            ];
            const cellSize = 100;
            
            const uniqueCells = new Set();
            queries.forEach(q => {
                const cellKey = `${Math.floor(q.x / cellSize)},${Math.floor(q.z / cellSize)}`;
                uniqueCells.add(cellKey);
            });
            
            expect(uniqueCells.size).toBe(1);
        });
    });

    describe('3D spatial partitioning', () => {
        test('should calculate 3D grid cell', () => {
            const x = 125;
            const y = 50;
            const z = 275;
            const cellSize = 100;
            
            const cellX = Math.floor(x / cellSize);
            const cellY = Math.floor(y / cellSize);
            const cellZ = Math.floor(z / cellSize);
            
            expect(cellX).toBe(1);
            expect(cellY).toBe(0);
            expect(cellZ).toBe(2);
        });

        test('should query 27 neighbor cells in 3D', () => {
            const neighbors = [];
            
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dz = -1; dz <= 1; dz++) {
                        neighbors.push({ dx, dy, dz });
                    }
                }
            }
            
            expect(neighbors.length).toBe(27);
        });
    });

    describe('Hierarchical grids', () => {
        test('should use coarse grid for distant objects', () => {
            const distance = 500;
            const nearThreshold = 100;
            
            const cellSize = distance > nearThreshold ? 200 : 50;
            
            expect(cellSize).toBe(200);
        });

        test('should use fine grid for nearby objects', () => {
            const distance = 50;
            const nearThreshold = 100;
            
            const cellSize = distance > nearThreshold ? 200 : 50;
            
            expect(cellSize).toBe(50);
        });
    });

    describe('Load balancing', () => {
        test('should detect overcrowded cells', () => {
            const objectsInCell = 25;
            const maxObjectsPerCell = 20;
            
            const isOvercrowded = objectsInCell > maxObjectsPerCell;
            
            expect(isOvercrowded).toBe(true);
        });

        test('should suggest cell subdivision', () => {
            const currentCellSize = 100;
            const isOvercrowded = true;
            
            const newCellSize = isOvercrowded ? currentCellSize / 2 : currentCellSize;
            
            expect(newCellSize).toBe(50);
        });
    });
});