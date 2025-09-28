class InputHandler {
    constructor() {
        this.keys = {};
        this.steeringInput = 0;
        this.throttleInput = 0;
        this.brakeInput = 0;
        this.resetPressed = false;
        this.virtualControls = null;
        this.setupEventListeners();
        this.setupMobileControls();
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
        // Check both keyboard and virtual controls
        // WASD keys
        const keyA = this.keys['KeyA'] || (this.virtualControls && this.virtualControls.getKey('KeyA'));
        const keyD = this.keys['KeyD'] || (this.virtualControls && this.virtualControls.getKey('KeyD'));
        const keyW = this.keys['KeyW'] || (this.virtualControls && this.virtualControls.getKey('KeyW'));
        const keyS = this.keys['KeyS'] || (this.virtualControls && this.virtualControls.getKey('KeyS'));
        
        // Arrow keys
        const keyLeft = this.keys['ArrowLeft'];
        const keyRight = this.keys['ArrowRight'];
        const keyUp = this.keys['ArrowUp'];
        const keyDown = this.keys['ArrowDown'];
        
        // Steering (inverted) - combine WASD and arrow keys
        this.steeringInput = 0;
        if (keyA || keyLeft) {
            this.steeringInput = 1;  // A/Left now steers right
        }
        if (keyD || keyRight) {
            this.steeringInput = -1;  // D/Right now steers left
        }
        
        // Throttle and brake - combine WASD and arrow keys
        this.throttleInput = (keyW || keyUp) ? 1 : 0;
        this.brakeInput = (keyS || keyDown) ? 1 : 0;
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
        // Check virtual control reset button
        if (this.virtualControls && this.virtualControls.getKey('KeyR')) {
            this.virtualControls.touches['KeyR'] = false; // Clear after use
            return true;
        }
        
        if (this.resetPressed) {
            this.resetPressed = false;
            return true;
        }
        return false;
    }
    
    setupMobileControls() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                        ('ontouchstart' in window) || 
                        (navigator.maxTouchPoints > 0);
        
        if (isMobile) {
            if (typeof VirtualControls !== 'undefined') {
                this.virtualControls = new VirtualControls();
            }
        }
    }
}