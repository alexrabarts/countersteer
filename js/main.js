class Game {
    constructor() {
        console.log('Starting game initialization...');
        
        this.init();
        this.setupScene();
        this.setupLighting();
        this.setupCamera();
        
        console.log('Creating environment...');
        this.environment = new Environment(this.scene);
        
        console.log('Creating cones course...');
        this.cones = new Cones(this.scene, this.environment);
        
        console.log('Creating traffic...');
        this.traffic = new Traffic(this.scene, this.environment);
        
        console.log('Creating vehicle...');
        this.vehicle = new Vehicle(this.scene);
        this.vehicle.environment = this.environment; // Pass environment reference for elevation
        
        // Initialize vehicle at proper road height
        if (this.environment.roadPath && this.environment.roadPath.length > 0) {
            const startY = this.environment.roadPath[0].y || 0;
            this.vehicle.position.y = startY;
        }
        
        this.input = new InputHandler();
        
        this.clock = new THREE.Clock();
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        
        // Scoring system
        this.score = 0;
        this.combo = 0;
        this.comboMultiplier = 1;
        this.checkpointsPassed = 0;
        this.lastCheckpointIndex = -1;
        
        // High score tracking
        this.highScore = parseInt(localStorage.getItem('motorcycleHighScore') || '0');
        this.updateHighScoreDisplay();

        // Finish state
        this.finished = false;
        this.finishTime = 0;
        this.startTime = performance.now();

        console.log('Starting animation loop...');
        this.animate();
    }

    init() {
        this.scene = new THREE.Scene();
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.shadowMap.autoUpdate = true;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.8;
        document.body.appendChild(this.renderer.domElement);
        
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupScene() {
        // Misty mountain atmosphere with layered fog effect
        this.scene.background = new THREE.Color(0x9db4c8);
        // Use exponential fog for more realistic mountain haze
        this.scene.fog = new THREE.FogExp2(0x9db4c8, 0.004);
    }

    setupLighting() {
        // Ambient light - increased for better visibility
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        // Hemisphere light for natural sky/ground lighting
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x3a5f3a, 0.3);
        this.scene.add(hemisphereLight);

        // Directional light (sun)
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.directionalLight.position.set(50, 80, 0);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 4096; // Increased resolution
        this.directionalLight.shadow.mapSize.height = 4096;
        this.directionalLight.shadow.camera.near = 0.1;
        this.directionalLight.shadow.camera.far = 300; // Reduced for better precision
        this.directionalLight.shadow.camera.left = -60; // Tighter frustum
        this.directionalLight.shadow.camera.right = 60;
        this.directionalLight.shadow.camera.top = 60;
        this.directionalLight.shadow.camera.bottom = -60;
        this.directionalLight.shadow.bias = -0.0001; // Reduce shadow acne
        this.scene.add(this.directionalLight);
        
        // Store initial light offset from origin
        this.lightOffset = this.directionalLight.position.clone();
        
        // Secondary directional light for distant shadows (lower quality but wider coverage)
        this.distantLight = new THREE.DirectionalLight(0xffffff, 0.3);
        this.distantLight.position.set(50, 80, 0);
        this.distantLight.castShadow = true;
        this.distantLight.shadow.mapSize.width = 1024; // Lower resolution
        this.distantLight.shadow.mapSize.height = 1024;
        this.distantLight.shadow.camera.near = 50; // Start where near shadows end
        this.distantLight.shadow.camera.far = 800; // Much further
        this.distantLight.shadow.camera.left = -200;
        this.distantLight.shadow.camera.right = 200;
        this.distantLight.shadow.camera.top = 200;
        this.distantLight.shadow.camera.bottom = -200;
        this.distantLight.shadow.bias = -0.001;
        this.scene.add(this.distantLight);

        // Fill light from opposite side for softer shadows
        this.fillLight = new THREE.DirectionalLight(0xffffff, 0.2);
        this.fillLight.position.set(-50, 30, 0);
        this.scene.add(this.fillLight);

        // Rim light for vehicle highlighting
        this.rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
        this.rimLight.position.set(0, 10, -50);
        this.scene.add(this.rimLight);

        // Vehicle headlights
        this.leftHeadlight = new THREE.SpotLight(0xffffff, 1, 100, Math.PI/6, 0.1, 2);
        this.leftHeadlight.castShadow = true;
        this.leftHeadlight.shadow.mapSize.width = 1024;
        this.leftHeadlight.shadow.mapSize.height = 1024;
        this.scene.add(this.leftHeadlight);

        this.rightHeadlight = new THREE.SpotLight(0xffffff, 1, 100, Math.PI/6, 0.1, 2);
        this.rightHeadlight.castShadow = true;
        this.rightHeadlight.shadow.mapSize.width = 1024;
        this.rightHeadlight.shadow.mapSize.height = 1024;
        this.scene.add(this.rightHeadlight);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
        this.camera.position.set(0, 5, -10);
        this.camera.lookAt(0, 0, 0);
        
        // Dynamic camera offset for mountain roads
        this.baseCameraOffset = new THREE.Vector3(0, 3, -6); // Even closer view for more immersion
        this.cameraOffset = this.baseCameraOffset.clone();
        this.cameraTarget = new THREE.Vector3();
        this.currentCameraPos = this.camera.position.clone();
        this.currentLookTarget = new THREE.Vector3(0, 1, 0);
        this.cameraLerpFactor = 0.08; // Slightly faster response for mountain roads
        this.cameraLateralOffset = 0; // Track lateral offset for smooth side movement
        this.previousYawAngle = 0; // Track yaw changes for lateral movement
        console.log('Camera setup complete');
    }



    updateCamera() {
        // Follow camera - keep camera behind vehicle
        const vehiclePos = this.vehicle.position.clone();
        const vehicleRotation = new THREE.Euler(0, this.vehicle.yawAngle, 0);
        
        // Calculate yaw change for lateral camera lag
        const yawDelta = this.vehicle.yawAngle - this.previousYawAngle;
        this.previousYawAngle = this.vehicle.yawAngle;
        
        // Update lateral offset - camera swings opposite to turn direction initially
        const targetLateralOffset = -yawDelta * 25; // Strong lateral movement
        this.cameraLateralOffset = this.cameraLateralOffset * 0.85 + targetLateralOffset * 0.15;

        // Dynamic camera offset based on lean angle for better mountain road feel
        const leanInfluence = this.vehicle.leanAngle * 2; // Shift camera opposite to lean
        
        // Combine lateral lag with lean influence
        this.cameraOffset.x = this.baseCameraOffset.x - leanInfluence + this.cameraLateralOffset;
        
        // Adjust height based on speed for dramatic effect
        const speedRatio = this.vehicle.speed / this.vehicle.maxSpeed;
        this.cameraOffset.y = this.baseCameraOffset.y + speedRatio * 0.5; // Slight rise with speed
        this.cameraOffset.z = this.baseCameraOffset.z - speedRatio * 1; // Move back slightly with speed

        // Calculate camera position relative to vehicle
        const offset = this.cameraOffset.clone();
        offset.applyEuler(vehicleRotation);
        const cameraPos = vehiclePos.clone().add(offset);

        // Smooth camera movement with lag
        this.currentCameraPos.lerp(cameraPos, this.cameraLerpFactor);
        this.camera.position.copy(this.currentCameraPos);

        // Dynamic FOV based on speed for immersion
        const speedFactor = this.vehicle.speed / this.vehicle.maxSpeed;
        this.camera.fov = 70 + speedFactor * 15; // 70 to 85 degrees for mountain roads
        this.camera.updateProjectionMatrix();

        // Look ahead of vehicle for better anticipation on mountain roads
        const lookAheadDistance = 3 + speedRatio * 7; // Look further ahead at speed
        const lookAhead = new THREE.Vector3(0, 0, lookAheadDistance);
        lookAhead.applyEuler(vehicleRotation);
        
        const lookTarget = this.vehicle.position.clone().add(lookAhead);
        lookTarget.y += 1;
        this.currentLookTarget.lerp(lookTarget, this.cameraLerpFactor * 1.5);
        this.camera.lookAt(this.currentLookTarget);
        
        // Update shadow camera to follow player
        this.updateShadowCamera();
    }
    
    updateShadowCamera() {
        // Make the directional lights' shadow cameras follow the player
        const playerPos = this.vehicle.position;
        
        // Update near shadow light position to stay relative to player
        this.directionalLight.position.copy(playerPos).add(this.lightOffset);
        this.directionalLight.target.position.copy(playerPos);
        this.directionalLight.target.updateMatrixWorld();
        
        // Update distant shadow light similarly
        this.distantLight.position.copy(playerPos).add(this.lightOffset);
        this.distantLight.target.position.copy(playerPos);
        this.distantLight.target.updateMatrixWorld();
    }

    updateUI() {
        if (this.finished) {
            // Dashboard remains visible but update for finish state
            const dashboard = document.querySelector('.dashboard');
            if (dashboard) {
                dashboard.style.opacity = '0.5';
            }
            return;
        }

        // Update dashboard gauges
        const speed = this.vehicle.getSpeed().toFixed(0);
        const speedElement = document.getElementById('speed');
        speedElement.textContent = speed;
        
        // Color code speed
        if (speed < 20) {
            speedElement.className = 'gauge-value danger';
        } else if (speed < 40) {
            speedElement.className = 'gauge-value warning';
        } else {
            speedElement.className = 'gauge-value';
        }

        const leanAngle = this.vehicle.getLeanAngleDegrees();
        const leanElement = document.getElementById('lean');
        leanElement.textContent = this.vehicle.crashed ? 'CRASH!' : `${leanAngle.toFixed(0)}°`;
        
        // Color code lean
        if (Math.abs(leanAngle) > 45) {
            leanElement.className = 'gauge-value danger';
        } else if (Math.abs(leanAngle) > 30) {
            leanElement.className = 'gauge-value warning';
        } else {
            leanElement.className = 'gauge-value';
        }

        document.getElementById('steering').textContent = `${this.vehicle.getSteeringAngleDegrees().toFixed(0)}°`;
        
        // Update distance display
        const distance = this.vehicle.getDistanceTraveled();
        document.getElementById('distance').textContent = `${distance.toFixed(0)}m`;

        // Update FPS
        document.getElementById('fps').textContent = `FPS: ${this.fps}`;
        
        // Update score display
        this.updateScoreDisplay();
    }
    
    updateHighScoreDisplay() {
        document.getElementById('highScore').textContent = `Best: ${this.highScore.toLocaleString()}`;
    }

    showFinishScreen() {
        // Calculate final score with finish bonus
        const distance = this.vehicle.getDistanceTraveled();
        const timeSeconds = this.finishTime / 1000;
        const averageSpeed = distance / timeSeconds * 3.6; // km/h
        
        // Add finish bonus to current score
        const finishBonus = 1000 * this.comboMultiplier;
        this.addScore(finishBonus);
        
        const totalScore = this.score;

        // Create finish banner
        const finishBanner = document.createElement('div');
        finishBanner.id = 'finishBanner';
        finishBanner.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #2c3e50, #34495e);
            border: 3px solid #f39c12;
            border-radius: 20px;
            padding: 30px;
            text-align: center;
            color: white;
            font-family: Arial, sans-serif;
            z-index: 1000;
            box-shadow: 0 0 30px rgba(0,0,0,0.8);
            animation: fadeIn 0.5s ease-out;
        `;

        finishBanner.innerHTML = `
            <h1 style="color: #f39c12; margin: 0 0 20px 0; font-size: 48px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">
                COURSE COMPLETE!
            </h1>
            <div style="font-size: 24px; margin-bottom: 20px;">
                <div style="margin-bottom: 10px;">Distance: <span style="color: #3498db;">${distance.toFixed(0)} meters</span></div>
                <div style="margin-bottom: 10px;">Time: <span style="color: #e74c3c;">${timeSeconds.toFixed(1)} seconds</span></div>
                <div style="margin-bottom: 10px;">Average Speed: <span style="color: #9b59b6;">${averageSpeed.toFixed(1)} km/h</span></div>
            </div>
            <div style="font-size: 36px; font-weight: bold; color: #f39c12; margin-bottom: 20px;">
                SCORE: ${totalScore.toLocaleString()}
            </div>
            <div style="font-size: 18px; color: #bdc3c7;">
                Press R to play again
            </div>
        `;

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(finishBanner);

        // Update high score if this score is better
        if (totalScore > this.highScore) {
            this.highScore = totalScore;
            localStorage.setItem('motorcycleHighScore', this.highScore.toString());
        }

        console.log(`COURSE FINISHED! Distance: ${distance.toFixed(0)}m, Time: ${timeSeconds.toFixed(1)}s, Score: ${totalScore}`);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // FPS calculation
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = now;
            document.getElementById('fps').textContent = `FPS: ${this.fps}`;
        }

        const deltaTime = this.clock.getDelta();
        const steeringInput = this.input.getSteeringInput();
        const throttleInput = this.input.getThrottleInput();
        const brakeInput = this.input.getBrakeInput();
        
        // Check for reset
        if (this.input.checkReset()) {
            // Remove finish banner if it exists
            const finishBanner = document.getElementById('finishBanner');
            if (finishBanner) {
                finishBanner.remove();
            }

            // High score is updated when finishing the course, not on reset

            this.vehicle.reset();
            this.cones.reset();
            this.finished = false;
            this.startTime = performance.now();
            
            // Reset scoring
            this.score = 0;
            this.combo = 0;
            this.comboMultiplier = 1;
            this.checkpointsPassed = 0;
            this.lastCheckpointIndex = -1;
            
            // Reset checkpoints
            if (this.environment && this.environment.checkpoints) {
                this.environment.checkpoints.forEach(cp => cp.passed = false);
            }
            
            // Reset UI
            this.updateScoreDisplay();
            document.getElementById('checkpointCount').textContent = 'Checkpoints: 0/10';
            
            // Show dashboard again
            const dashboard = document.querySelector('.dashboard');
            if (dashboard) {
                dashboard.style.opacity = '1';
            }
        }
        
        this.vehicle.update(deltaTime, steeringInput, throttleInput, brakeInput);
        
        // Check for checkpoint passes and jump scoring
        if (!this.vehicle.crashed && !this.finished) {
            this.checkCheckpoints();
            this.checkJumpScoring();
        }

        // Check for finish line crossing
        if (!this.finished && !this.vehicle.crashed && this.environment.finishLinePosition) {
            const distanceToFinish = this.vehicle.position.distanceTo(this.environment.finishLinePosition);
            if (distanceToFinish < 5) { // Within 5 units of finish line
                this.finished = true;
                this.finishTime = performance.now() - this.startTime;
                this.showFinishScreen();
            }
        }

        // Update traffic
        if (this.traffic) {
            const collision = this.traffic.update(deltaTime, this.vehicle.position);
            if (collision && collision.hit && !this.vehicle.crashed) {
                this.vehicle.crashed = true;
                this.vehicle.crashAngle = this.vehicle.leanAngle || 0.5;
                this.vehicle.frame.material.color.setHex(0xff00ff); // Magenta for traffic collision
                
                // Calculate impact direction based on car position
                const car = collision.car;
                if (car && car.carGroup) {
                    const impactDir = new THREE.Vector3(
                        this.vehicle.position.x - car.carGroup.position.x,
                        0,
                        this.vehicle.position.z - car.carGroup.position.z
                    ).normalize();
                    
                    // Combine vehicle and car speeds for impact force
                    const relativeSpeed = this.vehicle.speed + car.currentSpeed * 0.5;
                    const impactForce = Math.min(relativeSpeed * 0.3, 8);
                    
                    this.vehicle.velocity = impactDir.multiplyScalar(impactForce);
                    this.vehicle.velocity.y = 4; // Upward force from impact
                } else {
                    // Fallback if car data not available
                    const impactForce = Math.min(this.vehicle.speed * 0.3, 6);
                    this.vehicle.velocity = new THREE.Vector3(
                        Math.random() - 0.5,
                        2,
                        Math.random() - 0.5
                    ).normalize().multiplyScalar(impactForce);
                }
                
                console.log('CRASHED! Hit a car at', (this.vehicle.speed * 2.237).toFixed(1) + ' mph');
            }
        }
        
        // Check cone collisions
        if (!this.vehicle.crashed) {
            this.cones.checkCollision(this.vehicle.position);
        }
        
        this.updateCamera();
        this.updateUI();
        
        // Update directional light to follow vehicle
        this.directionalLight.position.x = this.vehicle.position.x + 50;
        this.directionalLight.position.z = this.vehicle.position.z;
        this.directionalLight.target.position.copy(this.vehicle.position);
        this.directionalLight.target.updateMatrixWorld();

        // Subtle intensity variation for natural lighting
        const time = performance.now() * 0.001;
        this.directionalLight.intensity = 0.8 + Math.sin(time * 0.1) * 0.05;

        // Update headlights
        const headlightOffset = new THREE.Vector3(0, 0.5, 0.7);
        headlightOffset.applyEuler(new THREE.Euler(0, this.vehicle.yawAngle, 0));

        this.leftHeadlight.position.copy(this.vehicle.position).add(new THREE.Vector3(-0.3, 0, 0).applyEuler(new THREE.Euler(0, this.vehicle.yawAngle, 0))).add(headlightOffset);
        this.rightHeadlight.position.copy(this.vehicle.position).add(new THREE.Vector3(0.3, 0, 0).applyEuler(new THREE.Euler(0, this.vehicle.yawAngle, 0))).add(headlightOffset);

        const targetOffset = new THREE.Vector3(0, 0, 50);
        targetOffset.applyEuler(new THREE.Euler(0, this.vehicle.yawAngle, 0));

        this.leftHeadlight.target.position.copy(this.vehicle.position).add(targetOffset);
        this.rightHeadlight.target.position.copy(this.vehicle.position).add(targetOffset);

        this.leftHeadlight.target.updateMatrixWorld();
        this.rightHeadlight.target.updateMatrixWorld();

        // Update rim light to follow behind vehicle
        this.rimLight.position.set(this.vehicle.position.x, 10, this.vehicle.position.z - 50);

        this.renderer.render(this.scene, this.camera);
    }

    checkCheckpoints() {
        if (!this.environment || !this.environment.checkpoints) return;
        
        for (let checkpoint of this.environment.checkpoints) {
            if (!checkpoint.passed) {
                const dx = this.vehicle.position.x - checkpoint.position.x;
                const dz = this.vehicle.position.z - checkpoint.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                // Check if within checkpoint gate (16 units wide)
                if (distance < checkpoint.width) {
                    // Check if this is the next expected checkpoint (in order)
                    if (checkpoint.index === this.lastCheckpointIndex + 1 || 
                        (this.lastCheckpointIndex === 9 && checkpoint.index === 0)) {
                        
                        checkpoint.passed = true;
                        this.lastCheckpointIndex = checkpoint.index;
                        this.checkpointsPassed++;
                        
                        // Award points
                        const points = checkpoint.points * this.comboMultiplier;
                        this.addScore(points);
                        
                        // Increase combo
                        this.combo++;
                        if (this.combo >= 3) {
                            this.comboMultiplier = Math.min(this.combo / 2, 5); // Max 5x multiplier
                        }
                        
                        // Show checkpoint notification
                        this.showCheckpointNotification(checkpoint.index + 1, points);
                        
                        console.log(`Checkpoint ${checkpoint.index + 1} passed! +${points} points`);
                    }
                }
            }
        }
    }
    
    checkJumpScoring() {
        if (!this.vehicle.isJumping) {
            // Check if we just landed
            if (this.wasJumping) {
                this.wasJumping = false;
                
                // Calculate jump score based on air time and rotation
                const jumpRotation = Math.abs(this.vehicle.jumpRotation);
                let jumpScore = 50; // Base jump score
                
                // Bonus for flips
                if (jumpRotation > Math.PI * 1.5) {
                    // More than 1.5 rotations
                    jumpScore += 500;
                    this.showJumpBonus("DOUBLE FLIP! +500");
                } else if (jumpRotation > Math.PI * 0.8) {
                    // Nearly full rotation
                    jumpScore += 200;
                    this.showJumpBonus("FLIP! +200");
                } else if (jumpRotation > Math.PI * 0.4) {
                    // Half rotation
                    jumpScore += 100;
                    this.showJumpBonus("HALF FLIP! +100");
                }
                
                jumpScore *= this.comboMultiplier;
                this.addScore(jumpScore);
                
                // Increase combo for successful jump
                this.combo++;
                if (this.combo >= 3) {
                    this.comboMultiplier = Math.min(this.combo / 2, 5);
                }
            }
        } else {
            this.wasJumping = true;
        }
    }
    
    addScore(points) {
        this.score += Math.round(points);
        this.updateScoreDisplay();
        
        // Update high score if needed
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('motorcycleHighScore', this.highScore.toString());
            this.updateHighScoreDisplay();
        }
    }
    
    updateScoreDisplay() {
        document.getElementById('score').textContent = this.score.toLocaleString();
        document.getElementById('comboMultiplier').textContent = `${this.comboMultiplier.toFixed(1)}x`;
        
        if (this.combo > 0) {
            const comboDisplay = document.getElementById('comboDisplay');
            comboDisplay.textContent = `COMBO x${this.combo}`;
            comboDisplay.style.animation = 'none';
            setTimeout(() => { comboDisplay.style.animation = 'pulse 0.5s ease-in-out'; }, 10);
        }
    }
    
    showCheckpointNotification(checkpointNum, points) {
        const notification = document.createElement('div');
        notification.className = 'checkpoint-notification';
        notification.textContent = `CHECKPOINT ${checkpointNum}/10! +${points}`;
        document.body.appendChild(notification);
        
        // Update checkpoint counter
        document.getElementById('checkpointCount').textContent = `Checkpoints: ${this.checkpointsPassed}/10`;
        
        setTimeout(() => {
            notification.remove();
        }, 1000);
    }
    
    showJumpBonus(text) {
        const notification = document.createElement('div');
        notification.className = 'checkpoint-notification';
        notification.style.color = '#FF69B4';
        notification.textContent = text;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 1000);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new Game();
});