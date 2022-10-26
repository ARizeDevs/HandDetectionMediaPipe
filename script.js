import DeviceDetector from "https://cdn.skypack.dev/device-detector-js@2.2.10";

import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.145.0/examples/jsm/controls/OrbitControls.js';

const mpHands = window;
const drawingUtils = window;
const controls = window;
const controls3d = window;
let handWorldLandmarks = [];
let handLandmarks = [];
// Usage: testSupport({client?: string, os?: string}[])
// Client and os are regular expressions.
// See: https://cdn.jsdelivr.net/npm/device-detector-js@2.2.10/README.md for
// legal values for client and os
testSupport([
    { client: 'Chrome' },
]);
function testSupport(supportedDevices) {
    const deviceDetector = new DeviceDetector();
    const detectedDevice = deviceDetector.parse(navigator.userAgent);
    let isSupported = false;
    for (const device of supportedDevices) {
        if (device.client !== undefined) {
            const re = new RegExp(`^${device.client}$`);
            if (!re.test(detectedDevice.client.name)) {
                continue;
            }
        }
        if (device.os !== undefined) {
            const re = new RegExp(`^${device.os}$`);
            if (!re.test(detectedDevice.os.name)) {
                continue;
            }
        }
        isSupported = true;
        break;
    }
    if (!isSupported) {
        alert(`This demo, running on ${detectedDevice.client.name}/${detectedDevice.os.name}, ` +
            `is not well supported at this time, continue at your own risk.`);
    }
}
// Our input frames will come from here.
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const controlsElement = document.getElementsByClassName('control-panel')[0];
const canvasCtx = canvasElement.getContext('2d');
const config = {
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${mpHands.VERSION}/${file}`;
    }
};
// We'll add this to our control panel later, but we'll save it here so we can
// call tick() each time the graph runs.
const fpsControl = new controls.FPS();
// Optimization: Turn off animated spinner after its hiding animation is done.
const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
    spinner.style.display = 'none';
};
// const landmarkContainer = document.getElementsByClassName('landmark-grid-container')[0];
// const grid = new controls3d.LandmarkGrid(landmarkContainer, {
//     connectionColor: 0xCCCCCC,
//     definedColors: [{ name: 'Left', value: 0xffa500 }, { name: 'Right', value: 0x00ffff }],
//     range: 0.2,
//     fitToGrid: false,
//     labelSuffix: 'm',
//     landmarkSize: 2,
//     numCellsPerAxis: 4,
//     showHidden: false,
//     centered: false,
// });
function onResults(results) {
    if (results.multiHandWorldLandmarks.length) {
        handWorldLandmarks = [...results.multiHandWorldLandmarks[0]];
        // console.log(results);
    }
    else {
        handWorldLandmarks = [];
    }
    if (results.multiHandLandmarks.length) {
        handLandmarks = [...results.multiHandLandmarks[0]];
    } else {
        handLandmarks = [];
    }

    // Hide the spinner.
    document.body.classList.add('loaded');
    // Update the frame rate.
    fpsControl.tick();
    // Draw the overlays.
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    // if (results.multiHandLandmarks && results.multiHandedness) {
    //     for (let index = 0; index < results.multiHandLandmarks.length; index++) {
    //         const classification = results.multiHandedness[index];
    //         const isRightHand = classification.label === 'Right';
    //         const landmarks = results.multiHandLandmarks[index];
    //         drawingUtils.drawConnectors(canvasCtx, landmarks, mpHands.HAND_CONNECTIONS, { color: isRightHand ? '#00FF00' : '#FF0000' });
    //         drawingUtils.drawLandmarks(canvasCtx, landmarks, {
    //             color: isRightHand ? '#00FF00' : '#FF0000',
    //             fillColor: isRightHand ? '#FF0000' : '#00FF00',
    //             radius: (data) => {
    //                 return drawingUtils.lerp(data.from.z, -0.15, .1, 10, 1);
    //             }
    //         });
    //     }
    // }
    canvasCtx.restore();
    if (results.multiHandWorldLandmarks) {
        // We only get to call updateLandmarks once, so we need to cook the data to
        // fit. The landmarks just merge, but the connections need to be offset.
        // const landmarks = results.multiHandWorldLandmarks.reduce((prev, current) => [...prev, ...current], []);
        // const colors = [];
        // let connections = [];
        // for (let loop = 0; loop < results.multiHandWorldLandmarks.length; ++loop) {
        //     const offset = loop * mpHands.HAND_CONNECTIONS.length;
        //     const offsetConnections = mpHands.HAND_CONNECTIONS.map((connection) => [connection[0] + offset, connection[1] + offset]);
        //     connections = connections.concat(offsetConnections);
        //     const classification = results.multiHandedness[loop];
        //     colors.push({
        //         list: offsetConnections.map((unused, i) => i + offset),
        //         color: classification.label,
        //     });
        // }
        // grid.updateLandmarks(landmarks, connections, colors);
    }
    else {
        // grid.updateLandmarks([]);
    }
}
const hands = new mpHands.Hands(config);
hands.onResults(onResults);
// Present a control panel through which the user can manipulate the solution
// options.
new controls
    .ControlPanel(controlsElement, {
        selfieMode: true,
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    })
    .add([
        new controls.StaticText({ title: 'MediaPipe Hands' }),
        fpsControl,
        new controls.Toggle({ title: 'Selfie Mode', field: 'selfieMode' }),
        new controls.SourcePicker({
            onFrame: async (input, size) => {
                const aspect = size.height / size.width;
                let width, height;
                if (window.innerWidth > window.innerHeight) {
                    height = window.innerHeight;
                    width = height / aspect;
                }
                else {
                    width = window.innerWidth;
                    height = width * aspect;
                }
                canvasElement.width = width;
                canvasElement.height = height;
                await hands.send({ image: input });
            },
        }),
        new controls.Slider({
            title: 'Max Number of Hands',
            field: 'maxNumHands',
            range: [1, 4],
            step: 1
        }),
        new controls.Slider({
            title: 'Model Complexity',
            field: 'modelComplexity',
            discrete: ['Lite', 'Full'],
        }),
        new controls.Slider({
            title: 'Min Detection Confidence',
            field: 'minDetectionConfidence',
            range: [0, 1],
            step: 0.01
        }),
        new controls.Slider({
            title: 'Min Tracking Confidence',
            field: 'minTrackingConfidence',
            range: [0, 1],
            step: 0.01
        }),
    ])
    .on(x => {
        const options = x;
        videoElement.classList.toggle('selfie', options.selfieMode);
        hands.setOptions(options);
    });




const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1280 / 720, 0.001, 1000);
// const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.001, 1000);


const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setClearColor(0x000000, 0); // the default
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const threeControls = new OrbitControls(camera, renderer.domElement);

camera.position.z = 2;

// console.log(camera);

// console.log(renderer.domElement);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const box = new THREE.Mesh(geometry, material);
box.position.set(0, 0, -1);
// scene.add(box);


const spheres = [];

for (let i = 0; i < 21; i++) {
    const geometry = new THREE.SphereGeometry(0.02, 32, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.visible = true;
    scene.add(sphere);
    spheres.push(sphere);
}

function animate() {
    if (handWorldLandmarks.length) {

        // const { x, y, z } = handLandmarks[0];
        // // landmarks[0][1] == nose position(face center point)
        // // use landmarks xy value to calculate the screen xy
        // let vec = new THREE.Vector3();
        // let pos = new THREE.Vector3();

        // // var newVec = new THREE.Vector3(x * 2 - 1,-y * 2 + 1, -1).unproject(camera);
        // // console.log(newVec);

        // vec.set(
        //     x * 2 - 1,
        //     -y * 2 + 1,
        //     0.5);
        // vec.unproject(camera);
        // vec.sub(camera.position).normalize();
        // let distance = -camera.position.z / vec.z;
        // pos.copy(camera.position).add(vec.multiplyScalar(distance));
        // box.position.x = pos.x;
        // box.position.y = pos.y;
        // console.log(pos);

        spheres.forEach((sphere, i) => {

            const { x, y, z } = handLandmarks[i];
      
            let vec = new THREE.Vector3();
            let pos = new THREE.Vector3();
    
            vec.set(
                x * 2 - 1,
                -y * 2 + 1,
                0.5);
            vec.unproject(camera);
            vec.sub(camera.position).normalize();
            let distance = -camera.position.z / vec.z;
            pos.copy(camera.position).add(vec.multiplyScalar(distance));
            sphere.position.x = pos.x;
            sphere.position.y = pos.y;

            sphere.visible = true;
            // sphere.position.set(handWorldLandmarks[i].x, -handWorldLandmarks[i].y, -handWorldLandmarks[i].z);
        });
    }
    else {
        spheres.forEach((sphere, i) => {
            sphere.visible = false;
        });
    }

    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();