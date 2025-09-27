class InputHandler {
    constructor() {
        this.keys = {};
        this.steeringInput = 0;
        this.throttleInput = 0;
        this.brakeInput = 0;
        this.resetPressed = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
            this.updateInputs();
            
            // Check for reset
            if (event.code === 'KeyR') {
                this.resetPressed = true;
            }
        });

        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
            this.updateInputs();
            
            if (event.code === 'KeyR') {
                this.resetPressed = false;
            }
        });
    }

    updateInputs() {
        // Steering
        this.steeringInput = 0;
        if (this.keys['KeyA']) {
            this.steeringInput = -1;
        }
        if (this.keys['KeyD']) {
            this.steeringInput = 1;
        }
        
        // Throttle and brake
        this.throttleInput = this.keys['KeyW'] ? 1 : 0;
        this.brakeInput = this.keys['KeyS'] ? 1 : 0;
    }

    getSteeringInput() {
        return this.steeringInput;
    }
    
    getThrottleInput() {
        return this.throttleInput;
    }
    
    getBrakeInput() {
        return this.brakeInput;
    }
    
    checkReset() {
        if (this.resetPressed) {
            this.resetPressed = false;
            return true;
        }
        return false;
    }
}