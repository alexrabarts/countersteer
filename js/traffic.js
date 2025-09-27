class Traffic {
    constructor(scene, environment) {
        this.scene = scene;
        this.environment = environment;
        this.cars = [];
        this.maxCars = 12;
        this.carSpacing = 150; // Minimum distance between cars
        
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
        
        // Check spacing between cars and avoid collisions
        for (let i = 0; i < this.cars.length; i++) {
            for (let j = i + 1; j < this.cars.length; j++) {
                const car1 = this.cars[i];
                const car2 = this.cars[j];
                
                // Only check cars going same direction
                if (car1.direction === car2.direction) {
                    const distance = car1.getDistanceToOtherCar(car2);
                    if (distance < this.carSpacing && distance > 0) {
                        // Slow down the car behind
                        if (car1.currentSegment < car2.currentSegment) {
                            car1.temporarySlowdown();
                        } else {
                            car2.temporarySlowdown();
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
        this.color = options.color || 0xff0000;
        this.segmentProgress = 0;
        
        this.createCarModel();
        this.updatePosition();
    }
    
    createCarModel() {
        this.carGroup = new THREE.Group();
        
        // Car body with more rounded shape
        const bodyGeometry = new THREE.BoxGeometry(2, 1.2, 4.5);
        // Round the edges slightly
        bodyGeometry.translate(0, 0, 0);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: this.color,
            roughness: 0.3,
            metalness: 0.7
        });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.position.y = 0.6;
        this.body.castShadow = true;
        this.body.receiveShadow = true;
        this.carGroup.add(this.body);
        
        // Hood detail
        const hoodGeometry = new THREE.BoxGeometry(1.9, 0.1, 1.8);
        const hoodMaterial = new THREE.MeshStandardMaterial({ 
            color: this.color,
            roughness: 0.4,
            metalness: 0.6
        });
        const hood = new THREE.Mesh(hoodGeometry, hoodMaterial);
        hood.position.set(0, 1.1, 1.2);
        hood.rotation.x = -0.1;
        this.carGroup.add(hood);
        
        // Car roof with better shape
        const roofGeometry = new THREE.BoxGeometry(1.8, 0.7, 2.2);
        const roofMaterial = new THREE.MeshStandardMaterial({ 
            color: this.color,
            roughness: 0.35,
            metalness: 0.65
        });
        this.roof = new THREE.Mesh(roofGeometry, roofMaterial);
        this.roof.position.y = 1.4;
        this.roof.position.z = -0.2;
        this.roof.castShadow = true;
        this.roof.receiveShadow = true;
        this.carGroup.add(this.roof);
        
        // Windshield
        const windshieldGeometry = new THREE.BoxGeometry(1.7, 0.7, 0.1);
        const windshieldMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x446688,
            roughness: 0.05,
            metalness: 0.9,
            opacity: 0.6,
            transparent: true
        });
        const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
        windshield.position.y = 1.35;
        windshield.position.z = 0.85;
        windshield.rotation.x = -0.4;
        this.carGroup.add(windshield);
        
        // Rear window
        const rearWindowGeometry = new THREE.BoxGeometry(1.7, 0.6, 0.1);
        const rearWindow = new THREE.Mesh(rearWindowGeometry, windshieldMaterial);
        rearWindow.position.y = 1.35;
        rearWindow.position.z = -1.3;
        rearWindow.rotation.x = 0.35;
        this.carGroup.add(rearWindow);
        
        // Side windows
        const sideWindowGeometry = new THREE.BoxGeometry(0.05, 0.5, 1.8);
        const leftWindow = new THREE.Mesh(sideWindowGeometry, windshieldMaterial);
        leftWindow.position.set(0.95, 1.3, -0.2);
        this.carGroup.add(leftWindow);
        
        const rightWindow = new THREE.Mesh(sideWindowGeometry, windshieldMaterial);
        rightWindow.position.set(-0.95, 1.3, -0.2);
        this.carGroup.add(rightWindow);
        
        // Wheels with rims
        const wheelGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 16);
        const wheelMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a1a1a,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const rimGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.26, 8);
        const rimMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xaaaaaa,
            roughness: 0.3,
            metalness: 0.8
        });
        
        const wheelPositions = [
            { x: 0.95, z: 1.4 },
            { x: -0.95, z: 1.4 },
            { x: 0.95, z: -1.4 },
            { x: -0.95, z: -1.4 }
        ];
        
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(pos.x, 0.35, pos.z);
            wheel.castShadow = true;
            wheel.receiveShadow = true;
            this.carGroup.add(wheel);
            
            const rim = new THREE.Mesh(rimGeometry, rimMaterial);
            rim.rotation.z = Math.PI / 2;
            rim.position.set(pos.x * 1.01, 0.35, pos.z);
            this.carGroup.add(rim);
        });
        
        // Headlights
        const headlightGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.1);
        const headlightMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffcc,
            emissive: 0xffffcc,
            emissiveIntensity: 0.3,
            roughness: 0.1,
            metalness: 0.8
        });
        
        const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        leftHeadlight.position.set(0.6, 0.6, 2.3);
        this.carGroup.add(leftHeadlight);
        
        const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        rightHeadlight.position.set(-0.6, 0.6, 2.3);
        this.carGroup.add(rightHeadlight);
        
        // Tail lights
        const taillightMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.2,
            roughness: 0.1,
            metalness: 0.8
        });
        
        const leftTaillight = new THREE.Mesh(headlightGeometry, taillightMaterial);
        leftTaillight.position.set(0.6, 0.6, -2.3);
        this.carGroup.add(leftTaillight);
        
        const rightTaillight = new THREE.Mesh(headlightGeometry, taillightMaterial);
        rightTaillight.position.set(-0.6, 0.6, -2.3);
        this.carGroup.add(rightTaillight);
        
        this.scene.add(this.carGroup);
    }
    
    updatePosition() {
        const totalSegments = this.environment.roadPath.length;
        
        // Wrap around if needed
        if (this.currentSegment >= totalSegments) {
            this.currentSegment = 0;
        } else if (this.currentSegment < 0) {
            this.currentSegment = totalSegments - 1;
        }
        
        const currentPoint = this.environment.roadPath[Math.floor(this.currentSegment)];
        const nextSegment = (Math.floor(this.currentSegment) + 1) % totalSegments;
        const nextPoint = this.environment.roadPath[nextSegment];
        
        // Get interpolation value
        const t = this.segmentProgress;
        
        // Interpolate position between segments
        const x = currentPoint.x + (nextPoint.x - currentPoint.x) * t;
        const y = (currentPoint.y || 0) + ((nextPoint.y || 0) - (currentPoint.y || 0)) * t;
        const z = currentPoint.z + (nextPoint.z - currentPoint.z) * t;
        
        // Use current point heading (simpler and more stable)
        const interpolatedHeading = currentPoint.heading;
        
        // Calculate lane offset based on interpolated heading
        const laneOffset = this.lane === 'left' ? -3 : 3;
        const perpX = Math.cos(interpolatedHeading) * laneOffset;
        const perpZ = -Math.sin(interpolatedHeading) * laneOffset;
        
        // Set car position with slight elevation above road
        this.carGroup.position.set(x + perpX, y + 0.5, z + perpZ);
        
        // Set rotation to match road direction using interpolated heading
        // Car model faces +Z in local space (headlights at +Z)
        // Road heading: 0 = north (+Z), increases clockwise (turning right)
        // Three.js Y rotation: positive = counterclockwise when viewed from above
        
        if (this.direction === 1) {
            // Forward direction - car should face along road heading
            // Road heading 0 = +Z, car faces +Z, so rotate by -heading
            this.carGroup.rotation.y = -interpolatedHeading;
        } else {
            // Opposite direction - car should face opposite to road heading
            // Add PI to face backwards
            this.carGroup.rotation.y = -interpolatedHeading + Math.PI;
        }
    }
    
    update(deltaTime) {
        // Move along the road
        const segmentLength = 20; // Match environment segment length
        const distanceToMove = this.currentSpeed * deltaTime;
        const segmentsToMove = distanceToMove / segmentLength;
        
        // Update progress based on direction
        if (this.direction === 1) {
            this.segmentProgress += segmentsToMove;
        } else {
            this.segmentProgress -= segmentsToMove;
        }
        
        while (this.segmentProgress >= 1) {
            this.segmentProgress -= 1;
            this.currentSegment += 1;
        }
        
        while (this.segmentProgress < 0) {
            this.segmentProgress += 1;
            this.currentSegment -= 1;
        }
        
        // Wrap around
        const totalSegments = this.environment.roadPath.length;
        if (this.currentSegment >= totalSegments) {
            this.currentSegment -= totalSegments;
        } else if (this.currentSegment < 0) {
            this.currentSegment += totalSegments;
        }
        
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
        
        // More accurate collision detection considering car size
        const collisionThreshold = 2.5; // Car is about 2m wide, 4.5m long
        return distance < collisionThreshold;
    }
    
    getDistanceToOtherCar(otherCar) {
        const dx = this.carGroup.position.x - otherCar.carGroup.position.x;
        const dz = this.carGroup.position.z - otherCar.carGroup.position.z;
        return Math.sqrt(dx * dx + dz * dz);
    }
    
    remove() {
        this.scene.remove(this.carGroup);
    }
}