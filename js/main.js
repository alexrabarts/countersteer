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
        
        console.log('Creating vehicle...');
        this.vehicle = new Vehicle(this.scene);
        this.input = new InputHandler();
        
        this.clock = new THREE.Clock();
        this.time = 0; // For time-of-day cycle

        console.log('Starting animation loop...');
        this.animate();
    }

    init() {
        this.scene = new THREE.Scene();
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
        
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupScene() {
        // Sky blue background with distance fog
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 200, 800);
    }

    setupLighting() {
        // Ambient light - increased for better visibility
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        // Directional light (sun)
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.directionalLight.position.set(50, 50, 0);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.1;
        this.directionalLight.shadow.camera.far = 500;
        this.directionalLight.shadow.camera.left = -100;
        this.directionalLight.shadow.camera.right = 100;
        this.directionalLight.shadow.camera.top = 100;
        this.directionalLight.shadow.camera.bottom = -100;
        this.scene.add(this.directionalLight);

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
        this.cameraOffset = new THREE.Vector3(0, 4, -10); // Slightly higher and further back
        this.cameraTarget = new THREE.Vector3();
        console.log('Camera setup complete');
    }



    updateCamera() {
        // Follow camera - keep camera behind vehicle
        const vehiclePos = this.vehicle.position.clone();
        const vehicleRotation = new THREE.Euler(0, this.vehicle.yawAngle, 0);

        // Calculate camera position relative to vehicle
        const offset = this.cameraOffset.clone();
        offset.applyEuler(vehicleRotation);
        const cameraPos = vehiclePos.clone().add(offset);
        this.camera.position.copy(cameraPos);

        // Look at vehicle
        const lookTarget = this.vehicle.position.clone();
        lookTarget.y += 1;
        this.camera.lookAt(lookTarget);
    }

    updateLighting() {
        // Time-of-day cycle
        const dayLength = Math.PI * 2; // Full cycle
        const sunAngle = (this.time % dayLength) / dayLength * Math.PI * 2;

        // Sun elevation (0 to PI)
        const elevation = Math.sin(sunAngle) * Math.PI / 2 + Math.PI / 4; // From -pi/4 to 3pi/4

        // Light intensity based on elevation
        const lightIntensity = Math.max(0.1, Math.sin(elevation));

        // Light color: warmer at dawn/dusk
        const warmth = Math.max(0, Math.sin(elevation * 2) * 0.5 + 0.5);
        const lightColor = new THREE.Color().setHSL(0.1 - warmth * 0.05, 0.5, 0.5 + warmth * 0.3);

        // Update directional light
        this.directionalLight.intensity = lightIntensity * 0.8;
        this.directionalLight.color.copy(lightColor);
        this.directionalLight.position.set(
            this.vehicle.position.x + 50 * Math.cos(elevation),
            50 * Math.sin(elevation),
            this.vehicle.position.z
        );
        this.directionalLight.target.position.copy(this.vehicle.position);
        this.directionalLight.target.updateMatrixWorld();

        // Update ambient light
        this.scene.children.find(obj => obj.type === 'AmbientLight').intensity = 0.3 + lightIntensity * 0.3;

        // Update sky color
        const skyHue = 0.6 - warmth * 0.1; // Blue to orange
        const skySat = 0.5 + warmth * 0.2;
        const skyLight = 0.7 + lightIntensity * 0.3;
        this.scene.background.setHSL(skyHue, skySat, skyLight);

        // Update fog
        this.scene.fog.color.setHSL(skyHue, skySat, skyLight * 0.8);

        // Update directional light to follow vehicle (adjusted for sun position)
        // Already done above

        // Update headlights (only at night)
        const nightFactor = Math.max(0, 1 - lightIntensity * 2);
        this.leftHeadlight.intensity = 1 * nightFactor;
        this.rightHeadlight.intensity = 1 * nightFactor;

        // Update headlights positions
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
    }

    updateUI() {
        document.getElementById('speed').textContent = `Speed: ${this.vehicle.getSpeed().toFixed(0)} km/h`;
        
        const leanText = this.vehicle.crashed ? 
            `CRASHED! (Press R to reset)` : 
            `Lean: ${this.vehicle.getLeanAngleDegrees().toFixed(1)}°`;
        document.getElementById('lean').textContent = leanText;
        
        document.getElementById('leanVel').textContent = `Lean Rate: ${(this.vehicle.leanVelocity * 180 / Math.PI).toFixed(1)}°/s`;
        document.getElementById('steering').textContent = `Steering: ${this.vehicle.getSteeringAngleDegrees().toFixed(1)}°`;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        this.time += deltaTime * 0.1; // Slow time progression

        const steeringInput = this.input.getSteeringInput();
        const throttleInput = this.input.getThrottleInput();
        const brakeInput = this.input.getBrakeInput();
        
        // Check for reset
        if (this.input.checkReset()) {
            this.vehicle.reset();
            this.cones.reset();
        }
        
        this.vehicle.update(deltaTime, steeringInput, throttleInput, brakeInput);
        
        // Check cone collisions
        if (!this.vehicle.crashed) {
            this.cones.checkCollision(this.vehicle.position);
        }
        
        this.updateCamera();
        this.updateUI();

        this.updateLighting();

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
        
        this.renderer.render(this.scene, this.camera);
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