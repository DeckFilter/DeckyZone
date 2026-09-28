// CSS keyframes translated from the supplied SVG timing references.
// Linear tracks retain their sampled interpolation; step-end tracks retain
// each discrete frame boundary. Transform groups keep their SVG-local origin.
// Only redundant constant samples are omitted. Prefixes avoid Steam CSS names.
export const animationCss = {
  None: "",
  ThumbstickMoveAnimation: `
svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-fill-7"] {
  animation: deckyzone-controller-0 3s linear infinite;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-fill-11"] {
  animation: deckyzone-controller-0 3s linear infinite;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-fill-9"] {
  animation: deckyzone-controller-0 3s linear infinite;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-fill-13"] {
  animation: deckyzone-controller-0 3s linear infinite;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-left-stick-cap-fill"] {
  animation: deckyzone-controller-0 3s linear infinite;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-right-stick-cap-fill"] {
  animation: deckyzone-controller-0 3s linear infinite;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-y-press"] {
  animation: deckyzone-controller-1 3s linear infinite;
  transform-box: view-box;
  transform-origin: 0 0;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-x-press"] {
  animation: deckyzone-controller-2 3s linear infinite;
  transform-box: view-box;
  transform-origin: 0 0;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-b-press"] {
  animation: deckyzone-controller-3 3s linear infinite;
  transform-box: view-box;
  transform-origin: 0 0;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-a-press"] {
  animation: deckyzone-controller-4 3s linear infinite;
  transform-box: view-box;
  transform-origin: 0 0;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-left-stick-pop"] {
  animation: deckyzone-controller-5 3s linear infinite;
  transform-box: view-box;
  transform-origin: 0 0;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-right-stick-pop"] {
  animation: deckyzone-controller-5 3s linear infinite;
  transform-box: view-box;
  transform-origin: 0 0;
}

svg[data-deckyzone-animation="ThumbstickMoveAnimation"] [data-part="zone-left-stick"] {
  animation: deckyzone-controller-6 3s linear infinite;
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
  0.555556% { fill-opacity: 0.003259; }
  1.111111% { fill-opacity: 0.304741; }
  1.666667% { fill-opacity: 0.784; }
  2.222222% { fill-opacity: 1; }
  92.777778% { fill-opacity: 1; }
  93.333333% { fill-opacity: 0.944606; }
  93.888889% { fill-opacity: 0.675197; }
  94.444444% { fill-opacity: 0.324803; }
  95% { fill-opacity: 0.055394; }
  95.555556% { fill-opacity: 0; }
  100% { fill-opacity: 0; }
}

@keyframes deckyzone-controller-1 {
  0% { transform: scale(1); }
  1.666667% { transform: scale(1); }
  2.222222% { transform: scale(1.015842); }
  2.777778% { transform: scale(1.083444); }
  3.333333% { transform: scale(1.185278); }
  3.888889% { transform: scale(1.300598); }
  4.444444% { transform: scale(1.408657); }
  5% { transform: scale(1.488706); }
  5.555556% { transform: scale(1.52); }
  6.111111% { transform: scale(1.491195); }
  6.666667% { transform: scale(1.416909); }
  7.222222% { transform: scale(1.315334); }
  7.777778% { transform: scale(1.204663); }
  8.333333% { transform: scale(1.103089); }
  8.888889% { transform: scale(1.028804); }
  9.444444% { transform: scale(1); }
  21.666667% { transform: scale(1); }
  22.222222% { transform: scale(0.929655); }
  22.777778% { transform: scale(0.68); }
  23.888889% { transform: scale(0.68); }
  24.444444% { transform: scale(0.681043); }
  25% { transform: scale(0.81608); }
  25.555556% { transform: scale(0.98445); }
  26.111111% { transform: scale(1); }
  75.555556% { transform: scale(1); }
  76.111111% { transform: scale(0.789854); }
  76.666667% { transform: scale(0.68); }
  77.777778% { transform: scale(0.68); }
  78.333333% { transform: scale(0.71328); }
  78.888889% { transform: scale(0.894984); }
  79.444444% { transform: scale(1); }
  100% { transform: scale(1); }
}

@keyframes deckyzone-controller-2 {
  0% { transform: scale(1); }
  1.666667% { transform: scale(1); }
  2.222222% { transform: scale(1.015842); }
  2.777778% { transform: scale(1.083444); }
  3.333333% { transform: scale(1.185278); }
  3.888889% { transform: scale(1.300598); }
  4.444444% { transform: scale(1.408657); }
  5% { transform: scale(1.488706); }
  5.555556% { transform: scale(1.52); }
  6.111111% { transform: scale(1.491195); }
  6.666667% { transform: scale(1.416909); }
  7.222222% { transform: scale(1.315334); }
  7.777778% { transform: scale(1.204663); }
  8.333333% { transform: scale(1.103089); }
  8.888889% { transform: scale(1.028804); }
  9.444444% { transform: scale(1); }
  60% { transform: scale(1); }
  60.555556% { transform: scale(0.727301); }
  61.111111% { transform: scale(0.68); }
  62.222222% { transform: scale(0.68); }
  62.777778% { transform: scale(0.74251); }
  63.333333% { transform: scale(0.93088); }
  63.888889% { transform: scale(1); }
  100% { transform: scale(1); }
}

@keyframes deckyzone-controller-3 {
  0% { transform: scale(1); }
  1.666667% { transform: scale(1); }
  2.222222% { transform: scale(1.015842); }
  2.777778% { transform: scale(1.083444); }
  3.333333% { transform: scale(1.185278); }
  3.888889% { transform: scale(1.300598); }
  4.444444% { transform: scale(1.408657); }
  5% { transform: scale(1.488706); }
  5.555556% { transform: scale(1.52); }
  6.111111% { transform: scale(1.491195); }
  6.666667% { transform: scale(1.416909); }
  7.222222% { transform: scale(1.315334); }
  7.777778% { transform: scale(1.204663); }
  8.333333% { transform: scale(1.103089); }
  8.888889% { transform: scale(1.028804); }
  9.444444% { transform: scale(1); }
  37.777778% { transform: scale(1); }
  38.333333% { transform: scale(0.756574); }
  38.888889% { transform: scale(0.68); }
  40% { transform: scale(0.68); }
  40.555556% { transform: scale(0.727034); }
  41.111111% { transform: scale(0.91346); }
  41.666667% { transform: scale(1); }
  42.777778% { transform: scale(1); }
  43.333333% { transform: scale(0.756574); }
  43.888889% { transform: scale(0.68); }
  45% { transform: scale(0.68); }
  45.555556% { transform: scale(0.727034); }
  46.111111% { transform: scale(0.91346); }
  46.666667% { transform: scale(1); }
  47.777778% { transform: scale(1); }
  48.333333% { transform: scale(0.756574); }
  48.888889% { transform: scale(0.68); }
  50% { transform: scale(0.68); }
  50.555556% { transform: scale(0.727034); }
  51.111111% { transform: scale(0.91346); }
  51.666667% { transform: scale(1); }
  100% { transform: scale(1); }
}

@keyframes deckyzone-controller-4 {
  0% { transform: scale(1); }
  1.666667% { transform: scale(1); }
  2.222222% { transform: scale(1.015842); }
  2.777778% { transform: scale(1.083444); }
  3.333333% { transform: scale(1.185278); }
  3.888889% { transform: scale(1.300598); }
  4.444444% { transform: scale(1.408657); }
  5% { transform: scale(1.488706); }
  5.555556% { transform: scale(1.52); }
  6.111111% { transform: scale(1.491195); }
  6.666667% { transform: scale(1.416909); }
  7.222222% { transform: scale(1.315334); }
  7.777778% { transform: scale(1.204663); }
  8.333333% { transform: scale(1.103089); }
  8.888889% { transform: scale(1.028804); }
  9.444444% { transform: scale(1); }
  62.777778% { transform: scale(1); }
  63.333333% { transform: scale(0.756574); }
  63.888889% { transform: scale(0.68); }
  65% { transform: scale(0.68); }
  65.555556% { transform: scale(0.727034); }
  66.111111% { transform: scale(0.91346); }
  66.666667% { transform: scale(1); }
  79.444444% { transform: scale(1); }
  80% { transform: scale(0.756574); }
  80.555556% { transform: scale(0.68); }
  81.666667% { transform: scale(0.68); }
  82.222222% { transform: scale(0.727034); }
  82.777778% { transform: scale(0.91346); }
  83.333333% { transform: scale(1); }
  100% { transform: scale(1); }
}

@keyframes deckyzone-controller-5 {
  0% { transform: scale(1); }
  1.666667% { transform: scale(1); }
  2.222222% { transform: scale(1.006702); }
  2.777778% { transform: scale(1.035303); }
  3.333333% { transform: scale(1.078387); }
  3.888889% { transform: scale(1.127176); }
  4.444444% { transform: scale(1.172893); }
  5% { transform: scale(1.20676); }
  5.555556% { transform: scale(1.22); }
  6.111111% { transform: scale(1.207813); }
  6.666667% { transform: scale(1.176385); }
  7.222222% { transform: scale(1.133411); }
  7.777778% { transform: scale(1.086588); }
  8.333333% { transform: scale(1.043615); }
  8.888889% { transform: scale(1.012186); }
  9.444444% { transform: scale(1); }
  100% { transform: scale(1); }
}

@keyframes deckyzone-controller-6 {
  0% { transform: translate(0px, 0px); }
  16.111111% { transform: translate(0px, 0px); }
  16.666667% { transform: translate(0px, -0px); }
  17.222222% { transform: translate(0px, -0.0714px); }
  17.777778% { transform: translate(0px, -0.2652px); }
  18.333333% { transform: translate(0px, -0.5508px); }
  18.888889% { transform: translate(0px, -0.8976px); }
  19.444444% { transform: translate(0px, -1.275px); }
  20% { transform: translate(0px, -1.6524px); }
  20.555556% { transform: translate(0px, -1.9992px); }
  21.111111% { transform: translate(0px, -2.2848px); }
  21.666667% { transform: translate(0px, -2.4786px); }
  22.222222% { transform: translate(0px, -2.55px); }
  38.888889% { transform: translate(0px, -2.55px); }
  39.444444% { transform: translate(0px, -2.4786px); }
  40% { transform: translate(0px, -2.2848px); }
  40.555556% { transform: translate(0px, -1.9992px); }
  41.111111% { transform: translate(0px, -1.6524px); }
  41.666667% { transform: translate(0px, -1.275px); }
  42.222222% { transform: translate(0px, -0.8976px); }
  42.777778% { transform: translate(0px, -0.5508px); }
  43.333333% { transform: translate(0px, -0.2652px); }
  43.888889% { transform: translate(0px, -0.0714px); }
  44.444444% { transform: translate(0px, 0px); }
  61.111111% { transform: translate(0px, 0px); }
  61.666667% { transform: translate(0px, 0.0714px); }
  62.222222% { transform: translate(0px, 0.2652px); }
  62.777778% { transform: translate(0px, 0.5508px); }
  63.333333% { transform: translate(0px, 0.8976px); }
  63.888889% { transform: translate(0px, 1.275px); }
  64.444444% { transform: translate(0px, 1.6524px); }
  65% { transform: translate(0px, 1.9992px); }
  65.555556% { transform: translate(0px, 2.2848px); }
  66.111111% { transform: translate(0px, 2.4786px); }
  66.666667% { transform: translate(0px, 2.55px); }
  67.222222% { transform: translate(0px, 2.4786px); }
  67.777778% { transform: translate(0px, 2.2848px); }
  68.333333% { transform: translate(0px, 1.9992px); }
  68.888889% { transform: translate(0px, 1.6524px); }
  69.444444% { transform: translate(0px, 1.275px); }
  70% { transform: translate(0px, 0.8976px); }
  70.555556% { transform: translate(0px, 0.5508px); }
  71.111111% { transform: translate(0px, 0.2652px); }
  71.666667% { transform: translate(0px, 0.0714px); }
  72.222222% { transform: translate(0px, 0px); }
  100% { transform: translate(0px, 0px); }
}

@keyframes deckyzone-controller-7 {
  0% { transform: translate(0px, 0px); }
  16.111111% { transform: translate(0px, 0px); }
  16.666667% { transform: translate(0px, -0px); }
  17.222222% { transform: translate(0px, -0.0714px); }
  17.777778% { transform: translate(0px, -0.2652px); }
  18.333333% { transform: translate(0px, -0.5508px); }
  18.888889% { transform: translate(0px, -0.8976px); }
  19.444444% { transform: translate(0px, -1.275px); }
  20% { transform: translate(0px, -1.6524px); }
  20.555556% { transform: translate(0px, -1.9992px); }
  21.111111% { transform: translate(0px, -2.2848px); }
  21.666667% { transform: translate(0px, -2.4786px); }
  22.222222% { transform: translate(0px, -2.55px); }
  32.777778% { transform: translate(0px, -2.55px); }
  33.333333% { transform: translate(-0px, -2.55px); }
  33.888889% { transform: translate(-0.056073px, -2.549383px); }
  34.444444% { transform: translate(-0.208056px, -2.541498px); }
  35% { transform: translate(-0.430525px, -2.513394px); }
  35.555556% { transform: translate(-0.696027px, -2.453171px); }
  36.111111% { transform: translate(-0.975843px, -2.355893px); }
  36.666667% { transform: translate(-1.242488px, -2.226819px); }
  37.222222% { transform: translate(-1.47281px, -2.081665px); }
  37.777778% { transform: translate(-1.649993px, -1.944228px); }
  38.333333% { transform: translate(-1.763037px, -1.842336px); }
  38.888889% { transform: translate(-1.803122px, -1.803122px); }
  50% { transform: translate(-1.803122px, -1.803122px); }
  50.555556% { transform: translate(-1.722099px, -1.880658px); }
  51.111111% { transform: translate(-1.485861px, -2.07237px); }
  51.666667% { transform: translate(-1.100213px, -2.300442px); }
  52.222222% { transform: translate(-0.587493px, -2.481401px); }
  52.777778% { transform: translate(-0px, -2.55px); }
  53.333333% { transform: translate(0.587493px, -2.481401px); }
  53.888889% { transform: translate(1.100213px, -2.300442px); }
  54.444444% { transform: translate(1.485861px, -2.07237px); }
  55% { transform: translate(1.722099px, -1.880658px); }
  55.555556% { transform: translate(1.803122px, -1.803122px); }
  66.666667% { transform: translate(1.803122px, -1.803122px); }
  67.222222% { transform: translate(1.752635px, -1.752635px); }
  67.777778% { transform: translate(1.615598px, -1.615598px); }
  68.333333% { transform: translate(1.413648px, -1.413648px); }
  68.888889% { transform: translate(1.168423px, -1.168423px); }
  69.444444% { transform: translate(0.901561px, -0.901561px); }
  70% { transform: translate(0.634699px, -0.634699px); }
  70.555556% { transform: translate(0.389474px, -0.389474px); }
  71.111111% { transform: translate(0.187525px, -0.187525px); }
  71.666667% { transform: translate(0.050487px, -0.050487px); }
  72.222222% { transform: translate(0px, 0px); }
  100% { transform: translate(0px, 0px); }
}

@keyframes deckyzone-controller-8 {
  0% { fill-opacity: 0.0; }
  2.7666667% { fill-opacity: 0.1059; }
  3.3333333% { fill-opacity: 0.3608; }
  3.9% { fill-opacity: 0.7059; }
  4.4333333% { fill-opacity: 1.0; }
  87.7666667% { fill-opacity: 0.9098; }
  88.3333333% { fill-opacity: 0.8118; }
  88.9% { fill-opacity: 0.7059; }
  89.4333333% { fill-opacity: 0.5961; }
  90% { fill-opacity: 0.4941; }
  90.5666667% { fill-opacity: 0.3922; }
  91.1% { fill-opacity: 0.298; }
  91.6666667% { fill-opacity: 0.2157; }
  92.2333333% { fill-opacity: 0.1451; }
  92.7666667% { fill-opacity: 0.0784; }
  93.3333333% { fill-opacity: 0.0353; }
  93.9% { fill-opacity: 0.0078; }
  94.4333333% { fill-opacity: 0.0; }
  100% { fill-opacity: 0.0; }
}

@keyframes deckyzone-controller-9 {
  0% { transform: scale(1.000000, 1.000000); }
  2.7666667% { transform: scale(0.993216, 1.006831); }
  3.3333333% { transform: scale(0.994174, 1.005875); }
  3.9% { transform: scale(0.998057, 1.001948); }
  4.4333333% { transform: scale(0.999998, 1.000002); }
  5% { transform: scale(1.001623, 0.998380); }
  5.5666667% { transform: scale(1.000493, 0.999509); }
  6.1% { transform: scale(1.001650, 0.998355); }
  6.6666667% { transform: scale(1.000985, 0.999017); }
  7.2333333% { transform: scale(1.001170, 0.998832); }
  7.7666667% { transform: scale(1.000783, 0.999219); }
  8.3333333% { transform: scale(1.001062, 0.998940); }
  8.9% { transform: scale(1.000120, 0.999880); }
  9.4333333% { transform: scale(1.000072, 0.999928); }
  16.6666667% { transform: scale(1.000000, 1.000000); }
  17.2333333% { transform: scale(1.000028, 0.999833); }
  17.7666667% { transform: scale(1.000028, 0.999835); }
  18.3333333% { transform: scale(1.000064, 0.999634); }
  18.9% { transform: scale(1.000622, 0.999513); }
  19.4333333% { transform: scale(1.000517, 0.999897); }
  20% { transform: scale(1.000141, 0.999843); }
  20.5666667% { transform: scale(1.000194, 1.000904); }
  22.2333333% { transform: scale(1.001197, 0.943880); }
  22.7666667% { transform: scale(1.001135, 0.943906); }
  25% { transform: scale(1.001105, 0.943930); }
  27.7666667% { transform: scale(1.000154, 1.000918); }
  33.3333333% { transform: scale(1.000194, 1.000904); }
  46.1% { transform: scale(0.939866, 0.998015); }
  51.6666667% { transform: scale(1.000194, 1.000904); }
  63.9% { transform: scale(0.946418, 0.998922); }
  69.4333333% { transform: scale(1.000194, 1.000904); }
  77.7666667% { transform: scale(0.946418, 0.998922); }
  83.3333333% { transform: scale(1.000194, 1.000904); }
  83.9% { transform: scale(1.000000, 1.000000); }
  100% { transform: scale(1.000000, 1.000000); }
}

@keyframes deckyzone-controller-10 {
  0% { transform: translate(0.00000000px, 0.00000000px); }
  2.7666667% { transform: translate(0.01939594px, 0.04621891px); }
  3.3333333% { transform: translate(-0.00523046px, -0.01506364px); }
  3.9% { transform: translate(-0.00734120px, 0.00114269px); }
  4.4333333% { transform: translate(0.02087584px, -0.01032555px); }
  5% { transform: translate(0.00762831px, -0.00094704px); }
  5.5666667% { transform: translate(0.01513884px, -0.00077318px); }
  6.1% { transform: translate(-0.00187882px, -0.00627007px); }
  6.6666667% { transform: translate(0.00859991px, -0.02046276px); }
  7.2333333% { transform: translate(0.00926625px, 0.00041330px); }
  7.7666667% { transform: translate(-0.00220895px, -0.02048322px); }
  8.3333333% { transform: translate(0.00654988px, 0.00653307px); }
  8.9% { transform: translate(0.00045179px, -0.00037061px); }
  9.4333333% { transform: translate(0.00024641px, -0.00011447px); }
  16.6666667% { transform: translate(0.00000000px, 0.00000000px); }
  17.2333333% { transform: translate(0.00109436px, 0.00016888px); }
  17.7666667% { transform: translate(0.00109557px, 0.00017441px); }
  18.3333333% { transform: translate(0.00118814px, -0.00048718px); }
  18.9% { transform: translate(0.00292418px, -0.00017817px); }
  19.4333333% { transform: translate(0.00205511px, -0.00183126px); }
  20% { transform: translate(0.00492975px, -0.00307924px); }
  20.5666667% { transform: translate(0.00963720px, -0.00201519px); }
  22.2333333% { transform: translate(0.01238796px, -0.21375780px); }
  22.7666667% { transform: translate(0.01253827px, -0.21336208px); }
  25% { transform: translate(0.01242081px, -0.21363116px); }
  27.7666667% { transform: translate(0.00950293px, -0.00233459px); }
  33.3333333% { transform: translate(0.00963720px, -0.00201519px); }
  46.1% { transform: translate(0.22743886px, -0.00631929px); }
  51.6666667% { transform: translate(0.00963720px, -0.00201519px); }
  63.9% { transform: translate(-0.18815471px, -0.00318187px); }
  69.4333333% { transform: translate(0.00963720px, -0.00201519px); }
  77.7666667% { transform: translate(-0.18815471px, -0.00318187px); }
  83.3333333% { transform: translate(0.00963720px, -0.00201519px); }
  83.9% { transform: translate(0.00000000px, 0.00000000px); }
  100% { transform: translate(0.00000000px, 0.00000000px); }
}

@keyframes deckyzone-controller-11 {
  0% { transform: scale(1.0); }
  2.7666667% { transform: scale(1.072815); }
  3.3333333% { transform: scale(1.084489); }
  3.9% { transform: scale(1.111681); }
  4.4333333% { transform: scale(1.150704); }
  5% { transform: scale(1.200071); }
  5.5666667% { transform: scale(1.25); }
  6.1% { transform: scale(1.197533); }
  6.6666667% { transform: scale(1.14368); }
  7.2333333% { transform: scale(1.091105); }
  7.7666667% { transform: scale(1.047677); }
  8.3333333% { transform: scale(1.013849); }
  8.9% { transform: scale(1.000004); }
  9.4333333% { transform: scale(1.000016); }
  16.6666667% { transform: scale(1.0); }
  100% { transform: scale(1.0); }
}
`,
  MouseMoveTriggerClick: `
svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-part="zone-right-trackpad-pop"] {
  animation: deckyzone-mouse-0 3.001s step-end infinite;
  transform-box: view-box;
  transform-origin: 0 0;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-part="zone-right-trackpad-fill"] {
  animation: deckyzone-mouse-1 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-part="zone-mouse-click-ring"] {
  animation: deckyzone-mouse-2 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-part="zone-mouse-cursor"] {
  animation: deckyzone-mouse-3 3.001s step-end infinite;
  transform-box: view-box;
  transform-origin: 0 0;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-part="zone-mouse-cursor-scale"] {
  animation: deckyzone-mouse-4 3.001s step-end infinite;
  transform-box: view-box;
  transform-origin: 0 0;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="0"] {
  animation: deckyzone-mouse-5 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="1"] {
  animation: deckyzone-mouse-6 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="2"] {
  animation: deckyzone-mouse-7 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="3"] {
  animation: deckyzone-mouse-8 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="4"] {
  animation: deckyzone-mouse-9 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="5"] {
  animation: deckyzone-mouse-10 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="6"] {
  animation: deckyzone-mouse-11 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="7"] {
  animation: deckyzone-mouse-12 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="8"] {
  animation: deckyzone-mouse-13 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="9"] {
  animation: deckyzone-mouse-14 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="10"] {
  animation: deckyzone-mouse-15 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="11"] {
  animation: deckyzone-mouse-16 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="12"] {
  animation: deckyzone-mouse-17 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="13"] {
  animation: deckyzone-mouse-18 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="14"] {
  animation: deckyzone-mouse-19 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="15"] {
  animation: deckyzone-mouse-20 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="16"] {
  animation: deckyzone-mouse-21 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="17"] {
  animation: deckyzone-mouse-22 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="18"] {
  animation: deckyzone-mouse-23 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="19"] {
  animation: deckyzone-mouse-24 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="20"] {
  animation: deckyzone-mouse-25 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="21"] {
  animation: deckyzone-mouse-26 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="22"] {
  animation: deckyzone-mouse-27 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="23"] {
  animation: deckyzone-mouse-28 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="24"] {
  animation: deckyzone-mouse-29 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="25"] {
  animation: deckyzone-mouse-30 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="26"] {
  animation: deckyzone-mouse-31 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="27"] {
  animation: deckyzone-mouse-32 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="28"] {
  animation: deckyzone-mouse-33 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="29"] {
  animation: deckyzone-mouse-34 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="30"] {
  animation: deckyzone-mouse-35 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="31"] {
  animation: deckyzone-mouse-36 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="32"] {
  animation: deckyzone-mouse-37 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="33"] {
  animation: deckyzone-mouse-38 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="34"] {
  animation: deckyzone-mouse-39 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="35"] {
  animation: deckyzone-mouse-40 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="36"] {
  animation: deckyzone-mouse-41 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="37"] {
  animation: deckyzone-mouse-42 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="38"] {
  animation: deckyzone-mouse-43 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="39"] {
  animation: deckyzone-mouse-44 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="40"] {
  animation: deckyzone-mouse-45 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="41"] {
  animation: deckyzone-mouse-46 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="42"] {
  animation: deckyzone-mouse-47 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="43"] {
  animation: deckyzone-mouse-48 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="44"] {
  animation: deckyzone-mouse-49 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="45"] {
  animation: deckyzone-mouse-50 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="46"] {
  animation: deckyzone-mouse-51 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="47"] {
  animation: deckyzone-mouse-52 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="48"] {
  animation: deckyzone-mouse-53 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="49"] {
  animation: deckyzone-mouse-54 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="50"] {
  animation: deckyzone-mouse-55 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="51"] {
  animation: deckyzone-mouse-56 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="52"] {
  animation: deckyzone-mouse-57 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="53"] {
  animation: deckyzone-mouse-58 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="54"] {
  animation: deckyzone-mouse-59 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="55"] {
  animation: deckyzone-mouse-60 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="56"] {
  animation: deckyzone-mouse-61 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="57"] {
  animation: deckyzone-mouse-62 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="58"] {
  animation: deckyzone-mouse-63 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="59"] {
  animation: deckyzone-mouse-64 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="60"] {
  animation: deckyzone-mouse-65 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="61"] {
  animation: deckyzone-mouse-66 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="62"] {
  animation: deckyzone-mouse-67 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="63"] {
  animation: deckyzone-mouse-68 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="64"] {
  animation: deckyzone-mouse-69 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="65"] {
  animation: deckyzone-mouse-70 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="66"] {
  animation: deckyzone-mouse-71 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="67"] {
  animation: deckyzone-mouse-72 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="68"] {
  animation: deckyzone-mouse-73 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="69"] {
  animation: deckyzone-mouse-74 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="70"] {
  animation: deckyzone-mouse-75 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="71"] {
  animation: deckyzone-mouse-76 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="72"] {
  animation: deckyzone-mouse-77 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="73"] {
  animation: deckyzone-mouse-78 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="74"] {
  animation: deckyzone-mouse-79 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="75"] {
  animation: deckyzone-mouse-80 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="76"] {
  animation: deckyzone-mouse-81 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="77"] {
  animation: deckyzone-mouse-82 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="78"] {
  animation: deckyzone-mouse-83 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="79"] {
  animation: deckyzone-mouse-84 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="80"] {
  animation: deckyzone-mouse-85 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="81"] {
  animation: deckyzone-mouse-86 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="82"] {
  animation: deckyzone-mouse-87 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="83"] {
  animation: deckyzone-mouse-88 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="84"] {
  animation: deckyzone-mouse-89 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="85"] {
  animation: deckyzone-mouse-90 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="86"] {
  animation: deckyzone-mouse-91 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="87"] {
  animation: deckyzone-mouse-92 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="88"] {
  animation: deckyzone-mouse-93 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="89"] {
  animation: deckyzone-mouse-94 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="90"] {
  animation: deckyzone-mouse-95 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="91"] {
  animation: deckyzone-mouse-96 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="92"] {
  animation: deckyzone-mouse-97 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="93"] {
  animation: deckyzone-mouse-98 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="94"] {
  animation: deckyzone-mouse-99 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="95"] {
  animation: deckyzone-mouse-100 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="96"] {
  animation: deckyzone-mouse-101 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="97"] {
  animation: deckyzone-mouse-102 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="98"] {
  animation: deckyzone-mouse-103 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="99"] {
  animation: deckyzone-mouse-104 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="100"] {
  animation: deckyzone-mouse-105 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="101"] {
  animation: deckyzone-mouse-106 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="102"] {
  animation: deckyzone-mouse-107 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="103"] {
  animation: deckyzone-mouse-108 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="104"] {
  animation: deckyzone-mouse-109 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="105"] {
  animation: deckyzone-mouse-110 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="106"] {
  animation: deckyzone-mouse-111 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="107"] {
  animation: deckyzone-mouse-112 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="108"] {
  animation: deckyzone-mouse-113 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="109"] {
  animation: deckyzone-mouse-114 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="110"] {
  animation: deckyzone-mouse-115 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="111"] {
  animation: deckyzone-mouse-116 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="112"] {
  animation: deckyzone-mouse-117 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="113"] {
  animation: deckyzone-mouse-118 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="114"] {
  animation: deckyzone-mouse-119 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="115"] {
  animation: deckyzone-mouse-120 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="116"] {
  animation: deckyzone-mouse-121 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="117"] {
  animation: deckyzone-mouse-122 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="118"] {
  animation: deckyzone-mouse-123 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="119"] {
  animation: deckyzone-mouse-124 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="120"] {
  animation: deckyzone-mouse-125 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="121"] {
  animation: deckyzone-mouse-126 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="122"] {
  animation: deckyzone-mouse-127 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="123"] {
  animation: deckyzone-mouse-128 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="124"] {
  animation: deckyzone-mouse-129 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="125"] {
  animation: deckyzone-mouse-130 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="126"] {
  animation: deckyzone-mouse-131 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="127"] {
  animation: deckyzone-mouse-132 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="128"] {
  animation: deckyzone-mouse-133 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="129"] {
  animation: deckyzone-mouse-134 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="130"] {
  animation: deckyzone-mouse-135 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="131"] {
  animation: deckyzone-mouse-136 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="132"] {
  animation: deckyzone-mouse-137 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="133"] {
  animation: deckyzone-mouse-138 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="134"] {
  animation: deckyzone-mouse-139 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="135"] {
  animation: deckyzone-mouse-140 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="136"] {
  animation: deckyzone-mouse-141 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="137"] {
  animation: deckyzone-mouse-142 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="138"] {
  animation: deckyzone-mouse-143 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="139"] {
  animation: deckyzone-mouse-144 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="140"] {
  animation: deckyzone-mouse-145 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="141"] {
  animation: deckyzone-mouse-146 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="142"] {
  animation: deckyzone-mouse-147 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="143"] {
  animation: deckyzone-mouse-148 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="144"] {
  animation: deckyzone-mouse-149 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="145"] {
  animation: deckyzone-mouse-150 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="146"] {
  animation: deckyzone-mouse-151 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="147"] {
  animation: deckyzone-mouse-152 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="148"] {
  animation: deckyzone-mouse-153 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="149"] {
  animation: deckyzone-mouse-154 3.001s step-end infinite;
}

svg[data-deckyzone-animation="MouseMoveTriggerClick"] [data-contact-frame="150"] {
  animation: deckyzone-mouse-155 3.001s step-end infinite;
}

@keyframes deckyzone-mouse-0 {
  0% { transform: scale(1.0); }
  2.7657448% { transform: scale(1.032258); }
  3.8987004% { transform: scale(1.064516); }
  4.431856% { transform: scale(1.129032); }
  4.9983339% { transform: scale(1.16129); }
  5.5648117% { transform: scale(1.209677); }
  6.0979673% { transform: scale(1.16129); }
  6.6644452% { transform: scale(1.129032); }
  7.230923% { transform: scale(1.096774); }
  7.7640786% { transform: scale(1.064516); }
  8.8970343% { transform: scale(1.032258); }
  9.4301899% { transform: scale(1.0); }
  100% { transform: scale(1.0); }
}

@keyframes deckyzone-mouse-1 {
  0% { fill-opacity: 0.0; }
  2.7657448% { fill-opacity: 0.070866; }
  3.3322226% { fill-opacity: 0.255906; }
  3.8987004% { fill-opacity: 0.5; }
  4.431856% { fill-opacity: 0.740157; }
  4.9983339% { fill-opacity: 0.925197; }
  5.5648117% { fill-opacity: 1.0; }
  88.8703765% { fill-opacity: 0.992126; }
  89.4368544% { fill-opacity: 0.972441; }
  90.0033322% { fill-opacity: 0.940945; }
  90.5364878% { fill-opacity: 0.893701; }
  91.1029657% { fill-opacity: 0.84252; }
  91.6694435% { fill-opacity: 0.783465; }
  92.2025991% { fill-opacity: 0.716535; }
  92.769077% { fill-opacity: 0.645669; }
  93.3355548% { fill-opacity: 0.574803; }
  93.8687104% { fill-opacity: 0.5; }
  94.4351883% { fill-opacity: 0.42126; }
  95.0016661% { fill-opacity: 0.350394; }
  95.5348217% { fill-opacity: 0.279528; }
  96.1012996% { fill-opacity: 0.212598; }
  96.6677774% { fill-opacity: 0.153543; }
  97.200933% { fill-opacity: 0.102362; }
  97.7674109% { fill-opacity: 0.055118; }
  98.3338887% { fill-opacity: 0.023622; }
  98.8670443% { fill-opacity: 0.003937; }
  99.4335222% { fill-opacity: 0.0; }
  100% { fill-opacity: 0.0; }
}

@keyframes deckyzone-mouse-2 {
  0% { cx: 388.0px; cy: 192.0px; r: 0.0px; stroke-width: 0.0px; opacity: 0.0; }
  49.4501833% { cx: 388.5px; cy: 191.5px; r: 10.367495px; stroke-width: 5.979045px; opacity: 1.0; }
  49.9833389% { cx: 387.5px; cy: 192.0px; r: 15.136639px; stroke-width: 5.866914px; opacity: 0.780545; }
  50.5498167% { cx: 388.0px; cy: 192.0px; r: 18.615733px; stroke-width: 5.702016px; opacity: 0.580935; }
  51.1162946% { cx: 388.0px; cy: 192.0px; r: 21.514144px; stroke-width: 5.68871px; opacity: 0.430507; }
  51.6494502% { cx: 388.0px; cy: 192.0px; r: 23.81139px; stroke-width: 5.641501px; opacity: 0.31892; }
  52.215928% { cx: 388.0px; cy: 192.0px; r: 25.966585px; stroke-width: 5.629214px; opacity: 0.284696; }
  52.7824059% { cx: 388.0px; cy: 191.5px; r: 27.004507px; stroke-width: 5.575401px; opacity: 0.265716; }
  53.3155615% { cx: 388.0px; cy: 192.0px; r: 28.182646px; stroke-width: 5.179991px; opacity: 0.24127; }
  53.8820393% { cx: 388.0px; cy: 192.0px; r: 0.0px; stroke-width: 0.0px; opacity: 0.0; }
  59.9800067% { cx: 388.5px; cy: 191.5px; r: 10.367495px; stroke-width: 5.979045px; opacity: 1.0; }
  60.5464845% { cx: 387.5px; cy: 192.0px; r: 15.136639px; stroke-width: 5.866914px; opacity: 0.780545; }
  61.1129623% { cx: 388.0px; cy: 192.0px; r: 18.615733px; stroke-width: 5.702016px; opacity: 0.580935; }
  61.646118% { cx: 388.0px; cy: 192.0px; r: 21.514144px; stroke-width: 5.68871px; opacity: 0.430507; }
  62.2125958% { cx: 388.0px; cy: 192.0px; r: 23.81139px; stroke-width: 5.641501px; opacity: 0.31892; }
  62.7790736% { cx: 388.0px; cy: 192.0px; r: 25.966585px; stroke-width: 5.629214px; opacity: 0.284696; }
  63.3122293% { cx: 388.0px; cy: 191.5px; r: 27.004507px; stroke-width: 5.575401px; opacity: 0.265716; }
  63.8787071% { cx: 388.0px; cy: 192.0px; r: 28.182646px; stroke-width: 5.179991px; opacity: 0.24127; }
  64.4451849% { cx: 388.0px; cy: 192.0px; r: 0.0px; stroke-width: 0.0px; opacity: 0.0; }
  100% { cx: 388.0px; cy: 192.0px; r: 0.0px; stroke-width: 0.0px; opacity: 0.0; }
}

@keyframes deckyzone-mouse-3 {
  0% { opacity: 0.0; transform: translate(320.000000px, 210.000000px); }
  6.6644452% { opacity: 0.027451; transform: translate(320.618100px, 203.405930px); }
  7.230923% { opacity: 0.070588; transform: translate(320.813179px, 203.355872px); }
  7.7640786% { opacity: 0.113725; transform: translate(320.714862px, 203.293782px); }
  8.3305565% { opacity: 0.156863; transform: translate(320.693378px, 203.300251px); }
  8.8970343% { opacity: 0.223529; transform: translate(320.682699px, 203.324265px); }
  9.4301899% { opacity: 0.290196; transform: translate(320.696025px, 203.310803px); }
  9.9966678% { opacity: 0.356863; transform: translate(320.689888px, 203.298405px); }
  10.5631456% { opacity: 0.427451; transform: translate(320.698090px, 203.311279px); }
  11.0963012% { opacity: 0.505882; transform: translate(320.701434px, 203.305787px); }
  11.6627791% { opacity: 0.584314; transform: translate(320.690596px, 203.303830px); }
  12.2292569% { opacity: 0.654902; transform: translate(320.694830px, 203.307469px); }
  12.7624125% { opacity: 0.721569; transform: translate(320.699435px, 203.309131px); }
  13.3288904% { opacity: 0.788235; transform: translate(320.695974px, 203.306915px); }
  13.8953682% { opacity: 0.839216; transform: translate(320.694607px, 203.306189px); }
  14.4285238% { opacity: 0.898039; transform: translate(320.694717px, 203.307912px); }
  14.9950017% { opacity: 0.945098; transform: translate(320.693355px, 203.307358px); }
  15.5614795% { opacity: 0.976471; transform: translate(320.695568px, 203.307583px); }
  16.0946351% { opacity: 0.996078; transform: translate(320.697106px, 203.308634px); }
  16.661113% { opacity: 1.0; transform: translate(320.694961px, 203.307325px); }
  17.2275908% { opacity: 1.0; transform: translate(320.420699px, 203.306434px); }
  17.7607464% { opacity: 1.0; transform: translate(319.536280px, 203.306618px); }
  18.3272243% { opacity: 1.0; transform: translate(317.953881px, 203.307341px); }
  18.8937021% { opacity: 1.0; transform: translate(315.565075px, 203.305916px); }
  19.4268577% { opacity: 1.0; transform: translate(312.270502px, 203.306757px); }
  19.9933356% { opacity: 0.996078; transform: translate(307.956882px, 203.305510px); }
  20.5598134% { opacity: 1.0; transform: translate(302.551405px, 203.306193px); }
  21.092969% { opacity: 1.0; transform: translate(296.078715px, 203.304791px); }
  21.6594469% { opacity: 1.0; transform: translate(288.716850px, 203.305906px); }
  22.2259247% { opacity: 1.0; transform: translate(280.821387px, 203.302098px); }
  22.7590803% { opacity: 1.0; transform: translate(272.915409px, 203.304544px); }
  23.3255581% { opacity: 0.996078; transform: translate(265.530073px, 203.304768px); }
  23.892036% { opacity: 0.996078; transform: translate(259.023129px, 203.306480px); }
  24.4251916% { opacity: 0.996078; transform: translate(253.585113px, 203.305714px); }
  24.9916694% { opacity: 0.996078; transform: translate(249.236003px, 203.306330px); }
  25.5581473% { opacity: 0.996078; transform: translate(245.911477px, 203.306099px); }
  26.0913029% { opacity: 0.996078; transform: translate(243.496387px, 203.306344px); }
  26.6577807% { opacity: 0.996078; transform: translate(241.890840px, 203.306890px); }
  27.2242586% { opacity: 0.996078; transform: translate(240.988105px, 203.306482px); }
  27.7907364% { opacity: 0.996078; transform: translate(240.695279px, 203.307078px); }
  28.323892% { opacity: 0.996078; transform: translate(240.928560px, 203.307093px); }
  28.8903699% { opacity: 0.996078; transform: translate(241.691697px, 203.306535px); }
  29.4568477% { opacity: 0.996078; transform: translate(243.015830px, 203.306413px); }
  29.9900033% { opacity: 0.996078; transform: translate(244.960841px, 203.306674px); }
  30.5564812% { opacity: 0.996078; transform: translate(247.592452px, 203.306845px); }
  31.122959% { opacity: 0.996078; transform: translate(250.973792px, 203.305714px); }
  31.6561146% { opacity: 0.996078; transform: translate(255.154916px, 203.305561px); }
  32.2225925% { opacity: 0.996078; transform: translate(260.213013px, 203.305927px); }
  32.7890703% { opacity: 0.996078; transform: translate(266.208669px, 203.304535px); }
  33.3222259% { opacity: 0.996078; transform: translate(273.175626px, 203.305552px); }
  33.8887038% { opacity: 0.996078; transform: translate(281.128158px, 203.304564px); }
  34.4551816% { opacity: 0.996078; transform: translate(289.989065px, 203.304712px); }
  34.9883372% { opacity: 0.996078; transform: translate(299.647493px, 203.304262px); }
  35.5548151% { opacity: 0.996078; transform: translate(309.926400px, 203.303993px); }
  36.1212929% { opacity: 0.996078; transform: translate(320.530614px, 203.304271px); }
  36.6544485% { opacity: 0.996078; transform: translate(331.138802px, 203.303710px); }
  37.2209264% { opacity: 0.996078; transform: translate(341.428096px, 203.303572px); }
  37.7874042% { opacity: 0.996078; transform: translate(351.109950px, 203.304458px); }
  38.3205598% { opacity: 0.996078; transform: translate(360.004736px, 203.304540px); }
  38.8870377% { opacity: 0.996078; transform: translate(367.983406px, 203.305277px); }
  39.4535155% { opacity: 0.996078; transform: translate(374.978963px, 203.306027px); }
  39.9866711% { opacity: 0.996078; transform: translate(381.003765px, 203.305198px); }
  40.553149% { opacity: 0.996078; transform: translate(386.094375px, 203.306044px); }
  41.1196268% { opacity: 0.996078; transform: translate(390.300471px, 203.305830px); }
  41.6527824% { opacity: 0.996078; transform: translate(393.701139px, 203.305879px); }
  42.2192602% { opacity: 0.996078; transform: translate(396.356375px, 203.306302px); }
  42.7857381% { opacity: 0.996078; transform: translate(398.322526px, 203.306370px); }
  43.3188937% { opacity: 0.996078; transform: translate(399.664409px, 203.306497px); }
  43.8853715% { opacity: 0.996078; transform: translate(400.443534px, 203.306858px); }
  44.4518494% { opacity: 0.996078; transform: translate(400.694204px, 203.306457px); }
  44.985005% { opacity: 0.996078; transform: translate(400.694225px, 203.306554px); }
  48.3172276% { opacity: 0.996078; transform: translate(400.665200px, 203.285367px); }
  48.8837054% { opacity: 0.996078; transform: translate(400.161316px, 202.913503px); }
  49.4501833% { opacity: 0.997296; transform: translate(399.261983px, 202.203212px); }
  49.9833389% { opacity: 0.998919; transform: translate(399.082012px, 202.149265px); }
  50.5498167% { opacity: 0.998919; transform: translate(399.134266px, 202.137683px); }
  51.1162946% { opacity: 0.998919; transform: translate(399.245176px, 202.076172px); }
  51.6494502% { opacity: 0.998108; transform: translate(399.273140px, 202.097033px); }
  52.215928% { opacity: 0.998919; transform: translate(399.383723px, 202.242866px); }
  52.7824059% { opacity: 0.998919; transform: translate(399.387309px, 202.317906px); }
  53.3155615% { opacity: 0.999731; transform: translate(399.451024px, 202.343206px); }
  53.8820393% { opacity: 0.996078; transform: translate(399.604624px, 202.503851px); }
  55.5481506% { opacity: 0.996078; transform: translate(400.324794px, 203.034194px); }
  56.1146285% { opacity: 0.996078; transform: translate(400.694225px, 203.306554px); }
  58.8803732% { opacity: 0.996078; transform: translate(400.665200px, 203.285367px); }
  59.446851% { opacity: 0.996078; transform: translate(400.161316px, 202.913503px); }
  59.9800067% { opacity: 0.997296; transform: translate(399.261983px, 202.203212px); }
  60.5464845% { opacity: 0.998919; transform: translate(399.082012px, 202.149265px); }
  61.1129623% { opacity: 0.998919; transform: translate(399.134266px, 202.137683px); }
  61.646118% { opacity: 0.998919; transform: translate(399.245176px, 202.076172px); }
  62.2125958% { opacity: 0.998108; transform: translate(399.273140px, 202.097033px); }
  62.7790736% { opacity: 0.998919; transform: translate(399.383723px, 202.242866px); }
  63.3122293% { opacity: 0.998919; transform: translate(399.387309px, 202.317906px); }
  63.8787071% { opacity: 0.999731; transform: translate(399.451024px, 202.343206px); }
  64.4451849% { opacity: 0.996078; transform: translate(399.604624px, 202.503851px); }
  66.1112962% { opacity: 0.996078; transform: translate(400.324794px, 203.034194px); }
  66.6444518% { opacity: 0.996078; transform: translate(400.694225px, 203.306554px); }
  73.308897% { opacity: 0.996078; transform: translate(400.556737px, 203.306998px); }
  73.8753749% { opacity: 0.996078; transform: translate(400.107206px, 203.307594px); }
  74.4418527% { opacity: 0.996078; transform: translate(399.308228px, 203.307013px); }
  74.9750083% { opacity: 0.996078; transform: translate(398.106049px, 203.306606px); }
  75.5414862% { opacity: 0.996078; transform: translate(396.434294px, 203.306500px); }
  76.107964% { opacity: 0.996078; transform: translate(394.237491px, 203.306915px); }
  76.6411196% { opacity: 0.996078; transform: translate(391.429393px, 203.306668px); }
  77.2075975% { opacity: 0.996078; transform: translate(387.935421px, 203.305701px); }
  77.7740753% { opacity: 0.996078; transform: translate(383.696846px, 203.306247px); }
  78.3072309% { opacity: 0.996078; transform: translate(378.692536px, 203.306276px); }
  78.8737088% { opacity: 0.996078; transform: translate(373.014441px, 203.305803px); }
  79.4401866% { opacity: 0.996078; transform: translate(366.840043px, 203.305082px); }
  79.9733422% { opacity: 1.0; transform: translate(360.478601px, 203.305548px); }
  80.5398201% { opacity: 0.996078; transform: translate(354.271986px, 203.305634px); }
  81.1062979% { opacity: 1.0; transform: translate(348.498426px, 203.305279px); }
  81.6394535% { opacity: 1.0; transform: translate(343.337142px, 203.305664px); }
  82.2059314% { opacity: 0.996078; transform: translate(338.827281px, 203.305768px); }
  82.7724092% { opacity: 0.996078; transform: translate(334.968457px, 203.306379px); }
  83.338887% { opacity: 0.996078; transform: translate(331.717860px, 203.306206px); }
  83.8720427% { opacity: 0.996078; transform: translate(329.011252px, 203.306226px); }
  84.4385205% { opacity: 0.996078; transform: translate(326.789401px, 203.305903px); }
  85.0049983% { opacity: 0.996078; transform: translate(324.987144px, 203.306355px); }
  85.5381539% { opacity: 0.996078; transform: translate(323.555177px, 203.306890px); }
  86.1046318% { opacity: 0.996078; transform: translate(322.456893px, 203.306206px); }
  86.6711096% { opacity: 1.0; transform: translate(321.651966px, 203.306914px); }
  87.2042652% { opacity: 0.996078; transform: translate(321.108839px, 203.307125px); }
  87.7707431% { opacity: 0.996078; transform: translate(320.792382px, 203.307217px); }
  88.3372209% { opacity: 0.996078; transform: translate(320.694225px, 203.306554px); }
  88.8703765% { opacity: 0.988235; transform: translate(320.694474px, 203.306723px); }
  89.4368544% { opacity: 0.968627; transform: translate(320.694285px, 203.306097px); }
  90.0033322% { opacity: 0.937255; transform: translate(320.694298px, 203.306733px); }
  90.5364878% { opacity: 0.890196; transform: translate(320.693975px, 203.305984px); }
  91.1029657% { opacity: 0.839216; transform: translate(320.694607px, 203.306189px); }
  91.6694435% { opacity: 0.780392; transform: translate(320.694619px, 203.306388px); }
  92.2025991% { opacity: 0.713725; transform: translate(320.693822px, 203.306165px); }
  92.769077% { opacity: 0.643137; transform: translate(320.693765px, 203.306347px); }
  93.3355548% { opacity: 0.572549; transform: translate(320.692779px, 203.305801px); }
  93.8687104% { opacity: 0.498039; transform: translate(320.693942px, 203.305858px); }
  94.4351883% { opacity: 0.419608; transform: translate(320.694390px, 203.306407px); }
  95.0016661% { opacity: 0.34902; transform: translate(320.694357px, 203.305539px); }
  95.5348217% { opacity: 0.278431; transform: translate(320.693904px, 203.304992px); }
  96.1012996% { opacity: 0.211765; transform: translate(320.690237px, 203.304678px); }
  96.6677774% { opacity: 0.152941; transform: translate(320.686989px, 203.304191px); }
  97.200933% { opacity: 0.101961; transform: translate(320.691425px, 203.304038px); }
  97.7674109% { opacity: 0.054902; transform: translate(320.685477px, 203.294772px); }
  98.3338887% { opacity: 0.023529; transform: translate(320.721049px, 203.334116px); }
  98.8670443% { opacity: 0.0; transform: translate(320.000000px, 210.000000px); }
  100% { opacity: 0.0; transform: translate(320.000000px, 210.000000px); }
}

@keyframes deckyzone-mouse-4 {
  0% { transform: scale(0.32); }
  6.6644452% { transform: scale(0.27663079); }
  7.230923% { transform: scale(0.27931402); }
  7.7640786% { transform: scale(0.3025094); }
  8.3305565% { transform: scale(0.31693592); }
  8.8970343% { transform: scale(0.31197071); }
  9.4301899% { transform: scale(0.31424286); }
  9.9966678% { transform: scale(0.31753023); }
  10.5631456% { transform: scale(0.31805209); }
  11.0963012% { transform: scale(0.31870309); }
  11.6627791% { transform: scale(0.31799588); }
  12.2292569% { transform: scale(0.31836759); }
  12.7624125% { transform: scale(0.31947916); }
  13.3288904% { transform: scale(0.31969141); }
  13.8953682% { transform: scale(0.32142681); }
  14.4285238% { transform: scale(0.31995054); }
  14.9950017% { transform: scale(0.32004945); }
  15.5614795% { transform: scale(0.32012849); }
  16.0946351% { transform: scale(0.3201364); }
  16.661113% { transform: scale(0.32076571); }
  17.2275908% { transform: scale(0.32082413); }
  17.7607464% { transform: scale(0.32083156); }
  18.3272243% { transform: scale(0.32078284); }
  18.8937021% { transform: scale(0.32077726); }
  19.4268577% { transform: scale(0.32077164); }
  19.9933356% { transform: scale(0.3213732); }
  20.5598134% { transform: scale(0.32078239); }
  21.092969% { transform: scale(0.32071317); }
  21.6594469% { transform: scale(0.32067938); }
  22.2259247% { transform: scale(0.32067953); }
  22.7590803% { transform: scale(0.32072039); }
  23.3255581% { transform: scale(0.3213149); }
  23.892036% { transform: scale(0.32136883); }
  24.4251916% { transform: scale(0.32136154); }
  24.9916694% { transform: scale(0.32139506); }
  25.5581473% { transform: scale(0.32142129); }
  26.0913029% { transform: scale(0.32142566); }
  26.6577807% { transform: scale(0.32143441); }
  27.2242586% { transform: scale(0.32143878); }
  27.7907364% { transform: scale(0.32145918); }
  28.323892% { transform: scale(0.32144169); }
  28.8903699% { transform: scale(0.32144898); }
  29.4568477% { transform: scale(0.32143732); }
  29.9900033% { transform: scale(0.32142858); }
  30.5564812% { transform: scale(0.32140089); }
  31.122959% { transform: scale(0.32139943); }
  31.6561146% { transform: scale(0.32137029); }
  32.2225925% { transform: scale(0.32135425); }
  32.7890703% { transform: scale(0.32133239); }
  33.3222259% { transform: scale(0.32131781); }
  33.8887038% { transform: scale(0.32129303); }
  34.4551816% { transform: scale(0.3212872); }
  34.9883372% { transform: scale(0.32127554); }
  35.5548151% { transform: scale(0.3212595); }
  36.1212929% { transform: scale(0.32126096); }
  36.6544485% { transform: scale(0.32125075); }
  37.2209264% { transform: scale(0.32127554); }
  37.7874042% { transform: scale(0.32127262); }
  38.3205598% { transform: scale(0.32130615); }
  38.8870377% { transform: scale(0.32131927); }
  39.4535155% { transform: scale(0.32133968); }
  39.9866711% { transform: scale(0.32135134); }
  40.553149% { transform: scale(0.3213834); }
  41.1196268% { transform: scale(0.32140526); }
  41.6527824% { transform: scale(0.32141255); }
  42.2192602% { transform: scale(0.32140963); }
  42.7857381% { transform: scale(0.32143586); }
  43.8853715% { transform: scale(0.32144606); }
  44.4518494% { transform: scale(0.32145189); }
  44.985005% { transform: scale(0.32145335); }
  48.3172276% { transform: scale(0.31896822); }
  48.8837054% { transform: scale(0.27649176); }
  49.4501833% { transform: scale(0.23660621); }
  49.9833389% { transform: scale(0.23358459); }
  50.5498167% { transform: scale(0.233212); }
  51.1162946% { transform: scale(0.23258441); }
  51.6494502% { transform: scale(0.23192549); }
  52.215928% { transform: scale(0.23096226); }
  52.7824059% { transform: scale(0.23031967); }
  53.3155615% { transform: scale(0.23019106); }
  53.8820393% { transform: scale(0.23002201); }
  55.5481506% { transform: scale(0.27946733); }
  56.1146285% { transform: scale(0.32145335); }
  58.8803732% { transform: scale(0.31896822); }
  59.446851% { transform: scale(0.27649176); }
  59.9800067% { transform: scale(0.23660621); }
  60.5464845% { transform: scale(0.23358459); }
  61.1129623% { transform: scale(0.233212); }
  61.646118% { transform: scale(0.23258441); }
  62.2125958% { transform: scale(0.23192549); }
  62.7790736% { transform: scale(0.23096226); }
  63.3122293% { transform: scale(0.23031967); }
  63.8787071% { transform: scale(0.23019106); }
  64.4451849% { transform: scale(0.23002201); }
  66.1112962% { transform: scale(0.27946733); }
  66.6444518% { transform: scale(0.32145335); }
  73.308897% { transform: scale(0.32144898); }
  73.8753749% { transform: scale(0.3214548); }
  74.4418527% { transform: scale(0.32145043); }
  74.9750083% { transform: scale(0.32143586); }
  75.5414862% { transform: scale(0.32141983); }
  76.107964% { transform: scale(0.32140672); }
  76.6411196% { transform: scale(0.32140818); }
  77.2075975% { transform: scale(0.32139215); }
  77.7740753% { transform: scale(0.32136737); }
  78.3072309% { transform: scale(0.32136154); }
  78.8737088% { transform: scale(0.3213528); }
  79.4401866% { transform: scale(0.32134551); }
  79.9733422% { transform: scale(0.32071771); }
  80.5398201% { transform: scale(0.32133676); }
  81.1062979% { transform: scale(0.32071625); }
  81.6394535% { transform: scale(0.32076135); }
  82.2059314% { transform: scale(0.32138049); }
  82.7724092% { transform: scale(0.3213834); }
  83.338887% { transform: scale(0.32141255); }
  83.8720427% { transform: scale(0.32142129); }
  84.4385205% { transform: scale(0.32142421); }
  85.0049983% { transform: scale(0.32143441); }
  85.5381539% { transform: scale(0.32143878); }
  86.1046318% { transform: scale(0.32143149); }
  86.6711096% { transform: scale(0.32082388); }
  87.2042652% { transform: scale(0.32145335); }
  87.7707431% { transform: scale(0.32145772); }
  88.3372209% { transform: scale(0.32145335); }
  88.8703765% { transform: scale(0.32145714); }
  89.4368544% { transform: scale(0.32145341); }
  90.0033322% { transform: scale(0.32145547); }
  90.5364878% { transform: scale(0.32144172); }
  91.1029657% { transform: scale(0.32142681); }
  91.6694435% { transform: scale(0.32142735); }
  92.2025991% { transform: scale(0.3214228); }
  92.769077% { transform: scale(0.32139291); }
  93.3355548% { transform: scale(0.32138861); }
  93.8687104% { transform: scale(0.32134259); }
  94.4351883% { transform: scale(0.32133513); }
  95.0016661% { transform: scale(0.32130807); }
  95.5348217% { transform: scale(0.32122556); }
  96.1012996% { transform: scale(0.32113291); }
  96.6677774% { transform: scale(0.3210416); }
  97.200933% { transform: scale(0.32074691); }
  97.7674109% { transform: scale(0.31999403); }
  98.3338887% { transform: scale(0.31837002); }
  98.8670443% { transform: scale(0.32); }
  100% { transform: scale(0.32); }
}

@keyframes deckyzone-mouse-5 {
  0% { opacity: 0; }
  4.431856% { opacity: 1; }
  4.9983339% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-6 {
  0% { opacity: 0; }
  4.9983339% { opacity: 1; }
  5.5648117% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-7 {
  0% { opacity: 0; }
  5.5648117% { opacity: 1; }
  6.0979673% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-8 {
  0% { opacity: 0; }
  6.0979673% { opacity: 1; }
  6.6644452% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-9 {
  0% { opacity: 0; }
  6.6644452% { opacity: 1; }
  7.230923% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-10 {
  0% { opacity: 0; }
  7.230923% { opacity: 1; }
  7.7640786% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-11 {
  0% { opacity: 0; }
  7.7640786% { opacity: 1; }
  8.3305565% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-12 {
  0% { opacity: 0; }
  8.3305565% { opacity: 1; }
  8.8970343% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-13 {
  0% { opacity: 0; }
  8.8970343% { opacity: 1; }
  9.4301899% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-14 {
  0% { opacity: 0; }
  9.4301899% { opacity: 1; }
  9.9966678% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-15 {
  0% { opacity: 0; }
  9.9966678% { opacity: 1; }
  10.5631456% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-16 {
  0% { opacity: 0; }
  10.5631456% { opacity: 1; }
  11.0963012% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-17 {
  0% { opacity: 0; }
  11.0963012% { opacity: 1; }
  11.6627791% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-18 {
  0% { opacity: 0; }
  11.6627791% { opacity: 1; }
  12.2292569% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-19 {
  0% { opacity: 0; }
  12.2292569% { opacity: 1; }
  12.7624125% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-20 {
  0% { opacity: 0; }
  12.7624125% { opacity: 1; }
  13.3288904% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-21 {
  0% { opacity: 0; }
  13.3288904% { opacity: 1; }
  13.8953682% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-22 {
  0% { opacity: 0; }
  13.8953682% { opacity: 1; }
  14.4285238% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-23 {
  0% { opacity: 0; }
  14.4285238% { opacity: 1; }
  14.9950017% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-24 {
  0% { opacity: 0; }
  14.9950017% { opacity: 1; }
  15.5614795% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-25 {
  0% { opacity: 0; }
  15.5614795% { opacity: 1; }
  16.0946351% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-26 {
  0% { opacity: 0; }
  16.0946351% { opacity: 1; }
  16.661113% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-27 {
  0% { opacity: 0; }
  16.661113% { opacity: 1; }
  17.2275908% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-28 {
  0% { opacity: 0; }
  17.2275908% { opacity: 1; }
  17.7607464% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-29 {
  0% { opacity: 0; }
  17.7607464% { opacity: 1; }
  18.3272243% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-30 {
  0% { opacity: 0; }
  18.3272243% { opacity: 1; }
  18.8937021% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-31 {
  0% { opacity: 0; }
  18.8937021% { opacity: 1; }
  19.4268577% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-32 {
  0% { opacity: 0; }
  19.4268577% { opacity: 1; }
  19.9933356% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-33 {
  0% { opacity: 0; }
  19.9933356% { opacity: 1; }
  20.5598134% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-34 {
  0% { opacity: 0; }
  20.5598134% { opacity: 1; }
  21.092969% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-35 {
  0% { opacity: 0; }
  21.092969% { opacity: 1; }
  21.6594469% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-36 {
  0% { opacity: 0; }
  21.6594469% { opacity: 1; }
  22.2259247% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-37 {
  0% { opacity: 0; }
  22.2259247% { opacity: 1; }
  22.7590803% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-38 {
  0% { opacity: 0; }
  22.7590803% { opacity: 1; }
  23.3255581% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-39 {
  0% { opacity: 0; }
  23.3255581% { opacity: 1; }
  23.892036% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-40 {
  0% { opacity: 0; }
  23.892036% { opacity: 1; }
  24.4251916% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-41 {
  0% { opacity: 0; }
  24.4251916% { opacity: 1; }
  24.9916694% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-42 {
  0% { opacity: 0; }
  24.9916694% { opacity: 1; }
  25.5581473% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-43 {
  0% { opacity: 0; }
  25.5581473% { opacity: 1; }
  26.0913029% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-44 {
  0% { opacity: 0; }
  26.0913029% { opacity: 1; }
  26.6577807% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-45 {
  0% { opacity: 0; }
  26.6577807% { opacity: 1; }
  27.2242586% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-46 {
  0% { opacity: 0; }
  27.2242586% { opacity: 1; }
  27.7907364% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-47 {
  0% { opacity: 0; }
  27.7907364% { opacity: 1; }
  28.323892% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-48 {
  0% { opacity: 0; }
  28.323892% { opacity: 1; }
  28.8903699% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-49 {
  0% { opacity: 0; }
  28.8903699% { opacity: 1; }
  29.4568477% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-50 {
  0% { opacity: 0; }
  29.4568477% { opacity: 1; }
  29.9900033% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-51 {
  0% { opacity: 0; }
  29.9900033% { opacity: 1; }
  30.5564812% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-52 {
  0% { opacity: 0; }
  30.5564812% { opacity: 1; }
  31.122959% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-53 {
  0% { opacity: 0; }
  31.122959% { opacity: 1; }
  31.6561146% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-54 {
  0% { opacity: 0; }
  31.6561146% { opacity: 1; }
  32.2225925% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-55 {
  0% { opacity: 0; }
  32.2225925% { opacity: 1; }
  32.7890703% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-56 {
  0% { opacity: 0; }
  32.7890703% { opacity: 1; }
  33.3222259% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-57 {
  0% { opacity: 0; }
  33.3222259% { opacity: 1; }
  33.8887038% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-58 {
  0% { opacity: 0; }
  33.8887038% { opacity: 1; }
  34.4551816% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-59 {
  0% { opacity: 0; }
  34.4551816% { opacity: 1; }
  34.9883372% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-60 {
  0% { opacity: 0; }
  34.9883372% { opacity: 1; }
  35.5548151% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-61 {
  0% { opacity: 0; }
  35.5548151% { opacity: 1; }
  36.1212929% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-62 {
  0% { opacity: 0; }
  36.1212929% { opacity: 1; }
  36.6544485% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-63 {
  0% { opacity: 0; }
  36.6544485% { opacity: 1; }
  37.2209264% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-64 {
  0% { opacity: 0; }
  37.2209264% { opacity: 1; }
  37.7874042% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-65 {
  0% { opacity: 0; }
  37.7874042% { opacity: 1; }
  38.3205598% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-66 {
  0% { opacity: 0; }
  38.3205598% { opacity: 1; }
  38.8870377% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-67 {
  0% { opacity: 0; }
  38.8870377% { opacity: 1; }
  39.4535155% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-68 {
  0% { opacity: 0; }
  39.4535155% { opacity: 1; }
  39.9866711% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-69 {
  0% { opacity: 0; }
  39.9866711% { opacity: 1; }
  40.553149% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-70 {
  0% { opacity: 0; }
  40.553149% { opacity: 1; }
  41.1196268% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-71 {
  0% { opacity: 0; }
  41.1196268% { opacity: 1; }
  41.6527824% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-72 {
  0% { opacity: 0; }
  41.6527824% { opacity: 1; }
  42.2192602% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-73 {
  0% { opacity: 0; }
  42.2192602% { opacity: 1; }
  42.7857381% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-74 {
  0% { opacity: 0; }
  42.7857381% { opacity: 1; }
  43.3188937% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-75 {
  0% { opacity: 0; }
  43.3188937% { opacity: 1; }
  43.8853715% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-76 {
  0% { opacity: 0; }
  43.8853715% { opacity: 1; }
  44.4518494% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-77 {
  0% { opacity: 0; }
  44.4518494% { opacity: 1; }
  44.985005% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-78 {
  0% { opacity: 0; }
  44.985005% { opacity: 1; }
  48.3172276% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-79 {
  0% { opacity: 0; }
  48.3172276% { opacity: 1; }
  48.8837054% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-80 {
  0% { opacity: 0; }
  48.8837054% { opacity: 1; }
  49.4501833% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-81 {
  0% { opacity: 0; }
  49.4501833% { opacity: 1; }
  49.9833389% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-82 {
  0% { opacity: 0; }
  49.9833389% { opacity: 1; }
  50.5498167% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-83 {
  0% { opacity: 0; }
  50.5498167% { opacity: 1; }
  51.1162946% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-84 {
  0% { opacity: 0; }
  51.1162946% { opacity: 1; }
  51.6494502% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-85 {
  0% { opacity: 0; }
  51.6494502% { opacity: 1; }
  52.215928% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-86 {
  0% { opacity: 0; }
  52.215928% { opacity: 1; }
  52.7824059% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-87 {
  0% { opacity: 0; }
  52.7824059% { opacity: 1; }
  53.3155615% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-88 {
  0% { opacity: 0; }
  53.3155615% { opacity: 1; }
  53.8820393% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-89 {
  0% { opacity: 0; }
  53.8820393% { opacity: 1; }
  54.4485172% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-90 {
  0% { opacity: 0; }
  54.4485172% { opacity: 1; }
  54.9816728% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-91 {
  0% { opacity: 0; }
  54.9816728% { opacity: 1; }
  55.5481506% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-92 {
  0% { opacity: 0; }
  55.5481506% { opacity: 1; }
  56.1146285% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-93 {
  0% { opacity: 0; }
  56.1146285% { opacity: 1; }
  58.8803732% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-94 {
  0% { opacity: 0; }
  58.8803732% { opacity: 1; }
  59.446851% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-95 {
  0% { opacity: 0; }
  59.446851% { opacity: 1; }
  59.9800067% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-96 {
  0% { opacity: 0; }
  59.9800067% { opacity: 1; }
  60.5464845% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-97 {
  0% { opacity: 0; }
  60.5464845% { opacity: 1; }
  61.1129623% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-98 {
  0% { opacity: 0; }
  61.1129623% { opacity: 1; }
  61.646118% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-99 {
  0% { opacity: 0; }
  61.646118% { opacity: 1; }
  62.2125958% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-100 {
  0% { opacity: 0; }
  62.2125958% { opacity: 1; }
  62.7790736% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-101 {
  0% { opacity: 0; }
  62.7790736% { opacity: 1; }
  63.3122293% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-102 {
  0% { opacity: 0; }
  63.3122293% { opacity: 1; }
  63.8787071% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-103 {
  0% { opacity: 0; }
  63.8787071% { opacity: 1; }
  64.4451849% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-104 {
  0% { opacity: 0; }
  64.4451849% { opacity: 1; }
  64.9783406% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-105 {
  0% { opacity: 0; }
  64.9783406% { opacity: 1; }
  65.5448184% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-106 {
  0% { opacity: 0; }
  65.5448184% { opacity: 1; }
  66.1112962% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-107 {
  0% { opacity: 0; }
  66.1112962% { opacity: 1; }
  66.6444518% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-108 {
  0% { opacity: 0; }
  66.6444518% { opacity: 1; }
  73.308897% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-109 {
  0% { opacity: 0; }
  73.308897% { opacity: 1; }
  73.8753749% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-110 {
  0% { opacity: 0; }
  73.8753749% { opacity: 1; }
  74.4418527% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-111 {
  0% { opacity: 0; }
  74.4418527% { opacity: 1; }
  74.9750083% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-112 {
  0% { opacity: 0; }
  74.9750083% { opacity: 1; }
  75.5414862% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-113 {
  0% { opacity: 0; }
  75.5414862% { opacity: 1; }
  76.107964% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-114 {
  0% { opacity: 0; }
  76.107964% { opacity: 1; }
  76.6411196% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-115 {
  0% { opacity: 0; }
  76.6411196% { opacity: 1; }
  77.2075975% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-116 {
  0% { opacity: 0; }
  77.2075975% { opacity: 1; }
  77.7740753% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-117 {
  0% { opacity: 0; }
  77.7740753% { opacity: 1; }
  78.3072309% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-118 {
  0% { opacity: 0; }
  78.3072309% { opacity: 1; }
  78.8737088% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-119 {
  0% { opacity: 0; }
  78.8737088% { opacity: 1; }
  79.4401866% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-120 {
  0% { opacity: 0; }
  79.4401866% { opacity: 1; }
  79.9733422% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-121 {
  0% { opacity: 0; }
  79.9733422% { opacity: 1; }
  80.5398201% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-122 {
  0% { opacity: 0; }
  80.5398201% { opacity: 1; }
  81.1062979% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-123 {
  0% { opacity: 0; }
  81.1062979% { opacity: 1; }
  81.6394535% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-124 {
  0% { opacity: 0; }
  81.6394535% { opacity: 1; }
  82.2059314% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-125 {
  0% { opacity: 0; }
  82.2059314% { opacity: 1; }
  82.7724092% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-126 {
  0% { opacity: 0; }
  82.7724092% { opacity: 1; }
  83.338887% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-127 {
  0% { opacity: 0; }
  83.338887% { opacity: 1; }
  83.8720427% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-128 {
  0% { opacity: 0; }
  83.8720427% { opacity: 1; }
  84.4385205% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-129 {
  0% { opacity: 0; }
  84.4385205% { opacity: 1; }
  85.0049983% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-130 {
  0% { opacity: 0; }
  85.0049983% { opacity: 1; }
  85.5381539% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-131 {
  0% { opacity: 0; }
  85.5381539% { opacity: 1; }
  86.1046318% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-132 {
  0% { opacity: 0; }
  86.1046318% { opacity: 1; }
  86.6711096% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-133 {
  0% { opacity: 0; }
  86.6711096% { opacity: 1; }
  87.2042652% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-134 {
  0% { opacity: 0; }
  87.2042652% { opacity: 1; }
  87.7707431% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-135 {
  0% { opacity: 0; }
  87.7707431% { opacity: 1; }
  88.3372209% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-136 {
  0% { opacity: 0; }
  88.3372209% { opacity: 1; }
  88.8703765% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-137 {
  0% { opacity: 0; }
  88.8703765% { opacity: 1; }
  89.4368544% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-138 {
  0% { opacity: 0; }
  89.4368544% { opacity: 1; }
  90.0033322% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-139 {
  0% { opacity: 0; }
  90.0033322% { opacity: 1; }
  90.5364878% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-140 {
  0% { opacity: 0; }
  90.5364878% { opacity: 1; }
  91.1029657% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-141 {
  0% { opacity: 0; }
  91.1029657% { opacity: 1; }
  91.6694435% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-142 {
  0% { opacity: 0; }
  91.6694435% { opacity: 1; }
  92.2025991% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-143 {
  0% { opacity: 0; }
  92.2025991% { opacity: 1; }
  92.769077% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-144 {
  0% { opacity: 0; }
  92.769077% { opacity: 1; }
  93.3355548% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-145 {
  0% { opacity: 0; }
  93.3355548% { opacity: 1; }
  93.8687104% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-146 {
  0% { opacity: 0; }
  93.8687104% { opacity: 1; }
  94.4351883% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-147 {
  0% { opacity: 0; }
  94.4351883% { opacity: 1; }
  95.0016661% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-148 {
  0% { opacity: 0; }
  95.0016661% { opacity: 1; }
  95.5348217% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-149 {
  0% { opacity: 0; }
  95.5348217% { opacity: 1; }
  96.1012996% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-150 {
  0% { opacity: 0; }
  96.1012996% { opacity: 1; }
  96.6677774% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-151 {
  0% { opacity: 0; }
  96.6677774% { opacity: 1; }
  97.200933% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-152 {
  0% { opacity: 0; }
  97.200933% { opacity: 1; }
  97.7674109% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-153 {
  0% { opacity: 0; }
  97.7674109% { opacity: 1; }
  98.3338887% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-154 {
  0% { opacity: 0; }
  98.3338887% { opacity: 1; }
  98.8670443% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes deckyzone-mouse-155 {
  0% { opacity: 0; }
  98.8670443% { opacity: 1; }
  99.4335222% { opacity: 0; }
  100% { opacity: 0; }
}
`,
  TouchscreenAnimation: `
svg[data-deckyzone-animation="TouchscreenAnimation"] [data-part="zone-active-display"] {
  animation: deckyzone-touchscreen-0 2.851s step-end infinite;
}

svg[data-deckyzone-animation="TouchscreenAnimation"] [data-part="zone-touch-indicator"] {
  animation: deckyzone-touchscreen-1 2.851s step-end infinite;
}

@keyframes deckyzone-touchscreen-0 {
  0% { fill-opacity: 0.0; }
  2.350053% { fill-opacity: 0.003922; }
  2.911259% { fill-opacity: 0.160784; }
  3.507541% { fill-opacity: 0.32549; }
  4.103823% { fill-opacity: 0.494118; }
  4.66503% { fill-opacity: 0.662745; }
  5.261312% { fill-opacity: 0.831373; }
  5.857594% { fill-opacity: 0.984314; }
  6.4188% { fill-opacity: 0.94902; }
  7.015082% { fill-opacity: 0.901961; }
  7.611364% { fill-opacity: 0.85098; }
  8.172571% { fill-opacity: 0.8; }
  8.768853% { fill-opacity: 0.74902; }
  9.365135% { fill-opacity: 0.701961; }
  9.926342% { fill-opacity: 0.65098; }
  10.522624% { fill-opacity: 0.6; }
  11.118906% { fill-opacity: 0.54902; }
  11.680112% { fill-opacity: 0.498039; }
  12.276394% { fill-opacity: 0.447059; }
  12.872676% { fill-opacity: 0.396078; }
  13.433883% { fill-opacity: 0.345098; }
  14.030165% { fill-opacity: 0.298039; }
  14.626447% { fill-opacity: 0.247059; }
  15.187653% { fill-opacity: 0.196078; }
  15.783935% { fill-opacity: 0.145098; }
  16.380217% { fill-opacity: 0.098039; }
  16.941424% { fill-opacity: 0.047059; }
  17.537706% { fill-opacity: 0.0; }
  100% { fill-opacity: 0.0; }
}

@keyframes deckyzone-touchscreen-1 {
  0% { cx: 321.0px; opacity: 0.0; }
  5.857594% { cx: 321.0px; opacity: 1.0; }
  8.172571% { cx: 321.0px; opacity: 0.995726; }
  18.133988% { cx: 321.0px; opacity: 1.0; }
  18.695195% { cx: 320.0px; opacity: 1.0; }
  19.291477% { cx: 318.0px; opacity: 1.0; }
  19.887759% { cx: 316.0px; opacity: 1.0; }
  20.448965% { cx: 312.0px; opacity: 1.0; }
  21.045247% { cx: 308.0px; opacity: 1.0; }
  21.641529% { cx: 303.0px; opacity: 1.0; }
  22.202736% { cx: 296.0px; opacity: 1.0; }
  22.799018% { cx: 289.0px; opacity: 1.0; }
  23.3953% { cx: 281.0px; opacity: 1.0; }
  23.956506% { cx: 273.0px; opacity: 1.0; }
  24.552788% { cx: 266.0px; opacity: 1.0; }
  25.149071% { cx: 259.0px; opacity: 1.0; }
  25.710277% { cx: 254.0px; opacity: 1.0; }
  26.306559% { cx: 249.0px; opacity: 1.0; }
  26.902841% { cx: 246.0px; opacity: 1.0; }
  27.464048% { cx: 244.0px; opacity: 1.0; }
  28.06033% { cx: 242.0px; opacity: 1.0; }
  28.656612% { cx: 241.0px; opacity: 1.0; }
  30.410382% { cx: 242.0px; opacity: 1.0; }
  31.006664% { cx: 243.0px; opacity: 1.0; }
  31.567871% { cx: 245.0px; opacity: 1.0; }
  32.164153% { cx: 248.0px; opacity: 1.0; }
  32.760435% { cx: 251.0px; opacity: 1.0; }
  33.321642% { cx: 255.5px; opacity: 1.0; }
  33.917924% { cx: 261.0px; opacity: 1.0; }
  34.514206% { cx: 267.0px; opacity: 1.0; }
  35.075412% { cx: 274.0px; opacity: 1.0; }
  35.671694% { cx: 282.0px; opacity: 1.0; }
  36.267976% { cx: 290.0px; opacity: 1.0; }
  36.829183% { cx: 300.0px; opacity: 1.0; }
  37.425465% { cx: 310.0px; opacity: 1.0; }
  38.021747% { cx: 321.0px; opacity: 1.0; }
  38.582953% { cx: 332.0px; opacity: 1.0; }
  39.179235% { cx: 342.0px; opacity: 1.0; }
  39.775517% { cx: 352.0px; opacity: 1.0; }
  40.336724% { cx: 360.0px; opacity: 1.0; }
  40.933006% { cx: 368.0px; opacity: 1.0; }
  41.529288% { cx: 375.0px; opacity: 1.0; }
  42.090495% { cx: 381.0px; opacity: 1.0; }
  42.686777% { cx: 386.0px; opacity: 1.0; }
  43.283059% { cx: 391.0px; opacity: 1.0; }
  43.844265% { cx: 394.0px; opacity: 1.0; }
  44.440547% { cx: 397.0px; opacity: 1.0; }
  45.036829% { cx: 399.0px; opacity: 1.0; }
  45.598036% { cx: 400.0px; opacity: 1.0; }
  46.194318% { cx: 401.0px; opacity: 1.0; }
  47.948088% { cx: 400.0px; opacity: 1.0; }
  48.54437% { cx: 399.0px; opacity: 1.0; }
  49.105577% { cx: 397.0px; opacity: 1.0; }
  49.701859% { cx: 394.0px; opacity: 1.0; }
  50.298141% { cx: 391.0px; opacity: 1.0; }
  50.859348% { cx: 386.0px; opacity: 1.0; }
  51.45563% { cx: 381.0px; opacity: 1.0; }
  52.051912% { cx: 375.0px; opacity: 1.0; }
  52.613118% { cx: 368.0px; opacity: 1.0; }
  53.2094% { cx: 360.0px; opacity: 1.0; }
  53.805682% { cx: 352.0px; opacity: 1.0; }
  54.366889% { cx: 342.0px; opacity: 1.0; }
  54.963171% { cx: 332.0px; opacity: 1.0; }
  55.559453% { cx: 321.0px; opacity: 1.0; }
  56.120659% { cx: 310.0px; opacity: 1.0; }
  56.716941% { cx: 300.0px; opacity: 1.0; }
  57.313223% { cx: 290.0px; opacity: 1.0; }
  57.87443% { cx: 282.0px; opacity: 1.0; }
  58.470712% { cx: 274.0px; opacity: 1.0; }
  59.066994% { cx: 267.0px; opacity: 1.0; }
  59.628201% { cx: 261.0px; opacity: 1.0; }
  60.224483% { cx: 255.5px; opacity: 1.0; }
  60.820765% { cx: 251.0px; opacity: 1.0; }
  61.381971% { cx: 248.0px; opacity: 1.0; }
  61.978253% { cx: 245.0px; opacity: 1.0; }
  62.574535% { cx: 243.0px; opacity: 1.0; }
  63.135742% { cx: 242.0px; opacity: 1.0; }
  63.732024% { cx: 241.0px; opacity: 1.0; }
  66.082076% { cx: 242.0px; opacity: 1.0; }
  67.239565% { cx: 243.0px; opacity: 1.0; }
  67.835847% { cx: 244.0px; opacity: 1.0; }
  68.397054% { cx: 245.0px; opacity: 1.0; }
  68.993336% { cx: 247.0px; opacity: 1.0; }
  69.589618% { cx: 248.0px; opacity: 1.0; }
  70.150824% { cx: 250.0px; opacity: 1.0; }
  70.747106% { cx: 253.0px; opacity: 1.0; }
  71.343388% { cx: 255.0px; opacity: 1.0; }
  71.904595% { cx: 258.0px; opacity: 1.0; }
  72.500877% { cx: 262.0px; opacity: 1.0; }
  73.097159% { cx: 266.0px; opacity: 1.0; }
  73.658365% { cx: 270.0px; opacity: 1.0; }
  74.254647% { cx: 274.0px; opacity: 1.0; }
  74.850929% { cx: 279.0px; opacity: 1.0; }
  75.412136% { cx: 283.0px; opacity: 1.0; }
  76.008418% { cx: 287.5px; opacity: 1.0; }
  76.6047% { cx: 292.0px; opacity: 1.0; }
  77.165907% { cx: 295.0px; opacity: 1.0; }
  77.762189% { cx: 299.0px; opacity: 1.0; }
  78.358471% { cx: 302.0px; opacity: 1.0; }
  78.919677% { cx: 305.0px; opacity: 1.0; }
  79.515959% { cx: 307.5px; opacity: 1.0; }
  80.112241% { cx: 310.0px; opacity: 1.0; }
  80.673448% { cx: 312.0px; opacity: 1.0; }
  81.26973% { cx: 313.0px; opacity: 1.0; }
  81.866012% { cx: 315.0px; opacity: 1.0; }
  82.427219% { cx: 316.0px; opacity: 1.0; }
  83.023501% { cx: 317.0px; opacity: 1.0; }
  83.619783% { cx: 318.0px; opacity: 1.0; }
  84.180989% { cx: 319.0px; opacity: 1.0; }
  84.777271% { cx: 320.0px; opacity: 1.0; }
  85.93476% { cx: 321.0px; opacity: 1.0; }
  87.723606% { cx: 321.0px; opacity: 0.995726; }
  88.284812% { cx: 321.0px; opacity: 0.944444; }
  88.881094% { cx: 321.0px; opacity: 0.897436; }
  89.477376% { cx: 321.0px; opacity: 0.846154; }
  90.038583% { cx: 321.0px; opacity: 0.794872; }
  90.634865% { cx: 321.0px; opacity: 0.747863; }
  91.231147% { cx: 321.0px; opacity: 0.700855; }
  91.792354% { cx: 321.0px; opacity: 0.649573; }
  92.388636% { cx: 321.0px; opacity: 0.598291; }
  92.984918% { cx: 321.0px; opacity: 0.542735; }
  93.546124% { cx: 321.0px; opacity: 0.495726; }
  94.142406% { cx: 321.0px; opacity: 0.444444; }
  94.738688% { cx: 321.0px; opacity: 0.393162; }
  95.299895% { cx: 321.0px; opacity: 0.34188; }
  95.896177% { cx: 321.0px; opacity: 0.294872; }
  96.492459% { cx: 321.0px; opacity: 0.24359; }
  97.053665% { cx: 321.0px; opacity: 0.196581; }
  97.649947% { cx: 321.0px; opacity: 0.145299; }
  98.246229% { cx: 321.0px; opacity: 0.098291; }
  98.807436% { cx: 321.0px; opacity: 0.047009; }
  99.403718% { cx: 321.0px; opacity: 0.0; }
  100% { cx: 321.0px; opacity: 0.0; }
}
`,
} as const;
