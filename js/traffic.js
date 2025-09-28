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
        this.color = options.color || 0xff0000;
        this.segmentProgress = 0;
        
        this.createCarModel();
        this.updatePosition();
    }
    
    createCarModel() {
        this.carGroup = new THREE.Group();
        
        // Main car body using a more detailed shape with beveled edges
        const shape = new THREE.Shape();
        const width = 1;
        const length = 2.25;
        shape.moveTo(-width, -length);
        shape.lineTo(width, -length);
        shape.lineTo(width, length);
        shape.lineTo(-width, length);
        shape.closePath();
        
        const extrudeSettings = {
            depth: 1.2,
            bevelEnabled: true,
            bevelThickness: 0.1,
            bevelSize: 0.1,
            bevelSegments: 3
        };
        
        const bodyGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        bodyGeometry.rotateX(Math.PI / 2);
        bodyGeometry.translate(0, 0.6, 0);
        
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: this.color,
            roughness: 0.3,
            metalness: 0.7
        });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.castShadow = true;
        this.body.receiveShadow = true;
        this.carGroup.add(this.body);
        
        // Hood with curved surface using a more detailed geometry
        const hoodShape = new THREE.Shape();
        hoodShape.moveTo(-0.95, -0.9);
        hoodShape.quadraticCurveTo(0, -1, 0.95, -0.9);
        hoodShape.lineTo(0.95, 0.9);
        hoodShape.quadraticCurveTo(0, 0.8, -0.95, 0.9);
        hoodShape.closePath();
        
        const hoodGeometry = new THREE.ExtrudeGeometry(hoodShape, {
            depth: 0.15,
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.02,
            bevelSegments: 2
        });
        hoodGeometry.rotateX(Math.PI / 2);
        
        const hoodMaterial = new THREE.MeshStandardMaterial({ 
            color: this.color,
            roughness: 0.4,
            metalness: 0.6
        });
        const hood = new THREE.Mesh(hoodGeometry, hoodMaterial);
        hood.position.set(0, 1.25, 1.2);
        hood.rotation.x = -0.05;
        this.carGroup.add(hood);
        
        // Car roof with curved top using sphere geometry for smoother shape
        const roofGeometry = new THREE.SphereGeometry(1.5, 12, 8, 0, Math.PI, 0, Math.PI/2);
        roofGeometry.scale(0.65, 0.5, 0.9);
        const roofMaterial = new THREE.MeshStandardMaterial({ 
            color: this.color,
            roughness: 0.35,
            metalness: 0.65,
            side: THREE.DoubleSide
        });
        this.roof = new THREE.Mesh(roofGeometry, roofMaterial);
        this.roof.position.y = 1.3;
        this.roof.position.z = -0.2;
        this.roof.castShadow = true;
        this.roof.receiveShadow = true;
        this.carGroup.add(this.roof);
        
        // Add roof pillars for more detail
        const pillarGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.8, 8);
        const pillarMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2a2a2a,
            roughness: 0.8,
            metalness: 0.3
        });
        
        // A-pillars (front)
        const leftAPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        leftAPillar.position.set(0.85, 1.0, 0.8);
        leftAPillar.rotation.z = 0.1;
        leftAPillar.rotation.x = -0.3;
        this.carGroup.add(leftAPillar);
        
        const rightAPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        rightAPillar.position.set(-0.85, 1.0, 0.8);
        rightAPillar.rotation.z = -0.1;
        rightAPillar.rotation.x = -0.3;
        this.carGroup.add(rightAPillar);
        
        // C-pillars (rear)
        const leftCPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        leftCPillar.position.set(0.85, 1.0, -1.2);
        leftCPillar.rotation.z = 0.1;
        leftCPillar.rotation.x = 0.3;
        this.carGroup.add(leftCPillar);
        
        const rightCPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        rightCPillar.position.set(-0.85, 1.0, -1.2);
        rightCPillar.rotation.z = -0.1;
        rightCPillar.rotation.x = 0.3;
        this.carGroup.add(rightCPillar);
        
        // Windshield with curved shape
        const windshieldShape = new THREE.Shape();
        windshieldShape.moveTo(-0.85, -0.35);
        windshieldShape.quadraticCurveTo(0, -0.4, 0.85, -0.35);
        windshieldShape.lineTo(0.85, 0.35);
        windshieldShape.lineTo(-0.85, 0.35);
        windshieldShape.closePath();
        
        const windshieldGeometry = new THREE.ExtrudeGeometry(windshieldShape, {
            depth: 0.05,
            bevelEnabled: true,
            bevelThickness: 0.01,
            bevelSize: 0.01,
            bevelSegments: 1
        });
        
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
        
        // Rear window with curved shape
        const rearWindowGeometry = windshieldGeometry.clone();
        rearWindowGeometry.scale(0.95, 0.85, 1);
        const rearWindow = new THREE.Mesh(rearWindowGeometry, windshieldMaterial);
        rearWindow.position.y = 1.35;
        rearWindow.position.z = -1.3;
        rearWindow.rotation.x = 0.35;
        this.carGroup.add(rearWindow);
        
        // Side windows with proper frames
        const sideWindowShape = new THREE.Shape();
        sideWindowShape.moveTo(0, 0);
        sideWindowShape.lineTo(0, 0.45);
        sideWindowShape.quadraticCurveTo(0.6, 0.5, 1.2, 0.45);
        sideWindowShape.lineTo(1.6, 0.35);
        sideWindowShape.lineTo(1.6, 0);
        sideWindowShape.closePath();
        
        const sideWindowGeometry = new THREE.ExtrudeGeometry(sideWindowShape, {
            depth: 0.03,
            bevelEnabled: false
        });
        
        const leftWindow = new THREE.Mesh(sideWindowGeometry, windshieldMaterial);
        leftWindow.position.set(0.92, 1.05, -0.8);
        leftWindow.rotation.y = Math.PI/2;
        this.carGroup.add(leftWindow);
        
        const rightWindow = new THREE.Mesh(sideWindowGeometry, windshieldMaterial);
        rightWindow.position.set(-0.92, 1.05, -0.8);
        rightWindow.rotation.y = -Math.PI/2;
        this.carGroup.add(rightWindow);
        
        // Wheels with detailed rims and tire treads
        const wheelGroup = new THREE.Group();
        
        // Tire geometry with tread pattern
        const tireGeometry = new THREE.TorusGeometry(0.35, 0.12, 8, 24);
        const tireMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a1a1a,
            roughness: 0.95,
            metalness: 0.05
        });
        
        // Rim with spokes
        const rimOuterGeometry = new THREE.CylinderGeometry(0.23, 0.23, 0.15, 32);
        const rimInnerGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.16, 16);
        const rimMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xcccccc,
            roughness: 0.2,
            metalness: 0.9
        });
        
        // Spoke geometry
        const spokeGeometry = new THREE.BoxGeometry(0.03, 0.16, 0.18);
        const spokeMaterial = new THREE.MeshStandardMaterial({
            color: 0xbbbbbb,
            roughness: 0.25,
            metalness: 0.85
        });
        
        const wheelPositions = [
            { x: 0.95, z: 1.4 },
            { x: -0.95, z: 1.4 },
            { x: 0.95, z: -1.4 },
            { x: -0.95, z: -1.4 }
        ];
        
        wheelPositions.forEach(pos => {
            const wheelAssembly = new THREE.Group();
            
            // Tire
            const tire = new THREE.Mesh(tireGeometry, tireMaterial);
            tire.rotation.y = Math.PI / 2;
            wheelAssembly.add(tire);
            
            // Outer rim
            const rimOuter = new THREE.Mesh(rimOuterGeometry, rimMaterial);
            rimOuter.rotation.z = Math.PI / 2;
            wheelAssembly.add(rimOuter);
            
            // Inner rim hub
            const rimInner = new THREE.Mesh(rimInnerGeometry, rimMaterial);
            rimInner.rotation.z = Math.PI / 2;
            wheelAssembly.add(rimInner);
            
            // Add 5 spokes
            for (let i = 0; i < 5; i++) {
                const spoke = new THREE.Mesh(spokeGeometry, spokeMaterial);
                spoke.rotation.z = Math.PI / 2;
                spoke.rotation.y = (i * Math.PI * 2) / 5;
                wheelAssembly.add(spoke);
            }
            
            // Add brake disc behind wheel
            const brakeDiscGeometry = new THREE.RingGeometry(0.08, 0.18, 32);
            const brakeDiscMaterial = new THREE.MeshStandardMaterial({
                color: 0x666666,
                roughness: 0.7,
                metalness: 0.6,
                side: THREE.DoubleSide
            });
            const brakeDisc = new THREE.Mesh(brakeDiscGeometry, brakeDiscMaterial);
            brakeDisc.rotation.y = Math.PI / 2;
            brakeDisc.position.x = pos.x > 0 ? -0.08 : 0.08;
            wheelAssembly.add(brakeDisc);
            
            wheelAssembly.position.set(pos.x, 0.35, pos.z);
            wheelAssembly.castShadow = true;
            wheelAssembly.receiveShadow = true;
            this.carGroup.add(wheelAssembly);
        });
        
        // Headlights with reflector housing
        const headlightHousingGeometry = new THREE.CylinderGeometry(0.18, 0.22, 0.15, 16);
        const headlightHousingMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.3
        });
        
        const headlightLensGeometry = new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const headlightLensMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            emissive: 0xffffcc,
            emissiveIntensity: 0.4,
            roughness: 0.05,
            metalness: 0.1,
            opacity: 0.9,
            transparent: true
        });
        
        // Left headlight
        const leftHeadlightGroup = new THREE.Group();
        const leftHousing = new THREE.Mesh(headlightHousingGeometry, headlightHousingMaterial);
        leftHousing.rotation.z = Math.PI / 2;
        leftHeadlightGroup.add(leftHousing);
        const leftLens = new THREE.Mesh(headlightLensGeometry, headlightLensMaterial);
        leftLens.rotation.z = -Math.PI / 2;
        leftLens.position.z = 0.05;
        leftHeadlightGroup.add(leftLens);
        leftHeadlightGroup.position.set(0.65, 0.6, 2.25);
        this.carGroup.add(leftHeadlightGroup);
        
        // Right headlight
        const rightHeadlightGroup = new THREE.Group();
        const rightHousing = new THREE.Mesh(headlightHousingGeometry, headlightHousingMaterial);
        rightHousing.rotation.z = Math.PI / 2;
        rightHeadlightGroup.add(rightHousing);
        const rightLens = new THREE.Mesh(headlightLensGeometry, headlightLensMaterial);
        rightLens.rotation.z = -Math.PI / 2;
        rightLens.position.z = 0.05;
        rightHeadlightGroup.add(rightLens);
        rightHeadlightGroup.position.set(-0.65, 0.6, 2.25);
        this.carGroup.add(rightHeadlightGroup);
        
        // Tail lights with detailed housing
        const taillightGeometry = new THREE.BoxGeometry(0.35, 0.25, 0.08);
        const taillightMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xcc0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.25,
            roughness: 0.15,
            metalness: 0.1,
            opacity: 0.85,
            transparent: true
        });
        
        const leftTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
        leftTaillight.position.set(0.7, 0.65, -2.28);
        this.carGroup.add(leftTaillight);
        
        const rightTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
        rightTaillight.position.set(-0.7, 0.65, -2.28);
        this.carGroup.add(rightTaillight);
        
        // Add brake light strip
        const brakeLightGeometry = new THREE.BoxGeometry(0.8, 0.08, 0.05);
        const brakeLightMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.3,
            roughness: 0.2,
            metalness: 0.1
        });
        const brakeLight = new THREE.Mesh(brakeLightGeometry, brakeLightMaterial);
        brakeLight.position.set(0, 1.5, -1.4);
        this.carGroup.add(brakeLight);
        
        // Add side mirrors
        const mirrorGeometry = new THREE.BoxGeometry(0.12, 0.08, 0.15);
        const mirrorMaterial = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.3,
            metalness: 0.7
        });
        
        const leftMirror = new THREE.Mesh(mirrorGeometry, mirrorMaterial);
        leftMirror.position.set(1.05, 1.1, 0.3);
        this.carGroup.add(leftMirror);
        
        const rightMirror = new THREE.Mesh(mirrorGeometry, mirrorMaterial);
        rightMirror.position.set(-1.05, 1.1, 0.3);
        this.carGroup.add(rightMirror);
        
        // Add door handles
        const handleGeometry = new THREE.BoxGeometry(0.15, 0.03, 0.05);
        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.3,
            metalness: 0.8
        });
        
        // Front door handles
        const leftFrontHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        leftFrontHandle.position.set(1.0, 0.85, 0.2);
        this.carGroup.add(leftFrontHandle);
        
        const rightFrontHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        rightFrontHandle.position.set(-1.0, 0.85, 0.2);
        this.carGroup.add(rightFrontHandle);
        
        // Rear door handles
        const leftRearHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        leftRearHandle.position.set(1.0, 0.85, -0.8);
        this.carGroup.add(leftRearHandle);
        
        const rightRearHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        rightRearHandle.position.set(-1.0, 0.85, -0.8);
        this.carGroup.add(rightRearHandle);
        
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
        const laneOffset = this.lane === 'left' ? -3 : 3;
        const perpX = Math.cos(interpolatedHeading) * laneOffset;
        const perpZ = -Math.sin(interpolatedHeading) * laneOffset;
        
        this.carGroup.position.set(x + perpX, y + 0.2, z + perpZ);
        
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
        // Move along the road
        const segmentLength = 20; // Match environment segment length
        const distanceToMove = this.currentSpeed * deltaTime;
        const segmentsToMove = distanceToMove / segmentLength;
        
        this.segmentProgress += segmentsToMove * this.direction;
        
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
        const collisionThreshold = 3.0; // Slightly larger for better detection
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
}