import { DotLottie } from "https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-web/+esm";

export const dotLottie = new DotLottie({
    autoplay: true,
    loop: true,
    canvas: document.querySelector('#dotlottie-canvas'),
    src: "data/lottie/test.json"
});

//import {dotLottie} from '../modules/lottie.js';
//dotLottie
//<canvas id="dotlottie-canvas" style="width: 300px; height: 300px"></canvas>
