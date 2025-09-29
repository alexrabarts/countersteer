class Environment {
    constructor(scene) {
        this.scene = scene;
        this.roadPath = []; // Store the path for other uses
        this.finishLinePosition = null; // Store finish line position for detection
        this.roadworksZones = []; // Store construction zones
        this.jumpRamps = []; // Store jump ramp objects for collision detection
        this.roadworkObstacles = []; // Store barriers and equipment for collision detection
        this.boulders = []; // Store boulder objects for collision detection
        this.checkpoints = []; // Store checkpoint positions for scoring
        this.createRoad();
        this.createGrass();
        this.createLayeredMountains(); // Add layered mountain scenery
        this.createRoadMarkings();
        this.addEnvironmentalDetails();
        this.createRoadworks(); // Add construction zones
        this.addHairpinWarnings(); // Add hairpin bend warnings
        this.createCheckpoints(); // Add scoring checkpoints
    }
    
    createRoad() {
        // Create road texture
        const roadTexture = this.createRoadTexture();
        const roadMaterial = new THREE.MeshStandardMaterial({
            map: roadTexture,
            side: THREE.DoubleSide,
            roughness: 0.9,
            metalness: 0.0
        });
        
        const roadWidth = 16;
        const segmentLength = 20; // Shorter segments for smoother curves
        
        // Track position and heading as we build the road
        let currentX = 0;
        let currentZ = 0;
        let currentHeading = 0; // Current direction in radians (0 = north/+Z)
        
        // Define the course as a series of straights and turns
        // Each element defines how many segments and the turn rate per segment
        const courseLayout = [
            { segments: 10, turnRate: 0 },        // Start straight - 200m
            { segments: 5, turnRate: 0.10 },      // Right turn 1 - moderate
            { segments: 4, turnRate: 0 },         // Short straight
            { segments: 6, turnRate: 0.12 },      // Right turn 2 - sharper
            { segments: 3, turnRate: 0 },         // Very short straight
            { segments: 8, turnRate: 0.08 },      // Right turn 3 - gradual
            { segments: 5, turnRate: 0 },         // Straight
            { segments: 2, turnRate: 0 },         // Short approach to hairpin
            { segments: 7, turnRate: 0.25 },      // EXTREME HAIRPIN - almost 180 degrees
            { segments: 2, turnRate: 0 },         // Short exit from hairpin
            { segments: 4, turnRate: -0.10 },     // Left turn - moderate to change direction
            { segments: 6, turnRate: 0 },         // Straight
            { segments: 5, turnRate: -0.12 },     // Left turn 2 - sharper
            { segments: 3, turnRate: 0 },         // Short straight
            { segments: 5, turnRate: -0.08 },     // Left turn 3 - gradual back toward start
            { segments: 6, turnRate: 0 },         // Final straight back to start area
        ];
        
        // First, build the road path
        let segmentIndex = 0;
        courseLayout.forEach(section => {
            for (let i = 0; i < section.segments; i++) {
                // Calculate center position for this segment
                const centerX = currentX + (segmentLength/2) * Math.sin(currentHeading);
                const centerZ = currentZ + (segmentLength/2) * Math.cos(currentHeading);
                
                // Calculate elevation with smooth continuous function - dramatic mountain road
                const elevation = Math.sin(segmentIndex * 0.05) * 15 + Math.cos(segmentIndex * 0.03) * 12 + 25;
                
                // Store path point with elevation
                this.roadPath.push({
                    x: centerX,
                    z: centerZ,
                    y: elevation,
                    heading: currentHeading
                });
                
                // Update position for next segment
                currentX += segmentLength * Math.sin(currentHeading);
                currentZ += segmentLength * Math.cos(currentHeading);
                
                // Update heading for next segment
                currentHeading += section.turnRate;
                segmentIndex++;
            }
        });
        
        // Create continuous road surface
        this.createContinuousRoad(roadMaterial);
        
        console.log('Course created with', this.roadPath.length, 'segments');
        console.log('Start position:', this.roadPath[0]);
    }
    
    createContinuousRoad(roadMaterial) {
        const roadWidth = 16;
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];
        const uvs = [];
        
        // Create vertices for continuous road surface
        for (let i = 0; i < this.roadPath.length; i++) {
            const point = this.roadPath[i];
            const nextPoint = i < this.roadPath.length - 1 ? this.roadPath[i + 1] : point;
            
            // Smoothly interpolate elevation between points
            const y = point.y;
            const nextY = nextPoint.y;
            
            // Calculate perpendicular to road direction
            const perpX = Math.cos(point.heading) * roadWidth / 2;
            const perpZ = -Math.sin(point.heading) * roadWidth / 2;
            
            // Add vertices for left and right edge of road
            vertices.push(
                point.x - perpX, y, point.z - perpZ,  // Left edge
                point.x + perpX, y, point.z + perpZ   // Right edge
            );
            
            // Add UV coordinates
            uvs.push(0, i * 0.1, 1, i * 0.1);
        }
        
        // Create triangles connecting the vertices
        for (let i = 0; i < this.roadPath.length - 1; i++) {
            const baseIndex = i * 2;
            // Two triangles per road segment
            indices.push(
                baseIndex, baseIndex + 2, baseIndex + 1,
                baseIndex + 1, baseIndex + 2, baseIndex + 3
            );
        }
        
        // Set geometry attributes
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        // Create the road mesh
        const roadMesh = new THREE.Mesh(geometry, roadMaterial);
        roadMesh.receiveShadow = true;
        roadMesh.castShadow = true;
        this.scene.add(roadMesh);
        
        console.log('Created continuous road with', vertices.length / 3, 'vertices');
    }

    addRockFormations() {
        // Create rock materials with variation
        const rockMaterials = [
            new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.95, metalness: 0.0 }),
            new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.95, metalness: 0.0 }),
            new THREE.MeshStandardMaterial({ color: 0x5c5c5c, roughness: 0.95, metalness: 0.0 })
        ];
        
        // NOTE: Most rock formations are now handled by the faceted cliff walls
        // Only adding minimal standalone rocks to avoid floating objects
        
        // Occasional large rocks near the cliff base
        this.roadPath.forEach((point, index) => {
            if (index % 15 === 0) { // Much less frequent
                // Left side cliff rocks (elevated side) - properly grounded
                const cliffX = point.x - (18 + Math.random() * 8) * Math.cos(point.heading);
                const cliffZ = point.z + (18 + Math.random() * 8) * Math.sin(point.heading);
                const cliffY = point.y - 1;  // Ground level, partially embedded
                
                // Create irregular rock shape using multiple merged geometries
                const rockGroup = new THREE.Group();
                
                // Main rock body - more reasonable size
                const mainRockGeometry = new THREE.DodecahedronGeometry(2 + Math.random() * 2, 0);
                const mainRock = new THREE.Mesh(
                    mainRockGeometry, 
                    rockMaterials[Math.floor(Math.random() * rockMaterials.length)]
                );
                mainRock.position.set(0, 0, 0);
                mainRock.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );
                mainRock.scale.set(
                    1 + Math.random() * 0.5,
                    0.7 + Math.random() * 0.6,
                    1 + Math.random() * 0.5
                );
                mainRock.castShadow = true;
                mainRock.receiveShadow = true;
                rockGroup.add(mainRock);
                
                // Additional rock chunks for detail
                for (let j = 0; j < 2 + Math.floor(Math.random() * 2); j++) {
                    const chunkGeometry = new THREE.TetrahedronGeometry(1 + Math.random() * 2, 0);
                    const chunk = new THREE.Mesh(
                        chunkGeometry,
                        rockMaterials[Math.floor(Math.random() * rockMaterials.length)]
                    );
                    chunk.position.set(
                        (Math.random() - 0.5) * 4,
                        (Math.random() - 0.5) * 3,
                        (Math.random() - 0.5) * 4
                    );
                    chunk.rotation.set(
                        Math.random() * Math.PI,
                        Math.random() * Math.PI,
                        Math.random() * Math.PI
                    );
                    chunk.castShadow = true;
                    chunk.receiveShadow = true;
                    rockGroup.add(chunk);
                }
                
                rockGroup.position.set(cliffX, cliffY, cliffZ);
                this.scene.add(rockGroup);
            }
            
            // Small boulders only near the road edge
            if (index % 8 === 0 && Math.random() > 0.7) { // Less frequent
                const side = Math.random() > 0.5 ? 1 : -1;
                const boulderX = point.x + side * (10 + Math.random() * 3) * Math.cos(point.heading);
                const boulderZ = point.z - side * (10 + Math.random() * 3) * Math.sin(point.heading);
                const boulderY = point.y - 0.8;  // More deeply embedded

                const boulderRadius = 0.5 + Math.random() * 1.5;
                const boulderGeometry = new THREE.SphereGeometry(
                    boulderRadius,
                    6 + Math.floor(Math.random() * 3),
                    5 + Math.floor(Math.random() * 3)
                );
                const boulder = new THREE.Mesh(
                    boulderGeometry,
                    rockMaterials[Math.floor(Math.random() * rockMaterials.length)]
                );
                boulder.position.set(boulderX, boulderY, boulderZ);
                boulder.scale.set(
                    1 + Math.random() * 0.3,
                    0.7 + Math.random() * 0.4,
                    1 + Math.random() * 0.3
                );
                boulder.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );
                boulder.castShadow = true;
                boulder.receiveShadow = true;
                this.scene.add(boulder);

                // Store boulder for collision detection
                this.boulders.push({
                    position: new THREE.Vector3(boulderX, boulderY, boulderZ),
                    radius: boulderRadius,
                    mesh: boulder
                });
            }
        });
        
        // Rock face walls removed - now handled by faceted cliff walls in createRoadWalls()
    }
    
    createGuardRails() {
        // Create metal guard rails for dangerous sections
        const railHeight = 0.8;
        const postSpacing = 4; // meters between posts
        
        // Metal rail material
        const railMaterial = new THREE.MeshStandardMaterial({
            color: 0xc0c0c0,
            roughness: 0.6,
            metalness: 0.8
        });
        
        // Post material
        const postMaterial = new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0.8,
            metalness: 0.6
        });
        
        // Create continuous rail sections
        for (let i = 0; i < this.roadPath.length - 1; i++) {
            const point = this.roadPath[i];
            const nextPoint = this.roadPath[i + 1];
            
            // Determine if this section needs guard rails based on elevation drop
            const elevationDrop = Math.abs(point.y);
            const nextIndex = Math.min(i + 1, this.roadPath.length - 1);
            const headingChange = Math.abs(this.roadPath[nextIndex].heading - point.heading);
            
            // Add rails on curves and high elevation sections
            if (elevationDrop > 5 || headingChange > 0.02) {
                // Determine which side needs rails (outside of curves or both on dangerous sections)
                const railSide = headingChange > 0.02 ? (headingChange > 0 ? -1 : 1) : 0;
                
                if (railSide <= 0) {
                    // Left side rail - create as vertical cylindrical rail
                    const railGeometry = new THREE.CylinderGeometry(0.05, 0.05, 
                        Math.sqrt(Math.pow(nextPoint.x - point.x, 2) + Math.pow(nextPoint.z - point.z, 2)),
                        8
                    );
                    const rail = new THREE.Mesh(railGeometry, railMaterial);
                    
                    const perpX = Math.cos(point.heading) * 8.2;
                    const perpZ = -Math.sin(point.heading) * 8.2;
                    
                    // Position and rotate properly
                    rail.position.set(
                        (point.x + nextPoint.x) / 2 - perpX,
                        (point.y + nextPoint.y) / 2 + railHeight,
                        (point.z + nextPoint.z) / 2 - perpZ
                    );
                    rail.rotation.z = Math.PI / 2; // Rotate to horizontal
                    rail.rotation.y = point.heading;
                    rail.castShadow = true;
                    rail.receiveShadow = true;
                    this.scene.add(rail);
                }
                
                if (railSide >= 0 || elevationDrop > 10) {
                    // Right side rail - create as vertical cylindrical rail
                    const railGeometry = new THREE.CylinderGeometry(0.05, 0.05,
                        Math.sqrt(Math.pow(nextPoint.x - point.x, 2) + Math.pow(nextPoint.z - point.z, 2)),
                        8
                    );
                    const rail = new THREE.Mesh(railGeometry, railMaterial);
                    
                    const perpX = Math.cos(point.heading) * 8.2;
                    const perpZ = -Math.sin(point.heading) * 8.2;
                    
                    // Position and rotate properly
                    rail.position.set(
                        (point.x + nextPoint.x) / 2 + perpX,
                        (point.y + nextPoint.y) / 2 + railHeight,
                        (point.z + nextPoint.z) / 2 + perpZ
                    );
                    rail.rotation.z = Math.PI / 2; // Rotate to horizontal
                    rail.rotation.y = point.heading;
                    rail.castShadow = true;
                    rail.receiveShadow = true;
                    this.scene.add(rail);
                }
                
                // Add posts every few segments
                if (i % 2 === 0) {
                    const postGeometry = new THREE.BoxGeometry(0.1, railHeight + 0.2, 0.1);
                    
                    if (railSide <= 0) {
                        // Left post
                        const perpX = Math.cos(point.heading) * 8.2;
                        const perpZ = -Math.sin(point.heading) * 8.2;
                        const post = new THREE.Mesh(postGeometry, postMaterial);
                        post.position.set(
                            point.x - perpX,
                            point.y + (railHeight + 0.2) / 2,
                            point.z - perpZ
                        );
                        post.castShadow = true;
                        post.receiveShadow = true;
                        this.scene.add(post);
                    }
                    
                    if (railSide >= 0 || elevationDrop > 10) {
                        // Right post
                        const perpX = Math.cos(point.heading) * 8.2;
                        const perpZ = -Math.sin(point.heading) * 8.2;
                        const post = new THREE.Mesh(postGeometry, postMaterial);
                        post.position.set(
                            point.x + perpX,
                            point.y + (railHeight + 0.2) / 2,
                            point.z + perpZ
                        );
                        post.castShadow = true;
                        post.receiveShadow = true;
                        this.scene.add(post);
                    }
                }
            }
        }
    }
    
    createRoadWalls() {
        // Rock materials for boulders - lighter grey-brown variations matching cliff
        const rockMaterials = [
            new THREE.MeshStandardMaterial({ color: 0xa0a0a0, roughness: 0.98, metalness: 0.0 }), // Very light grey
            new THREE.MeshStandardMaterial({ color: 0x959595, roughness: 0.97, metalness: 0.0 }), // Light grey
            new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.96, metalness: 0.0 }), // Pale grey
            new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.98, metalness: 0.0 }), // Light-medium grey
            new THREE.MeshStandardMaterial({ color: 0xa09282, roughness: 0.97, metalness: 0.0 })  // Light grey-brown
        ];
        
        // Create continuous faceted rock walls with integrated slope
        const createFacetedCliff = (side, height, isDropOff) => {
            const group = new THREE.Group();
            
            // Create rock texture
            const rockTexture = this.createRockTexture();
            
            // Rock material with flat shading for faceted appearance
            const cliffMaterial = new THREE.MeshStandardMaterial({ 
                map: rockTexture,
                color: 0xffffff, // White base to let vertex colors show through
                vertexColors: true,
                roughness: 0.98, 
                metalness: 0.0,
                flatShading: true, // Enable flat shading for faceted look
                side: THREE.DoubleSide
            });
            
            // Create main cliff face geometry
            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            const indices = [];
            const colors = [];
            const uvs = [];
            
            // Higher resolution for detailed faceting
            const horizontalSubdivisions = 2; // Subdivide between road segments
            const verticalSegments = 20; // More vertical detail for facets
            
            // Create dense vertex grid with multi-layer displacement
            for (let i = 0; i < this.roadPath.length; i++) {
                const point = this.roadPath[i];
                const nextPoint = i < this.roadPath.length - 1 ? this.roadPath[i + 1] : point;
                const roadY = point.y || 0;
                
                // Create horizontal subdivisions between road points
                for (let h = 0; h < horizontalSubdivisions; h++) {
                    const hProgress = h / horizontalSubdivisions;
                    
                    // Interpolate position along road
                    const interpX = point.x + (nextPoint.x - point.x) * hProgress;
                    const interpZ = point.z + (nextPoint.z - point.z) * hProgress;
                    const interpY = roadY + ((nextPoint.y || 0) - roadY) * hProgress;
                    const interpHeading = point.heading + ((nextPoint.heading - point.heading) * hProgress);
                    
                    // Create vertical segments
                    for (let j = 0; j <= verticalSegments; j++) {
                        const verticalProgress = j / verticalSegments;
                        const currentHeight = height * verticalProgress;
                        
                        // Calculate base perpendicular distance with slope for walls
                        // Start closer to account for displacement pushing wall outward
                        let baseDistance = 6.5; // Reduced from 8 to eliminate gap
                        
                         if (side > 0 && isDropOff) {
                             // Right wall (drop-off) - add dramatic overhanging slope
                             // Start at road edge, slope inward as we go down
                             const slopeAmount = verticalProgress * verticalProgress * 50; // Quadratic slope for overhang
                             baseDistance -= slopeAmount;
                            
                             // Debug: Log slope amount for first segment
                             if (i === 0 && h === 0 && j % 5 === 0) {
                                 console.log(`Right cliff overhang at height ${verticalProgress.toFixed(2)}: base=${baseDistance.toFixed(1)}, slope=${slopeAmount.toFixed(1)}`);
                             }
                        } else if (side < 0 && !isDropOff) {
                            // Left wall (mountain) - dramatic overhanging slope as it goes up
                            // Creates an intimidating overhanging cliff face
                            const slopeAmount = verticalProgress * verticalProgress * 25; // Quadratic slope for overhang
                            baseDistance += slopeAmount;
                        }
                        
                        // Multi-layer displacement for natural rock face
                        const idx = i * horizontalSubdivisions + h;
                        
                        // Reduce displacement at base to prevent gaps
                        const heightFactor = Math.min(verticalProgress * 2, 1); // Ramps up from 0 at base to 1
                        
                        // Layer 1: Large rock formations (increased amplitude)
                        const primary = (Math.sin(idx * 0.12 + j * 0.18) * Math.cos(j * 0.08) + 
                                       Math.sin(idx * 0.08 - j * 0.15) * 0.7) * 8.0 * heightFactor;
                        
                        // Layer 2: Medium rock faces (more variation)
                        const secondary = (Math.sin(idx * 0.35 + j * 0.45) * Math.cos(idx * 0.25) +
                                         Math.cos(idx * 0.5 - j * 0.3) * 0.8) * 4.0 * heightFactor;
                        
                        // Layer 3: Small surface details (increased frequency and amplitude)
                        const tertiary = (Math.sin(idx * 1.2 + j * 1.5) * 0.6 +
                                        Math.cos(idx * 1.8 - j * 2.0) * 0.4) * 1.5 * heightFactor;
                        
                         // Layer 4: Micro details for texture
                         const micro = Math.sin(idx * 3.5 + j * 4.0) * 0.5 * heightFactor;

                         // Combine displacements with height-based variation
                         const totalDisplacement = primary + secondary + tertiary + micro;

                         // Apply faceting by quantizing displacement - smaller facets for more angular look
                         const facetSize = 1.2 + Math.sin(idx * 0.3) * 0.4; // Smaller variable facet size for sharper angles
                         const facetedDisplacement = Math.floor(totalDisplacement / facetSize) * facetSize;

                         // Calculate base final distance
                         const displacementScale = verticalProgress === 0 ? 0.15 : 0.55; // Further increased displacement scale for more pronounced faceting
                         let finalDistance = baseDistance + facetedDisplacement * displacementScale;

                          // Apply slope for overhang
                          if (side > 0 && isDropOff) {
                              const slopeAmount = verticalProgress * 150;
                              finalDistance += slopeAmount;
                          }

                          // Ensure minimum distance to prevent gaps at road edge (8 units from center)
                          finalDistance = Math.max(finalDistance, 9.4);
                        
                        // Calculate position
                        const perpX = Math.cos(interpHeading) * finalDistance * side;
                        const perpZ = -Math.sin(interpHeading) * finalDistance * side;
                        
                        vertices.push(
                            interpX + perpX,
                            interpY + currentHeight,
                            interpZ + perpZ
                        );
                        
                        // More realistic mountain rock colors with grey variations
                        // Base grey colors ranging from light to dark
                        const greyBase = 0.35 + Math.random() * 0.25; // 0.35 to 0.6
                        
                        // Add geological stratification layers
                        const stratumHeight = 8; // Height of each stratum in units
                        const stratumIndex = Math.floor((interpY + currentHeight) / stratumHeight);
                        const stratumVariation = (stratumIndex % 3) * 0.08; // Alternate between 3 rock layer types
                        
                        // Add variation based on height - darker at base, lighter up high
                        const heightVariation = verticalProgress * 0.15;
                        
                        // Add variation based on displacement - deeper crevices are darker
                        const depthVariation = Math.abs(facetedDisplacement) * 0.02;
                        
                        // Occasional brown/tan streaks for mineral deposits
                        const mineralStreak = (Math.sin(idx * 0.3 + j * 0.4) > 0.7) ? 0.08 : 0;
                        
                        // Weather staining - darker patches
                        const weathering = (Math.cos(idx * 0.5 - j * 0.3) > 0.6) ? -0.1 : 0;
                        
                        // Water staining - vertical dark streaks
                        const waterStainX = idx * 0.2;
                        const waterStain = (Math.sin(waterStainX) > 0.7 && verticalProgress < 0.8) ? -0.15 : 0;
                        
                        // Vegetation patches - sparse moss and lichen on less steep areas
                        let isVegetated = false;
                        let isBrown = false;
                        const vegetationNoise = Math.sin(idx * 0.25 + j * 0.35) * Math.cos(idx * 0.4 - j * 0.3);
                        const brownNoise = Math.cos(idx * 0.18 + j * 0.22) * Math.sin(idx * 0.35 - j * 0.28);
                        
                        // Much less vegetation - only in very specific spots
                        const vegetationChance = (1 - verticalProgress) * 0.2 + 
                                                (1 - Math.abs(facetedDisplacement) / 10) * 0.1;
                        
                        if (vegetationNoise > 0.6 && Math.random() < vegetationChance) {
                            isVegetated = true;
                        } else if (brownNoise > 0.5 && Math.random() < 0.15) {
                            // Occasional brown weathered rock
                            isBrown = true;
                        }
                        
                        if (isVegetated) {
                            // Darker, more muted green - almost grey-green
                            const greyGreenBase = 0.32 + Math.random() * 0.08;
                            const greenTint = 0.08 + Math.random() * 0.05; // Very subtle green
                            
                            colors.push(
                                greyGreenBase * 0.9,  // Slightly less red
                                greyGreenBase + greenTint,  // Very subtle green
                                greyGreenBase * 0.85   // Slightly less blue
                            );
                        } else if (isBrown) {
                            // Brown weathered rock patches
                            const brownBase = 0.35 + Math.random() * 0.1;
                            const brownTint = 0.05 + Math.random() * 0.03;
                            
                            colors.push(
                                brownBase + brownTint * 1.2,  // More red
                                brownBase,  // Base
                                brownBase - brownTint * 0.5   // Less blue
                            );
                        } else {
                        // Regular rock colors with green tinting for horizontal facets
                        const finalGrey = Math.max(0.2, Math.min(0.8,
                            greyBase + heightVariation - depthVariation + weathering + stratumVariation + waterStain));

                        // Add green tinting for horizontal areas (higher displacement creates flatter surfaces)
                        const horizontalFactor = Math.min(1, Math.abs(facetedDisplacement) / 6); // 0-1, higher for more displaced (horizontal) areas
                        const greenTintStrength = horizontalFactor * 0.12; // Up to 12% green tint for horizontal facets

                        // Add slight color tints for realism
                        const redTint = finalGrey + mineralStreak - greenTintStrength * 0.3; // Reduce red for green tint
                        const greenTint = finalGrey - 0.02 + greenTintStrength; // Add green for horizontal areas
                        const blueTint = finalGrey + 0.03 - greenTintStrength * 0.2; // Slight blue reduction

                        colors.push(
                            redTint,
                            greenTint,
                            blueTint
                        );
                        }
                        
                        // UV coordinates
                        uvs.push(idx * 0.1, verticalProgress);
                    }
                }
            }
            
            // Create triangles for the faceted wall
            const vertsPerColumn = verticalSegments + 1;
            const columnsPerSegment = horizontalSubdivisions;
            const totalColumns = this.roadPath.length * columnsPerSegment;
            
            for (let col = 0; col < totalColumns - 1; col++) {
                for (let row = 0; row < verticalSegments; row++) {
                    const bl = col * vertsPerColumn + row; // bottom left
                    const br = (col + 1) * vertsPerColumn + row; // bottom right
                    const tl = bl + 1; // top left
                    const tr = br + 1; // top right
                    
                    // Create two triangles with varied winding for natural facets
                    if ((col + row) % 2 === 0) {
                        indices.push(bl, br, tl);
                        indices.push(br, tr, tl);
                    } else {
                        indices.push(bl, tr, tl);
                        indices.push(bl, br, tr);
                    }
                }
            }
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            geometry.setIndex(indices);
            
            // Don't compute vertex normals - let flat shading handle it
            geometry.computeVertexNormals();
            
            // Main faceted cliff face
            const mainCliff = new THREE.Mesh(geometry, cliffMaterial);
            mainCliff.receiveShadow = true;
            mainCliff.castShadow = true;
            group.add(mainCliff);
            
            // Add boulders integrated into the cliff walls for visual interest
            // These will be positioned to look like they're part of the cliff face
            
            for (let i = 0; i < this.roadPath.length; i += 8) { // Regular spacing
                const point = this.roadPath[i];
                
                // Add rocks at various heights on the cliff
                if (Math.random() > 0.3) { // 70% chance for variety
                    
                    // Calculate how many rocks for this segment (1-3)
                    const numRocks = 1 + Math.floor(Math.random() * 2);
                    
                    for (let r = 0; r < numRocks; r++) {
                        const rockSize = 0.8 + Math.random() * 2.5;
                        const rockGeometry = new THREE.DodecahedronGeometry(rockSize, 0);
                        const rock = new THREE.Mesh(
                            rockGeometry,
                            rockMaterials[Math.floor(Math.random() * rockMaterials.length)]
                        );
                        
                        // Height position on cliff (0 = base, 1 = top)
                        const heightRatio = Math.random() * 0.7; // Don't go too high
                        const cliffHeight = Math.abs(height) * heightRatio;
                        
                        // Calculate base distance accounting for slope
                        let distance = 7.0; // Start closer than cliff base
                        if (side > 0 && isDropOff) {
                            // Right cliff - account for outward slope
                            distance += heightRatio * heightRatio * 30; // Less than cliff slope
                        } else if (side < 0 && !isDropOff) {
                            // Left cliff - account for overhang
                            distance += heightRatio * heightRatio * 15;
                        }
                        
                        // Add some random variation in distance
                        distance += (Math.random() - 0.5) * 2;
                        
                        const perpX = Math.cos(point.heading) * distance * side;
                        const perpZ = -Math.sin(point.heading) * distance * side;
                        
                        // Position the rock
                        if (height > 0) {
                            // Left side - mountain wall going up
                            rock.position.set(
                                point.x + perpX,
                                (point.y || 0) + cliffHeight,
                                point.z + perpZ
                            );
                        } else {
                            // Right side - cliff going down
                            rock.position.set(
                                point.x + perpX,
                                (point.y || 0) - cliffHeight,
                                point.z + perpZ
                            );
                        }
                        
                        // Random rotation for natural look
                        rock.rotation.set(
                            Math.random() * Math.PI * 2,
                            Math.random() * Math.PI * 2,
                            Math.random() * Math.PI * 2
                        );
                        
                        // Varied scaling for natural appearance
                        rock.scale.set(
                            1.0 + Math.random() * 0.5,
                            0.7 + Math.random() * 0.4,
                            1.0 + Math.random() * 0.5
                        );
                        
                        rock.castShadow = true;
                        rock.receiveShadow = true;
                        group.add(rock);
                    }
                }
                
                // Add some larger accent boulders at the base
                if (i % 15 === 0 && Math.random() > 0.5) {
                    const baseBoulderSize = 1.5 + Math.random() * 2;
                    const baseBoulder = new THREE.Mesh(
                        new THREE.DodecahedronGeometry(baseBoulderSize, 0),
                        rockMaterials[Math.floor(Math.random() * rockMaterials.length)]
                    );

                    // Position at cliff base
                    const baseDistance = 7.5 + Math.random() * 1.0;
                    const perpX = Math.cos(point.heading) * baseDistance * side;
                    const perpZ = -Math.sin(point.heading) * baseDistance * side;

                    // Embed in ground - adjust Y based on terrain side
                    const boulderX = point.x + perpX;
                    let boulderY;
                    if (side > 0) {
                        // Right side (drop-off) - position much lower to match terrain drop
                        boulderY = (point.y || 0) - 45 - baseBoulderSize * 0.4; // Terrain drops to -50, so -45 embeds in terrain
                    } else {
                        // Left side (mountain) - position at road level
                        boulderY = (point.y || 0) - baseBoulderSize * 0.4;
                    }
                    const boulderZ = point.z + perpZ;

                    baseBoulder.position.set(boulderX, boulderY, boulderZ);

                    baseBoulder.rotation.set(
                        Math.random() * Math.PI,
                        Math.random() * Math.PI,
                        Math.random() * Math.PI
                    );

                    baseBoulder.scale.set(
                        1.3 + Math.random() * 0.4,
                        0.8 + Math.random() * 0.3,
                        1.2 + Math.random() * 0.4
                    );

                    baseBoulder.castShadow = true;
                    baseBoulder.receiveShadow = true;
                    group.add(baseBoulder);

                    // Store boulder for collision detection (approximate as sphere)
                    this.boulders.push({
                        position: new THREE.Vector3(boulderX, boulderY, boulderZ),
                        radius: baseBoulderSize * 0.6, // Approximate radius for dodecahedron
                        mesh: baseBoulder
                    });
                }
            }
            
            // Add crack systems to cliff face
            const crackMaterial = new THREE.MeshStandardMaterial({
                color: 0x1a1a1a,
                roughness: 1.0,
                metalness: 0.0,
                side: THREE.DoubleSide
            });
            
            // Create major vertical cracks
            for (let i = 0; i < this.roadPath.length; i += 25) {
                if (Math.random() > 0.5) {
                    const point = this.roadPath[i];
                    
                    // Create crack geometry as thin box
                    const crackHeight = Math.abs(height) * (0.4 + Math.random() * 0.4);
                    const crackWidth = 0.1 + Math.random() * 0.15;
                    const crackDepth = 0.5 + Math.random() * 0.5;
                    
                    const crackGeometry = new THREE.BoxGeometry(crackWidth, crackHeight, crackDepth);
                    const crack = new THREE.Mesh(crackGeometry, crackMaterial);
                    
                    // Position crack on cliff face
                    let distance = 7.8 + Math.random() * 2;
                    const verticalOffset = Math.random() * Math.abs(height) * 0.3;
                    
                    if (side > 0 && isDropOff) {
                        distance += (verticalOffset / Math.abs(height)) * 30;
                    } else if (side < 0 && !isDropOff) {
                        distance += (verticalOffset / Math.abs(height)) * 15;
                    }
                    
                    const perpX = Math.cos(point.heading) * distance * side;
                    const perpZ = -Math.sin(point.heading) * distance * side;
                    
                    if (height > 0) {
                        crack.position.set(
                            point.x + perpX,
                            (point.y || 0) + crackHeight/2 + verticalOffset,
                            point.z + perpZ
                        );
                    } else {
                        crack.position.set(
                            point.x + perpX,
                            (point.y || 0) - crackHeight/2 - verticalOffset,
                            point.z + perpZ
                        );
                    }
                    
                    // Rotate crack to align with cliff face
                    crack.rotation.y = point.heading + (side > 0 ? Math.PI/2 : -Math.PI/2);
                    crack.rotation.z = (Math.random() - 0.5) * 0.3; // Slight tilt
                    
                    crack.castShadow = true;
                    crack.receiveShadow = true;
                    group.add(crack);
                    
                    // Add smaller branching cracks
                    const numBranches = 1 + Math.floor(Math.random() * 2);
                    for (let b = 0; b < numBranches; b++) {
                        const branchHeight = crackHeight * (0.3 + Math.random() * 0.3);
                        const branchGeometry = new THREE.BoxGeometry(crackWidth * 0.6, branchHeight, crackDepth * 0.7);
                        const branch = new THREE.Mesh(branchGeometry, crackMaterial);
                        
                        // Position relative to main crack
                        branch.position.copy(crack.position);
                        branch.position.x += (Math.random() - 0.5) * 2;
                        branch.position.y += (Math.random() - 0.5) * crackHeight * 0.5;
                        branch.position.z += (Math.random() - 0.5) * 2;
                        
                        branch.rotation.y = crack.rotation.y + (Math.random() - 0.5) * 0.5;
                        branch.rotation.z = (Math.random() - 0.5) * 0.4;
                        
                        branch.castShadow = true;
                        branch.receiveShadow = true;
                        group.add(branch);
                    }
                }
            }
            
            // Base boulders already handled above - no need for dense boulder field
            
            // Add vegetation patches on the cliff face - muted colors
            const vegetationMaterial = new THREE.MeshStandardMaterial({
                color: 0x3a4a32, // Darker, more muted green
                roughness: 0.9,
                metalness: 0.0
            });
            
            const mossMaterial = new THREE.MeshStandardMaterial({
                color: 0x4a5242, // Grey-green moss color
                roughness: 0.95,
                metalness: 0.0
            });
            
            // Add water seepage patches - dark wet areas on cliff
            const seepageMaterial = new THREE.MeshStandardMaterial({
                color: 0x1a1a1a,
                roughness: 0.3,  // Wet surfaces are less rough
                metalness: 0.1,  // Slight metalness for wet look
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            });
            
            // Create water seepage patches
            for (let i = 0; i < this.roadPath.length; i += 30) {
                if (Math.random() > 0.5) {
                    const point = this.roadPath[i];
                    
                    // Create irregular seepage patch
                    const seepageGeometry = new THREE.PlaneGeometry(
                        1.5 + Math.random() * 2,
                        3 + Math.random() * 4,
                        4, 6
                    );
                    
                    // Distort vertices for irregular shape
                    const positions = seepageGeometry.attributes.position;
                    for (let v = 0; v < positions.count; v++) {
                        const x = positions.getX(v);
                        const y = positions.getY(v);
                        positions.setZ(v, (Math.random() - 0.5) * 0.2);
                        positions.setX(v, x * (0.8 + Math.random() * 0.4));
                    }
                    
                    const seepage = new THREE.Mesh(seepageGeometry, seepageMaterial);
                    
                    // Position on cliff face
                    const seepageHeight = Math.abs(height) * (0.2 + Math.random() * 0.5);
                    let distance = 7.6 + Math.random() * 0.5;
                    
                    if (side > 0 && isDropOff) {
                        distance += (seepageHeight / Math.abs(height)) * 30;
                    } else if (side < 0 && !isDropOff) {
                        distance += (seepageHeight / Math.abs(height)) * 15;
                    }
                    
                    const perpX = Math.cos(point.heading) * distance * side;
                    const perpZ = -Math.sin(point.heading) * distance * side;
                    
                    if (height > 0) {
                        seepage.position.set(
                            point.x + perpX,
                            (point.y || 0) + seepageHeight,
                            point.z + perpZ
                        );
                    } else {
                        seepage.position.set(
                            point.x + perpX,
                            (point.y || 0) - seepageHeight,
                            point.z + perpZ
                        );
                    }
                    
                    seepage.rotation.y = point.heading + (side > 0 ? Math.PI/2 : -Math.PI/2);
                    seepage.receiveShadow = true;
                    group.add(seepage);
                }
            }
            
            // Add hanging vines and climbing plants
            const vineMaterial = new THREE.MeshStandardMaterial({
                color: 0x2a3d2a,
                roughness: 0.95,
                metalness: 0.0,
                side: THREE.DoubleSide
            });
            
            // Create hanging vines from cliff ledges
            for (let i = 0; i < this.roadPath.length; i += 20) {
                if (Math.random() > 0.6) {
                    const point = this.roadPath[i];
                    
                    // Create vine as elongated curved mesh
                    const vineLength = 3 + Math.random() * 5;
                    const vineGeometry = new THREE.PlaneGeometry(0.3 + Math.random() * 0.2, vineLength, 1, 8);
                    
                    // Modify vertices to create curved hanging effect
                    const positions = vineGeometry.attributes.position;
                    for (let v = 0; v < positions.count; v++) {
                        const y = positions.getY(v);
                        const curve = Math.sin((y + vineLength/2) / vineLength * Math.PI) * 0.5;
                        positions.setZ(v, curve);
                    }
                    
                    const vine = new THREE.Mesh(vineGeometry, vineMaterial);
                    
                    // Position vine hanging from cliff face
                    const vineHeight = Math.abs(height) * (0.3 + Math.random() * 0.4);
                    let distance = 7.5 + Math.random() * 1;
                    
                    if (side > 0 && isDropOff) {
                        distance += (vineHeight / Math.abs(height)) * 30;
                    } else if (side < 0 && !isDropOff) {
                        distance += (vineHeight / Math.abs(height)) * 15;
                    }
                    
                    const perpX = Math.cos(point.heading) * distance * side;
                    const perpZ = -Math.sin(point.heading) * distance * side;
                    
                    if (height > 0) {
                        vine.position.set(
                            point.x + perpX,
                            (point.y || 0) + vineHeight - vineLength/2,
                            point.z + perpZ
                        );
                    } else {
                        vine.position.set(
                            point.x + perpX,
                            (point.y || 0) - vineHeight - vineLength/2,
                            point.z + perpZ
                        );
                    }
                    
                    vine.rotation.y = point.heading + (side > 0 ? Math.PI/2 : -Math.PI/2);
                    vine.rotation.x = (Math.random() - 0.5) * 0.2;
                    
                    vine.castShadow = true;
                    vine.receiveShadow = true;
                    group.add(vine);
                }
            }
            
            // Add moss and small vegetation patches
            for (let i = 0; i < this.roadPath.length; i += 12) {
                const point = this.roadPath[i];
                
                // Add vegetation at various heights
                if (Math.random() > 0.4) {
                    const numPatches = 1 + Math.floor(Math.random() * 2);
                    
                    for (let p = 0; p < numPatches; p++) {
                        // Height on cliff (favor lower areas for vegetation)
                        const heightRatio = Math.random() * 0.5; // Lower half of cliff
                        const cliffHeight = Math.abs(height) * heightRatio;
                        
                        // Calculate position with slope
                        let distance = 7.2 + Math.random() * 0.5;
                        if (side > 0 && isDropOff) {
                            distance += heightRatio * heightRatio * 25;
                        } else if (side < 0 && !isDropOff) {
                            distance += heightRatio * heightRatio * 12;
                        }
                        
                        const perpX = Math.cos(point.heading) * distance * side;
                        const perpZ = -Math.sin(point.heading) * distance * side;
                        
                        // Choose between moss patch or small bush
                        if (Math.random() > 0.5) {
                            // Moss patch (flat against cliff)
                            const mossGeometry = new THREE.PlaneGeometry(
                                1.5 + Math.random() * 2,
                                1 + Math.random() * 1.5
                            );
                            const moss = new THREE.Mesh(mossGeometry, mossMaterial);
                            
                            if (height > 0) {
                                moss.position.set(
                                    point.x + perpX,
                                    (point.y || 0) + cliffHeight,
                                    point.z + perpZ
                                );
                            } else {
                                moss.position.set(
                                    point.x + perpX,
                                    (point.y || 0) - cliffHeight,
                                    point.z + perpZ
                                );
                            }
                            
                            // Rotate to face outward from cliff
                            moss.rotation.y = point.heading + (side > 0 ? Math.PI/2 : -Math.PI/2);
                            moss.rotation.x = (Math.random() - 0.5) * 0.3;
                            moss.rotation.z = (Math.random() - 0.5) * 0.3;
                            
                            moss.receiveShadow = true;
                            group.add(moss);
                        } else {
                            // Small bush/grass tuft
                            const bushGeometry = new THREE.SphereGeometry(
                                0.3 + Math.random() * 0.4,
                                5, 4
                            );
                            const bush = new THREE.Mesh(bushGeometry, vegetationMaterial);
                            
                            if (height > 0) {
                                bush.position.set(
                                    point.x + perpX,
                                    (point.y || 0) + cliffHeight,
                                    point.z + perpZ
                                );
                            } else {
                                bush.position.set(
                                    point.x + perpX,
                                    (point.y || 0) - cliffHeight,
                                    point.z + perpZ
                                );
                            }
                            
                            bush.scale.set(
                                1.2 + Math.random() * 0.3,
                                0.8 + Math.random() * 0.3,
                                1 + Math.random() * 0.3
                            );
                            
                            bush.castShadow = true;
                            bush.receiveShadow = true;
                            group.add(bush);
                        }
                    }
                }
            }
            
            // Add snow patches and rocky outcrops on upper mountain (if going up)
            if (height > 20) {
                // Snow patches on upper elevations
                const snowMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0xf0f0f0,
                    roughness: 0.7,
                    metalness: 0.0
                });
                
                for (let i = 0; i < this.roadPath.length; i += 8) {
                    if (Math.random() > 0.4 && height > 30) {
                        const point = this.roadPath[i];
                        const snowGeometry = new THREE.PlaneGeometry(
                            3 + Math.random() * 4, 
                            2 + Math.random() * 3
                        );
                        const snow = new THREE.Mesh(snowGeometry, snowMaterial);
                        
                        const perpX = Math.cos(point.heading) * (8 + Math.random() * 2) * side;
                        const perpZ = -Math.sin(point.heading) * (8 + Math.random() * 2) * side;
                        
                        snow.position.set(
                            point.x + perpX,
                            (point.y || 0) + height * (0.7 + Math.random() * 0.3),
                            point.z + perpZ
                        );
                        
                        // Rotate to face outward and add some randomness
                        snow.rotation.y = point.heading + (side > 0 ? Math.PI/2 : -Math.PI/2);
                        snow.rotation.x = (Math.random() - 0.5) * 0.3;
                        snow.rotation.z = (Math.random() - 0.5) * 0.3;
                        
                        snow.receiveShadow = true;
                        group.add(snow);
                    }
                }
                
                // Sparse alpine vegetation
                const alpineBushGeometry = new THREE.SphereGeometry(0.6, 4, 3);
                const alpineBushMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0x1a3a1a,
                    roughness: 0.9,
                    metalness: 0.0
                });
                
                for (let i = 0; i < this.roadPath.length; i += 15) {
                    if (Math.random() > 0.6) {
                        const point = this.roadPath[i];
                        const bush = new THREE.Mesh(alpineBushGeometry, alpineBushMaterial);
                        
                        const perpX = Math.cos(point.heading) * 9 * side;
                        const perpZ = -Math.sin(point.heading) * 9 * side;
                        
                        bush.position.set(
                            point.x + perpX,
                            (point.y || 0) + height * 0.3,
                            point.z + perpZ
                        );
                        
                        bush.scale.set(
                            1 + Math.random() * 0.3,
                            0.6 + Math.random() * 0.3,
                            1 + Math.random() * 0.3
                        );
                        
                        bush.castShadow = true;
                        bush.receiveShadow = true;
                        group.add(bush);
                    }
                }
            }
            
            return group;
        };
        
        // Create ground strips to fill gaps between road and cliff bases
        const createGroundStrip = (side, width) => {
            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            const indices = [];
            const colors = [];
            
            for (let i = 0; i < this.roadPath.length - 1; i++) {
                const point = this.roadPath[i];
                const nextPoint = this.roadPath[i + 1];
                
                // Road edge position (8 units from center)
                const roadEdgeDistance = 8;
                const cliffBaseDistance = 7.5; // Matches minimum cliff distance
                
                // Calculate perpendicular offsets for this segment
                const perpX1 = Math.cos(point.heading) * roadEdgeDistance * side;
                const perpZ1 = -Math.sin(point.heading) * roadEdgeDistance * side;
                const perpX2 = Math.cos(point.heading) * (cliffBaseDistance + width) * side;
                const perpZ2 = -Math.sin(point.heading) * (cliffBaseDistance + width) * side;
                
                const nextPerpX1 = Math.cos(nextPoint.heading) * roadEdgeDistance * side;
                const nextPerpZ1 = -Math.sin(nextPoint.heading) * roadEdgeDistance * side;
                const nextPerpX2 = Math.cos(nextPoint.heading) * (cliffBaseDistance + width) * side;
                const nextPerpZ2 = -Math.sin(nextPoint.heading) * (cliffBaseDistance + width) * side;
                
                // Add vertices for this segment
                const baseIndex = i * 4;
                vertices.push(
                    point.x + perpX1, point.y - 0.05, point.z + perpZ1,
                    point.x + perpX2, point.y - 0.05, point.z + perpZ2,
                    nextPoint.x + nextPerpX1, nextPoint.y - 0.05, nextPoint.z + nextPerpZ1,
                    nextPoint.x + nextPerpX2, nextPoint.y - 0.05, nextPoint.z + nextPerpZ2
                );
                
                // Add color (dark rock/dirt color)
                for (let j = 0; j < 4; j++) {
                    colors.push(0.25, 0.2, 0.18);
                }
                
                // Create triangles
                indices.push(
                    baseIndex, baseIndex + 2, baseIndex + 1,
                    baseIndex + 1, baseIndex + 2, baseIndex + 3
                );
            }
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geometry.setIndex(indices);
            geometry.computeVertexNormals();
            
            const material = new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: 0.95,
                metalness: 0.0
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.receiveShadow = true;
            return mesh;
        };
        
        // Add ground strips to fill gaps
        const leftStrip = createGroundStrip(-1, 2);
        this.scene.add(leftStrip);
        const rightStrip = createGroundStrip(1, 6);
        this.scene.add(rightStrip);
        
        // Left cliff wall (mountain face rising above)
        const leftCliff = createFacetedCliff(-1, 40, false);  // Taller mountain wall
        this.scene.add(leftCliff);
        
        // Right cliff wall (drop-off) - extremely tall mountainside cliff
        const rightCliff = createFacetedCliff(1, -200, true);  // Doubled height from -100 to -200
        this.scene.add(rightCliff);
    }
    
    createLayeredMountains() {
        // Create multiple layers of mountains for depth
        
        // Layer 1: Distant mountain range (far background)
        this.createDistantMountainRange();
        
        // Layer 2: Mid-range mountains 
        this.createMidRangeMountains();
        
        // Layer 3: Near hills with more detail
        this.createNearHills();
        
        // Layer 4: Majestic peak - the dominant mountain
        this.createMajesticPeak();
    }
    
    createDistantMountainRange() {
        // Create far distant mountains with atmospheric perspective
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];
        const colors = [];
        
        // Parameters for distant mountains
        const numPeaks = 8;
        const baseDistance = 1500; // Much further away
        const maxHeight = 400;
        const width = 3000; // Wider to cover horizon
        
        // Create mountain silhouette
        const points = [];
        
        // Start from left edge
        points.push(new THREE.Vector3(-width/2, -80, baseDistance));
        
        // Generate smooth rolling mountain silhouette
        for (let i = 0; i <= numPeaks * 4; i++) {
            const x = -width/2 + (width / (numPeaks * 4)) * i;
            // Use smoother sine waves for rolling hills
            const baseHeight = Math.sin(i * 0.15) * 120 + Math.cos(i * 0.08) * 80;
            const mediumWave = Math.sin(i * 0.25) * 50;
            const smallWave = Math.cos(i * 0.4) * 20;
            const peakHeight = Math.max(50, baseHeight + mediumWave + smallWave + maxHeight * 0.4);
            const y = peakHeight;
            points.push(new THREE.Vector3(x, y, baseDistance));
        }
        
        // End at right edge
        points.push(new THREE.Vector3(width/2, -80, baseDistance));
        
        // Create triangulated mountain face
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            // Create two triangles for each segment (forming a quad to ground)
            const baseIndex = vertices.length / 3;
            
            // Add vertices
            vertices.push(p1.x, p1.y, p1.z); // Top left
            vertices.push(p2.x, p2.y, p2.z); // Top right
            vertices.push(p2.x, -80, p2.z);  // Bottom right
            vertices.push(p1.x, -80, p1.z);  // Bottom left
            
            // Add indices for two triangles
            indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
            indices.push(baseIndex, baseIndex + 2, baseIndex + 3);
            
            // Atmospheric perspective - lighter blue-grey color
            const atmosphericColor = {
                r: 0.55 + Math.random() * 0.05,
                g: 0.60 + Math.random() * 0.05,
                b: 0.70 + Math.random() * 0.05
            };
            
            // Add colors for all 4 vertices
            for (let j = 0; j < 4; j++) {
                colors.push(atmosphericColor.r, atmosphericColor.g, atmosphericColor.b);
            }
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.95,
            metalness: 0.0,
            side: THREE.DoubleSide,
            fog: true
        });
        
        const distantMountains = new THREE.Mesh(geometry, material);
        distantMountains.receiveShadow = true;
        this.scene.add(distantMountains);
        
        // Add a second distant range slightly offset and behind
        const secondRangeGeometry = geometry.clone();
        const secondRangeMaterial = material.clone();
        const secondRange = new THREE.Mesh(secondRangeGeometry, secondRangeMaterial);
        secondRange.position.set(500, 50, 400); // Further right and back
        secondRange.scale.set(0.8, 0.9, 1);
        this.scene.add(secondRange);
    }
    
    createMidRangeMountains() {
        // Create mid-distance mountains with more detail
        const group = new THREE.Group();
        
        // Create several individual peaks - closer but still clear of road
        // Road max Z is about 488, so keep peaks beyond 600
        const peaks = [
            { x: -600, z: 700, height: 250, width: 300 },   // Left back
            { x: -200, z: 750, height: 200, width: 280 },   // Left-center back
            { x: 300, z: 800, height: 280, width: 350 },    // Center back (safely beyond road)
            { x: 800, z: 750, height: 230, width: 290 },    // Right back (just beyond road X:700)
            { x: 1200, z: 700, height: 260, width: 310 }    // Far right back
        ];
        
        peaks.forEach(peak => {
            const mountain = this.createMountainPeak(
                peak.x, 
                peak.z, 
                peak.height, 
                peak.width,
                0x606570 // Medium grey color
            );
            group.add(mountain);
        });
        
        this.scene.add(group);
    }
    
    createNearHills() {
        // Create near hills with vegetation and detail
        const group = new THREE.Group();
        
        // Only add the central mountain/island in the lake area
        // This creates a dramatic centerpiece visible from the mountain road
        const centralMountain = this.createLakeIslandMountain();
        group.add(centralMountain);
        
        this.scene.add(group);
    }
    
    createLakeIslandMountain() {
        // Create a dramatic mountain rising from the lake in the center of the map
        const group = new THREE.Group();
        
        // Main mountain peak rising from the lake - smaller to avoid road
        const mainPeak = this.createMountainPeak(
            350,   // Center of the map area
            100,   // Slightly forward from true center
            180,   // Reduced height to avoid crossing road
            250,   // Smaller base
            0x3a4540 // Darker grey-green for contrast with lake
        );
        group.add(mainPeak);
        
        // Add a secondary smaller peak for visual interest
        const secondaryPeak = this.createMountainPeak(
            250,   // Offset to the left
            -50,   // Move further forward/left to avoid road
            120,   // Smaller height
            150,   // Smaller width
            0x424845 // Similar but slightly different color
        );
        group.add(secondaryPeak);
        
        // Remove the third peak that might be floating/problematic
        
        // Add some rocky outcrops around the base
        const rockMaterial = new THREE.MeshStandardMaterial({
            color: 0x5a5a5a,
            roughness: 0.95,
            metalness: 0.0
        });
        
        // Create rocky base formations
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 / 5) * i;
            const distance = 100 + Math.random() * 40;
            const rockX = 350 + Math.cos(angle) * distance;
            const rockZ = 100 + Math.sin(angle) * distance;
            
            const rockGeometry = new THREE.DodecahedronGeometry(15 + Math.random() * 10, 0);
            const rock = new THREE.Mesh(rockGeometry, rockMaterial);
            rock.position.set(rockX, -70, rockZ); // Just above water level
            rock.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            rock.scale.set(
                1 + Math.random() * 0.5,
                0.6 + Math.random() * 0.3,
                1 + Math.random() * 0.5
            );
            rock.castShadow = true;
            rock.receiveShadow = true;
            group.add(rock);
        }
        
        return group;
    }
    
    createMajesticPeak() {
        // Create twin peaks - two massive mountains close together
        const group = new THREE.Group();
        
        // First peak - Mont Blanc style with shallower slope
        const peak1X = 500;
        const peak1Z = 1000;
        const peak1Height = 500; // Very tall
        const peak1Width = 800;  // Much wider base for shallower Mont Blanc-like slope
        
        // Second peak - slightly shorter and offset
        const peak2X = 900;  // Move further apart due to wider bases
        const peak2Z = 950;
        const peak2Height = 450;
        const peak2Width = 750;  // Also wider for shallower slope
        
        // Create the first peak with more segments for smoother slope
        const mountain1Geometry = new THREE.ConeGeometry(peak1Width/2, peak1Height, 20, 10);
        
        // Deform the first peak to make it more mountain-like
        const positions1 = mountain1Geometry.attributes.position;
        for (let i = 0; i < positions1.count; i++) {
            const px = positions1.getX(i);
            const py = positions1.getY(i);
            const pz = positions1.getZ(i);
            
            // Get normalized height (0 at base, 1 at peak)
            const normalizedHeight = (py + peak1Height/2) / peak1Height;
            
            // Add gentler ridges and variation for Mont Blanc style
            const ridgeAngle = Math.atan2(pz, px);
            const ridgeEffect = Math.sin(ridgeAngle * 3) * (1 - normalizedHeight) * 20;  // Gentler ridges
            const noiseEffect = Math.sin(i * 0.3) * 15 * (1 - normalizedHeight);  // Less noise
            
            // Apply deformation
            const distance = Math.sqrt(px * px + pz * pz);
            const newDistance = distance + ridgeEffect + noiseEffect;
            const scale = newDistance / (distance || 1);
            
            positions1.setX(i, px * scale);
            positions1.setZ(i, pz * scale);
            
            // Make the peak slightly asymmetric
            if (normalizedHeight > 0.7) {
                positions1.setX(i, px * (1 + Math.sin(py * 0.1) * 0.1));
                positions1.setY(i, py + Math.cos(px * 0.05) * 10);
            }
            
            // Widen the base significantly
            if (normalizedHeight < 0.3) {
                const baseWidening = 1 + (0.3 - normalizedHeight) * 2;
                positions1.setX(i, px * baseWidening);
                positions1.setZ(i, pz * baseWidening);
            }
        }
        
        mountain1Geometry.computeVertexNormals();
        
        // Create vertex colors with snow at the peak for first mountain
        const colors1 = [];
        for (let i = 0; i < positions1.count; i++) {
            const py = positions1.getY(i);
            const normalizedHeight = (py + peak1Height/2) / peak1Height;
            
            // Transition to snow color at the peak
            if (normalizedHeight > 0.85) {
                // Snow white with slight blue tint
                const snowWhite = 0.95 + Math.random() * 0.05;
                colors1.push(
                    snowWhite - 0.02,  // Slightly less red for blue tint
                    snowWhite,
                    snowWhite
                );
            } else if (normalizedHeight > 0.75) {
                // Transition zone - mix of rock and snow
                const mixFactor = (normalizedHeight - 0.75) / 0.1;
                const rockGrey = 0.35 + normalizedHeight * 0.15;
                const snowWhite = 0.95;
                const mixed = rockGrey + (snowWhite - rockGrey) * mixFactor;
                colors1.push(
                    mixed + Math.random() * 0.03,
                    mixed + Math.random() * 0.03,
                    mixed + Math.random() * 0.03 + 0.02
                );
            } else {
                // Rock colors - darker at base, lighter towards peak
                const baseGrey = 0.25 + normalizedHeight * 0.2;
                const variation = Math.random() * 0.05;
                colors1.push(
                    baseGrey + variation,
                    baseGrey + variation + 0.02,
                    baseGrey + variation + 0.05
                );
            }
        }
        
        mountain1Geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors1, 3));
        
        const mountainMaterial = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.95,
            metalness: 0.0,
            flatShading: true // Keep some faceting for rock texture
        });
        
        const mountain1 = new THREE.Mesh(mountain1Geometry, mountainMaterial);
        mountain1.position.set(peak1X, peak1Height/2 - 80, peak1Z);
        mountain1.castShadow = true;
        mountain1.receiveShadow = true;
        group.add(mountain1);
        
        // Create the second peak (copy-paste with adjustments)
        const mountain2 = this.createSecondPeak(peak2X, peak2Z, peak2Height, peak2Width);
        group.add(mountain2);
        
        this.scene.add(group);
    }
    
    createSecondPeak(x, z, height, width) {
        // Create the second peak with shallower slope
        const mountainGeometry = new THREE.ConeGeometry(width/2, height, 20, 10);
        
        // Deform to make it natural
        const positions = mountainGeometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const px = positions.getX(i);
            const py = positions.getY(i);
            const pz = positions.getZ(i);
            
            const normalizedHeight = (py + height/2) / height;
            
            // Gentle ridge pattern for Mont Blanc style
            const ridgeAngle = Math.atan2(pz, px);
            const ridgeEffect = Math.sin(ridgeAngle * 4) * (1 - normalizedHeight) * 18;  // Gentler
            const noiseEffect = Math.sin(i * 0.4) * 12 * (1 - normalizedHeight);  // Less noise
            
            const distance = Math.sqrt(px * px + pz * pz);
            const newDistance = distance + ridgeEffect + noiseEffect;
            const scale = newDistance / (distance || 1);
            
            positions.setX(i, px * scale);
            positions.setZ(i, pz * scale);
            
            if (normalizedHeight > 0.7) {
                positions.setX(i, px * (1 + Math.cos(py * 0.12) * 0.08));
                positions.setY(i, py + Math.sin(px * 0.06) * 8);
            }
            
            if (normalizedHeight < 0.3) {
                const baseWidening = 1 + (0.3 - normalizedHeight) * 1.8;
                positions.setX(i, px * baseWidening);
                positions.setZ(i, pz * baseWidening);
            }
        }
        
        mountainGeometry.computeVertexNormals();
        
        // Add vertex colors with snow
        const colors = [];
        for (let i = 0; i < positions.count; i++) {
            const py = positions.getY(i);
            const normalizedHeight = (py + height/2) / height;
            
            if (normalizedHeight > 0.83) { // Slightly lower snow line
                const snowWhite = 0.94 + Math.random() * 0.06;
                colors.push(
                    snowWhite - 0.02,
                    snowWhite,
                    snowWhite + 0.01
                );
            } else if (normalizedHeight > 0.73) {
                const mixFactor = (normalizedHeight - 0.73) / 0.1;
                const rockGrey = 0.35 + normalizedHeight * 0.15;
                const snowWhite = 0.94;
                const mixed = rockGrey + (snowWhite - rockGrey) * mixFactor;
                colors.push(
                    mixed + Math.random() * 0.03,
                    mixed + Math.random() * 0.03,
                    mixed + Math.random() * 0.03 + 0.02
                );
            } else {
                const baseGrey = 0.27 + normalizedHeight * 0.18; // Slightly different coloring
                const variation = Math.random() * 0.05;
                colors.push(
                    baseGrey + variation,
                    baseGrey + variation + 0.01,
                    baseGrey + variation + 0.04
                );
            }
        }
        
        mountainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const mountainMaterial = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.95,
            metalness: 0.0,
            flatShading: true
        });
        
        const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
        mountain.position.set(x, height/2 - 80, z);
        mountain.castShadow = true;
        mountain.receiveShadow = true;
        
        return mountain;
    }
    
    createMountainPeak(x, z, height, width, color) {
        // Create a rounded mountain using sphere geometry for softer shapes
        const geometry = new THREE.SphereGeometry(width/2, 12, 8);
        
        // Modify vertices for mountain shape
        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const px = positions.getX(i);
            const py = positions.getY(i);
            const pz = positions.getZ(i);
            
            // Stretch vertically and compress horizontally for mountain profile
            const normalizedY = py / (width/2);
            
            // Create rounded mountain profile
            if (py > 0) {
                // Upper hemisphere - stretch to create peak
                const stretchFactor = 1.0 + (normalizedY * (height / (width/2) - 1));
                positions.setY(i, py * stretchFactor);
                
                // Gradually narrow towards peak for rounded cone shape
                const narrowFactor = 1.0 - (normalizedY * 0.3);
                positions.setX(i, px * narrowFactor);
                positions.setZ(i, pz * narrowFactor);
            } else {
                // Lower hemisphere - flatten significantly
                positions.setY(i, py * 0.1);
                
                // Widen base
                const widenFactor = 1.0 + Math.abs(normalizedY) * 0.5;
                positions.setX(i, px * widenFactor);
                positions.setZ(i, pz * widenFactor);
            }
            
            // Add gentle noise for natural variation
            const noise = Math.sin(i * 0.2) * 5 + Math.cos(i * 0.3) * 3;
            positions.setX(i, positions.getX(i) + noise * (1 - Math.abs(normalizedY)));
            positions.setZ(i, positions.getZ(i) + noise * (1 - Math.abs(normalizedY)) * 0.5);
        }
        
        geometry.computeVertexNormals();
        
        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.98,
            metalness: 0.0,
            flatShading: false // Smooth shading for rounded mountains
        });
        
        const mountain = new THREE.Mesh(geometry, material);
        mountain.position.set(x, -50, z); // Base at lake level
        mountain.castShadow = true;
        mountain.receiveShadow = true;
        
        // Add rounded snow cap for tall peaks
        if (height > 200) {
            const snowGeometry = new THREE.SphereGeometry(width/5, 8, 6);
            const snowMaterial = new THREE.MeshStandardMaterial({
                color: 0xf0f0f0,
                roughness: 0.7,
                metalness: 0.0
            });
            const snowCap = new THREE.Mesh(snowGeometry, snowMaterial);
            // Deform snow cap to be flatter
            const snowPositions = snowGeometry.attributes.position;
            for (let i = 0; i < snowPositions.count; i++) {
                const sy = snowPositions.getY(i);
                if (sy < 0) {
                    snowPositions.setY(i, sy * 0.3);
                }
            }
            snowCap.position.set(x, height * 0.85 - 50, z);
            snowCap.scale.set(1.2, 0.6, 1.2);
            mountain.add(snowCap);
        }
        
        return mountain;
    }
    
    createDetailedHill(x, z, height, width) {
        // Create a detailed hill with vegetation
        const group = new THREE.Group();
        
        // Main hill body using sphere geometry
        const hillGeometry = new THREE.SphereGeometry(width/2, 8, 6);
        
        // Deform sphere to create hill shape
        const positions = hillGeometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const px = positions.getX(i);
            const py = positions.getY(i);
            const pz = positions.getZ(i);
            
            // Flatten bottom hemisphere
            if (py < 0) {
                positions.setY(i, py * 0.1);
            } else {
                // Add noise to top for natural shape
                const noise = Math.sin(i * 0.4) * 5 + Math.cos(i * 0.6) * 3;
                positions.setY(i, py * (height / (width/2)) + noise);
            }
            
            // Add horizontal noise
            const horizontalNoise = Math.sin(i * 0.3) * 8;
            positions.setX(i, px + horizontalNoise);
            positions.setZ(i, pz + horizontalNoise * 0.5);
        }
        
        hillGeometry.computeVertexNormals();
        
        // Create gradient colors for the hill
        const colors = [];
        for (let i = 0; i < positions.count; i++) {
            const y = positions.getY(i);
            const heightRatio = Math.max(0, y) / height;
            
            // Base color - green to brown gradient
            const baseGreen = 0.25 + heightRatio * 0.1;
            const baseColor = {
                r: 0.35 + heightRatio * 0.15,
                g: baseGreen + Math.random() * 0.05,
                b: 0.25 + heightRatio * 0.1
            };
            
            colors.push(baseColor.r, baseColor.g, baseColor.b);
        }
        
        hillGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const hillMaterial = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.95,
            metalness: 0.0,
            flatShading: false
        });
        
        const hill = new THREE.Mesh(hillGeometry, hillMaterial);
        hill.position.set(x, -60, z); // Base at lower level to avoid road
        hill.castShadow = true;
        hill.receiveShadow = true;
        group.add(hill);
        
        // Add vegetation patches
        const vegetationMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d4a2d,
            roughness: 0.9,
            metalness: 0.0
        });
        
        // Add trees on the hill
        const numTrees = Math.floor(3 + Math.random() * 4);
        for (let i = 0; i < numTrees; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = width * 0.2 + Math.random() * width * 0.3;
            const treeX = x + Math.cos(angle) * distance;
            const treeZ = z + Math.sin(angle) * distance;
            const treeY = -60 + height * (0.3 + Math.random() * 0.4);
            
            // Simple tree
            const treeGeometry = new THREE.ConeGeometry(8, 20, 5);
            const tree = new THREE.Mesh(treeGeometry, vegetationMaterial);
            tree.position.set(treeX, treeY, treeZ);
            tree.castShadow = true;
            tree.receiveShadow = true;
            group.add(tree);
        }
        
        // Add bushes
        const bushMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a5a3a,
            roughness: 0.95,
            metalness: 0.0
        });
        
        const numBushes = Math.floor(5 + Math.random() * 5);
        for (let i = 0; i < numBushes; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = width * 0.15 + Math.random() * width * 0.35;
            const bushX = x + Math.cos(angle) * distance;
            const bushZ = z + Math.sin(angle) * distance;
            const bushY = -60 + height * (0.2 + Math.random() * 0.3);
            
            const bushGeometry = new THREE.SphereGeometry(3 + Math.random() * 2, 4, 3);
            const bush = new THREE.Mesh(bushGeometry, bushMaterial);
            bush.position.set(bushX, bushY, bushZ);
            bush.scale.set(1.5, 0.8, 1.2);
            bush.castShadow = true;
            bush.receiveShadow = true;
            group.add(bush);
        }
        
        return group;
    }
    
    createRockTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Base rock color
        ctx.fillStyle = '#656565';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add noise for rough surface
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 30;
            data[i] += noise;     // Red
            data[i + 1] += noise; // Green
            data[i + 2] += noise; // Blue
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Add stratification lines
        ctx.strokeStyle = '#4a4a4a';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        
        for (let y = 0; y < canvas.height; y += 15 + Math.random() * 10) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            for (let x = 0; x < canvas.width; x += 20) {
                ctx.lineTo(x, y + (Math.random() - 0.5) * 3);
            }
            ctx.stroke();
        }
        
        // Add cracks
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.4;
        
        for (let i = 0; i < 15; i++) {
            const startX = Math.random() * canvas.width;
            const startY = Math.random() * canvas.height;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            
            let x = startX;
            let y = startY;
            const steps = 5 + Math.random() * 10;
            
            for (let j = 0; j < steps; j++) {
                x += (Math.random() - 0.5) * 30;
                y += Math.random() * 20;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        
        // Add mineral veins
        ctx.strokeStyle = '#7a7570';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.2;
        
        for (let i = 0; i < 5; i++) {
            const startX = Math.random() * canvas.width;
            const startY = Math.random() * canvas.height;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(
                startX + Math.random() * 100, 
                startY + Math.random() * 100,
                startX + Math.random() * 200,
                startY + Math.random() * 200
            );
            ctx.stroke();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(0.5, 0.5);
        return texture;
    }
    
    createRoadTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Asphalt base
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Texture variation
        for (let i = 0; i < 300; i++) {
            const gray = Math.random() * 20 + 40;
            ctx.fillStyle = `rgba(${gray}, ${gray}, ${gray}, 0.5)`;
            ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 
                        Math.random() * 3 + 1, Math.random() * 3 + 1);
        }
        
        // Tire tracks and wear marks
        ctx.globalAlpha = 0.3;
        
        // Left tire track
        const leftTrackX = canvas.width * 0.35;
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 15;
        ctx.beginPath();
        ctx.moveTo(leftTrackX, 0);
        for (let y = 0; y < canvas.height; y += 20) {
            ctx.lineTo(leftTrackX + Math.sin(y * 0.02) * 3, y);
        }
        ctx.stroke();
        
        // Right tire track
        const rightTrackX = canvas.width * 0.65;
        ctx.beginPath();
        ctx.moveTo(rightTrackX, 0);
        for (let y = 0; y < canvas.height; y += 20) {
            ctx.lineTo(rightTrackX + Math.sin(y * 0.02 + 1) * 3, y);
        }
        ctx.stroke();
        
        // Center wear (from motorcycles)
        ctx.strokeStyle = '#323232';
        ctx.lineWidth = 8;
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        for (let y = 0; y < canvas.height; y += 30) {
            ctx.lineTo(canvas.width / 2 + Math.sin(y * 0.03) * 2, y);
        }
        ctx.stroke();
        
        // Oil stains and patches
        ctx.globalAlpha = 0.15;
        for (let i = 0; i < 5; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = 10 + Math.random() * 20;
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, 'rgba(20, 20, 20, 0.5)');
            gradient.addColorStop(1, 'rgba(20, 20, 20, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Cracks and repairs
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            const startX = Math.random() * canvas.width;
            const startY = Math.random() * canvas.height;
            ctx.moveTo(startX, startY);
            
            for (let j = 0; j < 3; j++) {
                ctx.lineTo(
                    startX + (Math.random() - 0.5) * 30,
                    startY + Math.random() * 40
                );
            }
            ctx.stroke();
        }
        
        ctx.globalAlpha = 1.0;
        
        // White edge lines
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(10, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(canvas.width - 10, 0);
        ctx.lineTo(canvas.width - 10, canvas.height);
        ctx.stroke();
        
        // Edge line wear
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 2;
        for (let y = 0; y < canvas.height; y += 30 + Math.random() * 20) {
            ctx.beginPath();
            ctx.moveTo(8, y);
            ctx.lineTo(12, y + 10);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(canvas.width - 12, y);
            ctx.lineTo(canvas.width - 8, y + 10);
            ctx.stroke();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }
    
    createGrass() {
        // Create a lake at the bottom instead of grass
        const lakeMaterial = new THREE.MeshStandardMaterial({
            color: 0x2266aa,  // Deep blue lake color
            side: THREE.DoubleSide,
            roughness: 0.1,   // Water is reflective
            metalness: 0.4    // Some metalness for water shine
        });
        
        const lakeGeometry = new THREE.PlaneGeometry(3000, 3000);
        const lake = new THREE.Mesh(lakeGeometry, lakeMaterial);
        lake.rotation.x = -Math.PI / 2;
        lake.position.set(0, -200, 0);  // Below cliff level
        lake.receiveShadow = true;
        this.scene.add(lake);

        // Create continuous terrain strips along the road
        const createTerrainStrip = (side, offset, dropAmount, color) => {
            const points = [];
            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            const indices = [];
            
            // Create vertices for terrain strip
            for (let i = 0; i < this.roadPath.length - 1; i++) {
                const point = this.roadPath[i];
                const nextPoint = this.roadPath[i + 1];
                const roadY = point.y !== undefined ? point.y : 0;
                const nextRoadY = nextPoint.y !== undefined ? nextPoint.y : 0;
                
                // Calculate perpendicular offset
                const perpX = Math.cos(point.heading) * offset * side;
                const perpZ = -Math.sin(point.heading) * offset * side;
                const nextPerpX = Math.cos(nextPoint.heading) * offset * side;
                const nextPerpZ = -Math.sin(nextPoint.heading) * offset * side;
                
                // Inner edge (closer to road)
                vertices.push(
                    point.x + perpX, roadY + dropAmount, point.z + perpZ,
                    nextPoint.x + nextPerpX, nextRoadY + dropAmount, nextPoint.z + nextPerpZ
                );
                
                // Outer edge (further from road) - extend much further for mountainside
                vertices.push(
                    point.x + perpX * 8, roadY + dropAmount * 2, point.z + perpZ * 8,
                    nextPoint.x + nextPerpX * 8, nextRoadY + dropAmount * 2, nextPoint.z + nextPerpZ * 8
                );
            }
            
            // Create triangles
            for (let i = 0; i < this.roadPath.length - 1; i++) {
                const baseIndex = i * 4;
                // Two triangles per segment
                indices.push(
                    baseIndex, baseIndex + 1, baseIndex + 2,
                    baseIndex + 1, baseIndex + 3, baseIndex + 2
                );
            }
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setIndex(indices);
            geometry.computeVertexNormals();
            
            const material = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.95,
                metalness: 0.0,
                side: THREE.DoubleSide
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.receiveShadow = true;
            mesh.castShadow = true;
            return mesh;
        };
        
        // Create left side elevated terrain
        const leftTerrain = createTerrainStrip(-1, 12, 2, 0x3a5f3a);
        this.scene.add(leftTerrain);
        
        // Create right side drop-off terrain - massive mountainside drop
        const rightTerrain = createTerrainStrip(1, 12, -50, 0x2a4f2a);
        this.scene.add(rightTerrain);
        
        // Create far right deep drop-off - extreme cliff face
        const deepDropTerrain = createTerrainStrip(1, 36, -150, 0x1a3f1a);
        this.scene.add(deepDropTerrain);
        
        // Add vertical walls connecting road to terrain
        this.createRoadWalls();
        
        // Guard rails commented out due to rendering issues
        // this.createGuardRails();
        
        // Add some water depth variation patches
        for (let i = 0; i < 20; i++) {
            const patchSize = 50 + Math.random() * 100;
            const patchGeometry = new THREE.PlaneGeometry(patchSize, patchSize);
            const patchMaterial = new THREE.MeshStandardMaterial({
                color: 0x1a5599,  // Darker blue for deeper water
                side: THREE.DoubleSide,
                roughness: 0.15,  // Still water-like
                metalness: 0.35
            });
            const patch = new THREE.Mesh(patchGeometry, patchMaterial);
            patch.rotation.x = -Math.PI / 2;
            patch.position.set(
                (Math.random() - 0.5) * 1500,
                -80.005,  // Match the lowered ground plane
                (Math.random() - 0.5) * 1500
            );
            patch.receiveShadow = true;
            this.scene.add(patch);
        }
    }
    
    createRoadMarkings() {
        // Yellow center line dashes
        const dashMaterial = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.1,
            roughness: 0.8,
            metalness: 0.0
        });
        
        // Place dashes along the road path
        this.roadPath.forEach((point, index) => {
            if (index % 2 === 0) { // Every other segment
                const dashGeometry = new THREE.PlaneGeometry(0.2, 4);
                const dash = new THREE.Mesh(dashGeometry, dashMaterial);
                dash.rotation.x = -Math.PI / 2;
                dash.rotation.z = point.heading;
                const dashY = point.y !== undefined ? point.y + 0.02 : 0.02;
                dash.position.set(point.x, dashY, point.z);
                dash.receiveShadow = true;
                this.scene.add(dash);
            }
        });
        
        // Add start/finish line
        if (this.roadPath.length > 0) {
            const startGeometry = new THREE.PlaneGeometry(16, 2);
            const startMaterial = new THREE.MeshStandardMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.6,
                roughness: 0.7,
                metalness: 0.0
            });
            const startLine = new THREE.Mesh(startGeometry, startMaterial);
            startLine.rotation.x = -Math.PI / 2;
            const startY = this.roadPath[5].y !== undefined ? this.roadPath[5].y + 0.03 : 0.03;
            startLine.position.set(this.roadPath[5].x, startY, this.roadPath[5].z);
            startLine.receiveShadow = true;
            this.scene.add(startLine);
            
            // Checkered pattern for finish (near the start)
            const finishMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.6,
                roughness: 0.7,
                metalness: 0.0
            });
            const lastSegments = this.roadPath.length - 5;
            const finishLine = new THREE.Mesh(startGeometry, finishMaterial);
            finishLine.rotation.x = -Math.PI / 2;
            finishLine.rotation.z = this.roadPath[lastSegments].heading;
            const finishY = this.roadPath[lastSegments].y !== undefined ? this.roadPath[lastSegments].y + 0.03 : 0.03;
            finishLine.position.set(this.roadPath[lastSegments].x, finishY, this.roadPath[lastSegments].z);
            finishLine.receiveShadow = true;
            this.scene.add(finishLine);

            // Store finish line position for detection
            this.finishLinePosition = new THREE.Vector3(this.roadPath[lastSegments].x, finishY, this.roadPath[lastSegments].z);
        }
    }
    
    addEnvironmentalDetails() {
        // Rock formations and cliff details
        this.addRockFormations();
        
        // Trees along the roadside - only on the mountain side (left)
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.6, 4);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9, metalness: 0.0 });
        const foliageGeometry = new THREE.SphereGeometry(3, 6, 5);
        const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.95, metalness: 0.0 });
        
        // Place trees along road path - only on left (mountain) side
        this.roadPath.forEach((point, index) => {
            if (index % 7 === 0) { // Every 7th segment for sparser placement
                // Only place trees on the left (mountain) side
                const treeDistance = 20 + Math.random() * 10;
                
                // Left side tree (mountain side)
                const leftX = point.x - treeDistance * Math.cos(point.heading);
                const leftZ = point.z + treeDistance * Math.sin(point.heading);
                
                // Ground level for tree base
                const groundLevel = point.y - 0.5;
                
                const leftTrunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
                leftTrunk.position.set(leftX, groundLevel + 2, leftZ);
                leftTrunk.castShadow = true;
                leftTrunk.receiveShadow = true;
                this.scene.add(leftTrunk);

                const leftFoliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
                leftFoliage.position.set(leftX, groundLevel + 5.5, leftZ);
                leftFoliage.castShadow = true;
                leftFoliage.receiveShadow = true;
                this.scene.add(leftFoliage);
                
                // No trees on right side (cliff drop-off) to avoid floating trees
            }
        });

        // Bushes along the mountain side only
        const bushGeometry = new THREE.SphereGeometry(1, 6, 4);
        const bushMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5016, roughness: 0.9, metalness: 0.0 });
        this.roadPath.forEach((point, index) => {
            if (index % 6 === 0) { // Less frequent
                // Only left side bushes (mountain side)
                const bushDistance = 12 + Math.random() * 5;
                const bushX = point.x - bushDistance * Math.cos(point.heading);
                const bushZ = point.z + bushDistance * Math.sin(point.heading);
                
                const leftBush = new THREE.Mesh(bushGeometry, bushMaterial);
                leftBush.position.set(bushX, point.y - 0.3, bushZ); // Partially embedded
                leftBush.castShadow = true;
                leftBush.receiveShadow = true;
                this.scene.add(leftBush);
                
                // No bushes on cliff side
            }
        });

        // Small cones for track detail (not guard rails)
        const coneGeometry = new THREE.ConeGeometry(0.15, 0.5, 8);
        const coneMaterial = new THREE.MeshStandardMaterial({ color: 0xff4500, roughness: 0.8, metalness: 0.0 });
        this.roadPath.forEach((point, index) => {
            if (index % 8 === 0 && index > 30 && index < this.roadPath.length - 5) { // Sparse placement
                const coneY = point.y !== undefined ? point.y + 0.25 : 0.25;
                
                // Only on straights
                const nextIndex = Math.min(index + 1, this.roadPath.length - 1);
                const headingChange = Math.abs(this.roadPath[nextIndex].heading - point.heading);
                
                if (headingChange < 0.01) {
                    // Left side cone
                    const leftX = point.x - 8.5 * Math.cos(point.heading);
                    const leftZ = point.z + 8.5 * Math.sin(point.heading);
                    const leftCone = new THREE.Mesh(coneGeometry, coneMaterial);
                    leftCone.position.set(leftX, coneY, leftZ);
                    leftCone.castShadow = true;
                    leftCone.receiveShadow = true;
                    this.scene.add(leftCone);

                    // Right side cone
                    const rightX = point.x + 8.5 * Math.cos(point.heading);
                    const rightZ = point.z - 8.5 * Math.sin(point.heading);
                    const rightCone = new THREE.Mesh(coneGeometry, coneMaterial);
                    rightCone.position.set(rightX, coneY, rightZ);
                    rightCone.castShadow = true;
                    rightCone.receiveShadow = true;
                    this.scene.add(rightCone);
                }
            }
        });

        // Start sign
        const signPostGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2, 8);
        const signPostMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9, metalness: 0.0 });
        const signPost = new THREE.Mesh(signPostGeometry, signPostMaterial);
        signPost.position.set(-5, 1, 10);
        signPost.castShadow = true;
        signPost.receiveShadow = true;
        this.scene.add(signPost);

        const signGeometry = new THREE.PlaneGeometry(2, 1);
        const signMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.0 });
        const sign = new THREE.Mesh(signGeometry, signMaterial);
        sign.position.set(-5, 2, 10);
        sign.castShadow = true;
        sign.receiveShadow = true;
        this.scene.add(sign);

        // Posts along the road - especially on curves
        const postGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.5);
        const postMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.0, emissive: 0x222222, emissiveIntensity: 0.05 });
        const reflectorGeometry = new THREE.BoxGeometry(0.2, 0.3, 0.05);
        const reflectorMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.2,
            roughness: 0.5,
            metalness: 0.0
        });
        
        this.roadPath.forEach((point, index) => {
            if (index % 3 === 0) { // Every 3rd segment (60m spacing)
                // Posts on outside of curves, both sides on straights
                const nextIndex = Math.min(index + 1, this.roadPath.length - 1);
                const headingChange = this.roadPath[nextIndex].heading - point.heading;
                
                if (Math.abs(headingChange) < 0.01) {
                    // Straight section - posts on both sides
                    // Left post
                    const leftX = point.x - 9 * Math.sin(point.heading + Math.PI/2);
                    const leftZ = point.z - 9 * Math.cos(point.heading + Math.PI/2);
                    const leftPost = new THREE.Mesh(postGeometry, postMaterial);
                    leftPost.position.set(leftX, 0.75, leftZ);
                    leftPost.castShadow = true;
                    leftPost.receiveShadow = true;
                    this.scene.add(leftPost);
                    
                    // Right post
                    const rightX = point.x + 9 * Math.sin(point.heading + Math.PI/2);
                    const rightZ = point.z + 9 * Math.cos(point.heading + Math.PI/2);
                    const rightPost = new THREE.Mesh(postGeometry, postMaterial);
                    rightPost.position.set(rightX, 0.75, rightZ);
                    rightPost.castShadow = true;
                    rightPost.receiveShadow = true;
                    this.scene.add(rightPost);
                } else {
                    // Curve - post on outside only
                    const side = headingChange > 0 ? -1 : 1; // Outside of curve
                    const postX = point.x + side * 9 * Math.sin(point.heading + Math.PI/2);
                    const postZ = point.z + side * 9 * Math.cos(point.heading + Math.PI/2);
                    const post = new THREE.Mesh(postGeometry, postMaterial);
                    post.position.set(postX, 0.75, postZ);
                    post.castShadow = true;
                    post.receiveShadow = true;
                    this.scene.add(post);

                    // Add reflector
                    const reflector = new THREE.Mesh(reflectorGeometry, reflectorMaterial);
                    reflector.position.set(postX, 1.2, postZ);
                    reflector.rotation.y = point.heading;
                    reflector.castShadow = true;
                    reflector.receiveShadow = true;
                    this.scene.add(reflector);
                }
            }
        });
    }
    
    createRoadworks() {
        // Define construction zones with variety - some with ramps, some without
        // Adjusted for new track layout with hairpin
        const roadworksLocations = [
            { startSegment: 27, endSegment: 29, hasRamp: true, type: 'major' },  // After hairpin major construction with jump
            { startSegment: 48, endSegment: 49, hasRamp: false, type: 'minor' }  // Near end minor repairs
        ];
        
        roadworksLocations.forEach(zone => {
            this.createConstructionZone(zone.startSegment, zone.endSegment, zone.hasRamp, zone.type);
        });
    }
    
    createConstructionZone(startSegment, endSegment, hasRamp = true, zoneType = 'major') {
        // Ensure segments are valid
        if (startSegment >= this.roadPath.length || endSegment >= this.roadPath.length) {
            return;
        }
        
        const startPoint = this.roadPath[startSegment];
        const endPoint = this.roadPath[endSegment];
        
        // Create orange traffic cones along the construction zone
        const coneGeometry = new THREE.ConeGeometry(0.3, 0.8, 6);
        const coneMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff6600,
            roughness: 0.8,
            metalness: 0.1
        });
        
        // Add white reflective stripes to cones
        const stripeGeometry = new THREE.RingGeometry(0.28, 0.32, 6);
        const stripeMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.2,
            roughness: 0.3,
            metalness: 0.5
        });
        
        // Place cones with appropriate density based on zone type
        const coneSpacing = zoneType === 'major' ? 3 : 5; // Major zones have closer cones
        
        for (let i = startSegment - 1; i <= endSegment + 1; i++) {
            if (i < 0 || i >= this.roadPath.length) continue;
            const point = this.roadPath[i];
            
            // Place cones at intervals
            const conesPerSegment = zoneType === 'major' ? 3 : 2; // Fewer cones
            for (let j = 0; j < conesPerSegment; j++) {
                const progress = j / conesPerSegment;
                const nextIndex = Math.min(i + 1, this.roadPath.length - 1);
                const nextPoint = this.roadPath[nextIndex];
                
                // Interpolate position along segment
                const x = point.x + (nextPoint.x - point.x) * progress;
                const z = point.z + (nextPoint.z - point.z) * progress;
                const y = point.y + (nextPoint.y - point.y) * progress;
                const heading = point.heading;
                
                // Place cone at lane divider
                const laneOffset = zoneType === 'major' ? -0.5 : 0; // Major zones push traffic more left
                const coneX = x + Math.cos(heading) * laneOffset;
                const coneZ = z - Math.sin(heading) * laneOffset;
                
                const cone = new THREE.Mesh(coneGeometry, coneMaterial);
                cone.position.set(coneX, y + 0.4, coneZ);
                cone.castShadow = true;
                cone.receiveShadow = true;
                this.scene.add(cone);
                
                // Add reflective stripe
                const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
                stripe.position.copy(cone.position);
                stripe.position.y += 0.2;
                stripe.rotation.x = -Math.PI / 2;
                this.scene.add(stripe);
                
                // For major zones only, add edge cones
                if (zoneType === 'major' && i >= startSegment && i <= endSegment && j === 0) {
                    const rightCone = cone.clone();
                    const rightX = x + Math.cos(heading) * 4; // Right lane edge
                    const rightZ = z - Math.sin(heading) * 4;
                    rightCone.position.set(rightX, y + 0.4, rightZ);
                    rightCone.castShadow = true;
                    rightCone.receiveShadow = true;
                    this.scene.add(rightCone);
                }
            }
        }
        
        // Add fewer warning cones before major construction zones
        if (zoneType === 'major') {
            const warningDistance = 5; // Shorter warning distance
            for (let i = startSegment - warningDistance; i < startSegment - 1; i++) {
                if (i < 0) continue;
                const point = this.roadPath[i];
                
                if (i % 3 === 0) { // Every third segment only
                    // Simple warning cone on right side
                    const rightCone = new THREE.Mesh(coneGeometry, coneMaterial);
                    rightCone.position.set(
                        point.x + Math.cos(point.heading) * 5,
                        point.y + 0.4,
                        point.z - Math.sin(point.heading) * 5
                    );
                    rightCone.castShadow = true;
                    rightCone.receiveShadow = true;
                    this.scene.add(rightCone);
                }
            }
        }
        
        // Create construction barriers (Jersey barriers)
        const barrierGeometry = new THREE.BoxGeometry(4, 1, 0.8);
        const barrierMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.95,
            metalness: 0.05
        });
        
        // Calculate ramp position to avoid placing barriers there
        const rampSegment = hasRamp ? Math.floor((startSegment + endSegment) / 2) : null;

        // Place barriers along the construction zone (skip around ramp)
        for (let i = startSegment; i <= endSegment; i += 2) {
            // Skip placing barriers near the ramp (within 4 segments)
            if (hasRamp && Math.abs(i - rampSegment) <= 4) {
                continue;
            }

            const point = this.roadPath[i];

            // Place barrier on left side (mountain side) to avoid floating over cliff
            const barrierX = point.x - Math.cos(point.heading) * 25;
            const barrierZ = point.z + Math.sin(point.heading) * 25;

            const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
            barrier.position.set(barrierX, point.y + 0.5, barrierZ);
            barrier.rotation.y = point.heading;
            barrier.castShadow = true;
            barrier.receiveShadow = true;
            this.scene.add(barrier);

            // Store barrier for collision detection
            this.roadworkObstacles.push({
                type: 'barrier',
                position: new THREE.Vector3(barrierX, point.y + 0.5, barrierZ),
                width: 4,
                height: 1,
                depth: 0.8
            });

            // console.log('Created barrier at:', barrierX.toFixed(1), barrierZ.toFixed(1), 'segment:', i);

            // Add orange and white stripes
            const stripeTexture = this.createConstructionStripeTexture();
            const stripePanelGeometry = new THREE.PlaneGeometry(4, 0.3);
            const stripePanelMaterial = new THREE.MeshStandardMaterial({
                map: stripeTexture,
                side: THREE.DoubleSide
            });

            const stripePanel = new THREE.Mesh(stripePanelGeometry, stripePanelMaterial);
            stripePanel.position.copy(barrier.position);
            stripePanel.position.y += 0.7;
            stripePanel.rotation.y = barrier.rotation.y;
            this.scene.add(stripePanel);
        }
        
        // Only add ramp and heavy equipment for major construction zones
        if (hasRamp && zoneType === 'major') {
            const midSegment = Math.floor((startSegment + endSegment) / 2);
            const rampPoint = this.roadPath[midSegment];

            // Move ramp to the right-hand lane
            const offsetPoint = {
                x: rampPoint.x + Math.cos(rampPoint.heading) * 5, // Right lane position
                z: rampPoint.z - Math.sin(rampPoint.heading) * 5,
                y: rampPoint.y,
                heading: rampPoint.heading
            };

            this.createDirtRamp(offsetPoint, midSegment);
            
            // Add construction equipment (static bulldozer) - moved far from road on mountain side
            this.createBulldozer(
                rampPoint.x - Math.cos(rampPoint.heading) * 30,
                rampPoint.y,
                rampPoint.z + Math.sin(rampPoint.heading) * 30,
                rampPoint.heading
            );

            // Add shipping containers for collision - positioned on mountain side to avoid drop-off
            // Placed at -6 and -7 units (left side) for better visibility while avoiding dirt pile
            this.createShippingContainer(
                rampPoint.x - Math.cos(rampPoint.heading) * 6,
                rampPoint.y,
                rampPoint.z + Math.sin(rampPoint.heading) * 6,
                rampPoint.heading
            );

            this.createShippingContainer(
                rampPoint.x - Math.cos(rampPoint.heading) * 7,
                rampPoint.y,
                rampPoint.z + Math.sin(rampPoint.heading) * 7,
                rampPoint.heading + Math.PI/2
            );
        } else if (zoneType === 'minor') {
            // For minor zones, just add some work equipment
            const workPoint = this.roadPath[startSegment];
            
            // Add a simple work truck instead of bulldozer (moved far from road on mountain side)
            this.createWorkTruck(
                workPoint.x - Math.cos(workPoint.heading) * 25,
                workPoint.y,
                workPoint.z + Math.sin(workPoint.heading) * 25,
                workPoint.heading
            );
        }
        
        // Add appropriate signage based on zone type
        if (zoneType === 'major') {
            this.createConstructionSign(
                this.roadPath[Math.max(0, startSegment - 5)],
                "ROAD WORK AHEAD"
            );
            
            // Add warning lights for major zones - REMOVED
            // this.createWarningLight(
            //     this.roadPath[Math.max(0, startSegment - 1)],
            //     'right'
            // );
        } else {
            // Minor zones just get a simple sign
            this.createConstructionSign(
                this.roadPath[Math.max(0, startSegment - 3)],
                "SLOW"
            );
        }
        
        // Store construction zone info for traffic AI
        this.roadworksZones.push({
            startSegment: startSegment,
            endSegment: endSegment,
            blockedLane: 'right',
            rampSegment: hasRamp ? Math.floor((startSegment + endSegment) / 2) : null,
            type: zoneType,
            hasRamp: hasRamp
        });
    }
    
    createDirtRamp(point, segmentIndex) {
        // Create dirt pile geometry - more irregular and mound-like
        const pileWidth = 5;  // Narrower dirt pile
        const pileLength = 10; // Shorter than ramp
        const pileHeight = 1.5; // Half height

        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];
        const uvs = [];

        // Create irregular dirt pile shape
        const segments = 12;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const z = -pileLength/2 + pileLength * t;

            // Create mound-like height profile with irregularities
            let baseHeight;
            if (t < 0.3) {
                // Gentle rise at start
                baseHeight = (t / 0.3) * pileHeight * 0.4;
            } else if (t < 0.7) {
                // Peak in middle with some variation
                const peakProgress = (t - 0.3) / 0.4;
                baseHeight = pileHeight * (0.4 + 0.6 * Math.sin(peakProgress * Math.PI));
            } else {
                // Fall off at end
                const fallProgress = (t - 0.7) / 0.3;
                baseHeight = pileHeight * Math.cos(fallProgress * Math.PI / 2) * 0.8;
            }

            // Add random height variations to make it look like piled dirt
            const heightVariation = (Math.sin(t * 15) + Math.cos(t * 8)) * 0.3;
            const y = Math.max(0, baseHeight + heightVariation);

            // Vary width to make it look less uniform
            const widthVariation = Math.sin(t * 6) * 0.5;
            const currentWidth = pileWidth + widthVariation;

            // Add width vertices with some asymmetry
            vertices.push(-currentWidth/2, y, z);
            vertices.push(currentWidth/2, y, z);

            uvs.push(0, t);
            uvs.push(1, t);
        }
        
        // Create triangles
        for (let i = 0; i < segments; i++) {
            const a = i * 2;
            const b = i * 2 + 1;
            const c = (i + 1) * 2;
            const d = (i + 1) * 2 + 1;
            
            indices.push(a, c, b);
            indices.push(b, c, d);
        }
        
        // Add sides with irregular dirt pile profile
        const sideStart = vertices.length / 3;

        // Left side
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const z = -pileLength/2 + pileLength * t;

            // Get the corresponding top vertex height
            const topVertexIndex = i * 2;
            const topY = vertices[topVertexIndex * 3 + 1]; // Y coordinate of left top vertex

            // Add some base variation
            const baseVariation = Math.sin(t * 8) * 0.2;
            const baseY = Math.max(0, baseVariation);

            vertices.push(-pileWidth/2 - Math.sin(t * 4) * 0.3, baseY, z);
            vertices.push(-pileWidth/2 - Math.sin(t * 4) * 0.3, topY, z);

            uvs.push(0, t);
            uvs.push(0.2, t);
        }

        // Right side
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const z = -pileLength/2 + pileLength * t;

            // Get the corresponding top vertex height
            const topVertexIndex = i * 2 + 1;
            const topY = vertices[topVertexIndex * 3 + 1]; // Y coordinate of right top vertex

            // Add some base variation
            const baseVariation = Math.cos(t * 6) * 0.2;
            const baseY = Math.max(0, baseVariation);

            vertices.push(pileWidth/2 + Math.cos(t * 5) * 0.3, baseY, z);
            vertices.push(pileWidth/2 + Math.cos(t * 5) * 0.3, topY, z);

            uvs.push(0.8, t);
            uvs.push(1, t);
        }
        
        // Create side triangles
        for (let s = 0; s < 2; s++) {
            const offset = sideStart + s * (segments + 1) * 2;
            for (let i = 0; i < segments; i++) {
                const a = offset + i * 2;
                const b = offset + i * 2 + 1;
                const c = offset + (i + 1) * 2;
                const d = offset + (i + 1) * 2 + 1;
                
                indices.push(a, b, c);
                indices.push(b, d, c);
            }
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        // Create dirt material with texture
        const dirtTexture = this.createDirtTexture();
        const dirtMaterial = new THREE.MeshStandardMaterial({
            map: dirtTexture,
            color: 0xFFFFFF, // White base to let texture colors show through
            roughness: 0.98,
            metalness: 0.0
        });
        
        const ramp = new THREE.Mesh(geometry, dirtMaterial);
        ramp.position.set(point.x, point.y, point.z);
        ramp.rotation.y = point.heading;
        ramp.castShadow = true;
        ramp.receiveShadow = true;
        this.scene.add(ramp);
        
        // Store ramp info for collision detection
        this.jumpRamps.push({
            position: new THREE.Vector3(point.x, point.y, point.z),
            rotation: point.heading,
            width: pileWidth,
            length: pileLength,
            height: pileHeight,
            segmentIndex: segmentIndex
        });
    }
    
    createDirtTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Base dirt color - more varied brown tones
        ctx.fillStyle = '#6B4423';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add large dirt clumps and variations
        for (let i = 0; i < 150; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = Math.random() * 4 + 1;
            const brightness = Math.random() * 60 - 30;

            // Vary between different dirt tones
            const r = Math.max(0, Math.min(255, 107 + brightness + Math.random() * 20));
            const g = Math.max(0, Math.min(255, 68 + brightness + Math.random() * 15));
            const b = Math.max(0, Math.min(255, 35 + brightness + Math.random() * 10));

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Add darker soil patches
        ctx.globalAlpha = 0.4;
        for (let i = 0; i < 25; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const width = Math.random() * 25 + 8;
            const height = Math.random() * 25 + 8;

            ctx.fillStyle = '#4A2C1A';
            ctx.fillRect(x, y, width, height);
        }

        // Add some small rocks/pebbles
        ctx.globalAlpha = 0.7;
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 2 + 1;

            ctx.fillStyle = '#666666';
            ctx.fillRect(x, y, size, size);
        }

        // Add sparse grass patches on top
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const width = Math.random() * 20 + 5;
            const height = Math.random() * 15 + 3;

            ctx.fillStyle = '#228B22';
            ctx.fillRect(x, y, width, height);
        }

        // Add tire tracks or disturbance marks
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = '#2F1B14';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            const startX = Math.random() * canvas.width;
            const startY = Math.random() * canvas.height;
            ctx.moveTo(startX, startY);

            // Create irregular track marks
            for (let j = 0; j < 5; j++) {
                const nextX = startX + (Math.random() - 0.5) * 30;
                const nextY = startY + Math.random() * 20;
                ctx.lineTo(nextX, nextY);
            }
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }
    
    createConstructionStripeTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Orange and white diagonal stripes
        const stripeWidth = 32;
        ctx.fillStyle = '#FF6600';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FFFFFF';
        for (let i = -canvas.height; i < canvas.width + canvas.height; i += stripeWidth * 2) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + stripeWidth, 0);
            ctx.lineTo(i + stripeWidth + canvas.height, canvas.height);
            ctx.lineTo(i + canvas.height, canvas.height);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        return texture;
    }
    
    createBulldozer(x, y, z, rotation) {
        const group = new THREE.Group();
        
        // Main body
        const bodyGeometry = new THREE.BoxGeometry(3, 2, 4);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            roughness: 0.7,
            metalness: 0.3
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(0, 1, 0);
        group.add(body);
        
        // Cabin
        const cabinGeometry = new THREE.BoxGeometry(2, 2, 2);
        const cabinMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            roughness: 0.7,
            metalness: 0.3
        });
        const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
        cabin.position.set(0, 2.5, -1);
        group.add(cabin);
        
        // Blade
        const bladeGeometry = new THREE.BoxGeometry(4, 1.5, 0.3);
        const bladeMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.9,
            metalness: 0.8
        });
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.set(0, 0.75, 2.5);
        blade.rotation.x = -0.2;
        group.add(blade);
        
        // Tracks
        const trackGeometry = new THREE.BoxGeometry(1, 1, 4.5);
        const trackMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.95,
            metalness: 0.1
        });
        
        const leftTrack = new THREE.Mesh(trackGeometry, trackMaterial);
        leftTrack.position.set(-1.8, 0.5, 0);
        group.add(leftTrack);
        
        const rightTrack = new THREE.Mesh(trackGeometry, trackMaterial);
        rightTrack.position.set(1.8, 0.5, 0);
        group.add(rightTrack);
        
        group.position.set(x, y, z);
        group.rotation.y = rotation;
        group.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        this.scene.add(group);
        
        // Store bulldozer for collision detection
        this.roadworkObstacles.push({
            type: 'bulldozer',
            position: new THREE.Vector3(x, y, z),
            width: 4,
            height: 3,
            depth: 5,
            rotation: rotation
        });
    }
    
    createConstructionSign(point, text) {
        const signGroup = new THREE.Group();
        
        // Sign post
        const postGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3);
        const postMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.8,
            metalness: 0.5
        });
        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.set(0, 1.5, 0);
        signGroup.add(post);
        
        // Sign board
        const boardGeometry = new THREE.BoxGeometry(4, 1.5, 0.1);
        const boardMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF6600,
            roughness: 0.9,
            metalness: 0.1,
            emissive: 0xFF6600,
            emissiveIntensity: 0.1
        });
        const board = new THREE.Mesh(boardGeometry, boardMaterial);
        board.position.set(0, 3, 0);
        signGroup.add(board);
        
        // Position sign beside road
        const signX = point.x - Math.cos(point.heading) * 10;
        const signZ = point.z + Math.sin(point.heading) * 10;
        
        signGroup.position.set(signX, point.y, signZ);
        signGroup.rotation.y = point.heading;
        
        signGroup.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        this.scene.add(signGroup);
    }
    
    createWorkTruck(x, y, z, rotation) {
        const group = new THREE.Group();
        
        // Truck body (smaller than bulldozer)
        const bodyGeometry = new THREE.BoxGeometry(2, 1.5, 4);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFA500, // Orange work truck
            roughness: 0.7,
            metalness: 0.2
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(0, 0.75, 0);
        group.add(body);
        
        // Truck cab
        const cabGeometry = new THREE.BoxGeometry(1.8, 1.2, 1.5);
        const cabMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFA500,
            roughness: 0.7,
            metalness: 0.2
        });
        const cab = new THREE.Mesh(cabGeometry, cabMaterial);
        cab.position.set(0, 1.5, 1);
        group.add(cab);
        
        // Wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8);
        const wheelMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.95,
            metalness: 0.1
        });
        
        const wheelPositions = [
            { x: -0.8, y: 0.3, z: 1.5 },
            { x: 0.8, y: 0.3, z: 1.5 },
            { x: -0.8, y: 0.3, z: -1.5 },
            { x: 0.8, y: 0.3, z: -1.5 }
        ];
        
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(pos.x, pos.y, pos.z);
            wheel.rotation.z = Math.PI / 2;
            group.add(wheel);
        });
        
        // Work light on top
        const lightBarGeometry = new THREE.BoxGeometry(1.5, 0.2, 0.2);
        const lightBarMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFF00,
            emissive: 0xFFFF00,
            emissiveIntensity: 0.3
        });
        const lightBar = new THREE.Mesh(lightBarGeometry, lightBarMaterial);
        lightBar.position.set(0, 2.2, 1);
        group.add(lightBar);
        
        group.position.set(x, y, z);
        group.rotation.y = rotation;
        group.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        this.scene.add(group);
        
        // Store work truck for collision detection
        this.roadworkObstacles.push({
            type: 'worktruck',
            position: new THREE.Vector3(x, y, z),
            width: 2,
            height: 2.5,
            depth: 4,
            rotation: rotation
        });
    }

    createShippingContainer(x, y, z, rotation) {
        // Create shipping container geometry
        const containerGeometry = new THREE.BoxGeometry(2.5, 2.5, 6);
        const containerMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF6B35, // Bright orange for visibility
            roughness: 0.9,
            metalness: 0.1
        });

        const container = new THREE.Mesh(containerGeometry, containerMaterial);

        // Add hazard stripes for visibility
        const stripeGeometry = new THREE.PlaneGeometry(2.4, 0.3);
        const stripeMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000, // Black hazard stripes
            roughness: 0.8,
            metalness: 0.2,
            side: THREE.DoubleSide
        });

        // Add hazard stripes on all sides
        const stripePositions = [
            // Front and back
            { position: [0, 0.6, 3.01], rotation: [0, 0, 0] },
            { position: [0, 0, 3.01], rotation: [0, 0, 0] },
            { position: [0, -0.6, 3.01], rotation: [0, 0, 0] },
            { position: [0, 0.6, -3.01], rotation: [0, Math.PI, 0] },
            { position: [0, 0, -3.01], rotation: [0, Math.PI, 0] },
            { position: [0, -0.6, -3.01], rotation: [0, Math.PI, 0] },
            // Sides
            { position: [1.26, 0.6, 0], rotation: [0, Math.PI/2, 0] },
            { position: [1.26, 0, 0], rotation: [0, Math.PI/2, 0] },
            { position: [1.26, -0.6, 0], rotation: [0, Math.PI/2, 0] },
            { position: [-1.26, 0.6, 0], rotation: [0, -Math.PI/2, 0] },
            { position: [-1.26, 0, 0], rotation: [0, -Math.PI/2, 0] },
            { position: [-1.26, -0.6, 0], rotation: [0, -Math.PI/2, 0] }
        ];

        stripePositions.forEach(stripe => {
            const hazardStripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
            hazardStripe.position.set(...stripe.position);
            hazardStripe.rotation.set(...stripe.rotation);
            container.add(hazardStripe);
        });

        container.position.set(x, y + 1.25, z); // Center at ground level + half height
        container.rotation.y = rotation;

        container.castShadow = true;
        container.receiveShadow = true;
        this.scene.add(container);

        // Store container for collision detection
        this.roadworkObstacles.push({
            type: 'container',
            position: new THREE.Vector3(x, y + 1.25, z),
            width: 2.5,
            height: 2.5,
            depth: 6,
            rotation: rotation
        });
    }

    createWarningLight(point, side) {
        const lightGroup = new THREE.Group();
        
        // Light pole
        const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2);
        const poleMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.5
        });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.set(0, 1, 0);
        lightGroup.add(pole);
        
        // Warning light
        const lightGeometry = new THREE.SphereGeometry(0.2, 8, 6);
        const lightMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFA500,
            emissive: 0xFFA500,
            emissiveIntensity: 0.8,
            roughness: 0.2,
            metalness: 0.1
        });
        const warningLight = new THREE.Mesh(lightGeometry, lightMaterial);
        warningLight.position.set(0, 2, 0);
        lightGroup.add(warningLight);
        
        // Position beside construction zone entrance
        const offset = side === 'left' ? -4 : 4;
        const lightX = point.x + Math.cos(point.heading) * offset;
        const lightZ = point.z - Math.sin(point.heading) * offset;
        
        lightGroup.position.set(lightX, point.y, lightZ);
        
        lightGroup.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        this.scene.add(lightGroup);
    }
    
    addHairpinWarnings() {
        // Find the extreme hairpin segment (around segment 34 based on our layout)
        let hairpinStartSegment = 0;
        let segmentCount = 0;
        
        // Calculate where the hairpin is
        const layout = [
            { segments: 10 }, { segments: 6 }, { segments: 4 }, { segments: 8 },
            { segments: 3 }, { segments: 10 }, { segments: 5 }, { segments: 2 },
            { segments: 7 }, // This is the hairpin
        ];
        
        for (let i = 0; i < 8; i++) {
            segmentCount += layout[i].segments;
        }
        hairpinStartSegment = segmentCount;
        
        // Add chevron warning signs before the hairpin
        this.createHairpinSign(
            this.roadPath[Math.max(0, hairpinStartSegment - 5)],
            'EXTREME HAIRPIN'
        );
        
        this.createHairpinSign(
            this.roadPath[Math.max(0, hairpinStartSegment - 3)],
            'SLOW DOWN!'
        );
        
        // Add chevron markers through the turn
        for (let i = 0; i < 7; i++) {
            if (hairpinStartSegment + i >= this.roadPath.length) break;
            const point = this.roadPath[hairpinStartSegment + i];
            this.createChevronMarker(point, 'right');
        }
        
        // Add safety barriers on the outside of the hairpin
        for (let i = -1; i < 8; i++) {
            const segmentIndex = hairpinStartSegment + i;
            if (segmentIndex < 0 || segmentIndex >= this.roadPath.length) continue;
            
            const point = this.roadPath[segmentIndex];
            
            // Place barrier on outside of turn (left side since it's a right turn)
            const barrierDistance = 9;
            const barrierX = point.x - Math.cos(point.heading) * barrierDistance;
            const barrierZ = point.z + Math.sin(point.heading) * barrierDistance;
            
            // Create red and white striped barrier
            const barrierGeometry = new THREE.BoxGeometry(3, 1.2, 0.5);
            const barrierMaterial = new THREE.MeshStandardMaterial({
                color: 0xff0000,
                roughness: 0.9,
                metalness: 0.1
            });
            
            const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
            barrier.position.set(barrierX, point.y + 0.6, barrierZ);
            barrier.rotation.y = point.heading;
            barrier.castShadow = true;
            barrier.receiveShadow = true;
            this.scene.add(barrier);
            
            // Store hairpin barrier for collision detection
            this.roadworkObstacles.push({
                type: 'hairpin_barrier',
                position: new THREE.Vector3(barrierX, point.y + 0.6, barrierZ),
                width: 3,
                height: 1.2,
                depth: 0.5
            });
            
            // Add white stripes
            const stripeGeometry = new THREE.BoxGeometry(0.5, 1.2, 0.51);
            const stripeMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.8,
                metalness: 0.1
            });
            
            for (let s = -1; s <= 1; s++) {
                const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
                stripe.position.copy(barrier.position);
                stripe.position.x += Math.sin(point.heading) * s * 0.8;
                stripe.position.z += Math.cos(point.heading) * s * 0.8;
                stripe.position.z += 0.01; // Slightly in front
                this.scene.add(stripe);
            }
        }
    }
    
    createHairpinSign(point, text) {
        const signGroup = new THREE.Group();
        
        // Sign post
        const postGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3);
        const postMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.8,
            metalness: 0.5
        });
        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.set(0, 1.5, 0);
        signGroup.add(post);
        
        // Warning sign board - yellow with black text
        const boardGeometry = new THREE.BoxGeometry(4, 1.5, 0.1);
        const boardMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFDD00,
            roughness: 0.9,
            metalness: 0.1,
            emissive: 0xFFDD00,
            emissiveIntensity: 0.2
        });
        const board = new THREE.Mesh(boardGeometry, boardMaterial);
        board.position.set(0, 3, 0);
        signGroup.add(board);
        
        // Position sign beside road
        const signX = point.x - Math.cos(point.heading) * 10;
        const signZ = point.z + Math.sin(point.heading) * 10;
        
        signGroup.position.set(signX, point.y, signZ);
        signGroup.rotation.y = point.heading;
        
        signGroup.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        this.scene.add(signGroup);
    }
    
    createChevronMarker(point, direction) {
        // Create chevron arrow marker pointing the direction of the turn
        const chevronGroup = new THREE.Group();
        
        // Post
        const postGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5);
        const postMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.5
        });
        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.set(0, 0.75, 0);
        chevronGroup.add(post);
        
        // Chevron shape (arrow)
        const chevronGeometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            -0.5, 0, 0,
            0, 0, -0.3,
            0.5, 0, 0,
            0.5, 0.3, 0,
            0, 0.3, -0.3,
            -0.5, 0.3, 0
        ]);
        const indices = [0, 1, 4, 0, 4, 5, 1, 2, 3, 1, 3, 4];
        chevronGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        chevronGeometry.setIndex(indices);
        chevronGeometry.computeVertexNormals();
        
        const chevronMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF0000,
            emissive: 0xFF0000,
            emissiveIntensity: 0.3,
            roughness: 0.9,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        
        const chevron = new THREE.Mesh(chevronGeometry, chevronMaterial);
        chevron.position.set(0, 1.8, 0);
        chevron.scale.set(1.5, 1.5, 1.5);
        
        // Rotate chevron to point right for right turn
        if (direction === 'right') {
            chevron.rotation.y = Math.PI / 2;
        } else {
            chevron.rotation.y = -Math.PI / 2;
        }
        
        chevronGroup.add(chevron);
        
        // Position on outside of turn
        const markerDistance = 8;
        const markerX = point.x - Math.cos(point.heading) * markerDistance;
        const markerZ = point.z + Math.sin(point.heading) * markerDistance;
        
        chevronGroup.position.set(markerX, point.y, markerZ);
        chevronGroup.rotation.y = point.heading;
        
        chevronGroup.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        this.scene.add(chevronGroup);
    }
    
    createRoadworksStripeTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Create red and white diagonal stripes
        const stripeWidth = 8;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#FF0000';
        for (let i = -canvas.height; i < canvas.width + canvas.height; i += stripeWidth * 2) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + stripeWidth, 0);
            ctx.lineTo(i + stripeWidth - canvas.height, canvas.height);
            ctx.lineTo(i - canvas.height, canvas.height);
            ctx.closePath();
            ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    createCheckpoints() {
        // Place checkpoints evenly throughout the track
        const totalSegments = this.roadPath.length;
        const checkpointInterval = Math.floor(totalSegments / 5); // 5 checkpoints

        // Start checkpoints after the first quarter of the track to avoid immediate scoring
        const startOffset = Math.floor(totalSegments / 4);

        // Create roadworks stripe texture
        const stripeTexture = this.createRoadworksStripeTexture();

        for (let i = 0; i < 5; i++) {
            const segmentIndex = (startOffset + i * checkpointInterval) % totalSegments;
            const point = this.roadPath[segmentIndex];
            const nextPoint = this.roadPath[(segmentIndex + 1) % totalSegments];
            
            // Create checkpoint gate
            const gateGroup = new THREE.Group();
            
            // Left pole with red/white stripes (like Swiss roadworks)
            const poleGeometry = new THREE.CylinderGeometry(0.15, 0.15, 5);
            const poleMaterial = new THREE.MeshStandardMaterial({
                map: stripeTexture,
                emissive: 0x330000,
                emissiveIntensity: 0.1,
                roughness: 0.5,
                metalness: 0.5
            });

            const leftPole = new THREE.Mesh(poleGeometry, poleMaterial);
            leftPole.position.set(-6, 2.5, 0); // Closer together, lower height
            gateGroup.add(leftPole);

            const rightPole = new THREE.Mesh(poleGeometry, poleMaterial);
            rightPole.position.set(6, 2.5, 0); // Closer together, lower height
            gateGroup.add(rightPole);
            
            // Position and orient the checkpoint
            gateGroup.position.set(point.x, point.y, point.z);
            gateGroup.rotation.y = point.heading;
            
            gateGroup.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            this.scene.add(gateGroup);
            
            // Store checkpoint info
            this.checkpoints.push({
                index: i,
                position: new THREE.Vector3(point.x, point.y, point.z),
                heading: point.heading,
                passed: false,
                width: 16, // Width of checkpoint gate
                segmentIndex: segmentIndex
            });
        }
    }
}