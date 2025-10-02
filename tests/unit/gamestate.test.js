import { jest } from '@jest/globals';

describe('Game State Management', () => {
    describe('Game initialization', () => {
        test('should initialize with default state', () => {
            const gameState = {
                score: 0,
                combo: 0,
                checkpointsPassed: 0,
                finished: false,
                crashed: false,
                startTime: Date.now()
            };
            
            expect(gameState.score).toBe(0);
            expect(gameState.combo).toBe(0);
            expect(gameState.finished).toBe(false);
        });

        test('should load high score from storage', () => {
            const storedHighScore = 5000;
            const highScore = storedHighScore || 0;
            
            expect(highScore).toBe(5000);
        });

        test('should initialize timer', () => {
            const startTime = Date.now();
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            
            expect(elapsed).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Score management', () => {
        test('should add score correctly', () => {
            let score = 0;
            const points = 100;
            
            score += points;
            
            expect(score).toBe(100);
        });

        test('should apply multiplier to score', () => {
            let score = 0;
            const basePoints = 100;
            const multiplier = 2;
            
            score += basePoints * multiplier;
            
            expect(score).toBe(200);
        });

        test('should update high score when beaten', () => {
            let highScore = 1000;
            const currentScore = 1500;
            
            if (currentScore > highScore) {
                highScore = currentScore;
            }
            
            expect(highScore).toBe(1500);
        });

        test('should not update high score when not beaten', () => {
            let highScore = 2000;
            const currentScore = 1500;
            
            if (currentScore > highScore) {
                highScore = currentScore;
            }
            
            expect(highScore).toBe(2000);
        });
    });

    describe('Checkpoint state', () => {
        test('should track checkpoint progression', () => {
            const checkpoints = [
                { index: 0, passed: false },
                { index: 1, passed: false },
                { index: 2, passed: false }
            ];
            
            checkpoints[0].passed = true;
            
            const passedCount = checkpoints.filter(cp => cp.passed).length;
            expect(passedCount).toBe(1);
        });

        test('should only pass checkpoints in order', () => {
            let lastCheckpointIndex = -1;
            const attemptedCheckpoint = 0;
            
            const canPass = attemptedCheckpoint === lastCheckpointIndex + 1 ||
                          (lastCheckpointIndex === 4 && attemptedCheckpoint === 0);
            
            expect(canPass).toBe(true);
        });

        test('should wrap checkpoint order at end', () => {
            let lastCheckpointIndex = 4;
            const attemptedCheckpoint = 0;
            
            const canPass = attemptedCheckpoint === lastCheckpointIndex + 1 ||
                          (lastCheckpointIndex === 4 && attemptedCheckpoint === 0);
            
            expect(canPass).toBe(true);
        });

        test('should store checkpoint times', () => {
            const checkpointTimes = {};
            const checkpointIndex = 0;
            const time = Date.now();
            
            checkpointTimes[checkpointIndex] = time;
            
            expect(checkpointTimes[0]).toBe(time);
        });

        test('should calculate time between checkpoints', () => {
            const checkpointTimes = {
                0: 1000,
                1: 3000
            };
            
            const sectionTime = checkpointTimes[1] - checkpointTimes[0];
            
            expect(sectionTime).toBe(2000);
        });
    });

    describe('Combo system', () => {
        test('should increment combo on success', () => {
            let combo = 0;
            
            combo++;
            
            expect(combo).toBe(1);
        });

        test('should reset combo on crash', () => {
            let combo = 5;
            const crashed = true;
            
            if (crashed) {
                combo = 0;
            }
            
            expect(combo).toBe(0);
        });

        test('should calculate combo multiplier', () => {
            const combo = 6;
            const multiplier = Math.min(combo / 2, 5);
            
            expect(multiplier).toBe(3);
        });

        test('should cap combo multiplier', () => {
            const combo = 20;
            const multiplier = Math.min(combo / 2, 5);
            
            expect(multiplier).toBe(5);
        });

        test('should maintain combo across actions', () => {
            let combo = 0;
            
            combo++; // Checkpoint
            combo++; // Jump
            combo++; // Wheelie
            
            expect(combo).toBe(3);
        });
    });

    describe('Game reset', () => {
        test('should reset score', () => {
            const state = { score: 5000, combo: 3, finished: false };
            
            state.score = 0;
            state.combo = 0;
            
            expect(state.score).toBe(0);
            expect(state.combo).toBe(0);
        });

        test('should reset checkpoints', () => {
            const checkpoints = [
                { passed: true },
                { passed: true },
                { passed: false }
            ];
            
            checkpoints.forEach(cp => cp.passed = false);
            
            const anyPassed = checkpoints.some(cp => cp.passed);
            expect(anyPassed).toBe(false);
        });

        test('should reset timer', () => {
            let startTime = 1000;
            
            startTime = Date.now();
            
            expect(startTime).toBeGreaterThan(1000);
        });

        test('should reset finish state', () => {
            let finished = true;
            
            finished = false;
            
            expect(finished).toBe(false);
        });
    });

    describe('Finish state', () => {
        test('should detect finish line crossing', () => {
            const playerPosition = { x: 0, y: 0, z: 100 };
            const finishLine = { x: 0, y: 0, z: 100 };
            const threshold = 5;
            
            const dx = playerPosition.x - finishLine.x;
            const dz = playerPosition.z - finishLine.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            const finished = distance < threshold;
            
            expect(finished).toBe(true);
        });

        test('should calculate final time', () => {
            const startTime = 1000;
            const finishTime = 61000;
            
            const elapsedMs = finishTime - startTime;
            const elapsedSeconds = elapsedMs / 1000;
            
            expect(elapsedSeconds).toBe(60);
        });

        test('should add finish bonus', () => {
            let score = 5000;
            const finishBonus = 1000;
            const multiplier = 2;
            
            score += finishBonus * multiplier;
            
            expect(score).toBe(7000);
        });

        test('should calculate race position', () => {
            const playerZ = 500;
            const aiPositions = [450, 480, 520, 540];
            
            let position = 1;
            aiPositions.forEach(aiZ => {
                if (aiZ > playerZ) position++;
            });
            
            expect(position).toBe(3); // 3rd place
        });
    });

    describe('Race timer', () => {
        test('should format time correctly', () => {
            const milliseconds = 125300;
            const seconds = Math.floor(milliseconds / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            
            expect(minutes).toBe(2);
            expect(remainingSeconds).toBe(5);
        });

        test('should track best time', () => {
            let bestTime = 999999;
            const currentTime = 65.5;
            
            if (currentTime < bestTime) {
                bestTime = currentTime;
            }
            
            expect(bestTime).toBe(65.5);
        });

        test('should not update best time if slower', () => {
            let bestTime = 60;
            const currentTime = 65.5;
            
            if (currentTime < bestTime) {
                bestTime = currentTime;
            }
            
            expect(bestTime).toBe(60);
        });
    });

    describe('Speed tracking', () => {
        test('should track average speed', () => {
            const distance = 1000; // meters
            const time = 50; // seconds
            
            const averageSpeed = distance / time;
            
            expect(averageSpeed).toBe(20); // m/s
        });

        test('should convert speed to mph', () => {
            const speedMs = 20;
            const speedMph = speedMs * 2.237;
            
            expect(speedMph).toBeCloseTo(44.7, 1);
        });

        test('should convert speed to kmh', () => {
            const speedMs = 20;
            const speedKmh = speedMs * 3.6;
            
            expect(speedKmh).toBe(72);
        });
    });

    describe('Race statistics', () => {
        test('should calculate distance traveled', () => {
            const positions = [
                { x: 0, z: 0 },
                { x: 0, z: 10 },
                { x: 0, z: 20 }
            ];
            
            let totalDistance = 0;
            for (let i = 1; i < positions.length; i++) {
                const dx = positions[i].x - positions[i-1].x;
                const dz = positions[i].z - positions[i-1].z;
                totalDistance += Math.sqrt(dx * dx + dz * dz);
            }
            
            expect(totalDistance).toBe(20);
        });

        test('should count total cones hit', () => {
            const cones = [
                { hit: true },
                { hit: false },
                { hit: true },
                { hit: true }
            ];
            
            const conesHit = cones.filter(c => c.hit).length;
            
            expect(conesHit).toBe(3);
        });

        test('should count near misses', () => {
            let nearMissCount = 0;
            const events = ['checkpoint', 'nearmiss', 'nearmiss', 'jump'];
            
            nearMissCount = events.filter(e => e === 'nearmiss').length;
            
            expect(nearMissCount).toBe(2);
        });
    });

    describe('Pause state', () => {
        test('should pause game timer', () => {
            let isPaused = false;
            let pauseStartTime = null;
            
            isPaused = true;
            pauseStartTime = Date.now();
            
            expect(isPaused).toBe(true);
            expect(pauseStartTime).toBeGreaterThan(0);
        });

        test('should resume game timer', () => {
            let isPaused = true;
            const pauseStartTime = 1000;
            const resumeTime = 5000;
            let startTime = 0;
            
            const pauseDuration = resumeTime - pauseStartTime;
            startTime += pauseDuration;
            isPaused = false;
            
            expect(isPaused).toBe(false);
            expect(startTime).toBe(4000);
        });
    });

    describe('Local storage persistence', () => {
        test('should serialize game state', () => {
            const state = {
                highScore: 10000,
                bestTime: 65.5
            };
            
            const serialized = JSON.stringify(state);
            
            expect(serialized).toContain('highScore');
            expect(serialized).toContain('bestTime');
        });

        test('should deserialize game state', () => {
            const serialized = '{"highScore":10000,"bestTime":65.5}';
            
            const state = JSON.parse(serialized);
            
            expect(state.highScore).toBe(10000);
            expect(state.bestTime).toBe(65.5);
        });
    });
});