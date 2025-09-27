class Vehicle {
    constructor(scene) {
        this.scene = scene;
        
        // Physical properties
        this.position = new THREE.Vector3(0, 5, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        
        // Vehicle parameters
        this.speed = 15; // m/s (starts at ~54 km/h)
        this.minSpeed = 5; // m/s (~18 km/h) - below this, bike falls
        this.maxSpeed = 30; // m/s (~108 km/h)
        this.acceleration = 8; // m/s²
        this.brakeForce = 12; // m/s²
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
        if (this.crashed) {
            // Continue sliding forward but no control
            this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
            this.velocity.multiplyScalar(0.98); // Friction slows it down
            this.speed = this.velocity.length();
            this.updateMesh();
            return;
        }
        
        // Update speed based on throttle/brake
        this.updateSpeed(deltaTime, throttleInput, brakeInput);
        
        // Check for low-speed fall
        if (this.speed < this.minSpeed) {
            this.crashed = true;
            this.crashAngle = this.leanAngle || 0.5; // Fall to the side
            this.frame.material.color.setHex(0xff6600); // Orange for low-speed fall
            console.log('CRASHED! Speed too low:', (this.speed * 3.6).toFixed(1) + ' km/h');
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
        
        // Update 3D model
        this.updateMesh();
    }
    
    updateSpeed(deltaTime, throttleInput, brakeInput) {
        // Apply throttle
        if (throttleInput > 0) {
            this.speed += this.acceleration * throttleInput * deltaTime;
        }
        
        // Apply brakes
        if (brakeInput > 0) {
            this.speed -= this.brakeForce * brakeInput * deltaTime;
        }
        
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
            this.group.position.y = -0.3;
            this.rider.rotation.z = 0; // Rider doesn't lean when crashed
        } else {
            // Normal lean
            this.group.rotation.z = this.leanAngle;
            this.rider.rotation.z = this.leanAngle * 0.2; // Rider leans subtly
        }

        // Rotate front wheel for steering visualization
        this.frontWheel.rotation.y = this.steeringAngle * 0.5;

        // Brake light glow
        // Note: brakeInput not passed to updateMesh, so assume from speed decrease or add parameter
        // For simplicity, glow when speed decreasing
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
        this.position.set(0, 5, 0);
        this.velocity.set(0, 0, 0);
        this.speed = 15; // Reset to starting speed
        this.leanAngle = 0;
        this.leanVelocity = 0;
        this.steeringAngle = 0;
        this.yawAngle = 0;
        this.crashed = false;
        this.crashAngle = 0;
        this.frame.material.color.setHex(0x0066cc);
    }

    getSpeed() {
        return this.crashed ? 0 : this.speed * 3.6; // Convert m/s to km/h
    }

    getLeanAngleDegrees() {
        return this.leanAngle * 180 / Math.PI;
    }

    getSteeringAngleDegrees() {
        return this.steeringAngle * 180 / Math.PI;
    }
}