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
        this.cones = new Cones(this.scene, this.environment, (points) => {
            this.addScore(points);
            this.showConeHitNotification(points);
            this.soundManager.playConeHitSound();
        });
        
        console.log('Creating traffic...');
        this.traffic = new Traffic(this.scene, this.environment);
        
        console.log('Creating vehicle...');
        this.vehicle = new Vehicle(this.scene, (points) => this.addScore(points));
        this.vehicle.environment = this.environment; // Pass environment reference for elevation
        
        // Initialize vehicle at proper road height
        if (this.environment.roadPath && this.environment.roadPath.length > 0) {
            const startY = this.environment.roadPath[0].y || 0;
            this.vehicle.position.y = startY;
        }
        
        this.input = new InputHandler();

        // Initialize sound system
        this.soundManager = new SoundManager();

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
        this.checkpointTimes = []; // Track when each checkpoint was passed
        this.lastCheckpointPosition = null; // Store last checkpoint position for restart
        this.lastCheckpointHeading = 0;
        this.checkpointRestartPressed = false;
        
        // High score tracking
        this.highScore = parseInt(localStorage.getItem('motorcycleHighScore') || '0');
        this.updateHighScoreDisplay();

        // Finish state
        this.finished = false;
        this.finishTime = 0;
        this.startTime = performance.now();

        // Help flags
        this.hasShownWheelieHelp = false;

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
        // Reduced density to better show layered mountains
        this.scene.fog = new THREE.FogExp2(0x9db4c8, 0.0015);
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
        
        // Start camera from above for intro animation
        this.camera.position.set(0, 50, -15); // Start high above
        this.camera.lookAt(0, 0, 0);
        
        // Camera intro animation state
        this.cameraIntroActive = true;
        this.cameraIntroStartTime = performance.now();
        this.cameraIntroDuration = 2500; // 2.5 seconds intro
        this.cameraIntroStartPos = new THREE.Vector3(0, 50, -15);
        this.cameraIntroEndPos = new THREE.Vector3(0, 5, -10);
        
        // Dynamic camera offset for mountain roads
        this.baseCameraOffset = new THREE.Vector3(0, 3, -6); // Even closer view for more immersion
        this.cameraOffset = this.baseCameraOffset.clone();
        this.cameraTarget = new THREE.Vector3();
        this.currentCameraPos = this.camera.position.clone();
        this.currentLookTarget = new THREE.Vector3(0, 1, 0);
        this.cameraLerpFactor = 0.08; // Slightly faster response for mountain roads
        this.cameraLateralOffset = 0; // Track lateral offset for smooth side movement
        this.previousYawAngle = 0; // Track yaw changes for lateral movement
        console.log('Camera setup complete - starting intro animation');
    }



    updateCamera() {
        // Handle camera intro animation
        if (this.cameraIntroActive) {
            const elapsed = performance.now() - this.cameraIntroStartTime;
            const progress = Math.min(elapsed / this.cameraIntroDuration, 1);
            
            // Use easing function for smooth animation (ease-in-out)
            const easeProgress = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            // Interpolate camera position from above to behind vehicle
            this.camera.position.lerpVectors(
                this.cameraIntroStartPos,
                this.cameraIntroEndPos,
                easeProgress
            );
            
            // Look at the vehicle
            this.camera.lookAt(this.vehicle.position.x, this.vehicle.position.y + 1, this.vehicle.position.z);
            
            // End intro when complete
            if (progress >= 1) {
                this.cameraIntroActive = false;
                console.log('Camera intro complete');
            }
            
            return; // Skip normal camera update during intro
        }
        
        // Normal camera follow behavior
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

        // Wheelie camera swing - move camera to the side for dramatic wheelie view
        if (this.vehicle.isWheelie) {
            const wheelieSwing = 8; // How far to swing the camera laterally
            this.cameraOffset.x += wheelieSwing;
        }

        // Calculate camera position relative to vehicle
        const offset = this.cameraOffset.clone();
        offset.applyEuler(vehicleRotation);
        const cameraPos = vehiclePos.clone().add(offset);

        // Smooth camera movement with lag - faster when falling off cliff
        let lerpFactor = this.cameraLerpFactor;
        if (this.vehicle.fallingOffCliff) {
            lerpFactor = 0.4; // Even faster following during fall
            // Add slight camera shake during fall
            const shakeAmount = Math.min(Math.abs(this.vehicle.velocity.y) * 0.01, 0.5);
            cameraPos.x += (Math.random() - 0.5) * shakeAmount;
            cameraPos.y += (Math.random() - 0.5) * shakeAmount;
            cameraPos.z += (Math.random() - 0.5) * shakeAmount;
        }
        this.currentCameraPos.lerp(cameraPos, lerpFactor);
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

        // Add lean-based lateral offset for corner viewing
        const leanLateralOffset = -this.vehicle.leanAngle * 4; // Lean angle affects how far to look laterally
        const lateralVector = new THREE.Vector3(leanLateralOffset, 0, 0);
        lateralVector.applyEuler(vehicleRotation);
        lookTarget.add(lateralVector);
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

        // Update speedometer
        const speed = this.vehicle.getSpeed().toFixed(0);
        const speedElement = document.getElementById('speed');
        speedElement.textContent = speed;

        // Color code speed for speedometer
        if (speed < 20) {
            speedElement.style.color = '#FF4444'; // Red for too slow
            speedElement.style.textShadow = '0 0 15px rgba(255, 68, 68, 0.8)';
        } else if (speed < 40) {
            speedElement.style.color = '#FFAA44'; // Orange for slow
            speedElement.style.textShadow = '0 0 15px rgba(255, 170, 68, 0.8)';
        } else {
            speedElement.style.color = '#00FF00'; // Green for good speed
            speedElement.style.textShadow = '0 0 15px rgba(0, 255, 0, 0.8)';
        }

        // Update FPS
        document.getElementById('fps').textContent = `FPS: ${this.fps}`;
        
        // Update wheelie indicator
        this.updateWheelieIndicator();
        
        // Update score display
        this.updateScoreDisplay();
    }
    
    updateHighScoreDisplay() {
        document.getElementById('highScore').textContent = `Best: ${this.highScore.toLocaleString()}`;
    }
    
    updateWheelieIndicator() {
        const indicator = document.getElementById('wheelieIndicator');
        const zoneText = document.getElementById('wheelieZone');
        const comboText = document.getElementById('wheelieCombo');

        if (this.vehicle.isWheelie) {
            const angleDegrees = this.vehicle.wheelieAngle * 180 / Math.PI;
            const maxAngleDegrees = this.vehicle.wheelieCrashAngle * 180 / Math.PI; // 81 degrees
            const angleRatio = Math.min(1, angleDegrees / maxAngleDegrees); // 0 to 1 as we approach crash

            indicator.classList.add('active');

            // Remove all color classes to prevent position shifts
            indicator.classList.remove('perfect', 'good', 'danger', 'low');

            // Continuous color transition from green to orange to red
            let r, g, b;
            if (angleRatio < 0.5) {
                // Green to orange (0 to 0.5 ratio)
                const transition = angleRatio * 2; // 0 to 1
                r = Math.round(0 + transition * 255); // 0 to 255
                g = Math.round(255 - transition * 0); // 255 to 255
                b = 0;
            } else {
                // Orange to red (0.5 to 1.0 ratio)
                const transition = (angleRatio - 0.5) * 2; // 0 to 1
                r = Math.round(255 - transition * 0); // 255 to 255
                g = Math.round(165 - transition * 165); // 165 to 0
                b = 0;
            }

            // Apply the color continuously
            indicator.style.color = `rgb(${r}, ${g}, ${b})`;
            indicator.style.background = `rgba(${r}, ${g}, ${b}, 0.2)`;
            indicator.style.textShadow = `0 0 20px rgba(${r}, ${g}, ${b}, 0.8)`;

            // Show wheelie text with angle
            zoneText.textContent = `WHEELIE ${angleDegrees.toFixed(0)}°`;

            // Clear combo text (no longer using combo system)
            comboText.textContent = '';
        } else {
            indicator.classList.remove('active');
            // Reset styles when not active
            indicator.style.color = '';
            indicator.style.background = '';
            indicator.style.textShadow = '';
        }
    }

    showFinishScreen() {
        // Calculate final score with finish bonus
        const distance = this.vehicle.getDistanceTraveled();
        const timeSeconds = this.finishTime / 1000;
        const averageSpeed = distance / timeSeconds * 3.6 * 0.621371; // mph
        
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
                <div style="margin-bottom: 10px;">Average Speed: <span style="color: #9b59b6;">${averageSpeed.toFixed(1)} mph</span></div>
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
        const wheelieInput = this.input.getWheelieInput();
        
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
            this.checkpointTimes = []; // Reset checkpoint times

            // Reset checkpoints
            if (this.environment && this.environment.checkpoints) {
                this.environment.checkpoints.forEach(cp => cp.passed = false);
            }

            // Reset UI
            this.updateScoreDisplay();
            document.getElementById('checkpointCount').textContent = 'Checkpoints: 0/5';

            // Show dashboard again
            const dashboard = document.querySelector('.dashboard');
            if (dashboard) {
                dashboard.style.opacity = '1';
            }
        }

        // Check for sound toggle
        if (this.input.checkSoundToggle()) {
            this.soundManager.toggleSound();
        }

        // Check for checkpoint restart
        if (this.input.checkCheckpointRestart()) {
            if (this.lastCheckpointPosition) {
                this.restartFromCheckpoint();
            } else {
                console.log('No checkpoint available for restart');
            }
        }
        
        // Check for crash (before updating vehicle)
        const wasCrashed = this.vehicle.crashed;

        this.vehicle.update(deltaTime, steeringInput, throttleInput, brakeInput, wheelieInput);

        // Play crash sound if we just crashed
        if (!wasCrashed && this.vehicle.crashed) {
            this.soundManager.playCrashSound();
        }

        // Show wheelie help when over halfway round the course
        if (!this.hasShownWheelieHelp && !this.vehicle.crashed && !this.finished) {
            if (this.checkpointsPassed >= 3) { // Show after passing 3 checkpoints (over halfway)
                this.showWheelieHelpNotification();
                this.hasShownWheelieHelp = true;
            }
        }

        // Update engine sound based on speed
        if (!this.vehicle.crashed && !this.finished) {
            const speedRatio = this.vehicle.speed / this.vehicle.maxSpeed;
            this.soundManager.playEngineSound(speedRatio);
        } else {
            this.soundManager.stopEngineSound();
        }

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

        // Check if vehicle is in roadworks zone
        let inRoadworksZone = false;
        if (this.environment.roadworksZones) {
            let currentSegment = 0;
            if (this.vehicle.currentRoadSegment < this.environment.roadPath.length) {
                currentSegment = this.vehicle.currentRoadSegment;
            }
            for (const zone of this.environment.roadworksZones) {
                if (currentSegment >= zone.startSegment && currentSegment <= zone.endSegment) {
                    inRoadworksZone = true;
                    break;
                }
            }
        }

        // Update traffic
        if (this.traffic) {
            const collision = this.traffic.update(deltaTime, this.vehicle.position);
            if (collision && collision.hit && !this.vehicle.crashed && !inRoadworksZone) {
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
                        (this.lastCheckpointIndex === 4 && checkpoint.index === 0)) {
                        
                        checkpoint.passed = true;
                        this.lastCheckpointIndex = checkpoint.index;
                        this.checkpointsPassed++;

                        // Store checkpoint position for restart
                        this.lastCheckpointPosition = checkpoint.position.clone();
                        this.lastCheckpointHeading = checkpoint.heading;
                        console.log(`Checkpoint ${checkpoint.index + 1} stored for restart at position: ${checkpoint.position.x.toFixed(1)}, ${checkpoint.position.z.toFixed(1)}`);

                        // Record checkpoint pass time
                        const currentTime = performance.now();
                        this.checkpointTimes[checkpoint.index] = currentTime;

                        // Calculate speed-based points
                        let sectionTime = 0;
                        let basePoints = 100; // Base points per checkpoint

                        if (checkpoint.index > 0 && this.checkpointTimes[checkpoint.index - 1]) {
                            // Calculate time for this section
                            sectionTime = (currentTime - this.checkpointTimes[checkpoint.index - 1]) / 1000; // Convert to seconds

                            // Calculate actual distance between checkpoints
                            const prevCheckpoint = this.environment.checkpoints[checkpoint.index - 1];
                            const distance = checkpoint.position.distanceTo(prevCheckpoint.position);
                            const averageSpeed = distance / sectionTime; // m/s
                            const speedKmh = averageSpeed * 3.6; // km/h

                            // Award points based on speed (faster = more points)
                            // Base speed threshold: 60 km/h gives base points, faster gives bonus
                            const speedBonus = Math.max(0, speedKmh - 60) * 1.5; // 1.5 points per km/h over 60
                            basePoints += Math.floor(speedBonus);
                        } else if (checkpoint.index === 0) {
                            // First checkpoint gets base points
                            basePoints = 100;
                        }

                        // Apply combo multiplier
                        const points = basePoints * this.comboMultiplier;
                        this.addScore(points);
                        
                        // Increase combo
                        this.combo++;
                        if (this.combo >= 3) {
                            this.comboMultiplier = Math.min(this.combo / 2, 5); // Max 5x multiplier
                        }
                        
                        // Show checkpoint notification
                        this.showCheckpointNotification(checkpoint.index + 1, points);

                        // Play checkpoint sound
                        this.soundManager.playCheckpointSound();

                        // Log speed info for first checkpoint or sections
                        if (checkpoint.index === 0) {
                            console.log(`Checkpoint ${checkpoint.index + 1} passed! +${points} points`);
                        } else {
                            const speedKmh = ((200 / sectionTime) * 3.6).toFixed(1);
                            console.log(`Checkpoint ${checkpoint.index + 1} passed! +${points} points (${speedKmh} km/h)`);
                        }
                    }
                }
            }
        }
    }
    
    checkJumpScoring() {
        // Check if we just started jumping
        if (this.vehicle.isJumping && !this.wasJumping) {
            this.soundManager.playJumpSound();
        }

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
        notification.textContent = `CHECKPOINT ${checkpointNum}/5! +${points}`;
        document.body.appendChild(notification);
        
        // Update checkpoint counter
        document.getElementById('checkpointCount').textContent = `Checkpoints: ${this.checkpointsPassed}/5`;
        
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

    showWheelieHelpNotification() {
        const notification = document.createElement('div');
        notification.className = 'checkpoint-notification';
        notification.style.color = '#FFD700';
        notification.textContent = 'Press SPACE to pop clutch for a wheelie!';
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000); // Longer duration for help text
    }

    showConeHitNotification(points) {
        const notification = document.createElement('div');
        notification.className = 'checkpoint-notification';
        notification.style.color = '#FFA500'; // Orange color for cones
        notification.textContent = `CONE HIT! +${points}`;
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

class SoundManager {
    constructor() {
        this.audioContext = null;
        this.masterVolume = 0.3;
        this.enabled = false; // Start muted by default

        // Initialize audio context on user interaction
        this.initAudioContext();

        // Sound effect caches
        this.sounds = {};
    }

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    }

    // Create a simple beep sound
    createBeep(frequency = 440, duration = 0.2, type = 'sine') {
        if (!this.enabled || !this.audioContext) return;

        // Resume audio context if suspended (required by Web Audio API)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = type;

        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.5, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    // Engine sound (continuous)
    playEngineSound(speed = 0) {
        if (!this.enabled || !this.audioContext) return;

        // Resume audio context if suspended (required by Web Audio API)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        // Stop previous engine sound
        if (this.engineSound) {
            this.engineSound.stop();
        }

        const baseFreq = 80 + (speed * 40); // 80-120 Hz based on speed
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
        oscillator.type = 'sawtooth';

        // Add some harmonics
        const harmonicOsc = this.audioContext.createOscillator();
        const harmonicGain = this.audioContext.createGain();
        harmonicOsc.connect(harmonicGain);
        harmonicGain.connect(gainNode);

        harmonicOsc.frequency.setValueAtTime(baseFreq * 2, this.audioContext.currentTime);
        harmonicOsc.type = 'square';

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200 + speed * 100, this.audioContext.currentTime);

        gainNode.gain.setValueAtTime(this.masterVolume * 0.2, this.audioContext.currentTime);

        oscillator.start();
        harmonicOsc.start();

        this.engineSound = {
            oscillator: oscillator,
            harmonicOsc: harmonicOsc,
            gainNode: gainNode,
            stop: () => {
                try {
                    oscillator.stop();
                    harmonicOsc.stop();
                } catch (e) {}
            }
        };
    }

    stopEngineSound() {
        if (this.engineSound) {
            this.engineSound.stop();
            this.engineSound = null;
        }
    }

    // Checkpoint pass sound
    playCheckpointSound() {
        // Ascending chime
        setTimeout(() => this.createBeep(523, 0.15), 0);   // C5
        setTimeout(() => this.createBeep(659, 0.15), 100); // E5
        setTimeout(() => this.createBeep(784, 0.15), 200); // G5
    }

    // Cone hit sound
    playConeHitSound() {
        // Descending thud
        this.createBeep(220, 0.1, 'sawtooth'); // A3
        setTimeout(() => this.createBeep(165, 0.1, 'sawtooth'), 50); // E3
    }

    // Jump sound
    playJumpSound() {
        // Quick ascending whoosh
        this.createBeep(330, 0.08); // E4
        setTimeout(() => this.createBeep(440, 0.08), 40); // A4
        setTimeout(() => this.createBeep(554, 0.08), 80); // C#5
    }

    // Crash sound
    playCrashSound() {
        // Chaotic noise burst
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const freq = 100 + Math.random() * 200;
                this.createBeep(freq, 0.05 + Math.random() * 0.1, 'sawtooth');
            }, i * 20);
        }
    }

    // Tire screech
    playTireScreech() {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.3);
        oscillator.type = 'sawtooth';

        filter.type = 'highpass';
        filter.frequency.setValueAtTime(500, this.audioContext.currentTime);

        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.4, this.audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }

    // Brake sound
    playBrakeSound() {
        this.createBeep(150, 0.1, 'sawtooth');
    }

    // Toggle sound on/off
    toggleSound() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.stopEngineSound();
        }

        // Show sound toggle notification
        this.showSoundToggleNotification(this.enabled);

        console.log('Sound ' + (this.enabled ? 'enabled' : 'disabled'));
    }

    showSoundToggleNotification(enabled) {
        const notification = document.createElement('div');
        notification.className = 'checkpoint-notification';
        notification.style.color = enabled ? '#00ff00' : '#ff0000';
        notification.textContent = `SOUND ${enabled ? 'ON' : 'OFF'}`;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 1000);
    }

    restartFromCheckpoint() {
        if (!this.lastCheckpointPosition) {
            console.log('No checkpoint position available for restart');
            return;
        }

        console.log('Restarting from checkpoint at:', this.lastCheckpointPosition.x.toFixed(1), this.lastCheckpointPosition.z.toFixed(1));

        // Apply penalty - lose some score
        const penalty = 500;
        this.addScore(-penalty);

        // Reset vehicle to checkpoint position
        this.vehicle.position.copy(this.lastCheckpointPosition);
        this.vehicle.yawAngle = this.lastCheckpointHeading;
        this.vehicle.speed = 15; // Reset to moderate speed
        this.vehicle.leanAngle = 0;
        this.vehicle.leanVelocity = 0;
        this.vehicle.crashed = false;
        this.vehicle.isJumping = false;
        this.vehicle.isWheelie = false;
        this.vehicle.wheelieAngle = 0;
        this.vehicle.wheelieVelocity = 0;
        this.vehicle.jumpRotation = 0;
        this.vehicle.jumpVelocityY = 0;
        this.vehicle.wheelieAngle = 0;

        // Reset start time for timing
        this.startTime = performance.now();

        // Reset cones
        this.cones.reset();

        // Show notification
        const notification = document.createElement('div');
        notification.className = 'checkpoint-notification';
        notification.style.color = '#ff6600';
        notification.textContent = `RESTARTED FROM CHECKPOINT (-${penalty} points)`;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 2000);

        console.log('Restarted from checkpoint with penalty');
    }
}

// Debug key events
document.addEventListener('keydown', (event) => {
    if (event.code === 'KeyC') {
        console.log('Global C key detected');
    }
});

// Start the game when page loads
window.addEventListener('load', () => {
    window.game = new Game();
});