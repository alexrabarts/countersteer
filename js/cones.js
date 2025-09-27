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
                const signedHeadingChange = this.environment.roadPath[nextIndex].heading -
                    this.environment.roadPath[prevIndex].heading;
                const headingChange = Math.abs(signedHeadingChange);

                // Place cones based on section type
                if (headingChange < 0.02) {
                    // Straight section - place slalom cones every 3 segments on alternating sides on grass
                    if (index % 3 === 0 && index > 10 && index < this.environment.roadPath.length - 10) {
                        const sideOffset = (Math.floor(index / 3) % 2 === 0) ? 10 : -10;
                        conePositions.push({
                            x: point.x + sideOffset,
                            z: point.z
                        });
                    }
                } else if (index % 5 === 0) {
                    // Corner section - place cones at apex, offset to the inside on grass
                    const turnDirection = signedHeadingChange > 0 ? 1 : -1;
                    const offset = turnDirection * 10;
                    conePositions.push({
                        x: point.x + offset,
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
        const coneMaterial = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.8, metalness: 0.0, emissive: 0x331100, emissiveIntensity: 0.1 });
        
        conePositions.forEach((pos, index) => {
            const cone = new THREE.Mesh(coneGeometry, coneMaterial);
            cone.position.set(pos.x, 0.4, pos.z);
            cone.castShadow = true;
            cone.receiveShadow = true;
            this.scene.add(cone);
            this.cones.push(cone);

            // Add sparse point lights for ambient illumination
            if (index % 10 === 0) {
                const ambientLight = new THREE.PointLight(0xffaa00, 0.3, 30);
                ambientLight.position.set(pos.x, 2, pos.z);
                this.scene.add(ambientLight);
            }

            // Add base
            const baseGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.05, 6);
            const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9, metalness: 0.0 });
            const base = new THREE.Mesh(baseGeometry, baseMaterial);
            base.position.set(pos.x, 0.025, pos.z);
            base.castShadow = true;
            base.receiveShadow = true;
            this.scene.add(base);
        });
        
        // Add start/finish lines
        this.createStartFinishMarkers();
    }
    
    createStartFinishMarkers() {
        // Start line
        const startGeometry = new THREE.PlaneGeometry(16, 2);
        const startMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.6,
            roughness: 0.7,
            metalness: 0.0,
            emissive: 0x002200,
            emissiveIntensity: 0.1
        });
        const startLine = new THREE.Mesh(startGeometry, startMaterial);
        startLine.rotation.x = -Math.PI / 2;
        startLine.position.set(0, 0.03, 20);
        startLine.receiveShadow = true;
        this.scene.add(startLine);

        // Start line light
        const startLight = new THREE.PointLight(0x00ff00, 0.5, 50);
        startLight.position.set(0, 5, 20);
        this.scene.add(startLight);
        
        // Finish line
        if (this.environment && this.environment.roadPath.length > 0) {
            const lastPoint = this.environment.roadPath[this.environment.roadPath.length - 1];
            const finishMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.6,
                roughness: 0.7,
                metalness: 0.0,
                emissive: 0x222222,
                emissiveIntensity: 0.1
            });
            const finishLine = new THREE.Mesh(startGeometry, finishMaterial);
            finishLine.rotation.x = -Math.PI / 2;
            finishLine.rotation.z = -lastPoint.heading;
            finishLine.position.set(lastPoint.x, 0.03, lastPoint.z + 20);
            finishLine.receiveShadow = true;
            this.scene.add(finishLine);

            // Finish line light
            const finishLight = new THREE.PointLight(0xffffff, 0.5, 50);
            finishLight.position.set(lastPoint.x, 5, lastPoint.z + 20);
            this.scene.add(finishLight);
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