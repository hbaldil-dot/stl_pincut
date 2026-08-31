# STL PinCut 3D (Android)

Native Android application rewritten from React + Three.js to Kotlin and Jetpack Compose.

## Features
- **3D Model Engine**: Interactive 3D STL viewer with 360° orbit, zoom, pan, and solid/wireframe rendering modes.
- **STL File Import & Export**: Supports loading ASCII and Binary STL files directly from Android storage or bundled 3D sample models (Figurine, Bracket, Cylinder Connector, Hexagonal Prism). Exports split parts as 3D-printable binary STL files with Android system share sheet support.
- **Surface Paint Lasso**: Interactive 3D face painting with configurable brush size radius and undo history.
- **Radial Spline Cutting Line**: Algorithmic boundary extraction and radial sorting generating smooth Catmull-Rom 3D cut loop around models.
- **Alignment Pin & Socket Slicing**: Slices mesh along the cutting plane and automatically generates male alignment pins (Tapered Pyramid or Straight Prism) and corresponding female socket cavities.
- **Exploded View Animation**: Interactive separation slider to preview split parts before 3D printing.
