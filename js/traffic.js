class Traffic {
    constructor(scene, environment) {
        this.scene = scene;
        this.environment = environment;
        this.cars = [];
        this.maxCars = 6; // Reduced from 12
        this.carSpacing = 200; // Increased spacing between cars
        
        this.initializeCars();
    }
    
    initializeCars() {
        // Create cars going both directions
        const totalSegments = this.environment.roadPath.length;
        
        // Cars going forward (same direction as player) - LEFT SIDE for left-hand drive
        for (let i = 0; i < this.maxCars / 2; i++) {
            const startSegment = Math.floor(Math.random() * totalSegments);
            const car = new Car(this.scene, this.environment, {
                direction: 1,
                speed: 15 + Math.random() * 10, // 15-25 m/s (54-90 km/h)
                startSegment: startSegment,
                lane: 'left', // Left lane for left-hand drive
                color: this.getRandomCarColor()
            });
            this.cars.push(car);
        }
        
        // Cars going opposite direction - RIGHT SIDE for left-hand drive
        for (let i = 0; i < this.maxCars / 2; i++) {
            const startSegment = Math.floor(Math.random() * totalSegments);
            const car = new Car(this.scene, this.environment, {
                direction: -1,
                speed: 15 + Math.random() * 10, // 15-25 m/s
                startSegment: startSegment,
                lane: 'right', // Opposite traffic on right for left-hand drive
                color: this.getRandomCarColor()
            });
            this.cars.push(car);
        }
    }
    
    getRandomCarColor() {
        const colors = [
            0xff0000, // Red
            0x0000ff, // Blue
            0xffff00, // Yellow
            0x00ff00, // Green
            0xffa500, // Orange
            0x800080, // Purple
            0xffffff, // White
            0x333333, // Dark gray
            0x00ffff, // Cyan
            0x8b4513  // Brown
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    update(deltaTime, playerPosition) {
        let collisionResult = null;
        
        // Update all cars
        this.cars.forEach(car => {
            car.update(deltaTime);
            
            // Check for collision with player
            if (!collisionResult && car.checkCollision(playerPosition)) {
                // Flash the car on impact
                car.onCollision();
                collisionResult = { hit: true, car: car };
            }
        });
        
        if (collisionResult) {
            return collisionResult;
        }
        
        // Check spacing between cars going same direction
        for (let i = 0; i < this.cars.length; i++) {
            for (let j = i + 1; j < this.cars.length; j++) {
                const car1 = this.cars[i];
                const car2 = this.cars[j];
                
                // Only check cars going same direction
                if (car1.direction === car2.direction) {
                    const distance = car1.getDistanceToOtherCar(car2);
                    if (distance < this.carSpacing && distance > 0) {
                        // Slow down the car behind
                        const car1Progress = car1.currentSegment + car1.segmentProgress;
                        const car2Progress = car2.currentSegment + car2.segmentProgress;
                        
                        if (car1.direction === 1) {
                            // Forward direction
                            if (car1Progress < car2Progress) {
                                car1.temporarySlowdown();
                            } else {
                                car2.temporarySlowdown();
                            }
                        } else {
                            // Reverse direction
                            if (car1Progress > car2Progress) {
                                car1.temporarySlowdown();
                            } else {
                                car2.temporarySlowdown();
                            }
                        }
                    }
                }
            }
        }
        
        return { hit: false };
    }
    

    reset() {
        // Remove all cars and recreate
        this.cars.forEach(car => car.remove());
        this.cars = [];
        this.initializeCars();
    }
}

class Car {
    constructor(scene, environment, options) {
        this.scene = scene;
        this.environment = environment;
        this.direction = options.direction || 1;
        this.baseSpeed = options.speed || 20;
        this.currentSpeed = this.baseSpeed;
        this.currentSegment = options.startSegment || 0;
        this.lane = options.lane || 'right';
        this.originalLane = this.lane;
        this.color = options.color || 0xff0000;
        this.segmentProgress = 0;
        this.inDetour = false;
        this.detourSide = null;
        
        this.createCarModel();
        
        // Ensure initial position is on the road
        if (this.environment && this.environment.roadPath && this.environment.roadPath.length > 0) {
            this.updatePosition();
        }
    }
    
    createCarModel() {
        this.carGroup = new THREE.Group();
        
        // Main car body - sleeker with subdivisions for smoother look
        const bodyGeometry = new THREE.BoxGeometry(1.9, 0.9, 4.2, 2, 2, 3);
        
        // Modify vertices to create a more car-like shape
        const bodyVertices = bodyGeometry.attributes.position;
        for (let i = 0; i < bodyVertices.count; i++) {
            const y = bodyVertices.getY(i);
            const z = bodyVertices.getZ(i);
            
            // Taper the front and back
            if (z > 1.5) {
                // Front taper
                bodyVertices.setY(i, y * 0.7);
            } else if (z < -1.5) {
                // Rear taper
                bodyVertices.setY(i, y * 0.8);
            }
        }
        bodyGeometry.computeVertexNormals();
        
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: this.color,
            roughness: 0.25,
            metalness: 0.75
        });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.position.y = 0.5;
        this.body.castShadow = true;
        this.body.receiveShadow = true;
        this.carGroup.add(this.body);
        
        // Car cabin/greenhouse - more streamlined
        const cabinGeometry = new THREE.BoxGeometry(1.75, 0.8, 2.0, 2, 2, 2);
        
        // Modify cabin vertices for a sloped windshield and rear
        const cabinVertices = cabinGeometry.attributes.position;
        for (let i = 0; i < cabinVertices.count; i++) {
            const y = cabinVertices.getY(i);
            const z = cabinVertices.getZ(i);
            
            // Slope windshield
            if (z > 0.5 && y > 0) {
                cabinVertices.setZ(i, z - y * 0.3);
            }
            // Slope rear window
            if (z < -0.5 && y > 0) {
                cabinVertices.setZ(i, z + y * 0.25);
            }
        }
        cabinGeometry.computeVertexNormals();
        
        const cabinMaterial = new THREE.MeshStandardMaterial({ 
            color: this.color,
            roughness: 0.3,
            metalness: 0.7
        });
        this.cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
        this.cabin.position.y = 1.15;
        this.cabin.position.z = -0.3;
        this.cabin.castShadow = true;
        this.cabin.receiveShadow = true;
        this.carGroup.add(this.cabin);
        
        // Windows - using planes for cleaner look
        const windowMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x224466,
            roughness: 0.1,
            metalness: 0.5,
            opacity: 0.7,
            transparent: true
        });
        
        // Windshield
        const windshieldGeometry = new THREE.PlaneGeometry(1.65, 0.65);
        const windshield = new THREE.Mesh(windshieldGeometry, windowMaterial);
        windshield.position.set(0, 1.3, 0.65);
        windshield.rotation.x = -0.35;
        this.carGroup.add(windshield);
        
        // Rear window
        const rearWindowGeometry = new THREE.PlaneGeometry(1.6, 0.55);
        const rearWindow = new THREE.Mesh(rearWindowGeometry, windowMaterial);
        rearWindow.position.set(0, 1.25, -1.25);
        rearWindow.rotation.x = 0.3;
        this.carGroup.add(rearWindow);
        
        // Side windows - front
        const frontSideWindowGeometry = new THREE.PlaneGeometry(0.9, 0.55);
        const leftFrontWindow = new THREE.Mesh(frontSideWindowGeometry, windowMaterial);
        leftFrontWindow.position.set(0.88, 1.25, 0.1);
        leftFrontWindow.rotation.y = Math.PI / 2;
        this.carGroup.add(leftFrontWindow);
        
        const rightFrontWindow = new THREE.Mesh(frontSideWindowGeometry, windowMaterial);
        rightFrontWindow.position.set(-0.88, 1.25, 0.1);
        rightFrontWindow.rotation.y = -Math.PI / 2;
        this.carGroup.add(rightFrontWindow);
        
        // Side windows - rear
        const rearSideWindowGeometry = new THREE.PlaneGeometry(0.8, 0.5);
        const leftRearWindow = new THREE.Mesh(rearSideWindowGeometry, windowMaterial);
        leftRearWindow.position.set(0.88, 1.2, -0.85);
        leftRearWindow.rotation.y = Math.PI / 2;
        this.carGroup.add(leftRearWindow);
        
        const rightRearWindow = new THREE.Mesh(rearSideWindowGeometry, windowMaterial);
        rightRearWindow.position.set(-0.88, 1.2, -0.85);
        rightRearWindow.rotation.y = -Math.PI / 2;
        this.carGroup.add(rightRearWindow);
        
        // Wheels with better detail
        const wheelGeometry = new THREE.CylinderGeometry(0.32, 0.32, 0.28, 20);
        const wheelMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a1a1a,
            roughness: 0.95,
            metalness: 0.05
        });
        
        // Rim with spokes pattern
        const rimOuterGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.29, 16);
        const rimInnerGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 12);
        const rimMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xb0b0b0,
            roughness: 0.25,
            metalness: 0.85
        });
        
        // Spoke geometry (simple box for performance)
        const spokeGeometry = new THREE.BoxGeometry(0.03, 0.3, 0.16);
        
        const wheelPositions = [
            { x: 0.85, z: 1.35 },
            { x: -0.85, z: 1.35 },
            { x: 0.85, z: -1.35 },
            { x: -0.85, z: -1.35 }
        ];
        
        wheelPositions.forEach(pos => {
            const wheelGroup = new THREE.Group();
            
            // Tire
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheelGroup.add(wheel);
            
            // Outer rim
            const rimOuter = new THREE.Mesh(rimOuterGeometry, rimMaterial);
            rimOuter.rotation.z = Math.PI / 2;
            wheelGroup.add(rimOuter);
            
            // Inner hub
            const rimInner = new THREE.Mesh(rimInnerGeometry, rimMaterial);
            rimInner.rotation.z = Math.PI / 2;
            wheelGroup.add(rimInner);
            
            // Add 5 spokes
            for (let i = 0; i < 5; i++) {
                const spoke = new THREE.Mesh(spokeGeometry, rimMaterial);
                spoke.rotation.z = Math.PI / 2;
                spoke.rotation.y = (i * Math.PI * 2) / 5;
                wheelGroup.add(spoke);
            }
            
            wheelGroup.position.set(pos.x, 0.32, pos.z);
            wheelGroup.castShadow = true;
            wheelGroup.receiveShadow = true;
            this.carGroup.add(wheelGroup);
        });
        
        // Headlights - circular for more realistic look
        const headlightGeometry = new THREE.CylinderGeometry(0.15, 0.18, 0.08, 12);
        const headlightMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            emissive: 0xffffee,
            emissiveIntensity: 0.5,
            roughness: 0.05,
            metalness: 0.5
        });
        
        const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        leftHeadlight.position.set(0.65, 0.5, 2.12);
        leftHeadlight.rotation.z = Math.PI / 2;
        this.carGroup.add(leftHeadlight);
        
        const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        rightHeadlight.position.set(-0.65, 0.5, 2.12);
        rightHeadlight.rotation.z = Math.PI / 2;
        this.carGroup.add(rightHeadlight);
        
        // Tail lights - wider and flatter
        const taillightGeometry = new THREE.BoxGeometry(0.35, 0.2, 0.08);
        const taillightMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xcc0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.3,
            roughness: 0.1,
            metalness: 0.2
        });
        
        const leftTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
        leftTaillight.position.set(0.65, 0.55, -2.12);
        this.carGroup.add(leftTaillight);
        
        const rightTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
        rightTaillight.position.set(-0.65, 0.55, -2.12);
        this.carGroup.add(rightTaillight);
        
        // Add grille
        const grilleGeometry = new THREE.PlaneGeometry(1.2, 0.4);
        const grilleMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.8,
            metalness: 0.3
        });
        const grille = new THREE.Mesh(grilleGeometry, grilleMaterial);
        grille.position.set(0, 0.4, 2.11);
        this.carGroup.add(grille);
        
        // Add bumpers
        const bumperGeometry = new THREE.BoxGeometry(1.95, 0.15, 0.25);
        const bumperMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.7,
            metalness: 0.3
        });
        
        const frontBumper = new THREE.Mesh(bumperGeometry, bumperMaterial);
        frontBumper.position.set(0, 0.25, 2.15);
        this.carGroup.add(frontBumper);
        
        const rearBumper = new THREE.Mesh(bumperGeometry, bumperMaterial);
        rearBumper.position.set(0, 0.25, -2.15);
        this.carGroup.add(rearBumper);
        
        // Add simple side mirrors
        const mirrorGeometry = new THREE.BoxGeometry(0.08, 0.06, 0.12);
        const mirrorMaterial = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.3,
            metalness: 0.7
        });
        
        const leftMirror = new THREE.Mesh(mirrorGeometry, mirrorMaterial);
        leftMirror.position.set(0.98, 1.0, 0.3);
        this.carGroup.add(leftMirror);
        
        const rightMirror = new THREE.Mesh(mirrorGeometry, mirrorMaterial);
        rightMirror.position.set(-0.98, 1.0, 0.3);
        this.carGroup.add(rightMirror);
        
        this.scene.add(this.carGroup);
    }
    
    updatePosition() {
        const totalSegments = this.environment.roadPath.length;
        
        // Ensure currentSegment is valid
        const safeCurrentSegment = Math.floor(this.currentSegment) % totalSegments;
        const actualCurrentSegment = safeCurrentSegment < 0 ? safeCurrentSegment + totalSegments : safeCurrentSegment;
        
        const currentPoint = this.environment.roadPath[actualCurrentSegment];
        const nextSegment = (actualCurrentSegment + 1) % totalSegments;
        const nextPoint = this.environment.roadPath[nextSegment];
        
        // Interpolate position between segments
        const t = this.segmentProgress;
        const x = currentPoint.x + (nextPoint.x - currentPoint.x) * t;
        const y = currentPoint.y + (nextPoint.y - currentPoint.y) * t;
        const z = currentPoint.z + (nextPoint.z - currentPoint.z) * t;
        
        // Interpolate heading for smoother turns
        let headingDiff = nextPoint.heading - currentPoint.heading;
        // Handle wrap-around
        if (headingDiff > Math.PI) headingDiff -= 2 * Math.PI;
        if (headingDiff < -Math.PI) headingDiff += 2 * Math.PI;
        const interpolatedHeading = currentPoint.heading + headingDiff * t;
        
        // Calculate lane offset based on interpolated heading
        let laneOffset;
        if (this.inDetour) {
            // Use detour lane with wider offset to avoid construction
            laneOffset = this.detourSide === 'left' ? -5 : 5;
        } else {
            // Normal lane position
            laneOffset = this.lane === 'left' ? -3 : 3;
        }
        const perpX = Math.cos(interpolatedHeading) * laneOffset;
        const perpZ = -Math.sin(interpolatedHeading) * laneOffset;
        
        // Ensure car is placed at correct road elevation
        const roadElevation = y || 0;
        this.carGroup.position.set(x + perpX, roadElevation + 0.4, z + perpZ);
        
        // Calculate the car's facing direction based on movement
        // The car should look where it's going
        let facingAngle;
        
        if (this.direction === 1) {
            // Forward - calculate angle from current to next position
            const dx = nextPoint.x - currentPoint.x;
            const dz = nextPoint.z - currentPoint.z;
            facingAngle = Math.atan2(dx, dz);
        } else {
            // Backward - opposite direction
            const dx = currentPoint.x - nextPoint.x;
            const dz = currentPoint.z - nextPoint.z;
            facingAngle = Math.atan2(dx, dz);
        }
        
        this.carGroup.rotation.y = facingAngle;
    }
    
    update(deltaTime) {
        // Check for roadworks and adjust lane if needed
        this.checkForRoadworks();
        
        // Move along the road
        const segmentLength = 20; // Match environment segment length
        const distanceToMove = this.currentSpeed * deltaTime;
        const segmentsToMove = distanceToMove / segmentLength;
        
        this.segmentProgress += segmentsToMove * this.direction;
        
        // Handle segment transitions
        while (this.segmentProgress >= 1) {
            this.segmentProgress -= 1;
            this.currentSegment += 1;
        }
        
        while (this.segmentProgress < 0) {
            this.segmentProgress += 1;
            this.currentSegment -= 1;
        }
        
        // Wrap around properly
        const totalSegments = this.environment.roadPath.length;
        this.currentSegment = ((this.currentSegment % totalSegments) + totalSegments) % totalSegments;
        
        // Restore speed if slowed down
        if (this.currentSpeed < this.baseSpeed) {
            this.currentSpeed += 10 * deltaTime;
            if (this.currentSpeed > this.baseSpeed) {
                this.currentSpeed = this.baseSpeed;
            }
        }
        
        this.updatePosition();
    }
    
    temporarySlowdown() {
        this.currentSpeed = this.baseSpeed * 0.5;
    }
    
    checkCollision(playerPosition) {
        const dx = this.carGroup.position.x - playerPosition.x;
        const dy = this.carGroup.position.y - playerPosition.y;
        const dz = this.carGroup.position.z - playerPosition.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // More accurate collision detection considering actual vehicle sizes
        // Car is about 1.9 units wide, 4.2 units long
        // Motorcycle is much smaller, so reduce threshold
        const collisionThreshold = 2.2; // Reduced from 3.0 for more accurate collision
        return distance < collisionThreshold;
    }
    
    onCollision() {
        // Flash the car body red briefly on collision
        const originalColor = this.body.material.color.getHex();
        this.body.material.color.setHex(0xff0000);
        this.body.material.emissive = new THREE.Color(0xff0000);
        this.body.material.emissiveIntensity = 0.3;
        
        // Reset after a short delay
        setTimeout(() => {
            this.body.material.color.setHex(originalColor);
            this.body.material.emissive = new THREE.Color(0x000000);
            this.body.material.emissiveIntensity = 0;
        }, 200);
    }
    
    getDistanceToOtherCar(otherCar) {
        const dx = this.carGroup.position.x - otherCar.carGroup.position.x;
        const dz = this.carGroup.position.z - otherCar.carGroup.position.z;
        return Math.sqrt(dx * dx + dz * dz);
    }
    
    remove() {
        this.scene.remove(this.carGroup);
    }
    
    checkForRoadworks() {
        if (!this.environment.roadworksZones) return;
        
        const currentSegmentIndex = Math.floor(this.currentSegment);
        let inConstructionZone = false;
        
        // Check if we're approaching or in a construction zone
        for (const zone of this.environment.roadworksZones) {
            // Check if we're near a construction zone (5 segments before to 2 after)
            const approachDistance = this.direction === 1 ? 5 : -5;
            const exitDistance = this.direction === 1 ? 2 : -2;
            
            if (this.direction === 1) {
                // Moving forward
                if (currentSegmentIndex >= zone.startSegment - 5 && 
                    currentSegmentIndex <= zone.endSegment + 2) {
                    inConstructionZone = true;
                    
                    // If in right lane and construction blocks right lane, move to left
                    if (this.lane === 'right' && zone.blockedLane === 'right') {
                        this.enterDetour('left');
                    }
                }
            } else {
                // Moving backward
                if (currentSegmentIndex <= zone.endSegment + 5 && 
                    currentSegmentIndex >= zone.startSegment - 2) {
                    inConstructionZone = true;
                    
                    // If in lane that's blocked, detour
                    if (this.lane === zone.blockedLane) {
                        this.enterDetour(this.lane === 'right' ? 'left' : 'right');
                    }
                }
            }
        }
        
        // Exit detour if we're past the construction zone
        if (!inConstructionZone && this.inDetour) {
            this.exitDetour();
        }
    }
    
    enterDetour(newLane) {
        if (!this.inDetour) {
            this.inDetour = true;
            this.detourSide = newLane;
            console.log(`Car entering detour, moving from ${this.lane} to ${newLane} lane`);
            
            // Slow down when entering construction zone
            this.currentSpeed = Math.min(this.currentSpeed, this.baseSpeed * 0.6);
        }
    }
    
    exitDetour() {
        if (this.inDetour) {
            console.log(`Car exiting detour, returning to normal lane`);
            this.inDetour = false;
            this.detourSide = null;
        }
    }
}