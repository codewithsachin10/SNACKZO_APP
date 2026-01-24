/// <reference types="vite/client" />
/// <reference types="@types/react" />
/// <reference types="@types/react-dom" />

declare namespace JSX {
    interface IntrinsicElements {
        mesh: any;
        geometry: any;
        material: any;
        group: any;
        ambientLight: any;
        pointLight: any;
        spotLight: any;
        primitive: any;
        torusKnotGeometry: any;
        meshStandardMaterial: any;
        icosahedronGeometry: any;
        meshWobbleMaterial: any;
        meshDistortMaterial: any;
        planeGeometry: any;
        directionalLight: any;
        boxGeometry: any;
    }
}
