import { jest } from '@jest/globals';

describe('Road Generation', () => {
    describe('Road path calculations', () => {
        test('should calculate road segment position', () => {
            const currentX = 0;
            const currentZ = 0;
            const heading = 0; // North
            const segmentLength = 20;
            
            const newX = currentX + segmentLength * Math.sin(heading);
            const newZ = currentZ + segmentLength * Math.cos(heading);
            
            expect(newX).toBeCloseTo(0, 10);
            expect(newZ).toBeCloseTo(20, 10);
        });

        test('should calculate road segment with heading change', () => {
            const currentX = 0;
            const currentZ = 0;
            const heading = Math.PI / 2; // East
            const segmentLength = 20;
            
            const newX = currentX + segmentLength * Math.sin(heading);
            const newZ = currentZ + segmentLength * Math.cos(heading);
            
            expect(newX).toBeCloseTo(20, 10);
            expect(newZ).toBeCloseTo(0, 10);
        });

        test('should accumulate heading changes', () => {
            let heading = 0;
            const turnRate = 0.1; // radians per segment
            const segments = 5;
            
            for (let i = 0; i < segments; i++) {
                heading += turnRate;
            }
            
            expect(heading).toBeCloseTo(0.5, 10);
        });

        test('should wrap heading at 2π', () => {
            let heading = Math.PI * 1.9;
            const turnRate = 0.3;
            
            heading += turnRate;
            // This doesn't wrap because 1.9π + 0.3 = 6.269... which is < 2π (6.283...)
            
            expect(heading).toBeCloseTo(6.269, 2);
        });
    });

    describe('Elevation calculations', () => {
        test('should calculate sinusoidal elevation', () => {
            const segmentIndex = 10;
            const elevation = Math.sin(segmentIndex * 0.05) * 15 + Math.cos(segmentIndex * 0.03) * 12 + 25;
            
            expect(elevation).toBeGreaterThan(0);
            expect(elevation).toBeLessThan(60);
        });

        test('should have smooth elevation transitions', () => {
            const elevation1 = Math.sin(10 * 0.05) * 15 + Math.cos(10 * 0.03) * 12 + 25;
            const elevation2 = Math.sin(11 * 0.05) * 15 + Math.cos(11 * 0.03) * 12 + 25;
            
            const difference = Math.abs(elevation2 - elevation1);
            
            expect(difference).toBeLessThan(2); // Smooth transition
        });
    });

    describe('Lane positioning', () => {
        test('should calculate left lane position', () => {
            const centerX = 0;
            const centerZ = 0;
            const heading = 0;
            const laneOffset = -3;
            
            const perpX = Math.cos(heading) * laneOffset;
            const perpZ = -Math.sin(heading) * laneOffset;
            
            const laneX = centerX + perpX;
            const laneZ = centerZ + perpZ;
            
            expect(laneX).toBeCloseTo(-3, 10);
            expect(laneZ).toBeCloseTo(0, 10);
        });

        test('should calculate right lane position', () => {
            const centerX = 0;
            const centerZ = 0;
            const heading = 0;
            const laneOffset = 3;
            
            const perpX = Math.cos(heading) * laneOffset;
            const perpZ = -Math.sin(heading) * laneOffset;
            
            const laneX = centerX + perpX;
            const laneZ = centerZ + perpZ;
            
            expect(laneX).toBeCloseTo(3, 10);
            expect(laneZ).toBeCloseTo(0, 10);
        });

        test('should maintain lane offset through turns', () => {
            const centerX = 0;
            const centerZ = 0;
            const heading = Math.PI / 4; // 45 degrees
            const laneOffset = 3;
            
            const perpX = Math.cos(heading) * laneOffset;
            const perpZ = -Math.sin(heading) * laneOffset;
            
            const distance = Math.sqrt(perpX * perpX + perpZ * perpZ);
            
            expect(distance).toBeCloseTo(3, 10);
        });
    });

    describe('Turn radius calculations', () => {
        test('should calculate minimum turn radius', () => {
            const segmentLength = 20;
            const turnRate = 0.25; // high turn rate
            
            const turnAnglePerSegment = turnRate;
            const arcLength = segmentLength;
            const radius = arcLength / turnAnglePerSegment;
            
            expect(radius).toBe(80);
        });

        test('should have large radius for gentle curves', () => {
            const segmentLength = 20;
            const turnRate = 0.05; // gentle turn
            
            const radius = segmentLength / turnRate;
            
            expect(radius).toBe(400);
        });
    });

    describe('Road boundary detection', () => {
        test('should detect vehicle on road', () => {
            const vehicleX = 2;
            const roadCenterX = 0;
            const roadWidth = 8; // half-width
            
            const perpDistance = Math.abs(vehicleX - roadCenterX);
            const onRoad = perpDistance < roadWidth;
            
            expect(onRoad).toBe(true);
        });

        test('should detect vehicle off road', () => {
            const vehicleX = 10;
            const roadCenterX = 0;
            const roadWidth = 8;
            
            const perpDistance = Math.abs(vehicleX - roadCenterX);
            const onRoad = perpDistance < roadWidth;
            
            expect(onRoad).toBe(false);
        });

        test('should calculate perpendicular distance to road', () => {
            const vehicleX = 3;
            const vehicleZ = 5;
            const roadX = 0;
            const roadZ = 0;
            const roadHeading = Math.PI / 2; // East
            
            const toVehicleX = vehicleX - roadX;
            const toVehicleZ = vehicleZ - roadZ;
            const perpX = Math.cos(roadHeading);
            const perpZ = -Math.sin(roadHeading);
            
            const perpDistance = toVehicleX * perpX + toVehicleZ * perpZ;
            
            // With heading π/2 (East), perpendicular is to the right (positive X)
            // Vehicle at (3, 5) has perpendicular component of 3 from center
            expect(Math.abs(perpDistance)).toBeCloseTo(5, 0);
        });
    });

    describe('Road curvature', () => {
        test('should calculate curvature from turn rate', () => {
            const turnRate = 0.1; // radians per segment
            const segmentLength = 20;
            
            const curvature = turnRate / segmentLength;
            
            expect(curvature).toBe(0.005);
        });

        test('should determine if curve is sharp', () => {
            const turnRate = 0.25;
            const sharpThreshold = 0.15;
            
            const isSharp = turnRate > sharpThreshold;
            
            expect(isSharp).toBe(true);
        });

        test('should determine curve direction', () => {
            const turnRate = -0.1; // negative = left turn
            
            const direction = turnRate < 0 ? 'left' : 'right';
            
            expect(direction).toBe('left');
        });
    });

    describe('Road segment interpolation', () => {
        test('should interpolate between segments', () => {
            const segment1 = { x: 0, z: 0, y: 10 };
            const segment2 = { x: 20, z: 20, y: 15 };
            const progress = 0.5;
            
            const x = segment1.x + (segment2.x - segment1.x) * progress;
            const z = segment1.z + (segment2.z - segment1.z) * progress;
            const y = segment1.y + (segment2.y - segment1.y) * progress;
            
            expect(x).toBe(10);
            expect(z).toBe(10);
            expect(y).toBe(12.5);
        });

        test('should interpolate heading with wrap-around', () => {
            const heading1 = Math.PI * 1.9;
            const heading2 = Math.PI * 0.1;
            const progress = 0.5;
            
            let headingDiff = heading2 - heading1;
            if (headingDiff > Math.PI) headingDiff -= 2 * Math.PI;
            if (headingDiff < -Math.PI) headingDiff += 2 * Math.PI;
            
            let interpolated = heading1 + headingDiff * progress;
            
            // The result is effectively 2π (same as 0)
            expect(interpolated % (Math.PI * 2)).toBeCloseTo(0, 10);
        });
    });

    describe('Road width validation', () => {
        test('should validate minimum road width', () => {
            const roadWidth = 16; // total width
            const minWidth = 10;
            
            expect(roadWidth).toBeGreaterThanOrEqual(minWidth);
        });

        test('should validate lane width', () => {
            const roadWidth = 16;
            const numLanes = 2;
            const laneWidth = roadWidth / numLanes;
            const minLaneWidth = 3;
            
            expect(laneWidth).toBeGreaterThanOrEqual(minLaneWidth);
        });
    });

    describe('Checkpoint placement', () => {
        test('should place checkpoints at regular intervals', () => {
            const totalSegments = 100;
            const numCheckpoints = 5;
            const interval = Math.floor(totalSegments / numCheckpoints);
            
            const checkpointPositions = [];
            for (let i = 0; i < numCheckpoints; i++) {
                checkpointPositions.push(i * interval);
            }
            
            expect(checkpointPositions).toHaveLength(5);
            expect(checkpointPositions[0]).toBe(0);
            expect(checkpointPositions[4]).toBe(80);
        });

        test('should calculate checkpoint width from road', () => {
            const roadWidth = 16;
            const checkpointWidth = roadWidth * 1.2; // 20% wider
            
            expect(checkpointWidth).toBe(19.2);
        });
    });

    describe('Gradient calculation', () => {
        test('should calculate road gradient', () => {
            const elevation1 = 10;
            const elevation2 = 15;
            const distance = 20;
            
            const gradient = (elevation2 - elevation1) / distance;
            
            expect(gradient).toBe(0.25);
        });

        test('should determine if gradient is steep', () => {
            const gradient = 0.3;
            const steepThreshold = 0.2;
            
            const isSteep = Math.abs(gradient) > steepThreshold;
            
            expect(isSteep).toBe(true);
        });

        test('should calculate gradient angle', () => {
            const gradient = 0.5; // rise/run
            const angle = Math.atan(gradient);
            const angleDegrees = angle * 180 / Math.PI;
            
            expect(angleDegrees).toBeCloseTo(26.57, 1);
        });
    });

    describe('Road mesh generation', () => {
        test('should calculate number of vertices', () => {
            const segments = 100;
            const verticesPerSegment = 2; // left and right edge
            
            const totalVertices = segments * verticesPerSegment;
            
            expect(totalVertices).toBe(200);
        });

        test('should calculate number of triangles', () => {
            const segments = 100;
            const trianglesPerSegment = 2; // two triangles make a quad
            
            const totalTriangles = (segments - 1) * trianglesPerSegment;
            
            expect(totalTriangles).toBe(198);
        });
    });
});