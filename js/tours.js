class TourSystem {
    constructor() {
        this.legs = [
            {
                id: 'mountain-dawn',
                name: 'Mountain Dawn',
                description: 'Gentle winding roads through misty mountain passes',
                startSegment: 0,
                endSegment: 59,
                timeOfDay: 'dawn',
                landscapeVariation: 'mountain',
                difficulty: 'Easy',
                distance: '12 km'
            },
            {
                id: 'valley-run',
                name: 'Valley Run',
                description: 'Fast flowing sections through sunlit valleys',
                startSegment: 60,
                endSegment: 119,
                timeOfDay: 'golden',
                landscapeVariation: 'valley',
                difficulty: 'Medium',
                distance: '12 km'
            },
            {
                id: 'high-pass',
                name: 'High Pass',
                description: 'Technical hairpins and dramatic elevation changes',
                startSegment: 120,
                endSegment: 179,
                timeOfDay: 'sunset',
                landscapeVariation: 'alpine',
                difficulty: 'Hard',
                distance: '12 km'
            },
            {
                id: 'coastal-descent',
                name: 'Coastal Descent',
                description: 'Sweeping descents with ocean views',
                startSegment: 180,
                endSegment: 239,
                timeOfDay: 'twilight',
                landscapeVariation: 'coastal',
                difficulty: 'Medium',
                distance: '12 km'
            },
            {
                id: 'night-ride',
                name: 'Night Ride',
                description: 'Mixed technical challenges under the stars',
                startSegment: 240,
                endSegment: 299,
                timeOfDay: 'night',
                landscapeVariation: 'mixed',
                difficulty: 'Hard',
                distance: '12 km'
            }
        ];

        this.currentLeg = null;
    }

    getLegs() {
        return this.legs;
    }

    getLegById(id) {
        return this.legs.find(leg => leg.id === id);
    }

    selectLeg(legId) {
        const leg = this.getLegById(legId);
        if (!leg) {
            console.error('Invalid leg ID:', legId);
            return null;
        }

        this.currentLeg = leg;
        console.log(`Selected leg: ${leg.name} (segments ${leg.startSegment}-${leg.endSegment})`);
        return leg;
    }

    getCurrentLeg() {
        return this.currentLeg;
    }

    getCurrentLegIndex() {
        if (!this.currentLeg) return -1;
        return this.legs.findIndex(leg => leg.id === this.currentLeg.id);
    }

    getNextLeg() {
        const currentIndex = this.getCurrentLegIndex();
        if (currentIndex === -1 || currentIndex >= this.legs.length - 1) {
            return null; // No next leg (on last leg or no leg selected)
        }
        return this.legs[currentIndex + 1];
    }

    getFirstLeg() {
        return this.legs[0];
    }

    isLastLeg() {
        const currentIndex = this.getCurrentLegIndex();
        return currentIndex === this.legs.length - 1;
    }

    getStartingPosition(roadPath) {
        if (!this.currentLeg) {
            console.warn('No leg selected, using default start position');
            return roadPath[0];
        }

        const startSegment = Math.min(this.currentLeg.startSegment, roadPath.length - 1);
        return roadPath[startSegment];
    }

    getCheckpointPositions(roadPath) {
        if (!this.currentLeg) {
            console.warn('No leg selected, using full track for checkpoints');
            return this.generateCheckpoints(roadPath, 0, roadPath.length - 1);
        }

        return this.generateCheckpoints(
            roadPath,
            this.currentLeg.startSegment,
            this.currentLeg.endSegment
        );
    }

    generateCheckpoints(roadPath, startSegment, endSegment) {
        const checkpoints = [];
        const segmentRange = endSegment - startSegment;
        const checkpointInterval = Math.floor(segmentRange / 10); // 10 checkpoints per leg

        for (let i = 1; i <= 10; i++) {
            const segmentIndex = startSegment + (checkpointInterval * i);
            if (segmentIndex < roadPath.length) {
                checkpoints.push(roadPath[segmentIndex]);
            }
        }

        return checkpoints;
    }

    getLandscapeConfig() {
        if (!this.currentLeg) {
            return { variation: 'mountain' };
        }

        const configs = {
            mountain: {
                grassColor: 0x4a7c4a,
                mountainColor: 0x6b5c42,
                fogDensity: 0.0015,
                treeTypes: ['pine', 'spruce'],
                rockFrequency: 0.3
            },
            valley: {
                grassColor: 0x5a9c5a,
                mountainColor: 0x7a6c52,
                fogDensity: 0.0008,
                treeTypes: ['oak', 'pine'],
                rockFrequency: 0.15
            },
            alpine: {
                grassColor: 0x3a6c3a,
                mountainColor: 0x8b8b8b,
                fogDensity: 0.002,
                treeTypes: ['pine'],
                rockFrequency: 0.5
            },
            coastal: {
                grassColor: 0x6aac6a,
                mountainColor: 0x5a4c32,
                fogDensity: 0.001,
                treeTypes: ['palm', 'oak'],
                rockFrequency: 0.2
            },
            mixed: {
                grassColor: 0x4a8c4a,
                mountainColor: 0x6a5c42,
                fogDensity: 0.0012,
                treeTypes: ['pine', 'oak'],
                rockFrequency: 0.25
            }
        };

        return configs[this.currentLeg.landscapeVariation] || configs.mountain;
    }

    createLegSelector(container, onLegSelected) {
        const selectorHTML = `
            <div class="tour-selector-overlay">
                <div class="tour-selector-panel">
                    <h1 class="tour-title">TWISTY CHALLENGE TOUR</h1>
                    <h2 class="tour-subtitle">Select Your Journey</h2>
                    <div class="leg-grid">
                        ${this.legs.map((leg, index) => `
                            <div class="leg-card" data-leg-id="${leg.id}">
                                <div class="leg-number">LEG ${index + 1}</div>
                                <h3 class="leg-name">${leg.name}</h3>
                                <p class="leg-description">${leg.description}</p>
                                <div class="leg-stats">
                                    <span class="stat"><strong>Distance:</strong> ${leg.distance}</span>
                                    <span class="stat"><strong>Difficulty:</strong> ${leg.difficulty}</span>
                                </div>
                                <button class="select-leg-btn" data-leg-id="${leg.id}">Start This Leg</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', selectorHTML);

        // Add event listeners
        document.querySelectorAll('.select-leg-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const legId = e.target.dataset.legId;
                const leg = this.selectLeg(legId);
                if (leg && onLegSelected) {
                    onLegSelected(leg);
                }
            });
        });
    }

    hideLegSelector() {
        const overlay = document.querySelector('.tour-selector-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    showLegSelector() {
        const overlay = document.querySelector('.tour-selector-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }
}
