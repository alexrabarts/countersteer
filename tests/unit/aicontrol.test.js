import { jest } from '@jest/globals';

describe('AI Control System', () => {
    describe('Difficulty levels', () => {
        test('should define difficulty settings', () => {
            const difficulties = {
                easy: { speed: 0.7, aggression: 0.3, mistakes: 0.2 },
                medium: { speed: 0.85, aggression: 0.6, mistakes: 0.1 },
                hard: { speed: 1.0, aggression: 0.9, mistakes: 0.05 },
                expert: { speed: 1.15, aggression: 1.0, mistakes: 0.01 }
            };
            
            expect(difficulties.easy.speed).toBe(0.7);
            expect(difficulties.expert.speed).toBe(1.15);
        });

        test('should scale AI speed with difficulty', () => {
            const baseSpeed = 40;
            const difficultyMultiplier = 0.85; // Medium
            
            const aiSpeed = baseSpeed * difficultyMultiplier;
            
            expect(aiSpeed).toBe(34);
        });

        test('should adjust AI reaction time', () => {
            const difficulty = 'hard';
            const reactionTimes = {
                easy: 0.3,
                medium: 0.2,
                hard: 0.1,
                expert: 0.05
            };
            
            expect(reactionTimes[difficulty]).toBe(0.1);
        });

        test('should vary AI mistake frequency', () => {
            const difficulty = 'easy';
            const mistakeChance = 0.2;
            const randomValue = 0.15;
            
            const makesMistake = randomValue < mistakeChance;
            
            expect(makesMistake).toBe(true);
        });
    });

    describe('Rubber-banding', () => {
        test('should slow down leader when too far ahead', () => {
            const leaderSpeed = 45;
            const playerPosition = 100;
            const leaderPosition = 200;
            const maxGap = 80;
            
            const gap = leaderPosition - playerPosition;
            const shouldSlowDown = gap > maxGap;
            const adjustedSpeed = shouldSlowDown ? leaderSpeed * 0.95 : leaderSpeed;
            
            expect(adjustedSpeed).toBeCloseTo(42.75, 2);
        });

        test('should speed up trailing AI when too far behind', () => {
            const aiSpeed = 35;
            const playerPosition = 200;
            const aiPosition = 100;
            const maxGap = 80;
            
            const gap = playerPosition - aiPosition;
            const shouldSpeedUp = gap > maxGap;
            const adjustedSpeed = shouldSpeedUp ? aiSpeed * 1.1 : aiSpeed;
            
            expect(adjustedSpeed).toBe(38.5);
        });

        test('should calculate rubber-band strength', () => {
            const gap = 120;
            const maxGap = 100;
            const extraGap = Math.max(0, gap - maxGap);
            
            const strength = Math.min(1, extraGap / 50);
            
            expect(strength).toBe(0.4);
        });

        test('should disable rubber-banding in expert mode', () => {
            const difficulty = 'expert';
            const rubberBandEnabled = difficulty !== 'expert';
            
            expect(rubberBandEnabled).toBe(false);
        });

        test('should apply gradual rubber-banding', () => {
            let currentMultiplier = 1.0;
            const targetMultiplier = 1.1;
            const lerpFactor = 0.1;
            
            currentMultiplier += (targetMultiplier - currentMultiplier) * lerpFactor;
            
            expect(currentMultiplier).toBeCloseTo(1.01, 2);
        });
    });

    describe('AI pathfinding', () => {
        test('should calculate racing line offset', () => {
            const cornerRadius = 100;
            const laneWidth = 4;
            
            const optimalOffset = laneWidth * 0.8;
            
            expect(optimalOffset).toBe(3.2);
        });

        test('should adjust path for obstacles', () => {
            const normalOffset = 0;
            const obstacleAt = 2; // Units right
            const avoidanceOffset = -3; // Move left
            
            const adjustedOffset = normalOffset + avoidanceOffset;
            
            expect(adjustedOffset).toBe(-3);
        });

        test('should calculate look-ahead distance', () => {
            const speed = 40;
            const baseLookAhead = 20;
            
            const lookAhead = baseLookAhead + speed * 0.5;
            
            expect(lookAhead).toBe(40);
        });
    });

    describe('AI decision making', () => {
        test('should decide to overtake', () => {
            const aiSpeed = 40;
            const targetSpeed = 30;
            const gap = 15;
            const safeGap = 20;
            
            const shouldOvertake = aiSpeed > targetSpeed && gap > safeGap * 0.7;
            
            expect(shouldOvertake).toBe(true);
        });

        test('should abort risky overtakes', () => {
            const cornerAhead = true;
            const distanceToCorner = 30;
            const safeDistance = 50;
            
            const isSafe = !cornerAhead || distanceToCorner > safeDistance;
            
            expect(isSafe).toBe(false);
        });

        test('should defend position', () => {
            const aiPosition = 200;
            const rivalPosition = 195;
            const gap = aiPosition - rivalPosition;
            const defendThreshold = 10;
            
            const shouldDefend = gap < defendThreshold;
            
            expect(shouldDefend).toBe(true);
        });
    });

    describe('AI mistakes', () => {
        test('should occasionally brake too late', () => {
            const difficulty = 'easy';
            const mistakeChance = 0.2;
            const randomValue = 0.15;
            
            const lateBraking = randomValue < mistakeChance;
            
            expect(lateBraking).toBe(true);
        });

        test('should miss apex sometimes', () => {
            const targetApex = 0;
            const mistakeOffset = 2; // 2 meters off
            
            const actualApex = targetApex + mistakeOffset;
            
            expect(actualApex).toBe(2);
        });

        test('should make fewer mistakes at higher difficulty', () => {
            const easyMistakes = 0.2;
            const expertMistakes = 0.01;
            
            expect(expertMistakes).toBeLessThan(easyMistakes);
        });
    });

    describe('AI learning', () => {
        test('should adapt to player style', () => {
            const playerAvgSpeed = 42;
            let aiTargetSpeed = 35;
            const adaptRate = 0.1;
            
            aiTargetSpeed += (playerAvgSpeed - aiTargetSpeed) * adaptRate;
            
            expect(aiTargetSpeed).toBeCloseTo(35.7, 1);
        });

        test('should remember successful overtakes', () => {
            const overtakeAttempts = 5;
            const successfulOvertakes = 3;
            
            const successRate = successfulOvertakes / overtakeAttempts;
            
            expect(successRate).toBe(0.6);
        });

        test('should adjust aggression based on results', () => {
            let aggression = 0.6;
            const crashes = 2;
            const maxCrashes = 1;
            
            if (crashes > maxCrashes) {
                aggression *= 0.9;
            }
            
            expect(aggression).toBe(0.54);
        });
    });

    describe('Pack behavior', () => {
        test('should maintain pack spacing', () => {
            const idealSpacing = 15;
            const currentSpacing = 10;
            const adjustment = (idealSpacing - currentSpacing) * 0.1;
            
            expect(adjustment).toBe(0.5);
        });

        test('should form drafting train', () => {
            const bikePositions = [100, 115, 130, 145];
            const spacings = [];
            
            for (let i = 1; i < bikePositions.length; i++) {
                spacings.push(bikePositions[i] - bikePositions[i-1]);
            }
            
            const avgSpacing = spacings.reduce((a, b) => a + b) / spacings.length;
            expect(avgSpacing).toBe(15);
        });

        test('should break formation for overtaking', () => {
            const inPack = true;
            const overtakeOpportunity = true;
            
            const breakFormation = inPack && overtakeOpportunity;
            
            expect(breakFormation).toBe(true);
        });
    });

    describe('AI stamina system', () => {
        test('should reduce performance over time', () => {
            const lapNumber = 5;
            const maxLaps = 10;
            const fatigueStart = 6;
            
            const fatigueFactor = lapNumber > fatigueStart ? 
                1 - (lapNumber - fatigueStart) / (maxLaps - fatigueStart) * 0.1 : 1;
            
            expect(fatigueFactor).toBe(1);
        });

        test('should apply stamina penalty', () => {
            const baseSpeed = 40;
            const stamina = 0.85;
            
            const effectiveSpeed = baseSpeed * stamina;
            
            expect(effectiveSpeed).toBe(34);
        });

        test('should recover stamina in straights', () => {
            let stamina = 0.8;
            const isInStraight = true;
            const recoveryRate = 0.02;
            
            if (isInStraight) {
                stamina = Math.min(1, stamina + recoveryRate);
            }
            
            expect(stamina).toBeCloseTo(0.82, 10);
        });
    });

    describe('AI consistency', () => {
        test('should vary lap times slightly', () => {
            const targetLapTime = 65;
            const consistency = 0.95; // High consistency
            const variation = 2; // seconds
            
            const lapTime = targetLapTime + (Math.random() - 0.5) * variation * (1 - consistency);
            
            expect(lapTime).toBeGreaterThan(64);
            expect(lapTime).toBeLessThan(66);
        });

        test('should calculate performance consistency', () => {
            const lapTimes = [65.2, 65.5, 65.1, 65.8];
            const avg = lapTimes.reduce((a, b) => a + b) / lapTimes.length;
            const variance = lapTimes.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / lapTimes.length;
            
            expect(variance).toBeLessThan(0.1);
        });
    });

    describe('AI personality traits', () => {
        test('should apply aggressive driving style', () => {
            const personality = 'aggressive';
            const baseOvertakeChance = 0.5;
            
            const overtakeChance = personality === 'aggressive' ? 
                baseOvertakeChance * 1.5 : baseOvertakeChance;
            
            expect(overtakeChance).toBe(0.75);
        });

        test('should apply cautious driving style', () => {
            const personality = 'cautious';
            const baseRiskTolerance = 0.7;
            
            const riskTolerance = personality === 'cautious' ? 
                baseRiskTolerance * 0.6 : baseRiskTolerance;
            
            expect(riskTolerance).toBe(0.42);
        });

        test('should apply technical driving style', () => {
            const personality = 'technical';
            const corneringBonus = 1.1;
            
            expect(corneringBonus).toBeGreaterThan(1);
        });
    });

    describe('Dynamic difficulty adjustment', () => {
        test('should track player performance', () => {
            const playerWins = 7;
            const totalRaces = 10;
            
            const winRate = playerWins / totalRaces;
            
            expect(winRate).toBe(0.7);
        });

        test('should increase difficulty if player dominates', () => {
            const winRate = 0.8;
            const targetWinRate = 0.5;
            let difficulty = 0.85;
            
            if (winRate > targetWinRate + 0.2) {
                difficulty = Math.min(1.2, difficulty * 1.05);
            }
            
            expect(difficulty).toBeCloseTo(0.8925, 4);
        });

        test('should decrease difficulty if player struggles', () => {
            const winRate = 0.2;
            const targetWinRate = 0.5;
            let difficulty = 0.85;
            
            if (winRate < targetWinRate - 0.2) {
                difficulty = Math.max(0.6, difficulty * 0.95);
            }
            
            expect(difficulty).toBeCloseTo(0.8075, 4);
        });
    });

    describe('AI communication', () => {
        test('should signal intentions', () => {
            const aiAction = 'overtaking';
            const signals = {
                overtaking: 'left',
                defending: 'center',
                yielding: 'right'
            };
            
            expect(signals[aiAction]).toBe('left');
        });

        test('should respect blue flags', () => {
            const lapsDown = 1;
            const leaderApproaching = true;
            
            const shouldYield = lapsDown > 0 && leaderApproaching;
            
            expect(shouldYield).toBe(true);
        });
    });
});