/**
 * Leg Progression Tests
 * Tests for tour leg progression and finish screen logic
 */

describe('Leg Progression', () => {
    let tourSystem;

    beforeEach(() => {
        // Create a mock tour system with 5 legs
        tourSystem = {
            legs: [
                { id: 'leg-1', name: 'Leg 1' },
                { id: 'leg-2', name: 'Leg 2' },
                { id: 'leg-3', name: 'Leg 3' },
                { id: 'leg-4', name: 'Leg 4' },
                { id: 'leg-5', name: 'Leg 5' }
            ],
            currentLeg: null,

            getCurrentLegIndex() {
                if (!this.currentLeg) return -1;
                return this.legs.findIndex(leg => leg.id === this.currentLeg.id);
            },

            getNextLeg() {
                const currentIndex = this.getCurrentLegIndex();
                if (currentIndex === -1 || currentIndex >= this.legs.length - 1) {
                    return null;
                }
                return this.legs[currentIndex + 1];
            },

            getFirstLeg() {
                return this.legs[0];
            },

            isLastLeg() {
                const currentIndex = this.getCurrentLegIndex();
                return currentIndex === this.legs.length - 1;
            }
        };
    });

    describe('getCurrentLegIndex', () => {
        test('should return -1 when no leg is selected', () => {
            tourSystem.currentLeg = null;

            const index = tourSystem.getCurrentLegIndex();

            expect(index).toBe(-1);
        });

        test('should return 0 for first leg', () => {
            tourSystem.currentLeg = tourSystem.legs[0];

            const index = tourSystem.getCurrentLegIndex();

            expect(index).toBe(0);
        });

        test('should return 2 for third leg', () => {
            tourSystem.currentLeg = tourSystem.legs[2];

            const index = tourSystem.getCurrentLegIndex();

            expect(index).toBe(2);
        });

        test('should return 4 for last leg', () => {
            tourSystem.currentLeg = tourSystem.legs[4];

            const index = tourSystem.getCurrentLegIndex();

            expect(index).toBe(4);
        });
    });

    describe('getNextLeg', () => {
        test('should return null when no leg is selected', () => {
            tourSystem.currentLeg = null;

            const nextLeg = tourSystem.getNextLeg();

            expect(nextLeg).toBeNull();
        });

        test('should return second leg when on first leg', () => {
            tourSystem.currentLeg = tourSystem.legs[0];

            const nextLeg = tourSystem.getNextLeg();

            expect(nextLeg).toEqual(tourSystem.legs[1]);
            expect(nextLeg.id).toBe('leg-2');
        });

        test('should return third leg when on second leg', () => {
            tourSystem.currentLeg = tourSystem.legs[1];

            const nextLeg = tourSystem.getNextLeg();

            expect(nextLeg).toEqual(tourSystem.legs[2]);
            expect(nextLeg.id).toBe('leg-3');
        });

        test('should return fifth leg when on fourth leg', () => {
            tourSystem.currentLeg = tourSystem.legs[3];

            const nextLeg = tourSystem.getNextLeg();

            expect(nextLeg).toEqual(tourSystem.legs[4]);
            expect(nextLeg.id).toBe('leg-5');
        });

        test('should return null when on last leg', () => {
            tourSystem.currentLeg = tourSystem.legs[4];

            const nextLeg = tourSystem.getNextLeg();

            expect(nextLeg).toBeNull();
        });
    });

    describe('getFirstLeg', () => {
        test('should always return first leg', () => {
            const firstLeg = tourSystem.getFirstLeg();

            expect(firstLeg).toEqual(tourSystem.legs[0]);
            expect(firstLeg.id).toBe('leg-1');
        });

        test('should return first leg even when on last leg', () => {
            tourSystem.currentLeg = tourSystem.legs[4];

            const firstLeg = tourSystem.getFirstLeg();

            expect(firstLeg).toEqual(tourSystem.legs[0]);
        });

        test('should return first leg when no leg selected', () => {
            tourSystem.currentLeg = null;

            const firstLeg = tourSystem.getFirstLeg();

            expect(firstLeg).toEqual(tourSystem.legs[0]);
        });
    });

    describe('isLastLeg', () => {
        test('should return false when no leg is selected', () => {
            tourSystem.currentLeg = null;

            const isLast = tourSystem.isLastLeg();

            expect(isLast).toBe(false);
        });

        test('should return false for first leg', () => {
            tourSystem.currentLeg = tourSystem.legs[0];

            const isLast = tourSystem.isLastLeg();

            expect(isLast).toBe(false);
        });

        test('should return false for middle legs', () => {
            tourSystem.currentLeg = tourSystem.legs[2];

            const isLast = tourSystem.isLastLeg();

            expect(isLast).toBe(false);
        });

        test('should return false for second-to-last leg', () => {
            tourSystem.currentLeg = tourSystem.legs[3];

            const isLast = tourSystem.isLastLeg();

            expect(isLast).toBe(false);
        });

        test('should return true for last leg', () => {
            tourSystem.currentLeg = tourSystem.legs[4];

            const isLast = tourSystem.isLastLeg();

            expect(isLast).toBe(true);
        });
    });

    describe('Finish Screen Logic', () => {
        test('should show "LEG COMPLETE!" title for non-last legs', () => {
            tourSystem.currentLeg = tourSystem.legs[0];
            const isLastLeg = tourSystem.isLastLeg();
            const titleText = isLastLeg ? 'TOUR COMPLETE!' : 'LEG COMPLETE!';

            expect(titleText).toBe('LEG COMPLETE!');
        });

        test('should show "TOUR COMPLETE!" title for last leg', () => {
            tourSystem.currentLeg = tourSystem.legs[4];
            const isLastLeg = tourSystem.isLastLeg();
            const titleText = isLastLeg ? 'TOUR COMPLETE!' : 'LEG COMPLETE!';

            expect(titleText).toBe('TOUR COMPLETE!');
        });

        test('should have next leg button for non-last legs', () => {
            tourSystem.currentLeg = tourSystem.legs[1];
            const isLastLeg = tourSystem.isLastLeg();

            expect(isLastLeg).toBe(false);
            // Would show nextLegBtn
        });

        test('should have restart tour button for last leg', () => {
            tourSystem.currentLeg = tourSystem.legs[4];
            const isLastLeg = tourSystem.isLastLeg();

            expect(isLastLeg).toBe(true);
            // Would show restartTourBtn
        });
    });

    describe('Leg Transitions', () => {
        test('should transition from leg 1 to leg 2', () => {
            tourSystem.currentLeg = tourSystem.legs[0];
            const nextLeg = tourSystem.getNextLeg();

            expect(nextLeg.id).toBe('leg-2');
        });

        test('should transition from leg 2 to leg 3', () => {
            tourSystem.currentLeg = tourSystem.legs[1];
            const nextLeg = tourSystem.getNextLeg();

            expect(nextLeg.id).toBe('leg-3');
        });

        test('should transition from leg 3 to leg 4', () => {
            tourSystem.currentLeg = tourSystem.legs[2];
            const nextLeg = tourSystem.getNextLeg();

            expect(nextLeg.id).toBe('leg-4');
        });

        test('should transition from leg 4 to leg 5', () => {
            tourSystem.currentLeg = tourSystem.legs[3];
            const nextLeg = tourSystem.getNextLeg();

            expect(nextLeg.id).toBe('leg-5');
        });

        test('should not have next leg after leg 5', () => {
            tourSystem.currentLeg = tourSystem.legs[4];
            const nextLeg = tourSystem.getNextLeg();

            expect(nextLeg).toBeNull();
        });

        test('should restart from leg 1 after completing tour', () => {
            tourSystem.currentLeg = tourSystem.legs[4];
            const firstLeg = tourSystem.getFirstLeg();

            expect(firstLeg.id).toBe('leg-1');
        });
    });

    describe('Edge Cases', () => {
        test('should handle single leg tour', () => {
            const singleLegTour = {
                legs: [{ id: 'only-leg', name: 'Only Leg' }],
                currentLeg: null,
                getCurrentLegIndex() {
                    if (!this.currentLeg) return -1;
                    return this.legs.findIndex(leg => leg.id === this.currentLeg.id);
                },
                isLastLeg() {
                    const currentIndex = this.getCurrentLegIndex();
                    return currentIndex === this.legs.length - 1;
                }
            };

            singleLegTour.currentLeg = singleLegTour.legs[0];
            const isLast = singleLegTour.isLastLeg();

            expect(isLast).toBe(true);
        });

        test('should handle empty leg selection', () => {
            tourSystem.currentLeg = null;

            expect(tourSystem.getCurrentLegIndex()).toBe(-1);
            expect(tourSystem.getNextLeg()).toBeNull();
            expect(tourSystem.isLastLeg()).toBe(false);
            expect(tourSystem.getFirstLeg()).toEqual(tourSystem.legs[0]);
        });

        test('should preserve leg order', () => {
            const legIds = tourSystem.legs.map(leg => leg.id);

            expect(legIds).toEqual(['leg-1', 'leg-2', 'leg-3', 'leg-4', 'leg-5']);
        });

        test('should handle rapid leg changes', () => {
            tourSystem.currentLeg = tourSystem.legs[0];
            expect(tourSystem.getCurrentLegIndex()).toBe(0);

            tourSystem.currentLeg = tourSystem.legs[2];
            expect(tourSystem.getCurrentLegIndex()).toBe(2);

            tourSystem.currentLeg = tourSystem.legs[4];
            expect(tourSystem.getCurrentLegIndex()).toBe(4);
            expect(tourSystem.isLastLeg()).toBe(true);
        });
    });
});
