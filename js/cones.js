class Cones {
    constructor(scene, environment) {
        this.scene = scene;
        this.environment = environment;
        this.cones = [];
        this.createCones();
    }
    
    createCones() {
        // Place cones strategically for slalom and corner markers
        const conePositions = [];
        
        // Use the environment's road path if available
        if (this.environment && this.environment.roadPath) {
            // Place cones at strategic intervals
            // More cones on straights for slalom, fewer in corners
            this.environment.roadPath.forEach((point, index) => {
                // Check if this is a turning section by looking at heading change
                const prevIndex = Math.max(0, index - 1);
                const nextIndex = Math.min(index + 1, this.environment.roadPath.length - 1);
                const headingChange = Math.abs(
                    this.environment.roadPath[nextIndex].heading - 
                    this.environment.roadPath[prevIndex].heading
                );
                
                // Place cones based on section type
                if (headingChange < 0.02) {
                    // Straight section - place slalom cones every 3 segments
                    if (index % 3 === 0 && index > 10 && index < this.environment.roadPath.length - 10) {
                        conePositions.push({
                            x: point.x,
                            z: point.z
                        });
                    }
                } else if (index % 5 === 0) {
                    // Corner section - fewer cones, marking the apex
                    conePositions.push({
                        x: point.x,
                        z: point.z
                    });
                }
            });
        } else {
            // Fallback: simple straight line
            for (let i = 0; i < 20; i++) {
                conePositions.push({ 
                    x: 0, 
                    z: 40 + i * 25
                });
            }
        }
        
        // Create the cone meshes
        const coneGeometry = new THREE.ConeGeometry(0.25, 0.8, 6);
        const coneMaterial = new THREE.MeshLambertMaterial({ color: 0xff6600 });
        
        conePositions.forEach((pos, index) => {
            const cone = new THREE.Mesh(coneGeometry, coneMaterial);
            cone.position.set(pos.x, 0.4, pos.z);
            this.scene.add(cone);
            this.cones.push(cone);
            
            // Add base
            const baseGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.05, 6);
            const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
            const base = new THREE.Mesh(baseGeometry, baseMaterial);
            base.position.set(pos.x, 0.025, pos.z);
            this.scene.add(base);
            
            // Add slalom guide patches
            if (index > 0) {
                const pathGeometry = new THREE.PlaneGeometry(5, 1.5);
                const pathMaterial = new THREE.MeshLambertMaterial({
                    color: 0xffff88,
                    transparent: true,
                    opacity: 0.2
                });
                
                const pathIndicator = new THREE.Mesh(pathGeometry, pathMaterial);
                pathIndicator.rotation.x = -Math.PI / 2;
                
                // Alternate sides for slalom
                const sideOffset = index % 2 === 1 ? 4 : -4;
                pathIndicator.position.set(pos.x + sideOffset, 0.01, pos.z);
                
                this.scene.add(pathIndicator);
            }
        });
        
        // Add start/finish lines
        this.createStartFinishMarkers();
    }
    
    createStartFinishMarkers() {
        // Start line
        const startGeometry = new THREE.PlaneGeometry(16, 2);
        const startMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x00ff00,
            transparent: true,
            opacity: 0.6
        });
        const startLine = new THREE.Mesh(startGeometry, startMaterial);
        startLine.rotation.x = -Math.PI / 2;
        startLine.position.set(0, 0.03, 20);
        this.scene.add(startLine);
        
        // Finish line
        if (this.environment && this.environment.roadPath.length > 0) {
            const lastPoint = this.environment.roadPath[this.environment.roadPath.length - 1];
            const finishMaterial = new THREE.MeshLambertMaterial({ 
                color: 0xffffff,
                transparent: true,
                opacity: 0.6
            });
            const finishLine = new THREE.Mesh(startGeometry, finishMaterial);
            finishLine.rotation.x = -Math.PI / 2;
            finishLine.rotation.z = -lastPoint.heading;
            finishLine.position.set(lastPoint.x, 0.03, lastPoint.z + 20);
            this.scene.add(finishLine);
        }
    }
    
    checkCollision(vehiclePosition) {
        const hitDistance = 1;
        
        for (let cone of this.cones) {
            const distance = Math.sqrt(
                Math.pow(vehiclePosition.x - cone.position.x, 2) +
                Math.pow(vehiclePosition.z - cone.position.z, 2)
            );
            
            if (distance < hitDistance) {
                if (cone.rotation.z === 0) {
                    cone.rotation.z = Math.PI / 3;
                    cone.position.y = 0.2;
                    console.log('Cone hit!');
                }
            }
        }
    }
    
    reset() {
        this.cones.forEach(cone => {
            cone.rotation.z = 0;
            cone.position.y = 0.4;
        });
    }
}