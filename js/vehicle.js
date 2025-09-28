class Vehicle {
    constructor(scene) {
        this.scene = scene;
        
        // Physical properties
        this.position = new THREE.Vector3(0, 0, 0); // Will be adjusted to road height after environment loads
        this.velocity = new THREE.Vector3(0, 0, 0);
        
        // Vehicle parameters
        this.speed = 20; // m/s (starts at ~72 km/h)
        this.minSpeed = 5; // m/s (~18 km/h) - below this, bike falls
        this.maxSpeed = 50; // m/s (~180 km/h)
        this.acceleration = 12; // m/s²
        this.brakeForce = 15; // m/s²
        this.wheelbase = 1.4; // metres
        this.cgHeight = 0.6; // centre of gravity height
        this.mass = 200; // kg
        
        // State variables
        this.leanAngle = 0; // radians (positive = right lean)
        this.leanVelocity = 0;
        this.steeringAngle = 0;
        this.yawAngle = 0;
        this.crashed = false;
        this.crashAngle = 0;
        this.previousSpeed = 0;
        this.fallingOffCliff = false;
        this.hitGround = false;
        this.fallStartY = 0;
        this.groundHitLogged = false;
        
        // Distance tracking
        this.distanceTraveled = 0;
        this.lastPosition = new THREE.Vector3(0, 0, 0);

         // Physics tuning
        this.steeringForce = 8; // How much force steering creates
        this.leanDamping = 0.02; // Natural damping
        this.maxLeanAngle = Math.PI / 3; // 60 degrees before crash
        
        this.createMesh();
    }

    createMesh() {
        this.group = new THREE.Group();

        // Materials
        const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8, metalness: 0.1 });
        const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9, metalness: 0.0 });
        const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x0066cc, roughness: 0.2, metalness: 0.9 });
        const chromeMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.1, metalness: 0.95 });
        const plasticMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3, metalness: 0.1 });
        const riderMaterial = new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.8, metalness: 0.0 });
        const leatherMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9, metalness: 0.0 });

        // Rear wheel (rim + tire)
        const rimGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 16);
        const tireGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.15, 16);
        this.rearRim = new THREE.Mesh(rimGeometry, chromeMaterial);
        this.rearTire = new THREE.Mesh(tireGeometry, tireMaterial);
        this.rearRim.rotation.z = Math.PI / 2;
        this.rearTire.rotation.z = Math.PI / 2;
        this.rearRim.position.set(0, 0.3, -0.7);
        this.rearTire.position.set(0, 0.3, -0.7);
        this.rearRim.castShadow = true;
        this.rearTire.castShadow = true;
        this.rearRim.receiveShadow = true;
        this.rearTire.receiveShadow = true;

        // Front wheel (rim + tire)
        this.frontRim = new THREE.Mesh(rimGeometry, chromeMaterial);
        this.frontTire = new THREE.Mesh(tireGeometry, tireMaterial);
        this.frontRim.rotation.z = Math.PI / 2;
        this.frontTire.rotation.z = Math.PI / 2;
        this.frontRim.position.set(0, 0.3, 0.7);
        this.frontTire.position.set(0, 0.3, 0.7);
        this.frontRim.castShadow = true;
        this.frontTire.castShadow = true;
        this.frontRim.receiveShadow = true;
        this.frontTire.receiveShadow = true;

        // Main frame (more detailed)
        const mainFrameGeometry = new THREE.BoxGeometry(0.08, 0.6, 1.0);
        this.mainFrame = new THREE.Mesh(mainFrameGeometry, frameMaterial);
        this.mainFrame.position.set(0, 0.5, 0);
        this.mainFrame.castShadow = true;
        this.mainFrame.receiveShadow = true;

        // Engine block
        const engineGeometry = new THREE.BoxGeometry(0.25, 0.3, 0.4);
        this.engine = new THREE.Mesh(engineGeometry, plasticMaterial);
        this.engine.position.set(0, 0.4, -0.2);
        this.engine.castShadow = true;
        this.engine.receiveShadow = true;

        // Exhaust pipes
        const exhaustGeometry = new THREE.CylinderGeometry(0.03, 0.04, 0.8, 8);
        this.exhaust = new THREE.Mesh(exhaustGeometry, chromeMaterial);
        this.exhaust.position.set(-0.15, 0.2, -0.4);
        this.exhaust.rotation.z = Math.PI / 6;
        this.exhaust.castShadow = true;
        this.exhaust.receiveShadow = true;

        // Fuel tank
        const tankGeometry = new THREE.CylinderGeometry(0.15, 0.12, 0.3, 12);
        this.fuelTank = new THREE.Mesh(tankGeometry, frameMaterial);
        this.fuelTank.position.set(0, 0.7, -0.1);
        this.fuelTank.castShadow = true;
        this.fuelTank.receiveShadow = true;

        // Seat
        const seatGeometry = new THREE.BoxGeometry(0.25, 0.05, 0.4);
        this.seat = new THREE.Mesh(seatGeometry, leatherMaterial);
        this.seat.position.set(0, 0.75, -0.3);
        this.seat.castShadow = true;
        this.seat.receiveShadow = true;

        // Handlebars (more detailed)
        const handlebarGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8);
        this.handlebar = new THREE.Mesh(handlebarGeometry, chromeMaterial);
        this.handlebar.rotation.z = Math.PI / 2;
        this.handlebar.position.set(0, 0.95, 0.6);
        this.handlebar.castShadow = true;
        this.handlebar.receiveShadow = true;

        // Brake light (larger and more prominent)
        const brakeGeometry = new THREE.BoxGeometry(0.08, 0.06, 0.04);
        const brakeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x000000, emissiveIntensity: 0.0 });
        this.brakeLight = new THREE.Mesh(brakeGeometry, brakeMaterial);
        this.brakeLight.position.set(0, 0.8, -0.55);
        this.brakeLight.castShadow = true;
        this.brakeLight.receiveShadow = true;

        // Mirrors (more detailed)
        const mirrorBaseGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.1, 6);
        const mirrorGlassGeometry = new THREE.PlaneGeometry(0.08, 0.06);
        const mirrorGlassMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.0, metalness: 0.1 });

        this.leftMirrorBase = new THREE.Mesh(mirrorBaseGeometry, chromeMaterial);
        this.leftMirrorGlass = new THREE.Mesh(mirrorGlassGeometry, mirrorGlassMaterial);
        this.leftMirrorBase.position.set(-0.35, 1.05, 0.55);
        this.leftMirrorGlass.position.set(-0.35, 1.05, 0.58);
        this.leftMirrorGlass.rotation.y = Math.PI / 6;
        this.leftMirrorBase.castShadow = true;
        this.leftMirrorGlass.castShadow = true;

        this.rightMirrorBase = new THREE.Mesh(mirrorBaseGeometry, chromeMaterial);
        this.rightMirrorGlass = new THREE.Mesh(mirrorGlassGeometry, mirrorGlassMaterial);
        this.rightMirrorBase.position.set(0.35, 1.05, 0.55);
        this.rightMirrorGlass.position.set(0.35, 1.05, 0.58);
        this.rightMirrorGlass.rotation.y = -Math.PI / 6;
        this.rightMirrorBase.castShadow = true;
        this.rightMirrorGlass.castShadow = true;

        // Rider (more detailed)
        const torsoGeometry = new THREE.BoxGeometry(0.25, 0.4, 0.15);
        const armGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6);
        this.riderTorso = new THREE.Mesh(torsoGeometry, riderMaterial);
        this.riderTorso.position.set(0, 1.3, -0.1);
        this.riderTorso.castShadow = true;
        this.riderTorso.receiveShadow = true;

        // Arms
        this.leftArm = new THREE.Mesh(armGeometry, riderMaterial);
        this.leftArm.position.set(-0.2, 1.25, 0.1);
        this.leftArm.rotation.z = Math.PI / 4;
        this.leftArm.castShadow = true;
        this.leftArm.receiveShadow = true;

        this.rightArm = new THREE.Mesh(armGeometry, riderMaterial);
        this.rightArm.position.set(0.2, 1.25, 0.1);
        this.rightArm.rotation.z = -Math.PI / 4;
        this.rightArm.castShadow = true;
        this.rightArm.receiveShadow = true;

        // Legs (more detailed)
        const upperLegGeometry = new THREE.CylinderGeometry(0.06, 0.05, 0.25, 8);
        const lowerLegGeometry = new THREE.CylinderGeometry(0.05, 0.04, 0.25, 8);
        const bootGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.15);

        this.leftUpperLeg = new THREE.Mesh(upperLegGeometry, riderMaterial);
        this.leftLowerLeg = new THREE.Mesh(lowerLegGeometry, riderMaterial);
        this.leftBoot = new THREE.Mesh(bootGeometry, leatherMaterial);
        this.leftUpperLeg.position.set(-0.08, 0.9, -0.1);
        this.leftLowerLeg.position.set(-0.08, 0.65, -0.1);
        this.leftBoot.position.set(-0.08, 0.45, 0.05);
        this.leftUpperLeg.castShadow = true;
        this.leftLowerLeg.castShadow = true;
        this.leftBoot.castShadow = true;

        this.rightUpperLeg = new THREE.Mesh(upperLegGeometry, riderMaterial);
        this.rightLowerLeg = new THREE.Mesh(lowerLegGeometry, riderMaterial);
        this.rightBoot = new THREE.Mesh(bootGeometry, leatherMaterial);
        this.rightUpperLeg.position.set(0.08, 0.9, -0.1);
        this.rightLowerLeg.position.set(0.08, 0.65, -0.1);
        this.rightBoot.position.set(0.08, 0.45, 0.05);
        this.rightUpperLeg.castShadow = true;
        this.rightLowerLeg.castShadow = true;
        this.rightBoot.castShadow = true;

        // Helmet (more detailed)
        const helmetBaseGeometry = new THREE.SphereGeometry(0.14, 12, 8);
        const visorGeometry = new THREE.SphereGeometry(0.15, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        const helmetMaterial = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.9, metalness: 0.0 });
        const visorMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.7 });

        this.helmet = new THREE.Mesh(helmetBaseGeometry, helmetMaterial);
        this.visor = new THREE.Mesh(visorGeometry, visorMaterial);
        this.helmet.position.set(0, 1.45, -0.05);
        this.visor.position.set(0, 1.45, 0.02);
        this.visor.rotation.x = Math.PI / 6;
        this.helmet.castShadow = true;
        this.visor.castShadow = true;

        // Add all parts to the group
        this.group.add(this.rearRim);
        this.group.add(this.rearTire);
        this.group.add(this.frontRim);
        this.group.add(this.frontTire);
        this.group.add(this.mainFrame);
        this.group.add(this.engine);
        this.group.add(this.exhaust);
        this.group.add(this.fuelTank);
        this.group.add(this.seat);
        this.group.add(this.handlebar);
        this.group.add(this.brakeLight);
        this.group.add(this.leftMirrorBase);
        this.group.add(this.leftMirrorGlass);
        this.group.add(this.rightMirrorBase);
        this.group.add(this.rightMirrorGlass);
        this.group.add(this.riderTorso);
        this.group.add(this.leftArm);
        this.group.add(this.rightArm);
        this.group.add(this.leftUpperLeg);
        this.group.add(this.leftLowerLeg);
        this.group.add(this.leftBoot);
        this.group.add(this.rightUpperLeg);
        this.group.add(this.rightLowerLeg);
        this.group.add(this.rightBoot);
        this.group.add(this.helmet);
        this.group.add(this.visor);

        this.scene.add(this.group);
    }

    update(deltaTime, steeringInput, throttleInput, brakeInput) {
        // Track distance traveled (only when not crashed)
        if (!this.crashed && this.lastPosition) {
            const distanceDelta = this.position.distanceTo(this.lastPosition);
            this.distanceTraveled += distanceDelta;
        }
        this.lastPosition = this.position.clone();
        
        if (this.crashed) {
            // If falling off cliff, apply gravity and check ground collision
            if (this.fallingOffCliff) {
                // Apply gravity
                this.velocity.y -= 9.81 * deltaTime;
                
                // Update position
                this.position.x += this.velocity.x * deltaTime;
                this.position.y += this.velocity.y * deltaTime;
                this.position.z += this.velocity.z * deltaTime;
                
                // Check if hit ground (grass plane is at y = 0)
                const groundLevel = 0;
                if (this.position.y <= groundLevel) {
                    this.position.y = groundLevel;
                    this.velocity.set(0, 0, 0); // Stop all movement
                    this.speed = 0;
                    this.hitGround = true;
                    
                    if (!this.groundHitLogged) {
                        console.log('CRASHED! Hit the ground after falling', 
                            Math.abs(this.fallStartY - groundLevel).toFixed(1) + ' meters');
                        this.groundHitLogged = true;
                    }
                }
            } else {
                // Normal crash - sliding on road
                this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
                this.velocity.multiplyScalar(0.98); // Friction slows it down
            }
            
            this.speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
            this.updateMesh();
            return;
        }
        
        // Update speed based on throttle/brake
        this.updateSpeed(deltaTime, throttleInput, brakeInput);
        
        // Check for low-speed fall
        if (this.speed < this.minSpeed) {
            this.crashed = true;
            this.crashAngle = this.leanAngle || 0.5; // Fall to the side
            this.mainFrame.material.color.setHex(0xff6600); // Orange for low-speed fall
            console.log('CRASHED! Speed too low:', (this.speed * 2.237).toFixed(1) + ' mph');
        }
        
        // Check for boulder collisions
        if (this.environment && this.environment.boulders) {
            for (const boulder of this.environment.boulders) {
                const dx = this.position.x - boulder.position.x;
                const dy = this.position.y - boulder.position.y;
                const dz = this.position.z - boulder.position.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                
                // Check if we hit the boulder (account for bike size)
                if (distance < boulder.radius + 1.0) {
                    this.crashed = true;
                    this.crashAngle = this.leanAngle || 0.5;
                    this.mainFrame.material.color.setHex(0xff0000); // Red for collision
                    
                    // Set crash velocity based on impact
                    const impactForce = this.speed * 0.5;
                    const impactDir = new THREE.Vector3(dx, 0, dz).normalize();
                    this.velocity = impactDir.multiplyScalar(impactForce);
                    this.velocity.y = 2; // Small upward force
                    
                    console.log('CRASHED! Hit a boulder at', (this.speed * 2.237).toFixed(1) + ' mph');
                    break;
                }
            }
        }
        
        // Check for wall collision (simplified check based on distance from road center)
        if (this.environment && this.environment.roadPath) {
            // Find nearest road segment
            let nearestSegment = null;
            let minDist = Infinity;
            for (const segment of this.environment.roadPath) {
                const dist = Math.sqrt(
                    Math.pow(this.position.x - segment.x, 2) + 
                    Math.pow(this.position.z - segment.z, 2)
                );
                if (dist < minDist) {
                    minDist = dist;
                    nearestSegment = segment;
                }
            }
            
            if (nearestSegment) {
                // Calculate perpendicular distance from road center
                const perpX = Math.cos(nearestSegment.heading);
                const perpZ = -Math.sin(nearestSegment.heading);
                const toVehicle = new THREE.Vector3(
                    this.position.x - nearestSegment.x,
                    0,
                    this.position.z - nearestSegment.z
                );
                const lateralDist = toVehicle.x * perpX + toVehicle.z * perpZ;
                
                // Check if too close to walls (road is 16 units wide, walls at ~8 units)
                if (Math.abs(lateralDist) > 7.5) {
                    this.crashed = true;
                    this.crashAngle = this.leanAngle || 0.5;
                    this.mainFrame.material.color.setHex(0x8b4513); // Brown for wall hit
                    
                    // Bounce off wall
                    const bounceDir = new THREE.Vector3(perpX, 0, perpZ);
                    if (lateralDist < 0) bounceDir.multiplyScalar(-1);
                    this.velocity = bounceDir.multiplyScalar(this.speed * 0.3);
                    this.velocity.y = 1;
                    
                    console.log('CRASHED! Hit the cliff wall at', (this.speed * 2.237).toFixed(1) + ' mph');
                }
            }
        }
        
        // Update physics
        this.updatePhysics(deltaTime, steeringInput);
        
        // Check for crash from excessive lean
        if (Math.abs(this.leanAngle) > this.maxLeanAngle) {
            this.crashed = true;
            this.crashAngle = this.leanAngle;
            this.mainFrame.material.color.setHex(0xff0000); // Red for high-speed crash
            console.log('CRASHED! Lean angle exceeded:', (this.leanAngle * 180/Math.PI).toFixed(1) + '°');
        }
        
        // Update position
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyEuler(new THREE.Euler(0, this.yawAngle, 0));
        this.velocity.copy(forward.multiplyScalar(this.speed));
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Update elevation to follow road
        this.updateElevation();
        
        // Check for wall collision
        this.checkWallCollision();
        
        // Update 3D model
        this.updateMesh();
    }
    
    updateSpeed(deltaTime, throttleInput, brakeInput) {
        // Calculate road gradient effect
        let gradientForce = 0;
        if (this.environment && this.environment.roadPath) {
            // Find the road gradient by looking ahead and behind
            const lookDistance = 5; // meters
            let currentY = this.position.y;
            
            // Find point ahead
            const forward = new THREE.Vector3(0, 0, lookDistance);
            forward.applyEuler(new THREE.Euler(0, this.yawAngle, 0));
            const aheadPos = this.position.clone().add(forward);
            
            // Find elevation ahead
            let aheadY = currentY;
            let minDist = Infinity;
            this.environment.roadPath.forEach(segment => {
                const dist = Math.sqrt(
                    Math.pow(aheadPos.x - segment.x, 2) + 
                    Math.pow(aheadPos.z - segment.z, 2)
                );
                if (dist < minDist) {
                    minDist = dist;
                    aheadY = segment.y || 0;
                }
            });
            
            // Calculate gradient (rise over run)
            const gradient = (aheadY - currentY) / lookDistance;
            
            // Gravity component along the slope
            // Going uphill: negative force, going downhill: positive force
            gradientForce = -gradient * 9.81 * 0.3; // Scaled for gameplay
        }
        
        // Apply throttle
        if (throttleInput > 0) {
            this.speed += this.acceleration * throttleInput * deltaTime;
        }
        
        // Apply brakes
        if (brakeInput > 0) {
            this.speed -= this.brakeForce * brakeInput * deltaTime;
        }
        
        // Apply gradient force
        this.speed += gradientForce * deltaTime;
        
        // Air resistance (much reduced so you don't need constant throttle)
        const dragForce = 0.002 * this.speed * this.speed;
        this.speed -= dragForce * deltaTime;
        
        // Clamp speed
        this.speed = Math.max(0, Math.min(this.maxSpeed, this.speed));
    }

    updatePhysics(deltaTime, steeringInput) {
        // Steering visualization
        this.steeringAngle = steeringInput * 0.3;
        
        // Speed affects steering sensitivity (less sensitive at high speed)
        const speedFactor = Math.max(0.3, Math.min(1.0, 20 / this.speed));
        
        // THREE MAIN FORCES:
        
        // 1. STEERING TORQUE: Counter-steering effect (speed-dependent)
        // Higher speed = more gyroscopic stability = harder to lean
        // Higher lean = harder to lean further
        let steeringTorque = -steeringInput * this.steeringForce * speedFactor;
        steeringTorque *= (1 - Math.abs(this.leanAngle) / this.maxLeanAngle);
        
        // 2. GRAVITY TORQUE: Always tries to increase lean (destabilizing)
        // Once leaning, gravity pulls the bike further over
        const gravityTorque = Math.sin(this.leanAngle) * 3.0;
        
        // 3. CENTRIPETAL TORQUE: From turning (can be stabilizing or destabilizing)
        // When turning, centripetal force at ground creates moment around CG
        let centripetalTorque = 0;
        if (Math.abs(this.leanAngle) > 0.01) {
            // Calculate turn rate from lean angle
            const leanFactor = Math.tan(Math.abs(this.leanAngle));
            const turnRadius = Math.max(8, (this.speed * this.speed) / (9.81 * leanFactor));
            const turnRate = this.speed / turnRadius;
            
            // Centripetal force opposes lean only in steady-state turn
            // This creates the balance point
            centripetalTorque = -Math.sign(this.leanAngle) * turnRate * this.speed * 0.15;
        }
        
        // 4. GYROSCOPIC RESISTANCE: Higher speed = more stability
        const gyroResistance = this.leanVelocity * this.speed * 0.02;

        // 5. SELF-RIGHTING TORQUE: Bike naturally tries to return upright
        const selfRightingTorque = -this.leanAngle * 2.5;

        // Total torque is sum of all forces
        const totalTorque = steeringTorque + gravityTorque + centripetalTorque - gyroResistance + selfRightingTorque;
        
        // Update lean velocity with small damping to prevent oscillation
        this.leanVelocity += totalTorque * deltaTime;
        this.leanVelocity *= 0.99;
        
        // Update lean angle
        this.leanAngle += this.leanVelocity * deltaTime;
        
        // Turn based on lean angle - bike turns in direction of lean
        if (Math.abs(this.leanAngle) > 0.01) {
            // Realistic motorcycle turning physics
            // Turn radius = v²/(g*tan(lean_angle))
            // Simplified: larger radius for more realistic turning
            const leanFactor = Math.tan(Math.abs(this.leanAngle));
            const turnRadius = (this.speed * this.speed) / (9.81 * leanFactor);
            
            // Limit minimum turn radius to prevent unrealistic tight turns
            const minRadius = 8; // minimum 8 meter turn radius
            const actualRadius = Math.max(minRadius, turnRadius);
            
            const angularVel = this.speed / actualRadius;
            this.yawAngle -= angularVel * Math.sign(this.leanAngle) * deltaTime;
        }
        
        // Debug output
        if (!this.debugCounter) this.debugCounter = 0;
        this.debugCounter++;
        if (this.debugCounter % 30 === 0 && (Math.abs(steeringInput) > 0 || Math.abs(this.leanAngle) > 0.01)) {
            console.log(
                'Input:', steeringInput.toFixed(1),
                '| Steer:', (this.steeringAngle * 180/Math.PI).toFixed(0) + '°',
                '| Lean:', (this.leanAngle * 180/Math.PI).toFixed(1) + '°',
                '| LeanVel:', (this.leanVelocity * 180/Math.PI).toFixed(0) + '°/s'
            );
        }
    }

    updateMesh() {
        this.group.position.copy(this.position);
        this.group.rotation.y = this.yawAngle;

        if (this.crashed) {
            // Fall over animation
            this.group.rotation.z = this.crashAngle > 0 ? Math.PI/2 : -Math.PI/2;
            // Rider doesn't lean when crashed
            this.riderTorso.rotation.z = 0;
            this.leftArm.rotation.z = Math.PI / 4;
            this.rightArm.rotation.z = -Math.PI / 4;
        } else {
            // Normal lean
            this.group.rotation.z = this.leanAngle;
            // Rider leans subtly with the bike
            this.riderTorso.rotation.z = this.leanAngle * 0.15;
            this.leftArm.rotation.z = Math.PI / 4 + this.leanAngle * 0.1;
            this.rightArm.rotation.z = -Math.PI / 4 + this.leanAngle * 0.1;
        }

        // Rotate front wheels for steering visualization
        this.frontRim.rotation.y = this.steeringAngle * 0.5;
        this.frontTire.rotation.y = this.steeringAngle * 0.5;

        // Brake light glow
        if (this.speed < this.previousSpeed) {
            this.brakeLight.material.emissive.setHex(0x440000);
            this.brakeLight.material.emissiveIntensity = 0.5;
        } else {
            this.brakeLight.material.emissive.setHex(0x000000);
            this.brakeLight.material.emissiveIntensity = 0.0;
        }
        this.previousSpeed = this.speed;
    }

    reset() {
        // Find the starting road elevation
        let startY = 0;
        if (this.environment && this.environment.roadPath && this.environment.roadPath.length > 0) {
            startY = this.environment.roadPath[0].y || 0;
        }
        this.position.set(0, startY, 0);
        this.velocity.set(0, 0, 0);
        this.speed = 20; // Reset to starting speed
        this.leanAngle = 0;
        this.leanVelocity = 0;
        this.steeringAngle = 0;
        this.yawAngle = 0;
        this.crashed = false;
        this.crashAngle = 0;
        this.fallingOffCliff = false;
        this.hitGround = false;
        this.fallStartY = 0;
        this.groundHitLogged = false;
        this.distanceTraveled = 0;
        this.lastPosition = new THREE.Vector3(0, 0, 0);
        this.mainFrame.material.color.setHex(0x0066cc);
    }

    getSpeed() {
        return this.crashed ? 0 : this.speed * 2.237; // Convert m/s to mph
    }

    getLeanAngleDegrees() {
        return this.leanAngle * 180 / Math.PI;
    }

    getSteeringAngleDegrees() {
        return this.steeringAngle * 180 / Math.PI;
    }
    
    getDistanceTraveled() {
        return this.distanceTraveled; // in meters
    }
    
    getDistanceTraveledKm() {
        return this.distanceTraveled / 1000; // in kilometers
    }
    
    updateElevation() {
        // Find nearest road segments and interpolate between them
        if (this.environment && this.environment.roadPath) {
            // Find closest segment
            let closest = { segment: null, distance: Infinity };
            let closestIndex = -1;
            
            this.environment.roadPath.forEach((segment, index) => {
                const distance = Math.sqrt(
                    Math.pow(this.position.x - segment.x, 2) + 
                    Math.pow(this.position.z - segment.z, 2)
                );
                
                if (distance < closest.distance) {
                    closest = { segment, distance };
                    closestIndex = index;
                }
            });
            
            if (closest.segment && closest.segment.y !== undefined) {
                let targetY = closest.segment.y;
                
                // If we have adjacent segments, interpolate for smoother transitions
                if (closestIndex > 0 && closestIndex < this.environment.roadPath.length - 1) {
                    const prevSegment = this.environment.roadPath[closestIndex - 1];
                    const nextSegment = this.environment.roadPath[closestIndex + 1];
                    
                    // Simple linear interpolation based on position along the road
                    const distToPrev = Math.sqrt(
                        Math.pow(this.position.x - prevSegment.x, 2) + 
                        Math.pow(this.position.z - prevSegment.z, 2)
                    );
                    const distToNext = Math.sqrt(
                        Math.pow(this.position.x - nextSegment.x, 2) + 
                        Math.pow(this.position.z - nextSegment.z, 2)
                    );
                    
                    if (distToPrev < distToNext && prevSegment.y !== undefined) {
                        // Closer to previous segment - interpolate between prev and current
                        const totalDist = distToPrev + closest.distance;
                        const weight = closest.distance / totalDist;
                        targetY = prevSegment.y * weight + closest.segment.y * (1 - weight);
                    } else if (nextSegment.y !== undefined) {
                        // Closer to next segment - interpolate between current and next
                        const totalDist = closest.distance + distToNext;
                        const weight = distToNext / totalDist;
                        targetY = closest.segment.y * weight + nextSegment.y * (1 - weight);
                    }
                }
                
                // Smooth elevation following for extreme terrain - reduce bobbing
                this.position.y = this.position.y * 0.3 + targetY * 0.7;
            }
        }
    }
    
    checkWallCollision() {
        // Check if bike has gone off the road edges
        if (this.environment && this.environment.roadPath) {
            // Find nearest road segment
            let closestSegment = null;
            let minDistance = Infinity;
            
            this.environment.roadPath.forEach(segment => {
                const distance = Math.sqrt(
                    Math.pow(this.position.x - segment.x, 2) + 
                    Math.pow(this.position.z - segment.z, 2)
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestSegment = segment;
                }
            });
            
            if (closestSegment) {
                // Calculate perpendicular distance from road centerline
                const roadVector = new THREE.Vector3(
                    Math.sin(closestSegment.heading),
                    0,
                    Math.cos(closestSegment.heading)
                );
                
                const toVehicle = new THREE.Vector3(
                    this.position.x - closestSegment.x,
                    0,
                    this.position.z - closestSegment.z
                );
                
                // Cross product gives perpendicular distance
                const perpVector = new THREE.Vector3().crossVectors(roadVector, new THREE.Vector3(0, 1, 0));
                const perpDistance = toVehicle.dot(perpVector);
                
                const roadWidth = 8; // Half of total road width (16m)
                const wallBuffer = 7.5; // Slightly inside the actual road edge
                
                // Check if we've hit the right wall (positive perpDistance)
                if (perpDistance > wallBuffer) {
                    this.crashed = true;
                    this.crashAngle = -Math.PI/4; // Fall to the left after hitting right wall
                    this.frame.material.color.setHex(0xff00ff); // Magenta for wall crash
                    console.log('CRASHED! Hit the right wall at', (this.speed * 2.237).toFixed(1) + ' mph');
                    
                    // Bounce back slightly
                    this.velocity.x *= -0.5;
                    this.velocity.z *= -0.5;
                }
                
                // Check if we've gone off the left edge (negative perpDistance)
                if (perpDistance < -wallBuffer) {
                    this.crashed = true;
                    this.fallingOffCliff = true;
                    this.fallStartY = this.position.y;
                    this.groundHitLogged = false;
                    this.crashAngle = Math.PI/4; // Fall to the right after going off left edge
                    this.mainFrame.material.color.setHex(0x8B0000); // Dark red for falling off cliff
                    console.log('CRASHED! Fell off the left edge at', (this.speed * 2.237).toFixed(1) + ' mph');
                    
                    // Continue forward momentum but start falling
                    this.velocity.y = -5; // Start falling downward
                }
            }
        }
    }
}