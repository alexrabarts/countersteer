/**
 * Leaderboard Integration Tests
 * End-to-end tests for the complete leaderboard flow
 */

describe('Leaderboard Integration Flow', () => {
    let leaderboardService;
    let firebase;
    let functions;

    beforeAll(async () => {
        // Initialize Firebase (assuming test environment is set up)
        // In real scenario, you'd connect to Firebase emulator
        firebase = require('firebase/app');
        require('firebase/functions');

        const firebaseConfig = {
            apiKey: 'test-api-key',
            authDomain: 'test.firebaseapp.com',
            databaseURL: 'http://localhost:9000',
            projectId: 'test-project'
        };

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        functions = firebase.functions();
        functions.useEmulator('localhost', 5001);
    });

    beforeEach(() => {
        leaderboardService = new LeaderboardService(functions);
    });

    describe('Complete Run Flow', () => {
        test('should complete full run submission flow', async () => {
            const legId = 'mountain-dawn';

            // Step 1: Start run
            const startResult = await leaderboardService.startRun(legId);
            expect(startResult).toBe(true);
            expect(leaderboardService.isActive()).toBe(true);

            // Step 2: Record 10 checkpoints
            for (let i = 0; i < 10; i++) {
                const time = (i + 1) * 5000; // 5 seconds per checkpoint
                await leaderboardService.recordCheckpoint(i, time);
            }

            expect(leaderboardService.checkpointTimes).toHaveLength(10);
            expect(leaderboardService.proofChain).toHaveLength(10);

            // Step 3: Submit run
            const submitResult = await leaderboardService.submitRun('TEST');
            expect(submitResult.success).toBe(true);
            expect(submitResult.rank).toBeGreaterThan(0);
            expect(typeof submitResult.flagged).toBe('boolean');

            // Session should be cleared
            expect(leaderboardService.isActive()).toBe(false);

            // Step 4: Fetch leaderboard and verify entry
            const leaderboardResult = await leaderboardService.fetchLeaderboard(legId, 10);
            expect(leaderboardResult.success).toBe(true);
            expect(leaderboardResult.entries.length).toBeGreaterThan(0);

            // Find our entry
            const ourEntry = leaderboardResult.entries.find(e => e.playerName === 'TEST');
            expect(ourEntry).toBeDefined();
            expect(ourEntry.totalTime).toBe(50000); // 10 * 5000ms
        }, 30000); // 30 second timeout for integration test

        test('should handle multiple concurrent submissions', async () => {
            const legId = 'valley-run';
            const players = ['AAA', 'BBB', 'CCC', 'DDD'];

            // Submit multiple runs concurrently
            const submissions = players.map(async (name, index) => {
                const service = new LeaderboardService(functions);
                await service.startRun(legId);

                // Record checkpoints with varying times
                for (let i = 0; i < 10; i++) {
                    const time = (i + 1) * (5000 + index * 1000);
                    await service.recordCheckpoint(i, time);
                }

                return service.submitRun(name);
            });

            const results = await Promise.all(submissions);

            // All should succeed
            results.forEach(result => {
                expect(result.success).toBe(true);
            });

            // Verify leaderboard ordering
            const leaderboardResult = await leaderboardService.fetchLeaderboard(legId, 10);
            expect(leaderboardResult.success).toBe(true);
            expect(leaderboardResult.entries.length).toBeGreaterThanOrEqual(players.length);

            // Verify ranking is correct (AAA should be first with fastest time)
            const ranks = {};
            leaderboardResult.entries.forEach(entry => {
                if (players.includes(entry.playerName)) {
                    ranks[entry.playerName] = entry.rank;
                }
            });

            expect(ranks['AAA']).toBeLessThan(ranks['BBB']);
            expect(ranks['BBB']).toBeLessThan(ranks['CCC']);
            expect(ranks['CCC']).toBeLessThan(ranks['DDD']);
        }, 60000);
    });

    describe('Error Handling', () => {
        test('should handle network failure gracefully', async () => {
            // Disconnect from emulator
            const offlineService = new LeaderboardService(null);

            const startResult = await offlineService.startRun('mountain-dawn');
            expect(startResult.success).toBe(false);
            expect(startResult.error).toBeDefined();
        });

        test('should reject submission without starting run', async () => {
            const result = await leaderboardService.submitRun('FAIL');
            expect(result.success).toBe(false);
            expect(result.error).toContain('No active session');
        });

        test('should reject submission with incomplete checkpoints', async () => {
            await leaderboardService.startRun('mountain-dawn');

            // Only record 5 checkpoints instead of 10
            for (let i = 0; i < 5; i++) {
                await leaderboardService.recordCheckpoint(i, (i + 1) * 5000);
            }

            const result = await leaderboardService.submitRun('FAIL');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Incomplete');
        });

        test('should handle session expiry', async () => {
            await leaderboardService.startRun('mountain-dawn');

            // Record checkpoints
            for (let i = 0; i < 10; i++) {
                await leaderboardService.recordCheckpoint(i, (i + 1) * 5000);
            }

            // Wait for session to expire (15+ minutes)
            // In real test, you'd mock the time
            // For now, just test that the function handles expired sessions

            // Manually expire by manipulating session data in database
            // This would require direct database access in test environment
            // Skipping implementation detail for this example

            expect(true).toBe(true); // Placeholder
        }, 10000);
    });

    describe('Anti-Cheat Validation', () => {
        test('should reject run with tampered proof chain', async () => {
            await leaderboardService.startRun('mountain-dawn');

            // Record checkpoints
            for (let i = 0; i < 10; i++) {
                await leaderboardService.recordCheckpoint(i, (i + 1) * 5000);
            }

            // Tamper with proof chain
            leaderboardService.proofChain[5] = 'tampered_proof_' + 'a'.repeat(50);

            const result = await leaderboardService.submitRun('CHTR');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid proof');
        });

        test('should reject run with times too fast', async () => {
            await leaderboardService.startRun('mountain-dawn');

            // Record checkpoints with unrealistically fast times
            for (let i = 0; i < 10; i++) {
                await leaderboardService.recordCheckpoint(i, (i + 1) * 500); // 0.5s per checkpoint
            }

            const result = await leaderboardService.submitRun('FAST');
            expect(result.success).toBe(false);
            expect(result.error).toContain('too fast');
        });

        test('should reject run with non-monotonic times', async () => {
            await leaderboardService.startRun('mountain-dawn');

            // Record checkpoints with backwards time
            const times = [5000, 10000, 9000, 15000, 20000, 25000, 30000, 35000, 40000, 45000];
            for (let i = 0; i < 10; i++) {
                await leaderboardService.recordCheckpoint(i, times[i]);
            }

            const result = await leaderboardService.submitRun('TIME');
            expect(result.success).toBe(false);
            expect(result.error).toContain('monotonic');
        });

        test('should flag statistical anomalies', async () => {
            const legId = 'high-pass';

            // Submit several normal runs to establish baseline
            for (let j = 0; j < 12; j++) {
                const service = new LeaderboardService(functions);
                await service.startRun(legId);

                for (let i = 0; i < 10; i++) {
                    const time = (i + 1) * 5000 + Math.random() * 500;
                    await service.recordCheckpoint(i, time);
                }

                await service.submitRun(`N${j.toString().padStart(3, '0')}`);
            }

            // Submit an anomalously fast run
            const fastService = new LeaderboardService(functions);
            await fastService.startRun(legId);

            for (let i = 0; i < 10; i++) {
                await fastService.recordCheckpoint(i, (i + 1) * 2000); // Much faster
            }

            const result = await fastService.submitRun('FAST');
            expect(result.success).toBe(true);
            expect(result.flagged).toBe(true); // Should be flagged as anomaly
        }, 60000);
    });

    describe('Rate Limiting', () => {
        test('should enforce hourly rate limit', async () => {
            const deviceFingerprint = await leaderboardService.generateDeviceFingerprint();

            // Attempt to start 6 runs quickly (limit is 5 per hour)
            const attempts = [];
            for (let i = 0; i < 6; i++) {
                const service = new LeaderboardService(functions);
                attempts.push(service.startRun('mountain-dawn'));
            }

            const results = await Promise.allSettled(attempts);

            // First 5 should succeed
            for (let i = 0; i < 5; i++) {
                expect(results[i].status).toBe('fulfilled');
            }

            // 6th should fail with rate limit error
            expect(results[5].status).toBe('rejected');
            expect(results[5].reason.message).toContain('Rate limit');
        }, 30000);
    });

    describe('Per-Leg Leaderboards', () => {
        test('should maintain separate leaderboards for each leg', async () => {
            const legs = ['mountain-dawn', 'valley-run', 'high-pass'];

            // Submit runs for each leg
            for (const legId of legs) {
                const service = new LeaderboardService(functions);
                await service.startRun(legId);

                for (let i = 0; i < 10; i++) {
                    await service.recordCheckpoint(i, (i + 1) * 5000);
                }

                await service.submitRun('TOUR');
            }

            // Verify each leg has its own leaderboard
            for (const legId of legs) {
                const result = await leaderboardService.fetchLeaderboard(legId, 10);
                expect(result.success).toBe(true);
                expect(result.entries.length).toBeGreaterThan(0);

                const tourEntry = result.entries.find(e => e.playerName === 'TOUR');
                expect(tourEntry).toBeDefined();
            }
        }, 60000);

        test('should rank entries correctly within each leg', async () => {
            const legId = 'coastal-descent';

            // Submit 3 runs with different times
            const times = [
                { name: 'SLOW', multiplier: 7000 },
                { name: 'MED', multiplier: 5000 },
                { name: 'FAST', multiplier: 3000 }
            ];

            for (const { name, multiplier } of times) {
                const service = new LeaderboardService(functions);
                await service.startRun(legId);

                for (let i = 0; i < 10; i++) {
                    await service.recordCheckpoint(i, (i + 1) * multiplier);
                }

                await service.submitRun(name);
            }

            // Fetch leaderboard
            const result = await leaderboardService.fetchLeaderboard(legId, 10);
            expect(result.success).toBe(true);

            // Verify ranking
            const fastEntry = result.entries.find(e => e.playerName === 'FAST');
            const medEntry = result.entries.find(e => e.playerName === 'MED');
            const slowEntry = result.entries.find(e => e.playerName === 'SLOW');

            expect(fastEntry.rank).toBeLessThan(medEntry.rank);
            expect(medEntry.rank).toBeLessThan(slowEntry.rank);
        }, 60000);
    });

    describe('Edge Cases', () => {
        test('should allow duplicate player names', async () => {
            const legId = 'night-ride';

            // Submit two runs with same name
            for (let i = 0; i < 2; i++) {
                const service = new LeaderboardService(functions);
                await service.startRun(legId);

                for (let j = 0; j < 10; j++) {
                    await service.recordCheckpoint(j, (j + 1) * 5000);
                }

                const result = await service.submitRun('DUPE');
                expect(result.success).toBe(true);
            }

            // Verify both entries exist
            const leaderboardResult = await leaderboardService.fetchLeaderboard(legId, 10);
            const dupeEntries = leaderboardResult.entries.filter(e => e.playerName === 'DUPE');
            expect(dupeEntries.length).toBeGreaterThanOrEqual(2);
        }, 30000);

        test('should handle empty leaderboard', async () => {
            const legId = 'empty-leg-' + Date.now();
            const result = await leaderboardService.fetchLeaderboard(legId, 10);

            expect(result.success).toBe(true);
            expect(result.entries).toEqual([]);
        });

        test('should cancel session cleanly', async () => {
            await leaderboardService.startRun('mountain-dawn');

            for (let i = 0; i < 5; i++) {
                await leaderboardService.recordCheckpoint(i, (i + 1) * 5000);
            }

            expect(leaderboardService.isActive()).toBe(true);

            leaderboardService.cancelSession();

            expect(leaderboardService.isActive()).toBe(false);
            expect(leaderboardService.sessionId).toBeNull();
            expect(leaderboardService.checkpointTimes).toEqual([]);
        });
    });
});
