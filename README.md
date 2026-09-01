# STL PinCut 3D - Interactive 3D Model Slicer with Alignment Pins

An interactive 3D model cutting and alignment pin generator designed for 3D printing, matching the exact workflow seen in specialized 3D character slicing tools (Nomad Sculpt / Blender pin cut tools).

## Core Features
1. **Interactive 3D Surface Lasso Drawing**:
   - Precision 3D surface crosshair `(+)` cursor.
   - Real-time raycasted Red 3D spline adhering to mesh contours.
   - Green start point indicator node.
   - Elastic Yellow rubber-band closing guide line connecting the cursor to the start marker.
   - Smooth loop closure and node snapping.

2. **Automated Cut Plane & Pin Generator (Videodaki Akış)**:
   - Instant generation of Neon Green cut cap slice surface upon closing the loop.
   - Translucent Orange Connector Pin (Tapered Truncated Pyramid, Cylindrical Dowel, Hexagonal Prism) positioned at the centroid and aligned along the cut plane normal.
   - Dashed direction axis line with double arrow indicators.
   - Real-time adjustment for Pin Width, Height, Taper Ratio, and Orientation Flip.

3. **Mesh Slicing & Female Socket Clearance**:
   - Slices 3D meshes along arbitrary best-fit cut planes.
   - Attaches Male Pin to Part 1 and generates matching Female Socket Pocket in Part 2 with calibrated 3D printing clearance.
   - Real-time Exploded View slider to pull apart cut pieces and inspect internal joints.

4. **Stylized Sculpt Clay Shader & High-Detail Presets**:
   - Turquoise Clay MatCap shader with specular highlights and ambient shading.
   - Bundled presets: Bearded Character Sculpt Bust, Muscular Anatomy Arm, Mechanical Assembly Bracket, Stepped Cylinder Joint.
   - Full support for custom Binary and ASCII `.stl` file uploads.

5. **Direct 3D Print Export**:
   - One-click Binary STL download for Part 1 (Male Pin) and Part 2 (Female Socket).
   - One-click ZIP package download with all parts and 3D printing slicing instructions.
