class VirtualJoystick {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            size: options.size || 120,
            stickSize: options.stickSize || 40,
            threshold: options.threshold || 0.1,
            position: options.position || 'left',
            ...options
        };
        
        this.active = false;
        this.value = { x: 0, y: 0 };
        this.touchId = null;
        
        this.createJoystick();
        this.setupEventListeners();
    }
    
    createJoystick() {
        this.base = document.createElement('div');
        this.base.className = 'joystick-base';
        this.base.style.cssText = `
            position: absolute;
            width: ${this.options.size}px;
            height: ${this.options.size}px;
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            ${this.options.position === 'left' ? 'left: 20px;' : 'right: 20px;'}
            bottom: 20px;
            touch-action: none;
            z-index: 1000;
        `;
        
        this.stick = document.createElement('div');
        this.stick.className = 'joystick-stick';
        this.stick.style.cssText = `
            position: absolute;
            width: ${this.options.stickSize}px;
            height: ${this.options.stickSize}px;
            background: rgba(255, 255, 255, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.8);
            border-radius: 50%;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            transition: background 0.1s;
            pointer-events: none;
        `;
        
        this.base.appendChild(this.stick);
        this.container.appendChild(this.base);
    }
    
    setupEventListeners() {
        this.base.addEventListener('touchstart', this.handleStart.bind(this), { passive: false });
        this.base.addEventListener('mousedown', this.handleStart.bind(this));
        
        document.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });
        document.addEventListener('mousemove', this.handleMove.bind(this));
        
        document.addEventListener('touchend', this.handleEnd.bind(this));
        document.addEventListener('mouseup', this.handleEnd.bind(this));
    }
    
    handleStart(e) {
        e.preventDefault();
        this.active = true;
        
        if (e.touches) {
            this.touchId = e.touches[0].identifier;
            this.updatePosition(e.touches[0]);
        } else {
            this.updatePosition(e);
        }
        
        this.stick.style.background = 'rgba(255, 255, 255, 0.8)';
    }
    
    handleMove(e) {
        if (!this.active) return;
        e.preventDefault();
        
        if (e.touches) {
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === this.touchId) {
                    this.updatePosition(e.touches[i]);
                    break;
                }
            }
        } else {
            this.updatePosition(e);
        }
    }
    
    handleEnd(e) {
        if (!this.active) return;
        
        if (e.touches) {
            let stillActive = false;
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === this.touchId) {
                    stillActive = true;
                    break;
                }
            }
            if (stillActive) return;
        }
        
        this.active = false;
        this.touchId = null;
        this.value = { x: 0, y: 0 };
        
        this.stick.style.transform = 'translate(-50%, -50%)';
        this.stick.style.background = 'rgba(255, 255, 255, 0.5)';
        
        if (this.options.onRelease) {
            this.options.onRelease();
        }
    }
    
    updatePosition(touch) {
        const rect = this.base.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        let x = touch.clientX - centerX;
        let y = touch.clientY - centerY;
        
        const distance = Math.sqrt(x * x + y * y);
        const maxDistance = this.options.size / 2 - this.options.stickSize / 2;
        
        if (distance > maxDistance) {
            const angle = Math.atan2(y, x);
            x = Math.cos(angle) * maxDistance;
            y = Math.sin(angle) * maxDistance;
        }
        
        this.value.x = x / maxDistance;
        this.value.y = -y / maxDistance;
        
        if (Math.abs(this.value.x) < this.options.threshold) {
            this.value.x = 0;
        }
        if (Math.abs(this.value.y) < this.options.threshold) {
            this.value.y = 0;
        }
        
        this.stick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        
        if (this.options.onMove) {
            this.options.onMove(this.value);
        }
    }
    
    getValue() {
        return this.value;
    }
    
    destroy() {
        this.base.remove();
    }
}