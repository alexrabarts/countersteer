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
        
        // Jump state
        this.isJumping = false;
        this.jumpVelocityY = 0;
        this.jumpStartHeight = 0;
        this.jumpRotation = 0;
        
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

    update(deltaTime, steeringInput, throttleInput, brakeInput) {
        // Store brake input for use in updateMesh
        this.currentBrakeInput = brakeInput;
        
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
        
        // Check for jump ramps
        if (!this.isJumping && this.environment && this.environment.jumpRamps) {
            for (const ramp of this.environment.jumpRamps) {
                const dx = this.position.x - ramp.position.x;
                const dz = this.position.z - ramp.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                // Check if we're on the ramp and moving fast enough
                if (distance < ramp.length / 2 && this.speed > 15) {
                    // Calculate position along ramp
                    const rampForward = new THREE.Vector3(
                        Math.sin(ramp.rotation),
                        0,
                        Math.cos(ramp.rotation)
                    );
                    const toVehicle = new THREE.Vector3(dx, 0, dz);
                    const alongRamp = toVehicle.dot(rampForward);
                    
                    // If we're on the up-ramp portion
                    if (alongRamp > -ramp.length/2 && alongRamp < ramp.length * 0.2) {
                        this.initiateJump(ramp);
                        break;
                    }
                }
            }
        }
        
        // Handle jump physics
        if (this.isJumping) {
            this.updateJump(deltaTime);
        }
        
        // Check for low-speed fall (but not while jumping)
        if (!this.isJumping && this.speed < this.minSpeed) {
            this.crashed = true;
            this.crashAngle = this.leanAngle || 0.5; // Fall to the side
            this.frame.material.color.setHex(0xff6600); // Orange for low-speed fall
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
                    this.frame.material.color.setHex(0x8b4513); // Brown for wall hit
                    
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
            this.frame.material.color.setHex(0xff0000); // Red for high-speed crash
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
            // Adjust bike position so it sits properly on the ground when rotated
            this.group.position.y = this.position.y + 0.3;
            this.rider.rotation.z = 0; // Rider doesn't lean when crashed
        } else if (this.isJumping) {
            // Jumping animation - forward rotation
            this.group.rotation.x = this.jumpRotation;
            this.group.rotation.z = this.leanAngle * 0.5; // Reduce lean while jumping
            this.rider.rotation.z = this.leanAngle * 0.1;
        } else {
            // Normal lean
            this.group.rotation.x = 0; // Reset pitch
            this.group.rotation.z = this.leanAngle;
            this.rider.rotation.z = this.leanAngle * 0.2; // Rider leans subtly
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
                
                // Much more responsive - almost instant but with tiny smoothing to prevent jitter
                this.position.y = this.position.y * 0.1 + targetY * 0.9;
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
                    this.frame.material.color.setHex(0x8B0000); // Dark red for falling off cliff
                    console.log('CRASHED! Fell off the left edge at', (this.speed * 2.237).toFixed(1) + ' mph');
                    
                    // Continue forward momentum but start falling
                    this.velocity.y = -5; // Start falling downward
                }
            }
        }
    }
    
    initiateJump(ramp) {
        this.isJumping = true;
        this.jumpStartHeight = this.position.y;
        
        // Calculate jump velocity based on speed and ramp angle
        const jumpAngle = Math.atan2(ramp.height, ramp.length * 0.6); // Approximate ramp angle
        this.jumpVelocityY = Math.sin(jumpAngle) * this.speed * 0.7;
        
        // Add some forward rotation for style
        this.jumpRotation = 0;
        
        console.log('JUMPING! Speed:', (this.speed * 2.237).toFixed(1) + ' mph, Launch velocity:', this.jumpVelocityY.toFixed(1));
    }
    
    updateJump(deltaTime) {
        // Apply gravity
        this.jumpVelocityY -= 9.81 * deltaTime * 2; // Double gravity for arcade feel
        
        // Update vertical position
        this.position.y += this.jumpVelocityY * deltaTime;
        
        // Add rotation for visual effect
        this.jumpRotation += deltaTime * 2;
        
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
        
        // Check landing quality
        const landingSpeed = Math.abs(this.jumpVelocityY);
        if (landingSpeed > 15 || Math.abs(this.jumpRotation) > Math.PI * 2) {
            // Hard landing - crash
            this.crashed = true;
            this.crashAngle = (Math.random() - 0.5) * Math.PI/2;
            console.log('CRASHED! Hard landing at', landingSpeed.toFixed(1) + ' m/s');
        } else {
            console.log('Successful landing!');
            // Reset rotation smoothly
            this.jumpRotation = 0;
        }
    }
}