class Vehicle {
    constructor(scene, onWheelieScore = null) {
        this.scene = scene;
        this.onWheelieScore = onWheelieScore;
        
        // Physical properties
        this.position = new THREE.Vector3(0, 0, 0); // Will be adjusted to road height after environment loads
        this.velocity = new THREE.Vector3(0, 0, 0);
        
        // Vehicle parameters
        this.speed = 20; // m/s (starts at ~72 km/h)
        this.minSpeed = 5; // m/s (~18 km/h) - below this, bike falls
        this.maxSpeed = 60; // m/s (~216 km/h)
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
        
        // Jump state
        this.isJumping = false;
        this.jumpVelocityY = 0;
        this.jumpStartHeight = 0;
        this.jumpRotation = 0;

        // Wheelie state
        this.isWheelie = false;
        this.wheelieAngle = 0;
        this.wheelieVelocity = 0;
        this.wheelieDamping = 0.15; // High damping for challenging wheelies
        this.wheelieStartTime = 0;
        this.wheelieScoreAccumulated = 0;
        
        // Advanced wheelie balance system
        this.wheelieBalance = 0; // -1 to 1, 0 is perfectly balanced
        this.wheelieOptimalAngle = Math.PI / 6; // 30 degrees - sweet spot
        this.wheelieDangerAngle = Math.PI / 3; // 60 degrees - danger zone
        this.wheelieCrashAngle = Math.PI * 0.45; // 81 degrees - too far!
        this.wheelieLastInputTime = 0;
        this.wheelieCombo = 0; // Combo multiplier for perfect balance
        this.wheeliePerfectFrames = 0; // Count frames in perfect zone
        
        // Distance tracking
        this.distanceTraveled = 0;
        this.lastPosition = new THREE.Vector3(0, 0, 0);

        // Road following tracking
        this.currentRoadSegment = 0; // Index of current road segment we're following
        this.segmentProgress = 0; // Progress along current segment (0-1)

        // Road boundary state tracking for hysteresis
        this.wasNearEdge = false; // Prevents oscillating between edge states
        this.lastPerpDistance = 0; // For hysteresis calculations

         // Physics tuning
        this.steeringForce = 8; // How much force steering creates
        this.leanDamping = 0.02; // Natural damping
        this.maxLeanAngle = Math.PI / 3; // 60 degrees before crash
        
        this.createMesh();
    }

    createMesh() {
        this.group = new THREE.Group();
        
        // Rear wheel
        const rearWheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.15, 16);
        const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7, metalness: 0.0 });
        this.rearWheel = new THREE.Mesh(rearWheelGeometry, wheelMaterial);
        this.rearWheel.rotation.z = Math.PI / 2;
        this.rearWheel.position.set(0, 0.3, -0.7);
        this.rearWheel.castShadow = true;
        this.rearWheel.receiveShadow = true;

        // Front wheel
        this.frontWheel = new THREE.Mesh(rearWheelGeometry, wheelMaterial);
        this.frontWheel.rotation.z = Math.PI / 2;
        this.frontWheel.position.set(0, 0.3, 0.7);
        this.frontWheel.castShadow = true;
        this.frontWheel.receiveShadow = true;

        // Frame
        const frameGeometry = new THREE.BoxGeometry(0.1, 0.8, 1.2);
        const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x0066cc, roughness: 0.3, metalness: 0.8 });
        this.frame = new THREE.Mesh(frameGeometry, frameMaterial);
        this.frame.position.set(0, 0.6, 0);
        this.frame.castShadow = true;
        this.frame.receiveShadow = true;

        // Brake light
        const brakeGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
        const brakeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x000000, emissiveIntensity: 0.0 });
        this.brakeLight = new THREE.Mesh(brakeGeometry, brakeMaterial);
        this.brakeLight.position.set(0, 0.8, -0.6);
        this.brakeLight.castShadow = true;
        this.brakeLight.receiveShadow = true;

        // Handlebars
        const handlebarGeometry = new THREE.BoxGeometry(0.6, 0.05, 0.05);
        const handlebarMaterial = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.4, metalness: 0.9 });
        this.handlebar = new THREE.Mesh(handlebarGeometry, handlebarMaterial);
        this.handlebar.position.set(0, 1.0, 0.6);
        this.handlebar.castShadow = true;
        this.handlebar.receiveShadow = true;

        // Mirrors
        const mirrorGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.05);
        const mirrorMaterial = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.1, metalness: 0.9 });
        this.leftMirror = new THREE.Mesh(mirrorGeometry, mirrorMaterial);
        this.leftMirror.position.set(-0.4, 1.1, 0.5);
        this.leftMirror.castShadow = true;
        this.leftMirror.receiveShadow = true;
        this.rightMirror = new THREE.Mesh(mirrorGeometry, mirrorMaterial);
        this.rightMirror.position.set(0.4, 1.1, 0.5);
        this.rightMirror.castShadow = true;
        this.rightMirror.receiveShadow = true;

        // Rider
        const riderGeometry = new THREE.BoxGeometry(0.3, 0.6, 0.2);
        const riderMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.8, metalness: 0.0 });
        this.rider = new THREE.Mesh(riderGeometry, riderMaterial);
        this.rider.position.set(0, 1.2, 0);
        this.rider.castShadow = true;
        this.rider.receiveShadow = true;

        // Legs
        const legGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8);
        const legMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff, roughness: 0.8, metalness: 0.0 });
        this.leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.leftLeg.position.set(-0.1, -0.5, 0);
        this.leftLeg.castShadow = true;
        this.leftLeg.receiveShadow = true;
        this.rider.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.rightLeg.position.set(0.1, -0.5, 0);
        this.rightLeg.castShadow = true;
        this.rightLeg.receiveShadow = true;
        this.rider.add(this.rightLeg);

        // Helmet
        const helmetGeometry = new THREE.SphereGeometry(0.15, 8, 6);
        const helmetMaterial = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.9, metalness: 0.0 });
        this.helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
        this.helmet.position.set(0, 0.25, 0);
        this.helmet.castShadow = true;
        this.helmet.receiveShadow = true;
        this.rider.add(this.helmet);

        this.group.add(this.rearWheel);
        this.group.add(this.frontWheel);
        this.group.add(this.frame);
        this.group.add(this.handlebar);
        this.group.add(this.rider);
        this.group.add(this.brakeLight);
        this.group.add(this.leftMirror);
        this.group.add(this.rightMirror);
        
        this.scene.add(this.group);
    }

    update(deltaTime, steeringInput, throttleInput, brakeInput, wheelieInput = 0) {
        // Store brake input for use in updateMesh
        this.currentBrakeInput = brakeInput;
        
        // Track distance traveled (only when not crashed)
        if (!this.crashed && this.lastPosition) {
            const distanceDelta = this.position.distanceTo(this.lastPosition);
            this.distanceTraveled += distanceDelta;

            // Update road segment tracking based on Z-distance traveled
            if (this.environment && this.environment.roadPath && this.environment.roadPath.length > 1) {
                const zDelta = this.position.z - this.lastPosition.z;
                if (Math.abs(zDelta) > 0.01) { // Only update if actually moving
                    this.segmentProgress += zDelta / 20; // Segment length is 20 units

                    // Handle segment transitions
                    while (this.segmentProgress >= 1 && this.currentRoadSegment < this.environment.roadPath.length - 1) {
                        this.segmentProgress -= 1;
                        this.currentRoadSegment++;
                    }
                    while (this.segmentProgress < 0 && this.currentRoadSegment > 0) {
                        this.segmentProgress += 1;
                        this.currentRoadSegment--;
                    }

                    // Clamp to valid range
                    this.currentRoadSegment = Math.max(0, Math.min(this.environment.roadPath.length - 1, this.currentRoadSegment));
                    this.segmentProgress = Math.max(0, Math.min(1, this.segmentProgress));
                }
            }
        }
        this.lastPosition = this.position.clone();
        
        // Check for wall/edge collision FIRST (even when crashed, in case we need to fall)
        if (!this.fallingOffCliff) {
            this.checkWallCollision();
        }
        
        if (this.crashed) {
            // If falling off cliff, apply gravity and check ground collision
            if (this.fallingOffCliff) {
                // console.log('FALLING: Y=' + this.position.y.toFixed(1) + ' VelY=' + this.velocity.y.toFixed(1));
                // Apply stronger gravity for dramatic falling
                this.velocity.y -= 15 * deltaTime;

                // Add air resistance (proportional to velocity squared)
                const airResistance = 0.1 * Math.abs(this.velocity.y) * this.velocity.y * deltaTime;
                if (this.velocity.y < 0) {
                    this.velocity.y += airResistance; // Slow down falling speed
                }

                // Apply air resistance to horizontal movement too
                const horizontalSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
                if (horizontalSpeed > 0.1) {
                    const dragFactor = 1 - (0.05 * horizontalSpeed * deltaTime);
                    this.velocity.x *= Math.max(dragFactor, 0.9);
                    this.velocity.z *= Math.max(dragFactor, 0.9);
                }

                // Update position
                this.position.x += this.velocity.x * deltaTime;
                this.position.y += this.velocity.y * deltaTime;
                this.position.z += this.velocity.z * deltaTime;



                // Check terrain collision - sample terrain height at current position
                const terrainHeight = this.getTerrainHeightAt(this.position.x, this.position.z);
                
                // Check if hit terrain or lake
                if (this.position.y <= terrainHeight + 0.5) {
                    // Hit the terrain/slope
                    this.position.y = terrainHeight + 0.5; // Place bike on terrain
                    
                    // Calculate slope normal to determine slide direction
                    const slopeNormal = this.calculateSlopeNormal(this.position.x, this.position.z);
                    
                    // If on a steep slope, slide down it
                    const slopeAngle = Math.acos(slopeNormal.y);
                    const slopeDegrees = slopeAngle * 180 / Math.PI;
                    
                    if (slopeDegrees > 30) { // Steep slope - keep sliding
                        // Project velocity onto slope
                        const slideDirection = new THREE.Vector3(slopeNormal.x, 0, slopeNormal.z).normalize();
                        const slideSpeed = Math.max(5, this.speed * 0.7); // Maintain some sliding speed
                        
                        this.velocity.x = slideDirection.x * slideSpeed;
                        this.velocity.z = slideDirection.z * slideSpeed;
                        this.velocity.y = -Math.tan(slopeAngle) * slideSpeed * 0.5; // Slide downward
                        
                        // Apply friction
                        this.velocity.multiplyScalar(0.98);
                    } else {
                        // Gentle slope or flat - stop
                        this.velocity.multiplyScalar(0.85); // Quick stop
                        if (this.velocity.length() < 0.5) {
                            this.velocity.set(0, 0, 0);
                            this.speed = 0;
                            this.hitGround = true;
                        }
                    }

                    if (!this.groundHitLogged && this.hitGround) {
                        console.log('CRASHED! Hit the terrain after falling',
                            Math.abs(this.fallStartY - terrainHeight).toFixed(1) + ' meters');
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

        // Update wheelie physics
        this.updateWheelie(deltaTime, throttleInput, brakeInput, wheelieInput, this.onWheelieScore);

        // Check for jump ramps
        if (!this.isJumping && this.environment && this.environment.jumpRamps) {
            for (const ramp of this.environment.jumpRamps) {
                const dx = this.position.x - ramp.position.x;
                const dz = this.position.z - ramp.position.z;
                
                // Rotate to ramp's local space
                const cos = Math.cos(-ramp.rotation);
                const sin = Math.sin(-ramp.rotation);
                const localX = dx * cos - dz * sin;
                const localZ = dx * sin + dz * cos;
                
                // Check if we're within ramp bounds
                const onRamp = Math.abs(localX) < ramp.width / 2 && 
                              localZ > -ramp.length / 2 && 
                              localZ < ramp.length / 2;
                
                if (onRamp && this.speed > 15) {
                    // Calculate height on ramp based on position
                    const rampProgress = (localZ + ramp.length / 2) / ramp.length;
                    let expectedHeight;
                    
                    if (rampProgress < 0.6) {
                        // Going up the ramp
                        expectedHeight = (rampProgress / 0.6) * ramp.height;
                    } else {
                        // Going down the ramp
                        expectedHeight = ramp.height * (1 - (rampProgress - 0.6) / 0.4);
                    }
                    
                    // Adjust bike height to follow ramp
                    const targetY = ramp.position.y + expectedHeight;
                    
                    // If we're on the upward part and high enough, initiate jump
                    if (rampProgress > 0.4 && rampProgress < 0.7 && expectedHeight > ramp.height * 0.7) {
                        this.initiateJump(ramp);
                        break;
                    } else if (!this.isJumping) {
                        // Smoothly follow ramp surface
                        this.position.y = this.position.y * 0.7 + targetY * 0.3;
                    }
                }
            }
        }
        
        // Handle jump physics
        if (this.isJumping) {
            this.updateJump(deltaTime, throttleInput, brakeInput);
        }
        
        // Check for low-speed fall (but not while jumping)
        if (!this.isJumping && this.speed < this.minSpeed) {
            this.crashed = true;
            this.crashAngle = this.leanAngle || 0.5; // Fall to the side
            this.frame.material.color.setHex(0xff6600); // Orange for low-speed fall
            console.log('CRASHED! Speed too low:', (this.speed * 2.237).toFixed(1) + ' mph');
        }

        // Debug: Log crash state
        if (this.crashed) {
            console.log('Bike is crashed, fallingOffCliff:', this.fallingOffCliff);
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
                    this.frame.material.color.setHex(0xff0000); // Red for collision
                    
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
        
        // Check for roadwork obstacle collisions (barriers, bulldozers, trucks)
        if (this.environment && this.environment.roadworkObstacles) {
            for (const obstacle of this.environment.roadworkObstacles) {
                const dx = this.position.x - obstacle.position.x;
                const dz = this.position.z - obstacle.position.z;

                // Simple box collision detection
                let collisionDistance;
                if (obstacle.type === 'barrier') {
                    collisionDistance = 2.0; // Barrier collision radius (reasonable for distant obstacles)
                } else if (obstacle.type === 'bulldozer') {
                    collisionDistance = 3.0; // Larger collision radius for bulldozer
                } else if (obstacle.type === 'worktruck') {
                    collisionDistance = 2.5; // Work truck collision radius
                } else if (obstacle.type === 'container') {
                    collisionDistance = 2.5; // Shipping container collision radius
                } else {
                    collisionDistance = 2;
                }

                const distance = Math.sqrt(dx * dx + dz * dz);

                // Debug logging for roadwork collisions
                if (distance < 15) { // Log when reasonably close
                    console.log('Roadwork obstacle check:', obstacle.type,
                        'distance:', distance.toFixed(2),
                        'collisionDistance:', collisionDistance,
                        'bike pos:', this.position.x.toFixed(1), this.position.z.toFixed(1),
                        'obstacle pos:', obstacle.position.x.toFixed(1), obstacle.position.z.toFixed(1));
                }

                if (distance < collisionDistance) {
                    this.crashed = true;
                    this.crashAngle = this.leanAngle || 0.5;
                    this.frame.material.color.setHex(0xFF8C00); // Dark orange for construction crash

                    // Set crash velocity based on impact
                    const impactForce = this.speed * 0.6;
                    const impactDir = new THREE.Vector3(dx, 0, dz).normalize();
                    this.velocity = impactDir.multiplyScalar(impactForce);
                    this.velocity.y = 1.5; // Small upward force

                    console.log('CRASHED! Hit construction', obstacle.type, 'at', (this.speed * 2.237).toFixed(1) + ' mph', 'distance:', distance.toFixed(2));
                    break;
                }
            }
        }

        // Check if bike has fallen through the road surface (especially when crashed on side)
        if (this.environment && this.environment.roadPath && !this.fallingOffCliff) {
            // Find closest road segment
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

            if (closestSegment && this.position.y < closestSegment.y - 2.0) {
                // Bike is significantly below road surface - correct position
                console.log('CORRECTING! Bike below road surface at', this.position.x.toFixed(1), this.position.z.toFixed(1), 'Y:', this.position.y.toFixed(1), 'road Y:', closestSegment.y.toFixed(1));
                this.position.y = closestSegment.y;
                this.velocity.y = Math.max(0, this.velocity.y); // Prevent downward velocity

                // If not already crashed, crash it now
                if (!this.crashed) {
                    this.crashed = true;
                    this.crashAngle = this.leanAngle || 0.5;
                    this.frame.material.color.setHex(0x8b4513); // Brown for ground collision
                    console.log('CRASHED! Hit the ground (fell through road)');
                }
            }
        }

        // Wall collision is now handled in checkWallCollision() - removed duplicate check

        // Update physics
        this.updatePhysics(deltaTime, steeringInput);
        
        // Check for crash from excessive lean
        if (Math.abs(this.leanAngle) > this.maxLeanAngle) {
            this.crashed = true;
            this.crashAngle = this.leanAngle;
            this.frame.material.color.setHex(0xff0000); // Red for high-speed crash
            console.log('CRASHED! Lean angle exceeded:', (this.leanAngle * 180/Math.PI).toFixed(1) + '°');
        }
        
        // Update position
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyEuler(new THREE.Euler(0, this.yawAngle, 0));
        this.velocity.copy(forward.multiplyScalar(this.speed));
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Update elevation to follow road
        const preElevationX = this.position.x;
        const preElevationZ = this.position.z;
        this.updateElevation();
        const postElevationX = this.position.x;
        const postElevationZ = this.position.z;

        // Log if elevation update changed lateral position (shouldn't happen)
        // if (Math.abs(preElevationX - postElevationX) > 0.01 || Math.abs(preElevationZ - postElevationZ) > 0.01) {
        //     console.log('WARNING: updateElevation changed lateral position!',
        //         'X:', preElevationX.toFixed(2), '->', postElevationX.toFixed(2),
        //         'Z:', preElevationZ.toFixed(2), '->', postElevationZ.toFixed(2));
        // }
        
        // Wall collision already checked at the beginning of update()
        
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
        
        // Apply throttle (reduced during wheelie for challenge)
        if (throttleInput > 0) {
            const wheeliePenalty = this.isWheelie ? 0.3 : 1.0; // Only 30% acceleration during wheelie
            this.speed += this.acceleration * throttleInput * deltaTime * wheeliePenalty;
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

    updateWheelie(deltaTime, throttleInput, brakeInput, wheelieInput = 0, onWheelieScore = null) {
        // Simple debug to confirm method is called
        if (!this.wheelieDebugInit) {
            console.log('=== WHEELIE SYSTEM INITIALIZED ===');
            this.wheelieDebugInit = true;
        }
        
        // Log every time throttle is pressed
        if (throttleInput > 0) {
            // console.log('[WHEELIE] Method called with throttle:', throttleInput, 'speed:', this.speed.toFixed(1) + 'm/s');
        }

        // Only allow wheelies when on ground and not crashed
        if (this.crashed || this.isJumping) {
            this.wheelieAngle = 0;
            this.wheelieVelocity = 0;
            this.isWheelie = false;
            return;
        }



        // Detect wheelie initiation - ONLY with dedicated wheelie key, any speed
        const isWheelieKeyPressed = wheelieInput > 0;
        // Simple wheelie trigger - just need to press the key
        const canStartWheelie = isWheelieKeyPressed && !this.isWheelie;
        
        // Debug wheelie attempts
        if (wheelieInput > 0 && !this.wheelieDebugThrottle) {
            console.log('Wheelie attempt:');
            console.log('  Wheelie key pressed: Yes');
            console.log('  isWheelie:', this.isWheelie);
            console.log('  wheelieAngle:', this.wheelieAngle);
            console.log('  Can start?', canStartWheelie);
            this.wheelieDebugThrottle = true; // Only log once
            setTimeout(() => this.wheelieDebugThrottle = false, 1000); // Reset after 1 second
        }

        if (canStartWheelie && this.wheelieAngle === 0) {
            // Start wheelie with a stronger pop
            this.isWheelie = true;
            this.wheelieAngle = 0.05; // Start with more visible angle
            this.wheelieVelocity = 3.5; // Stronger initial lift
            this.wheelieStartTime = performance.now();
            this.wheelieScoreAccumulated = 0;
            console.log('===== WHEELIE STARTED! =====');
            console.log('Speed:', this.speed.toFixed(1) + 'm/s (' + (this.speed * 2.237).toFixed(1) + ' mph)');
        }

        if (this.isWheelie) {
            // SIMPLIFIED WHEELIE PHYSICS - More fun, less punishing
            
            const angleDegrees = this.wheelieAngle * 180 / Math.PI;
            
            // Natural gravity - wheelie wants to fall back down (slightly harder)
            const gravityPull = 2.5 + (angleDegrees / 45) * 1.8; // 2.5-4.1 based on angle
            this.wheelieVelocity -= gravityPull * deltaTime;
            
            // Throttle control - main way to control wheelie after initiation
            if (throttleInput > 0) {
                // Consistent lift when holding throttle - be careful not to flip!
                this.wheelieVelocity += throttleInput * 5.5 * deltaTime; // Increased for more risk
            }
            
            // Brake brings it down - useful to save from crash
            if (brakeInput > 0) {
                this.wheelieVelocity -= brakeInput * 6.0 * deltaTime; // Reduced from 12.0
            }
            
            // Note: Wheelie key (Space/Shift) is only used to START the wheelie
            // After that, use throttle (W) to maintain it
            
            // Update wheelie angle
            this.wheelieAngle += this.wheelieVelocity * deltaTime;
            
            // Check for backwards flip crash
            const crashAngleDegrees = 75; // Easier to flip - crash at 75 degrees
            if (angleDegrees >= crashAngleDegrees) {
                // CRASHED! Went too far back
                this.crashed = true;
                this.isWheelie = false;
                this.wheelieAngle = 0;
                this.wheelieVelocity = 0;
                console.log('WHEELIE CRASH! Flipped backwards at', angleDegrees.toFixed(1) + '°');
                return;
            }
            
            // Don't clamp the angle - let it go all the way to crash
            // This allows the player to actually flip if they're not careful
            this.wheelieAngle = Math.max(0, this.wheelieAngle);

            // SIMPLE FUN SCORING - Just rack up points!
            const wheelieDuration = (performance.now() - this.wheelieStartTime) / 1000;
            
            // Base points based on angle - higher is better (risk vs reward)
            let pointsPerSecond = 20; // Base points
            
            if (angleDegrees > 60) {
                // High angle - risky but rewarding!
                pointsPerSecond = 100;
            } else if (angleDegrees > 40) {
                // Good angle
                pointsPerSecond = 60;
            } else if (angleDegrees > 20) {
                // Decent angle
                pointsPerSecond = 40;
            }
            
            // Duration bonus - longer wheelies are worth more
            const durationBonus = Math.min(wheelieDuration / 3, 2); // Up to 2x after 6 seconds
            
            // Speed bonus - faster is better
            const speedMph = this.speed * 2.237;
            const speedMultiplier = 1 + (speedMph / 100); // +1% per mph
            
            // Calculate points for this frame
            const pointsThisFrame = pointsPerSecond * deltaTime * durationBonus * speedMultiplier;
            
            if (onWheelieScore && pointsThisFrame > 0) {
                onWheelieScore(Math.round(pointsThisFrame));
                this.wheelieScoreAccumulated += pointsThisFrame;
            }

            // Simple angle feedback (optional logging)
            // if (Math.abs(this.wheelieAngle - oldAngle) > 0.1) {
            //     console.log(`Wheelie: ${angleDegrees.toFixed(1)}° | Score: ${Math.round(this.wheelieScoreAccumulated)}`);
            // }

            // End wheelie if angle gets to zero or speed too low
            if (this.wheelieAngle <= 0 || this.speed < 5) {
                this.isWheelie = false;
                this.wheelieAngle = 0;
                this.wheelieVelocity = 0;
                const wheelieDuration = (performance.now() - this.wheelieStartTime) / 1000;
                
                // Final score summary
                const rating = this.wheelieScoreAccumulated > 500 ? 'AMAZING!' :
                              this.wheelieScoreAccumulated > 200 ? 'Great!' :
                              this.wheelieScoreAccumulated > 50 ? 'Good' : 'Practice more!';
                              
                console.log(`Wheelie ended! Duration: ${wheelieDuration.toFixed(1)}s | Score: ${Math.round(this.wheelieScoreAccumulated)} | ${rating}`);
                
                // Reset combo
                this.wheelieCombo = 1;
                this.wheeliePerfectFrames = 0;
            }

            // Reduced damping - less forgiving, requires more active control
            this.wheelieVelocity *= (1 - this.wheelieDamping * 0.3);
        } else if (this.wheelieAngle > 0) {
            // Gradually return to normal only if there's an angle to return from
            this.wheelieAngle *= 0.95;
            if (this.wheelieAngle < 0.01) {
                this.wheelieAngle = 0;
            }
        }
    }

    updatePhysics(deltaTime, steeringInput) {
        // Steering visualization
        this.steeringAngle = steeringInput * 0.3;
        
        // Speed affects steering sensitivity (less sensitive at high speed)
        const speedFactor = Math.max(0.3, Math.min(1.0, 20 / this.speed));
        
        // THREE MAIN FORCES:
        
        // 1. STEERING TORQUE: Counter-steering effect (speed-dependent)
        // Higher speed = more gyroscopic stability = harder to lean
        // Increase torque when trying to return to upright from a lean
        let steeringTorque = -steeringInput * this.steeringForce * speedFactor;
        
        // Boost steering torque when steering against current lean (returning to upright)
        if (Math.sign(steeringInput) !== Math.sign(this.leanAngle) && Math.abs(this.leanAngle) > 0.1) {
            steeringTorque *= 1.5; // 50% more responsive when counter-steering to upright
        }
        
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
        const selfRightingTorque = -this.leanAngle * 3.5;

        // Total torque is sum of all forces
        const totalTorque = steeringTorque + gravityTorque + centripetalTorque - gyroResistance + selfRightingTorque;
        
        // Update lean velocity with small damping to prevent oscillation
        this.leanVelocity += totalTorque * deltaTime;
        
        // Apply stronger damping when returning to upright to reduce oscillation
        if (Math.abs(this.leanAngle) < 0.2 && Math.sign(this.leanVelocity) !== Math.sign(this.leanAngle)) {
            this.leanVelocity *= 0.95; // Stronger damping near center
        } else {
            this.leanVelocity *= 0.99;
        }
        
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
            // Only adjust height if not falling off cliff
            if (!this.fallingOffCliff) {
                // Adjust bike position so it sits properly on the ground when rotated
                this.group.position.y = this.position.y + 0.3;
            }
            this.rider.rotation.z = 0; // Rider doesn't lean when crashed
        } else if (this.isJumping) {
            // Jumping animation - forward rotation
            this.group.rotation.x = this.jumpRotation;
            this.group.rotation.z = this.leanAngle * 0.5; // Reduce lean while jumping
            this.rider.rotation.z = this.leanAngle * 0.1;
        } else if (this.isWheelie) {
            // Wheelie animation - pivot around center of rear wheel
            // Rear wheel center is at (0, 0.3, -0.7) in local space
            // Bike origin is at CG height (0.6m) above ground
            
            // Apply the rotation first
            this.group.rotation.x = -this.wheelieAngle; // Negative for wheelie (front up)
            
            // Calculate translation needed to keep rear wheel center fixed
            // Vector from bike origin to rear wheel center
            // Rear wheel center Y: 0.3 (above ground)
            // Bike origin Y: 0.6 (CG height above ground)
            // So offset from bike origin to wheel center: 0.3 - 0.6 = -0.3
            
            const angle = -this.wheelieAngle;
            const cosTheta = Math.cos(angle);
            const sinTheta = Math.sin(angle);
            
            // Original vector from origin to pivot point (rear wheel center)
            const pivotX = 0;
            const pivotY = 0.3 - this.cgHeight; // wheel center height - CG height = 0.3 - 0.6 = -0.3
            const pivotZ = -0.7; // rear wheel is 0.7m behind center
            
            // After rotation, this vector becomes:
            const rotatedY = pivotY * cosTheta - pivotZ * sinTheta;
            const rotatedZ = pivotY * sinTheta + pivotZ * cosTheta;
            
            // Translation needed to keep pivot point fixed
            this.group.position.y = this.position.y + (pivotY - rotatedY);
            this.group.position.z = this.position.z + (pivotZ - rotatedZ);
            
            // Apply lean (reduced during wheelie)
            this.group.rotation.z = this.leanAngle * 0.3; // Reduce lean during wheelie
            this.rider.rotation.z = this.leanAngle * 0.1;
            
            // Simple visual feedback - bike gets brighter during wheelie
            const angleDegrees = this.wheelieAngle * 180 / Math.PI;
            const brightness = 1.0 + (angleDegrees / 90) * 0.5; // Brighter as angle increases
            this.frame.material.color.setRGB(
                0.1 * brightness,
                0.4 * brightness,
                0.7 * brightness
            );
            
            // Debug: log when wheelie is active (commented out)
            // if (this.wheelieAngle > 0.1 && this.wheelieDebugCounter % 60 === 0) {
            //     console.log('Applying wheelie rotation:', (this.wheelieAngle * 180 / Math.PI).toFixed(1) + '°');
            // }
        } else {
            // Normal lean
            this.group.rotation.x = 0; // Reset pitch
            this.group.rotation.z = this.leanAngle;
            this.rider.rotation.z = this.leanAngle * 0.2; // Rider leans subtly
            
            // Restore normal bike color
            if (!this.crashed) {
                this.frame.material.color.setHex(0x1a4db3); // Normal blue
            }
        }

        // Rotate front wheel for steering visualization
        this.frontWheel.rotation.y = this.steeringAngle * 0.5;

        // Brake light glow - light up when brake is pressed
        if (this.currentBrakeInput > 0) {
            this.brakeLight.material.emissive.setHex(0xff0000);
            this.brakeLight.material.emissiveIntensity = 1.0;
        } else {
            this.brakeLight.material.emissive.setHex(0x000000);
            this.brakeLight.material.emissiveIntensity = 0.0;
        }
        this.previousSpeed = this.speed;
    }

    reset() {
        this.position.set(0, 2, 10);
        this.velocity.set(0, 0, 0);
        this.speed = 0;
        this.heading = 0;
        this.leanAngle = 0;
        this.leanVelocity = 0;
        this.crashed = false;
        this.crashAngle = 0;
        this.isJumping = false;
        this.jumpVelocityY = 0;
        this.jumpStartHeight = 0;
        this.jumpRotation = 0;
        this.previousSpeed = 0;
        this.isWheelie = false;
        this.wheelieAngle = 0;
        this.wheelieVelocity = 0;
        this.wheelieBalance = 0;
        this.wheelieStartTime = 0;
        this.wheelieScoreAccumulated = 0;
        this.wheelieCombo = 0;
        this.wheeliePerfectFrames = 0;
        this.wheelieLastInputTime = 0;
        this.fallingOffCliff = false;
        this.hitGround = false;
        this.fallStartY = 0;
        this.groundHitLogged = false;
        this.frame.material.color.setHex(0x0066cc); // Reset to blue
        this.updateMesh();
    }
    
    getTerrainHeightAt(x, z) {
        // Sample the terrain height at the given position
        // Start with lake level
        let baseHeight = -80;
        
        // Check if we're near the road - if so, use road height
        if (this.environment && this.environment.roadPath) {
            // Find closest road segment
            let closestDist = Infinity;
            let closestHeight = baseHeight;
            
            for (const point of this.environment.roadPath) {
                const dx = x - point.x;
                const dz = z - point.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                
                if (dist < closestDist && dist < 100) { // Within 100 units of road
                    closestDist = dist;
                    closestHeight = point.y || 0;
                    
                    // Interpolate height based on distance from road
                    if (dist > 20) {
                        // Slope down from road to lake
                        const slopeFactor = (dist - 20) / 80; // 0 at road edge, 1 at lake
                        closestHeight = closestHeight + (baseHeight - closestHeight) * slopeFactor;
                    }
                }
            }
            
            if (closestDist < 100) {
                return closestHeight;
            }
        }
        
        // Default to lake level if far from road
        return baseHeight;
    }
    
    calculateSlopeNormal(x, z) {
        // Calculate the normal vector of the terrain slope at this position
        const epsilon = 1.0; // Sample distance
        
        // Sample heights around the current position
        const h0 = this.getTerrainHeightAt(x, z);
        const hx1 = this.getTerrainHeightAt(x + epsilon, z);
        const hx2 = this.getTerrainHeightAt(x - epsilon, z);
        const hz1 = this.getTerrainHeightAt(x, z + epsilon);
        const hz2 = this.getTerrainHeightAt(x, z - epsilon);
        
        // Calculate gradients
        const dx = (hx1 - hx2) / (2 * epsilon);
        const dz = (hz1 - hz2) / (2 * epsilon);
        
        // Normal vector (perpendicular to slope)
        const normal = new THREE.Vector3(-dx, 1, -dz);
        normal.normalize();
        
        return normal;
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

        this.frame.material.color.setHex(0x0066cc);
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
        // Skip elevation update when jumping
        if (this.isJumping) return;
        
        // Check if we're on a ramp before adjusting to road height
        if (this.environment && this.environment.jumpRamps) {
            for (const ramp of this.environment.jumpRamps) {
                const dx = this.position.x - ramp.position.x;
                const dz = this.position.z - ramp.position.z;
                
                // Rotate to ramp's local space
                const cos = Math.cos(-ramp.rotation);
                const sin = Math.sin(-ramp.rotation);
                const localX = dx * cos - dz * sin;
                const localZ = dx * sin + dz * cos;
                
                // Check if we're within ramp bounds
                const onRamp = Math.abs(localX) < ramp.width / 2 && 
                              localZ > -ramp.length / 2 && 
                              localZ < ramp.length / 2;
                
                if (onRamp) {
                    // Don't update elevation when on ramp - let the ramp detection handle it
                    return;
                }
            }
        }
        
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
                
                 // Smooth elevation following to prevent bobbing with gradual changes
                 this.position.y = this.position.y * 0.7 + targetY * 0.3;
            }
        }
    }
    
    checkWallCollision() {
        // Check if bike has gone off the road edges
        if (!this.environment) {
            console.log('ERROR: No environment set on vehicle');
            return;
        }
        if (!this.environment.roadPath) {
            console.log('ERROR: No roadPath in environment');
            return;
        }
        if (this.environment.roadPath.length === 0) {
            console.log('ERROR: Empty roadPath');
            return;
        }

        if (this.environment && this.environment.roadPath) {
            // Use the closest segment for accurate perpDistance calculation
            let currentSegment = null;
            let minDistance = Infinity;
            this.environment.roadPath.forEach((segment, index) => {
                const distance = Math.sqrt(
                    Math.pow(this.position.x - segment.x, 2) +
                    Math.pow(this.position.z - segment.z, 2)
                );

                if (distance < minDistance) {
                    minDistance = distance;
                    currentSegment = segment;
                    this.currentRoadSegment = index; // Update current segment
                }
            });

            if (currentSegment) {
                // Calculate perpendicular distance from road centerline
                // Use the same perpendicular calculation as environment.js
                const perpX = Math.cos(currentSegment.heading);
                const perpZ = -Math.sin(currentSegment.heading);
                const toVehicleX = this.position.x - currentSegment.x;
                const toVehicleZ = this.position.z - currentSegment.z;

                const roadWidth = 8; // Half of total road width (16m)
                // Improved road boundary logic with hysteresis
                const roadEdge = 8.0; // Edge of the road (matches actual road width)
                const safetyZone = 10.0; // Safety zone - slow down but don't crash
                const cliffEdge = 8.0; // Cliff edge - fall past this
                const wallBuffer = 8.0; // Wall crash buffer

                // Dot product gives signed distance (positive = right of road, negative = left of road)
                const perpDistance = toVehicleX * perpX + toVehicleZ * perpZ;

                // Hysteresis to prevent oscillating between states
                const hysteresisBuffer = 0.5; // Half unit buffer
                const effectiveRoadEdge = this.wasNearEdge ? roadEdge - hysteresisBuffer : roadEdge;
                const effectiveSafetyZone = this.wasNearEdge ? safetyZone - hysteresisBuffer : safetyZone;
                const effectiveCliffEdge = this.wasNearEdge ? cliffEdge - hysteresisBuffer : cliffEdge;

                // Update hysteresis state
                this.wasNearEdge = Math.abs(perpDistance) > effectiveRoadEdge;

                // Debug logging (uncomment for troubleshooting)
                // console.log('PerpDistance:', perpDistance.toFixed(2),
                //     'RoadEdge:', effectiveRoadEdge.toFixed(1),
                //     'SafetyZone:', effectiveSafetyZone.toFixed(1),
                //     'CliffEdge:', effectiveCliffEdge.toFixed(1),
                //     'WallBuffer:', wallBuffer.toFixed(1));
                
                // Check if we're on the ledge areas (slow down but don't crash)
                if (Math.abs(perpDistance) > effectiveRoadEdge && Math.abs(perpDistance) < effectiveSafetyZone) {
                    // On the edge/ledge - slow down but don't crash
                    this.speed *= 0.95; // Gradual speed reduction
                    // console.log('NEAR EDGE: Slowing down at distance', perpDistance.toFixed(1));
                }
                
                // Check if we've hit the left cliff wall (negative perpDistance)
                if (perpDistance < -wallBuffer && !this.crashed) {
                    // Hit the cliff wall on the left - crash with bounce
                    this.crashed = true;
                    this.fallingOffCliff = false; // Not falling, we hit a wall
                    this.crashAngle = -Math.PI/6; // Crash leaning left into the wall
                    this.frame.material.color.setHex(0x8B0000); // Dark red for crash
                    console.log('CRASHED! Hit the left cliff wall at', (this.speed * 2.237).toFixed(1) + ' mph');
                    console.log('Left wall hit at distance:', perpDistance);

                    // Move bike back to wall position and apply bounce
                    const targetPerpDistance = -wallBuffer;
                    const adjustment = (targetPerpDistance - perpDistance);
                    this.position.x += perpX * adjustment;
                    this.position.z += perpZ * adjustment;

                    // Bounce off the wall - toward road center
                    const bounceDir = new THREE.Vector3(perpX, 0, perpZ); // Bounce back toward road center
                    this.velocity = bounceDir.multiplyScalar(this.speed * 0.2);
                    this.velocity.y = 0.5; // Small upward bounce
                }



                // Check if we've gone off the right cliff edge (positive perpDistance)
                if (perpDistance > effectiveCliffEdge && !this.crashed) {
                    console.log('=== FALLING OFF RIGHT CLIFF! ===');
                    console.log('perpDistance:', perpDistance, 'effectiveCliffEdge:', effectiveCliffEdge, 'cliffEdge:', cliffEdge);
                    console.log('Vehicle position:', this.position.x.toFixed(1), this.position.z.toFixed(1), 'Y:', this.position.y.toFixed(1));
                    console.log('CRASHED! Fell off the right cliff edge at', (this.speed * 2.237).toFixed(1) + ' mph');
                    this.crashed = true;
                    this.fallingOffCliff = true; // Fall off the right cliff edge
                    this.fallStartY = this.position.y;
                    this.groundHitLogged = false;
                    this.crashAngle = -Math.PI/4; // Fall to the left after going off right edge
                    this.frame.material.color.setHex(0x8B0000); // Dark red for falling

                    // Continue forward momentum but start falling
                    this.velocity.y = -8; // Start falling downward
                }
            }
        }
    }
    
    initiateJump(ramp) {
        this.isJumping = true;
        this.jumpStartHeight = this.position.y;
        
        // Calculate jump velocity based on speed and ramp angle
        const jumpAngle = Math.atan2(ramp.height, ramp.length * 0.6); // Approximate ramp angle
        this.jumpVelocityY = Math.sin(jumpAngle) * this.speed * 0.6; // Even higher jump force

        // Better extra lift
        this.jumpVelocityY += 2.5;
        
        // Add some forward rotation for style
        this.jumpRotation = 0;
        
        console.log('JUMPING! Speed:', (this.speed * 2.237).toFixed(1) + ' mph, Launch velocity:', this.jumpVelocityY.toFixed(1));
    }
    
    updateJump(deltaTime, throttleInput, brakeInput) {
        // Apply gravity
        this.jumpVelocityY -= 9.81 * deltaTime * 2; // Double gravity for arcade feel
        
        // Update vertical position
        this.position.y += this.jumpVelocityY * deltaTime;
        
        // Control rotation with throttle/brake for skill-based landing
        // Throttle pitches forward (nose down), brake pitches backward (nose up)
        const rotationControl = (throttleInput - brakeInput) * deltaTime * 3;
        this.jumpRotation += rotationControl;
        
        // Check for landing
        if (this.environment && this.environment.roadPath) {
            // Find the road height at current position
            let targetRoadHeight = 0;
            let minDistance = Infinity;
            
            for (const segment of this.environment.roadPath) {
                const distance = Math.sqrt(
                    Math.pow(this.position.x - segment.x, 2) + 
                    Math.pow(this.position.z - segment.z, 2)
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    targetRoadHeight = segment.y || 0;
                }
            }
            
            // Check if we've landed
            if (this.jumpVelocityY < 0 && this.position.y <= targetRoadHeight + 0.1) {
                this.land(targetRoadHeight);
            }
        }
        
        // Safety check - if we've been jumping too long, force landing
        if (this.position.y < this.jumpStartHeight - 10) {
            this.crashed = true;
            this.isJumping = false;
            this.jumpRotation = 0;
            console.log('CRASHED! Bad landing from jump');
        }
    }
    
    land(groundHeight) {
        this.isJumping = false;
        this.position.y = groundHeight;
        this.jumpVelocityY = 0;
        
        // Normalize rotation to -PI to PI range
        while (this.jumpRotation > Math.PI) this.jumpRotation -= Math.PI * 2;
        while (this.jumpRotation < -Math.PI) this.jumpRotation += Math.PI * 2;
        
        // Check landing quality based on rotation angle
        const landingAngle = Math.abs(this.jumpRotation);
        const landingSpeed = Math.abs(this.jumpVelocityY);
        
        // Good landing if bike is mostly level (within 45 degrees)
        if (landingAngle < Math.PI / 4) {
            console.log('Perfect landing! Angle:', (landingAngle * 180 / Math.PI).toFixed(0) + '°');
            this.jumpRotation = 0;
        } else if (landingAngle < Math.PI / 2) {
            // Rough but recoverable landing
            console.log('Rough landing! Angle:', (landingAngle * 180 / Math.PI).toFixed(0) + '°');
            this.jumpRotation = 0;
            // Slow down a bit from the hard landing
            this.speed *= 0.7;
        } else {
            // Bad angle - crash
            this.crashed = true;
            this.crashAngle = this.jumpRotation > 0 ? Math.PI/2 : -Math.PI/2;
            console.log('CRASHED! Bad landing angle:', (landingAngle * 180 / Math.PI).toFixed(0) + '°');
        }
    }
}