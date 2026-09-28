export const animationCss = {
  None: "",
  ThumbstickMoveAnimation: `
svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-fill-7"] {
  animation: deckyzone-controller-0 3s linear infinite;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-y-press"] {
  animation: deckyzone-controller-1 3s linear infinite;
  transform-box: view-box;
  transform-origin: 0 0;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-fill-11"] {
  animation: deckyzone-controller-0 3s linear infinite;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-x-press"] {
  animation: deckyzone-controller-2 3s linear infinite;
  transform-box: view-box;
  transform-origin: 0 0;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-fill-9"] {
  animation: deckyzone-controller-0 3s linear infinite;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-b-press"] {
  animation: deckyzone-controller-3 3s linear infinite;
  transform-box: view-box;
  transform-origin: 0 0;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-fill-13"] {
  animation: deckyzone-controller-0 3s linear infinite;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-a-press"] {
  animation: deckyzone-controller-4 3s linear infinite;
  transform-box: view-box;
  transform-origin: 0 0;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-left-stick-cap-fill"] {
  animation: deckyzone-controller-0 3s linear infinite;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-left-stick-pop"] {
  animation: deckyzone-controller-5 3s linear infinite;
  transform-box: view-box;
  transform-origin: 0 0;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-left-stick"] {
  animation: deckyzone-controller-6 3s linear infinite;
  transform-box: view-box;
  transform-origin: 0 0;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-right-stick-cap-fill"] {
  animation: deckyzone-controller-0 3s linear infinite;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-right-stick-pop"] {
  animation: deckyzone-controller-5 3s linear infinite;
  transform-box: view-box;
  transform-origin: 0 0;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-right-stick"] {
  animation: deckyzone-controller-7 3s linear infinite;
  transform-box: view-box;
  transform-origin: 0 0;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-dpad-fill"] {
  animation: deckyzone-controller-8 3s step-end infinite;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-dpad-press-shape"] {
  animation: deckyzone-controller-9 3s step-end infinite;
  transform-box: view-box;
  transform-origin: 0 0;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-dpad-press-position"] {
  animation: deckyzone-controller-10 3s step-end infinite;
  transform-box: view-box;
  transform-origin: 0 0;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-dpad-activation"] {
  animation: deckyzone-controller-11 3s step-end infinite;
  transform-box: view-box;
  transform-origin: 0 0;
}

@keyframes deckyzone-controller-0 {
  0% { fill-opacity: 0; }
  0.56% { fill-opacity: 0.003; }
  1.11% { fill-opacity: 0.305; }
  1.67% { fill-opacity: 0.784; }
  2.22% { fill-opacity: 1; }
  92.78% { fill-opacity: 1; }
  93.33% { fill-opacity: 0.945; }
  93.89% { fill-opacity: 0.675; }
  94.44% { fill-opacity: 0.325; }
  95% { fill-opacity: 0.055; }
  95.56% { fill-opacity: 0; }
  100% { fill-opacity: 0; }
}

@keyframes deckyzone-controller-1 {
  0% { transform: scale(1); }
  1.67% { transform: scale(1); }
  2.22% { transform: scale(1.016); }
  2.78% { transform: scale(1.083); }
  3.33% { transform: scale(1.185); }
  3.89% { transform: scale(1.301); }
  4.44% { transform: scale(1.409); }
  5% { transform: scale(1.489); }
  5.56% { transform: scale(1.52); }
  6.11% { transform: scale(1.491); }
  6.67% { transform: scale(1.417); }
  7.22% { transform: scale(1.315); }
  7.78% { transform: scale(1.205); }
  8.33% { transform: scale(1.103); }
  8.89% { transform: scale(1.029); }
  9.44% { transform: scale(1); }
  21.67% { transform: scale(1); }
  22.22% { transform: scale(0.93); }
  22.78% { transform: scale(0.68); }
  24.44% { transform: scale(0.681); }
  25% { transform: scale(0.816); }
  25.56% { transform: scale(0.984); }
  26.11% { transform: scale(1); }
  75.56% { transform: scale(1); }
  76.11% { transform: scale(0.79); }
  76.67% { transform: scale(0.68); }
  77.78% { transform: scale(0.68); }
  78.33% { transform: scale(0.713); }
  78.89% { transform: scale(0.895); }
  79.44% { transform: scale(1); }
  100% { transform: scale(1); }
}

@keyframes deckyzone-controller-2 {
  0% { transform: scale(1); }
  1.67% { transform: scale(1); }
  2.22% { transform: scale(1.016); }
  2.78% { transform: scale(1.083); }
  3.33% { transform: scale(1.185); }
  3.89% { transform: scale(1.301); }
  4.44% { transform: scale(1.409); }
  5% { transform: scale(1.489); }
  5.56% { transform: scale(1.52); }
  6.11% { transform: scale(1.491); }
  6.67% { transform: scale(1.417); }
  7.22% { transform: scale(1.315); }
  7.78% { transform: scale(1.205); }
  8.33% { transform: scale(1.103); }
  8.89% { transform: scale(1.029); }
  9.44% { transform: scale(1); }
  60% { transform: scale(1); }
  60.56% { transform: scale(0.727); }
  61.11% { transform: scale(0.68); }
  62.22% { transform: scale(0.68); }
  62.78% { transform: scale(0.743); }
  63.33% { transform: scale(0.931); }
  63.89% { transform: scale(1); }
  100% { transform: scale(1); }
}

@keyframes deckyzone-controller-3 {
  0% { transform: scale(1); }
  1.67% { transform: scale(1); }
  2.22% { transform: scale(1.016); }
  2.78% { transform: scale(1.083); }
  3.33% { transform: scale(1.185); }
  3.89% { transform: scale(1.301); }
  4.44% { transform: scale(1.409); }
  5% { transform: scale(1.489); }
  5.56% { transform: scale(1.52); }
  6.11% { transform: scale(1.491); }
  6.67% { transform: scale(1.417); }
  7.22% { transform: scale(1.315); }
  7.78% { transform: scale(1.205); }
  8.33% { transform: scale(1.103); }
  8.89% { transform: scale(1.029); }
  9.44% { transform: scale(1); }
  37.78% { transform: scale(1); }
  38.33% { transform: scale(0.757); }
  38.89% { transform: scale(0.68); }
  40% { transform: scale(0.68); }
  40.56% { transform: scale(0.727); }
  41.11% { transform: scale(0.913); }
  41.67% { transform: scale(1); }
  42.78% { transform: scale(1); }
  43.33% { transform: scale(0.757); }
  43.89% { transform: scale(0.68); }
  45% { transform: scale(0.68); }
  45.56% { transform: scale(0.727); }
  46.11% { transform: scale(0.913); }
  46.67% { transform: scale(1); }
  47.78% { transform: scale(1); }
  48.33% { transform: scale(0.757); }
  48.89% { transform: scale(0.68); }
  50% { transform: scale(0.68); }
  50.56% { transform: scale(0.727); }
  51.11% { transform: scale(0.913); }
  51.67% { transform: scale(1); }
  100% { transform: scale(1); }
}

@keyframes deckyzone-controller-4 {
  0% { transform: scale(1); }
  1.67% { transform: scale(1); }
  2.22% { transform: scale(1.016); }
  2.78% { transform: scale(1.083); }
  3.33% { transform: scale(1.185); }
  3.89% { transform: scale(1.301); }
  4.44% { transform: scale(1.409); }
  5% { transform: scale(1.489); }
  5.56% { transform: scale(1.52); }
  6.11% { transform: scale(1.491); }
  6.67% { transform: scale(1.417); }
  7.22% { transform: scale(1.315); }
  7.78% { transform: scale(1.205); }
  8.33% { transform: scale(1.103); }
  8.89% { transform: scale(1.029); }
  9.44% { transform: scale(1); }
  62.78% { transform: scale(1); }
  63.33% { transform: scale(0.757); }
  63.89% { transform: scale(0.68); }
  65% { transform: scale(0.68); }
  65.56% { transform: scale(0.727); }
  66.11% { transform: scale(0.913); }
  66.67% { transform: scale(1); }
  79.44% { transform: scale(1); }
  80% { transform: scale(0.757); }
  80.56% { transform: scale(0.68); }
  81.67% { transform: scale(0.68); }
  82.22% { transform: scale(0.727); }
  82.78% { transform: scale(0.913); }
  83.33% { transform: scale(1); }
  100% { transform: scale(1); }
}

@keyframes deckyzone-controller-5 {
  0% { transform: scale(1); }
  1.67% { transform: scale(1); }
  2.22% { transform: scale(1.007); }
  2.78% { transform: scale(1.035); }
  3.33% { transform: scale(1.078); }
  3.89% { transform: scale(1.127); }
  4.44% { transform: scale(1.173); }
  5% { transform: scale(1.207); }
  5.56% { transform: scale(1.22); }
  6.11% { transform: scale(1.208); }
  6.67% { transform: scale(1.176); }
  8.33% { transform: scale(1.044); }
  8.89% { transform: scale(1.012); }
  9.44% { transform: scale(1); }
  100% { transform: scale(1); }
}

@keyframes deckyzone-controller-6 {
  0% { transform: translate(0px, 0px); }
  16.67% { transform: translate(0px, 0px); }
  17.22% { transform: translate(0px, -0.07px); }
  17.78% { transform: translate(0px, -0.27px); }
  18.33% { transform: translate(0px, -0.55px); }
  18.89% { transform: translate(0px, -0.9px); }
  20% { transform: translate(0px, -1.65px); }
  20.56% { transform: translate(0px, -2px); }
  21.11% { transform: translate(0px, -2.28px); }
  21.67% { transform: translate(0px, -2.48px); }
  22.22% { transform: translate(0px, -2.55px); }
  38.89% { transform: translate(0px, -2.55px); }
  39.44% { transform: translate(0px, -2.48px); }
  40% { transform: translate(0px, -2.28px); }
  40.56% { transform: translate(0px, -2px); }
  41.11% { transform: translate(0px, -1.65px); }
  42.22% { transform: translate(0px, -0.9px); }
  42.78% { transform: translate(0px, -0.55px); }
  43.33% { transform: translate(0px, -0.27px); }
  43.89% { transform: translate(0px, -0.07px); }
  44.44% { transform: translate(0px, 0px); }
  61.11% { transform: translate(0px, 0px); }
  61.67% { transform: translate(0px, 0.07px); }
  62.22% { transform: translate(0px, 0.27px); }
  62.78% { transform: translate(0px, 0.55px); }
  63.89% { transform: translate(0px, 1.27px); }
  64.44% { transform: translate(0px, 1.65px); }
  65% { transform: translate(0px, 2px); }
  65.56% { transform: translate(0px, 2.28px); }
  66.11% { transform: translate(0px, 2.48px); }
  66.67% { transform: translate(0px, 2.55px); }
  67.22% { transform: translate(0px, 2.48px); }
  67.78% { transform: translate(0px, 2.28px); }
  68.33% { transform: translate(0px, 2px); }
  68.89% { transform: translate(0px, 1.65px); }
  70% { transform: translate(0px, 0.9px); }
  70.56% { transform: translate(0px, 0.55px); }
  71.11% { transform: translate(0px, 0.27px); }
  71.67% { transform: translate(0px, 0.07px); }
  72.22% { transform: translate(0px, 0px); }
  100% { transform: translate(0px, 0px); }
}

@keyframes deckyzone-controller-7 {
  0% { transform: translate(0px, 0px); }
  16.67% { transform: translate(0px, 0px); }
  17.22% { transform: translate(0px, -0.07px); }
  17.78% { transform: translate(0px, -0.27px); }
  18.33% { transform: translate(0px, -0.55px); }
  18.89% { transform: translate(0px, -0.9px); }
  20% { transform: translate(0px, -1.65px); }
  20.56% { transform: translate(0px, -2px); }
  21.11% { transform: translate(0px, -2.28px); }
  21.67% { transform: translate(0px, -2.48px); }
  22.22% { transform: translate(0px, -2.55px); }
  33.33% { transform: translate(0px, -2.55px); }
  33.89% { transform: translate(-0.06px, -2.55px); }
  34.44% { transform: translate(-0.21px, -2.54px); }
  35% { transform: translate(-0.43px, -2.51px); }
  35.56% { transform: translate(-0.7px, -2.45px); }
  36.11% { transform: translate(-0.98px, -2.36px); }
  36.67% { transform: translate(-1.24px, -2.23px); }
  37.22% { transform: translate(-1.47px, -2.08px); }
  37.78% { transform: translate(-1.65px, -1.94px); }
  38.33% { transform: translate(-1.76px, -1.84px); }
  38.89% { transform: translate(-1.8px, -1.8px); }
  50% { transform: translate(-1.8px, -1.8px); }
  50.56% { transform: translate(-1.72px, -1.88px); }
  51.11% { transform: translate(-1.49px, -2.07px); }
  51.67% { transform: translate(-1.1px, -2.3px); }
  52.22% { transform: translate(-0.59px, -2.48px); }
  52.78% { transform: translate(0px, -2.55px); }
  53.33% { transform: translate(0.59px, -2.48px); }
  53.89% { transform: translate(1.1px, -2.3px); }
  54.44% { transform: translate(1.49px, -2.07px); }
  55% { transform: translate(1.72px, -1.88px); }
  55.56% { transform: translate(1.8px, -1.8px); }
  66.67% { transform: translate(1.8px, -1.8px); }
  67.22% { transform: translate(1.75px, -1.75px); }
  67.78% { transform: translate(1.62px, -1.62px); }
  68.33% { transform: translate(1.41px, -1.41px); }
  68.89% { transform: translate(1.17px, -1.17px); }
  70% { transform: translate(0.63px, -0.63px); }
  70.56% { transform: translate(0.39px, -0.39px); }
  71.11% { transform: translate(0.19px, -0.19px); }
  71.67% { transform: translate(0.05px, -0.05px); }
  72.22% { transform: translate(0px, 0px); }
  100% { transform: translate(0px, 0px); }
}

@keyframes deckyzone-controller-8 {
  0% { fill-opacity: 0; }
  2.77% { fill-opacity: 0.106; }
  3.33% { fill-opacity: 0.361; }
  3.9% { fill-opacity: 0.706; }
  4.43% { fill-opacity: 1; }
  87.77% { fill-opacity: 0.91; }
  88.33% { fill-opacity: 0.812; }
  88.9% { fill-opacity: 0.706; }
  89.43% { fill-opacity: 0.596; }
  90% { fill-opacity: 0.494; }
  90.57% { fill-opacity: 0.392; }
  91.1% { fill-opacity: 0.298; }
  91.67% { fill-opacity: 0.216; }
  92.23% { fill-opacity: 0.145; }
  92.77% { fill-opacity: 0.078; }
  93.33% { fill-opacity: 0.035; }
  93.9% { fill-opacity: 0.008; }
  94.43% { fill-opacity: 0; }
  100% { fill-opacity: 0; }
}

@keyframes deckyzone-controller-9 {
  0% { transform: scale(1, 1); }
  2.77% { transform: scale(0.993, 1.007); }
  3.33% { transform: scale(0.994, 1.006); }
  3.9% { transform: scale(0.998, 1.002); }
  4.43% { transform: scale(1, 1); }
  5% { transform: scale(1.002, 0.998); }
  5.57% { transform: scale(1, 1); }
  6.1% { transform: scale(1.002, 0.998); }
  6.67% { transform: scale(1.001, 0.999); }
  8.9% { transform: scale(1, 1); }
  18.9% { transform: scale(1.001, 1); }
  20% { transform: scale(1, 1); }
  20.57% { transform: scale(1, 1.001); }
  22.23% { transform: scale(1.001, 0.944); }
  27.77% { transform: scale(1, 1.001); }
  46.1% { transform: scale(0.94, 0.998); }
  51.67% { transform: scale(1, 1.001); }
  63.9% { transform: scale(0.946, 0.999); }
  69.43% { transform: scale(1, 1.001); }
  77.77% { transform: scale(0.946, 0.999); }
  83.33% { transform: scale(1, 1.001); }
  83.9% { transform: scale(1, 1); }
  100% { transform: scale(1, 1); }
}

@keyframes deckyzone-controller-10 {
  0% { transform: translate(0px, 0px); }
  2.77% { transform: translate(0.02px, 0.05px); }
  3.33% { transform: translate(-0.01px, -0.02px); }
  3.9% { transform: translate(-0.01px, 0px); }
  4.43% { transform: translate(0.02px, -0.01px); }
  5% { transform: translate(0.01px, 0px); }
  5.57% { transform: translate(0.02px, 0px); }
  6.1% { transform: translate(0px, -0.01px); }
  6.67% { transform: translate(0.01px, -0.02px); }
  7.23% { transform: translate(0.01px, 0px); }
  7.77% { transform: translate(0px, -0.02px); }
  8.33% { transform: translate(0.01px, 0.01px); }
  8.9% { transform: translate(0px, 0px); }
  20.57% { transform: translate(0.01px, 0px); }
  22.23% { transform: translate(0.01px, -0.21px); }
  27.77% { transform: translate(0.01px, 0px); }
  46.1% { transform: translate(0.23px, -0.01px); }
  51.67% { transform: translate(0.01px, 0px); }
  63.9% { transform: translate(-0.19px, 0px); }
  69.43% { transform: translate(0.01px, 0px); }
  77.77% { transform: translate(-0.19px, 0px); }
  83.33% { transform: translate(0.01px, 0px); }
  83.9% { transform: translate(0px, 0px); }
  100% { transform: translate(0px, 0px); }
}

@keyframes deckyzone-controller-11 {
  0% { transform: scale(1); }
  2.77% { transform: scale(1.073); }
  3.33% { transform: scale(1.084); }
  3.9% { transform: scale(1.112); }
  4.43% { transform: scale(1.151); }
  5% { transform: scale(1.2); }
  5.57% { transform: scale(1.25); }
  6.1% { transform: scale(1.198); }
  6.67% { transform: scale(1.144); }
  7.23% { transform: scale(1.091); }
  7.77% { transform: scale(1.048); }
  8.33% { transform: scale(1.014); }
  8.9% { transform: scale(1); }
  100% { transform: scale(1); }
}
`,
  MouseMoveTriggerClick: `
svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-part="zone-right-trackpad-pop"] {
  animation: deckyzone-mouse-0 3s step-end infinite;
  transform-box: view-box;
  transform-origin: 0 0;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-part="zone-right-trackpad-fill"] {
  animation: deckyzone-mouse-1 3s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-part="zone-trackpad-contact-circle"] {
  animation: deckyzone-mouse-2 3s step-end infinite,
    deckyzone-mouse-3 3s step-end infinite,
    deckyzone-mouse-4 3s step-end infinite,
    deckyzone-mouse-5 3s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-part="zone-mouse-click-ring"] {
  animation: deckyzone-mouse-6 3s step-end infinite,
    deckyzone-mouse-7 3s step-end infinite,
    deckyzone-mouse-8 3s step-end infinite,
    deckyzone-mouse-9 3s step-end infinite,
    deckyzone-mouse-10 3s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-part="zone-mouse-cursor"] {
  animation: deckyzone-mouse-11 3s step-end infinite,
    deckyzone-mouse-12 3s step-end infinite;
  transform-box: view-box;
  transform-origin: 0 0;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-part="zone-mouse-cursor-scale"] {
  animation: deckyzone-mouse-13 3s step-end infinite;
  transform-box: view-box;
  transform-origin: 0 0;
}

@keyframes deckyzone-mouse-0 {
  0% { transform: scale(1); }
  2.77% { transform: scale(1.032); }
  3.9% { transform: scale(1.065); }
  4.43% { transform: scale(1.129); }
  5% { transform: scale(1.161); }
  5.56% { transform: scale(1.21); }
  6.1% { transform: scale(1.161); }
  6.66% { transform: scale(1.129); }
  7.23% { transform: scale(1.097); }
  7.76% { transform: scale(1.065); }
  8.9% { transform: scale(1.032); }
  9.43% { transform: scale(1); }
  100% { transform: scale(1); }
}

@keyframes deckyzone-mouse-1 {
  0% { fill-opacity: 0; }
  2.77% { fill-opacity: 0.071; }
  3.33% { fill-opacity: 0.256; }
  3.9% { fill-opacity: 0.5; }
  4.43% { fill-opacity: 0.74; }
  5% { fill-opacity: 0.925; }
  5.56% { fill-opacity: 1; }
  88.87% { fill-opacity: 0.992; }
  89.44% { fill-opacity: 0.972; }
  90% { fill-opacity: 0.941; }
  90.54% { fill-opacity: 0.894; }
  91.1% { fill-opacity: 0.843; }
  91.67% { fill-opacity: 0.783; }
  92.2% { fill-opacity: 0.717; }
  92.77% { fill-opacity: 0.646; }
  93.34% { fill-opacity: 0.575; }
  93.87% { fill-opacity: 0.5; }
  94.44% { fill-opacity: 0.421; }
  95% { fill-opacity: 0.35; }
  95.53% { fill-opacity: 0.28; }
  96.1% { fill-opacity: 0.213; }
  96.67% { fill-opacity: 0.154; }
  97.2% { fill-opacity: 0.102; }
  97.77% { fill-opacity: 0.055; }
  98.33% { fill-opacity: 0.024; }
  98.87% { fill-opacity: 0.004; }
  99.43% { fill-opacity: 0; }
  100% { fill-opacity: 0; }
}

@keyframes deckyzone-mouse-2 {
  0% { cx: 0.08px; }
  6.66% { cx: 0.15px; }
  17.23% { cx: 0.14px; }
  17.76% { cx: 0.1px; }
  18.33% { cx: 0.04px; }
  18.89% { cx: -0.06px; }
  19.43% { cx: -0.2px; }
  19.99% { cx: -0.37px; }
  20.56% { cx: -0.59px; }
  21.09% { cx: -0.85px; }
  21.66% { cx: -1.15px; }
  22.23% { cx: -1.47px; }
  22.76% { cx: -1.79px; }
  23.33% { cx: -2.09px; }
  23.89% { cx: -2.35px; }
  24.43% { cx: -2.58px; }
  24.99% { cx: -2.75px; }
  25.56% { cx: -2.89px; }
  26.09% { cx: -2.98px; }
  26.66% { cx: -3.05px; }
  27.22% { cx: -3.09px; }
  27.79% { cx: -3.1px; }
  28.32% { cx: -3.09px; }
  28.89% { cx: -3.06px; }
  29.46% { cx: -3.01px; }
  29.99% { cx: -2.93px; }
  30.56% { cx: -2.82px; }
  31.12% { cx: -2.68px; }
  31.66% { cx: -2.51px; }
  32.22% { cx: -2.31px; }
  32.79% { cx: -2.06px; }
  33.32% { cx: -1.78px; }
  33.89% { cx: -1.46px; }
  34.46% { cx: -1.09px; }
  34.99% { cx: -0.7px; }
  35.55% { cx: -0.28px; }
  36.12% { cx: 0.15px; }
  36.65% { cx: 0.57px; }
  37.22% { cx: 0.99px; }
  37.79% { cx: 1.38px; }
  38.32% { cx: 1.74px; }
  38.89% { cx: 2.07px; }
  39.45% { cx: 2.35px; }
  39.99% { cx: 2.6px; }
  40.55% { cx: 2.8px; }
  41.12% { cx: 2.97px; }
  41.65% { cx: 3.11px; }
  42.22% { cx: 3.22px; }
  42.79% { cx: 3.3px; }
  43.32% { cx: 3.36px; }
  43.89% { cx: 3.39px; }
  44.45% { cx: 3.4px; }
  73.31% { cx: 3.39px; }
  73.88% { cx: 3.37px; }
  74.44% { cx: 3.34px; }
  74.98% { cx: 3.29px; }
  75.54% { cx: 3.22px; }
  76.11% { cx: 3.13px; }
  76.64% { cx: 3.02px; }
  77.21% { cx: 2.88px; }
  77.77% { cx: 2.71px; }
  78.31% { cx: 2.5px; }
  78.87% { cx: 2.27px; }
  79.44% { cx: 2.02px; }
  79.97% { cx: 1.77px; }
  80.54% { cx: 1.52px; }
  81.11% { cx: 1.28px; }
  81.64% { cx: 1.07px; }
  82.21% { cx: 0.89px; }
  82.77% { cx: 0.73px; }
  83.34% { cx: 0.6px; }
  83.87% { cx: 0.49px; }
  84.44% { cx: 0.4px; }
  85% { cx: 0.33px; }
  85.54% { cx: 0.27px; }
  86.1% { cx: 0.22px; }
  86.67% { cx: 0.19px; }
  87.2% { cx: 0.16px; }
  87.77% { cx: 0.15px; }
  100% { cx: 0.08px; }
}

@keyframes deckyzone-mouse-3 {
  0% { cy: 0.13px; }
  6.66% { cy: 0.1px; }
  7.23% { cy: 0.13px; }
  7.76% { cy: 0.11px; }
  100% { cy: 0.13px; }
}

@keyframes deckyzone-mouse-4 {
  0% { r: 4.86px; }
  6.66% { r: 4.2px; }
  7.23% { r: 3.66px; }
  7.76% { r: 3.31px; }
  8.33% { r: 3.11px; }
  8.9% { r: 3.06px; }
  17.23% { r: 3.07px; }
  17.76% { r: 3.06px; }
  21.09% { r: 3.07px; }
  21.66% { r: 3.06px; }
  28.89% { r: 3.07px; }
  29.46% { r: 3.06px; }
  85.54% { r: 3.07px; }
  86.1% { r: 3.06px; }
  86.67% { r: 3.07px; }
  87.2% { r: 3.06px; }
  89.44% { r: 3.07px; }
  90% { r: 3.1px; }
  90.54% { r: 3.16px; }
  91.1% { r: 3.22px; }
  91.67% { r: 3.29px; }
  92.2% { r: 3.37px; }
  92.77% { r: 3.47px; }
  93.34% { r: 3.6px; }
  93.87% { r: 3.72px; }
  94.44% { r: 3.9px; }
  95% { r: 4.05px; }
  95.53% { r: 4.21px; }
  96.1% { r: 4.42px; }
  96.67% { r: 4.65px; }
  97.2% { r: 4.87px; }
  97.77% { r: 5.18px; }
  98.33% { r: 5.44px; }
  100% { r: 4.86px; }
}

@keyframes deckyzone-mouse-5 {
  0% { opacity: 0; }
  6.1% { opacity: 0.086; }
  6.66% { opacity: 0.286; }
  7.23% { opacity: 0.541; }
  7.76% { opacity: 0.776; }
  8.33% { opacity: 0.949; }
  8.9% { opacity: 1; }
  89.44% { opacity: 0.988; }
  90% { opacity: 0.972; }
  90.54% { opacity: 0.933; }
  91.1% { opacity: 0.898; }
  91.67% { opacity: 0.843; }
  92.2% { opacity: 0.804; }
  92.77% { opacity: 0.745; }
  93.34% { opacity: 0.678; }
  93.87% { opacity: 0.604; }
  94.44% { opacity: 0.526; }
  95% { opacity: 0.451; }
  95.53% { opacity: 0.372; }
  96.1% { opacity: 0.298; }
  96.67% { opacity: 0.224; }
  97.2% { opacity: 0.161; }
  97.77% { opacity: 0.094; }
  98.33% { opacity: 0.047; }
  98.87% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-6 {
  0% { cx: 388px; }
  49.45% { cx: 388.5px; }
  49.98% { cx: 387.5px; }
  50.55% { cx: 388px; }
  59.98% { cx: 388.5px; }
  60.55% { cx: 387.5px; }
  61.11% { cx: 388px; }
  100% { cx: 388px; }
}

@keyframes deckyzone-mouse-7 {
  0% { cy: 192px; }
  49.45% { cy: 191.5px; }
  49.98% { cy: 192px; }
  52.78% { cy: 191.5px; }
  53.32% { cy: 192px; }
  59.98% { cy: 191.5px; }
  60.55% { cy: 192px; }
  63.31% { cy: 191.5px; }
  63.88% { cy: 192px; }
  100% { cy: 192px; }
}

@keyframes deckyzone-mouse-8 {
  0% { r: 0px; }
  49.45% { r: 10.37px; }
  49.98% { r: 15.14px; }
  50.55% { r: 18.62px; }
  51.12% { r: 21.51px; }
  51.65% { r: 23.81px; }
  52.22% { r: 25.97px; }
  52.78% { r: 27px; }
  53.32% { r: 28.18px; }
  53.88% { r: 0px; }
  59.98% { r: 10.37px; }
  60.55% { r: 15.14px; }
  61.11% { r: 18.62px; }
  61.65% { r: 21.51px; }
  62.21% { r: 23.81px; }
  62.78% { r: 25.97px; }
  63.31% { r: 27px; }
  63.88% { r: 28.18px; }
  64.45% { r: 0px; }
  100% { r: 0px; }
}

@keyframes deckyzone-mouse-9 {
  0% { stroke-width: 0px; }
  49.45% { stroke-width: 5.98px; }
  49.98% { stroke-width: 5.87px; }
  50.55% { stroke-width: 5.7px; }
  51.12% { stroke-width: 5.69px; }
  51.65% { stroke-width: 5.64px; }
  52.22% { stroke-width: 5.63px; }
  52.78% { stroke-width: 5.58px; }
  53.32% { stroke-width: 5.18px; }
  53.88% { stroke-width: 0px; }
  59.98% { stroke-width: 5.98px; }
  60.55% { stroke-width: 5.87px; }
  61.11% { stroke-width: 5.7px; }
  61.65% { stroke-width: 5.69px; }
  62.21% { stroke-width: 5.64px; }
  62.78% { stroke-width: 5.63px; }
  63.31% { stroke-width: 5.58px; }
  63.88% { stroke-width: 5.18px; }
  64.45% { stroke-width: 0px; }
  100% { stroke-width: 0px; }
}

@keyframes deckyzone-mouse-10 {
  0% { opacity: 0; }
  49.45% { opacity: 1; }
  49.98% { opacity: 0.781; }
  50.55% { opacity: 0.581; }
  51.12% { opacity: 0.431; }
  51.65% { opacity: 0.319; }
  52.22% { opacity: 0.285; }
  52.78% { opacity: 0.266; }
  53.32% { opacity: 0.241; }
  53.88% { opacity: 0; }
  59.98% { opacity: 1; }
  60.55% { opacity: 0.781; }
  61.11% { opacity: 0.581; }
  61.65% { opacity: 0.431; }
  62.21% { opacity: 0.319; }
  62.78% { opacity: 0.285; }
  63.31% { opacity: 0.266; }
  63.88% { opacity: 0.241; }
  64.45% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-11 {
  0% { opacity: 0; }
  6.66% { opacity: 0.027; }
  7.23% { opacity: 0.071; }
  7.76% { opacity: 0.114; }
  8.33% { opacity: 0.157; }
  8.9% { opacity: 0.224; }
  9.43% { opacity: 0.29; }
  10% { opacity: 0.357; }
  10.56% { opacity: 0.427; }
  11.1% { opacity: 0.506; }
  11.66% { opacity: 0.584; }
  12.23% { opacity: 0.655; }
  12.76% { opacity: 0.722; }
  13.33% { opacity: 0.788; }
  13.9% { opacity: 0.839; }
  14.43% { opacity: 0.898; }
  15% { opacity: 0.945; }
  15.56% { opacity: 0.976; }
  16.09% { opacity: 0.996; }
  16.66% { opacity: 1; }
  19.99% { opacity: 0.996; }
  20.56% { opacity: 1; }
  23.33% { opacity: 0.996; }
  49.45% { opacity: 0.997; }
  49.98% { opacity: 0.999; }
  51.65% { opacity: 0.998; }
  52.22% { opacity: 0.999; }
  53.32% { opacity: 1; }
  53.88% { opacity: 0.996; }
  59.98% { opacity: 0.997; }
  60.55% { opacity: 0.999; }
  62.21% { opacity: 0.998; }
  62.78% { opacity: 0.999; }
  63.88% { opacity: 1; }
  64.45% { opacity: 0.996; }
  79.97% { opacity: 1; }
  80.54% { opacity: 0.996; }
  81.11% { opacity: 1; }
  82.21% { opacity: 0.996; }
  86.67% { opacity: 1; }
  87.2% { opacity: 0.996; }
  88.87% { opacity: 0.988; }
  89.44% { opacity: 0.969; }
  90% { opacity: 0.937; }
  90.54% { opacity: 0.89; }
  91.1% { opacity: 0.839; }
  91.67% { opacity: 0.78; }
  92.2% { opacity: 0.714; }
  92.77% { opacity: 0.643; }
  93.34% { opacity: 0.573; }
  93.87% { opacity: 0.498; }
  94.44% { opacity: 0.42; }
  95% { opacity: 0.349; }
  95.53% { opacity: 0.278; }
  96.1% { opacity: 0.212; }
  96.67% { opacity: 0.153; }
  97.2% { opacity: 0.102; }
  97.77% { opacity: 0.055; }
  98.33% { opacity: 0.024; }
  98.87% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-12 {
  0% { transform: translate(320px, 210px); }
  6.66% { transform: translate(320.62px, 203.41px); }
  7.23% { transform: translate(320.81px, 203.36px); }
  7.76% { transform: translate(320.71px, 203.29px); }
  8.33% { transform: translate(320.69px, 203.3px); }
  8.9% { transform: translate(320.68px, 203.32px); }
  9.43% { transform: translate(320.7px, 203.31px); }
  10% { transform: translate(320.69px, 203.3px); }
  10.56% { transform: translate(320.7px, 203.31px); }
  11.66% { transform: translate(320.69px, 203.3px); }
  12.23% { transform: translate(320.69px, 203.31px); }
  12.76% { transform: translate(320.7px, 203.31px); }
  13.9% { transform: translate(320.69px, 203.31px); }
  15.56% { transform: translate(320.7px, 203.31px); }
  16.66% { transform: translate(320.69px, 203.31px); }
  17.23% { transform: translate(320.42px, 203.31px); }
  17.76% { transform: translate(319.54px, 203.31px); }
  18.33% { transform: translate(317.95px, 203.31px); }
  18.89% { transform: translate(315.57px, 203.31px); }
  19.43% { transform: translate(312.27px, 203.31px); }
  19.99% { transform: translate(307.96px, 203.31px); }
  20.56% { transform: translate(302.55px, 203.31px); }
  21.09% { transform: translate(296.08px, 203.3px); }
  21.66% { transform: translate(288.72px, 203.31px); }
  22.23% { transform: translate(280.82px, 203.3px); }
  22.76% { transform: translate(272.92px, 203.3px); }
  23.33% { transform: translate(265.53px, 203.3px); }
  23.89% { transform: translate(259.02px, 203.31px); }
  24.43% { transform: translate(253.59px, 203.31px); }
  24.99% { transform: translate(249.24px, 203.31px); }
  25.56% { transform: translate(245.91px, 203.31px); }
  26.09% { transform: translate(243.5px, 203.31px); }
  26.66% { transform: translate(241.89px, 203.31px); }
  27.22% { transform: translate(240.99px, 203.31px); }
  27.79% { transform: translate(240.7px, 203.31px); }
  28.32% { transform: translate(240.93px, 203.31px); }
  28.89% { transform: translate(241.69px, 203.31px); }
  29.46% { transform: translate(243.02px, 203.31px); }
  29.99% { transform: translate(244.96px, 203.31px); }
  30.56% { transform: translate(247.59px, 203.31px); }
  31.12% { transform: translate(250.97px, 203.31px); }
  31.66% { transform: translate(255.15px, 203.31px); }
  32.22% { transform: translate(260.21px, 203.31px); }
  32.79% { transform: translate(266.21px, 203.3px); }
  33.32% { transform: translate(273.18px, 203.31px); }
  33.89% { transform: translate(281.13px, 203.3px); }
  34.46% { transform: translate(289.99px, 203.3px); }
  34.99% { transform: translate(299.65px, 203.3px); }
  35.55% { transform: translate(309.93px, 203.3px); }
  36.12% { transform: translate(320.53px, 203.3px); }
  36.65% { transform: translate(331.14px, 203.3px); }
  37.22% { transform: translate(341.43px, 203.3px); }
  37.79% { transform: translate(351.11px, 203.3px); }
  38.32% { transform: translate(360px, 203.3px); }
  38.89% { transform: translate(367.98px, 203.31px); }
  39.45% { transform: translate(374.98px, 203.31px); }
  39.99% { transform: translate(381px, 203.31px); }
  40.55% { transform: translate(386.09px, 203.31px); }
  41.12% { transform: translate(390.3px, 203.31px); }
  41.65% { transform: translate(393.7px, 203.31px); }
  42.22% { transform: translate(396.36px, 203.31px); }
  42.79% { transform: translate(398.32px, 203.31px); }
  43.32% { transform: translate(399.66px, 203.31px); }
  43.89% { transform: translate(400.44px, 203.31px); }
  44.45% { transform: translate(400.69px, 203.31px); }
  48.32% { transform: translate(400.67px, 203.29px); }
  48.88% { transform: translate(400.16px, 202.91px); }
  49.45% { transform: translate(399.26px, 202.2px); }
  49.98% { transform: translate(399.08px, 202.15px); }
  50.55% { transform: translate(399.13px, 202.14px); }
  51.12% { transform: translate(399.25px, 202.08px); }
  51.65% { transform: translate(399.27px, 202.1px); }
  52.22% { transform: translate(399.38px, 202.24px); }
  52.78% { transform: translate(399.39px, 202.32px); }
  53.32% { transform: translate(399.45px, 202.34px); }
  53.88% { transform: translate(399.6px, 202.5px); }
  55.55% { transform: translate(400.32px, 203.03px); }
  56.11% { transform: translate(400.69px, 203.31px); }
  58.88% { transform: translate(400.67px, 203.29px); }
  59.45% { transform: translate(400.16px, 202.91px); }
  59.98% { transform: translate(399.26px, 202.2px); }
  60.55% { transform: translate(399.08px, 202.15px); }
  61.11% { transform: translate(399.13px, 202.14px); }
  61.65% { transform: translate(399.25px, 202.08px); }
  62.21% { transform: translate(399.27px, 202.1px); }
  62.78% { transform: translate(399.38px, 202.24px); }
  63.31% { transform: translate(399.39px, 202.32px); }
  63.88% { transform: translate(399.45px, 202.34px); }
  64.45% { transform: translate(399.6px, 202.5px); }
  66.11% { transform: translate(400.32px, 203.03px); }
  66.64% { transform: translate(400.69px, 203.31px); }
  73.31% { transform: translate(400.56px, 203.31px); }
  73.88% { transform: translate(400.11px, 203.31px); }
  74.44% { transform: translate(399.31px, 203.31px); }
  74.98% { transform: translate(398.11px, 203.31px); }
  75.54% { transform: translate(396.43px, 203.31px); }
  76.11% { transform: translate(394.24px, 203.31px); }
  76.64% { transform: translate(391.43px, 203.31px); }
  77.21% { transform: translate(387.94px, 203.31px); }
  77.77% { transform: translate(383.7px, 203.31px); }
  78.31% { transform: translate(378.69px, 203.31px); }
  78.87% { transform: translate(373.01px, 203.31px); }
  79.44% { transform: translate(366.84px, 203.31px); }
  79.97% { transform: translate(360.48px, 203.31px); }
  80.54% { transform: translate(354.27px, 203.31px); }
  81.11% { transform: translate(348.5px, 203.31px); }
  81.64% { transform: translate(343.34px, 203.31px); }
  82.21% { transform: translate(338.83px, 203.31px); }
  82.77% { transform: translate(334.97px, 203.31px); }
  83.34% { transform: translate(331.72px, 203.31px); }
  83.87% { transform: translate(329.01px, 203.31px); }
  84.44% { transform: translate(326.79px, 203.31px); }
  85% { transform: translate(324.99px, 203.31px); }
  85.54% { transform: translate(323.56px, 203.31px); }
  86.1% { transform: translate(322.46px, 203.31px); }
  86.67% { transform: translate(321.65px, 203.31px); }
  87.2% { transform: translate(321.11px, 203.31px); }
  87.77% { transform: translate(320.79px, 203.31px); }
  88.34% { transform: translate(320.69px, 203.31px); }
  95.53% { transform: translate(320.69px, 203.3px); }
  97.77% { transform: translate(320.69px, 203.29px); }
  98.33% { transform: translate(320.72px, 203.33px); }
  98.87% { transform: translate(320px, 210px); }
  100% { transform: translate(320px, 210px); }
}

@keyframes deckyzone-mouse-13 {
  0% { transform: scale(0.32); }
  6.66% { transform: scale(0.277); }
  7.23% { transform: scale(0.279); }
  7.76% { transform: scale(0.303); }
  8.33% { transform: scale(0.317); }
  8.9% { transform: scale(0.312); }
  9.43% { transform: scale(0.314); }
  10% { transform: scale(0.318); }
  11.1% { transform: scale(0.319); }
  11.66% { transform: scale(0.318); }
  12.76% { transform: scale(0.319); }
  13.33% { transform: scale(0.32); }
  13.9% { transform: scale(0.321); }
  14.43% { transform: scale(0.32); }
  16.66% { transform: scale(0.321); }
  48.32% { transform: scale(0.319); }
  48.88% { transform: scale(0.276); }
  49.45% { transform: scale(0.237); }
  49.98% { transform: scale(0.234); }
  50.55% { transform: scale(0.233); }
  51.65% { transform: scale(0.232); }
  52.22% { transform: scale(0.231); }
  52.78% { transform: scale(0.23); }
  55.55% { transform: scale(0.279); }
  56.11% { transform: scale(0.321); }
  58.88% { transform: scale(0.319); }
  59.45% { transform: scale(0.276); }
  59.98% { transform: scale(0.237); }
  60.55% { transform: scale(0.234); }
  61.11% { transform: scale(0.233); }
  62.21% { transform: scale(0.232); }
  62.78% { transform: scale(0.231); }
  63.31% { transform: scale(0.23); }
  66.11% { transform: scale(0.279); }
  66.64% { transform: scale(0.321); }
  97.77% { transform: scale(0.32); }
  98.33% { transform: scale(0.318); }
  98.87% { transform: scale(0.32); }
  100% { transform: scale(0.32); }
}
`,
  TouchscreenAnimation: `
svg[data-deckyzone-animation="TouchscreenAnimation"] [data-part="zone-active-display"] {
  animation: deckyzone-touchscreen-0 2.85s step-end infinite;
}

svg[data-deckyzone-animation="TouchscreenAnimation"] [data-part="zone-touch-indicator"] {
  animation: deckyzone-touchscreen-1 2.85s step-end infinite,
    deckyzone-touchscreen-2 2.85s step-end infinite;
}

@keyframes deckyzone-touchscreen-0 {
  0% { fill-opacity: 0; }
  2.35% { fill-opacity: 0.004; }
  2.91% { fill-opacity: 0.161; }
  3.51% { fill-opacity: 0.325; }
  4.1% { fill-opacity: 0.494; }
  4.67% { fill-opacity: 0.663; }
  5.26% { fill-opacity: 0.831; }
  5.86% { fill-opacity: 0.984; }
  6.42% { fill-opacity: 0.949; }
  7.02% { fill-opacity: 0.902; }
  7.61% { fill-opacity: 0.851; }
  8.17% { fill-opacity: 0.8; }
  8.77% { fill-opacity: 0.749; }
  9.37% { fill-opacity: 0.702; }
  9.93% { fill-opacity: 0.651; }
  10.52% { fill-opacity: 0.6; }
  11.12% { fill-opacity: 0.549; }
  11.68% { fill-opacity: 0.498; }
  12.28% { fill-opacity: 0.447; }
  12.87% { fill-opacity: 0.396; }
  13.43% { fill-opacity: 0.345; }
  14.03% { fill-opacity: 0.298; }
  14.63% { fill-opacity: 0.247; }
  15.19% { fill-opacity: 0.196; }
  15.78% { fill-opacity: 0.145; }
  16.38% { fill-opacity: 0.098; }
  16.94% { fill-opacity: 0.047; }
  17.54% { fill-opacity: 0; }
  100% { fill-opacity: 0; }
}

@keyframes deckyzone-touchscreen-1 {
  0% { cx: 321px; }
  18.7% { cx: 320px; }
  19.29% { cx: 318px; }
  19.89% { cx: 316px; }
  20.45% { cx: 312px; }
  21.05% { cx: 308px; }
  21.64% { cx: 303px; }
  22.2% { cx: 296px; }
  22.8% { cx: 289px; }
  23.4% { cx: 281px; }
  23.96% { cx: 273px; }
  24.55% { cx: 266px; }
  25.15% { cx: 259px; }
  25.71% { cx: 254px; }
  26.31% { cx: 249px; }
  26.9% { cx: 246px; }
  27.46% { cx: 244px; }
  28.06% { cx: 242px; }
  28.66% { cx: 241px; }
  30.41% { cx: 242px; }
  31.01% { cx: 243px; }
  31.57% { cx: 245px; }
  32.16% { cx: 248px; }
  32.76% { cx: 251px; }
  33.32% { cx: 255.5px; }
  33.92% { cx: 261px; }
  34.51% { cx: 267px; }
  35.08% { cx: 274px; }
  35.67% { cx: 282px; }
  36.27% { cx: 290px; }
  36.83% { cx: 300px; }
  37.43% { cx: 310px; }
  38.02% { cx: 321px; }
  38.58% { cx: 332px; }
  39.18% { cx: 342px; }
  39.78% { cx: 352px; }
  40.34% { cx: 360px; }
  40.93% { cx: 368px; }
  41.53% { cx: 375px; }
  42.09% { cx: 381px; }
  42.69% { cx: 386px; }
  43.28% { cx: 391px; }
  43.84% { cx: 394px; }
  44.44% { cx: 397px; }
  45.04% { cx: 399px; }
  45.6% { cx: 400px; }
  46.19% { cx: 401px; }
  47.95% { cx: 400px; }
  48.54% { cx: 399px; }
  49.11% { cx: 397px; }
  49.7% { cx: 394px; }
  50.3% { cx: 391px; }
  50.86% { cx: 386px; }
  51.46% { cx: 381px; }
  52.05% { cx: 375px; }
  52.61% { cx: 368px; }
  53.21% { cx: 360px; }
  53.81% { cx: 352px; }
  54.37% { cx: 342px; }
  54.96% { cx: 332px; }
  55.56% { cx: 321px; }
  56.12% { cx: 310px; }
  56.72% { cx: 300px; }
  57.31% { cx: 290px; }
  57.87% { cx: 282px; }
  58.47% { cx: 274px; }
  59.07% { cx: 267px; }
  59.63% { cx: 261px; }
  60.22% { cx: 255.5px; }
  60.82% { cx: 251px; }
  61.38% { cx: 248px; }
  61.98% { cx: 245px; }
  62.57% { cx: 243px; }
  63.14% { cx: 242px; }
  63.73% { cx: 241px; }
  66.08% { cx: 242px; }
  67.24% { cx: 243px; }
  67.84% { cx: 244px; }
  68.4% { cx: 245px; }
  68.99% { cx: 247px; }
  69.59% { cx: 248px; }
  70.15% { cx: 250px; }
  70.75% { cx: 253px; }
  71.34% { cx: 255px; }
  71.9% { cx: 258px; }
  72.5% { cx: 262px; }
  73.1% { cx: 266px; }
  73.66% { cx: 270px; }
  74.25% { cx: 274px; }
  74.85% { cx: 279px; }
  75.41% { cx: 283px; }
  76.01% { cx: 287.5px; }
  76.6% { cx: 292px; }
  77.17% { cx: 295px; }
  77.76% { cx: 299px; }
  78.36% { cx: 302px; }
  78.92% { cx: 305px; }
  79.52% { cx: 307.5px; }
  80.11% { cx: 310px; }
  80.67% { cx: 312px; }
  81.27% { cx: 313px; }
  81.87% { cx: 315px; }
  82.43% { cx: 316px; }
  83.02% { cx: 317px; }
  83.62% { cx: 318px; }
  84.18% { cx: 319px; }
  84.78% { cx: 320px; }
  85.93% { cx: 321px; }
  100% { cx: 321px; }
}

@keyframes deckyzone-touchscreen-2 {
  0% { opacity: 0; }
  5.86% { opacity: 1; }
  8.17% { opacity: 0.996; }
  18.13% { opacity: 1; }
  87.72% { opacity: 0.996; }
  88.28% { opacity: 0.944; }
  88.88% { opacity: 0.897; }
  89.48% { opacity: 0.846; }
  90.04% { opacity: 0.795; }
  90.63% { opacity: 0.748; }
  91.23% { opacity: 0.701; }
  91.79% { opacity: 0.65; }
  92.39% { opacity: 0.598; }
  92.98% { opacity: 0.543; }
  93.55% { opacity: 0.496; }
  94.14% { opacity: 0.444; }
  94.74% { opacity: 0.393; }
  95.3% { opacity: 0.342; }
  95.9% { opacity: 0.295; }
  96.49% { opacity: 0.244; }
  97.05% { opacity: 0.197; }
  97.65% { opacity: 0.145; }
  98.25% { opacity: 0.098; }
  98.81% { opacity: 0.047; }
  99.4% { opacity: 0; }
  100% { opacity: 0; }
}
`,
} as const;
