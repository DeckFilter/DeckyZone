// Adapted from PowerControl (BSD-3-Clause), copyright (c) 2023 Gawah.
// Original: src/util/position.ts. Full notice is included in LICENSE.
export class FanPosition {
  temperature?: number;
  fanRPMpercent?: number;

  static tempMax: number = 100;
  static fanMax: number = 100;
  static fanMin: number = 0;
  static tempMin: number = 0;

  constructor(temperature: number, fanRPMpercent: number) {
    this.fanRPMpercent = Math.min(
      Math.max(fanRPMpercent, FanPosition.fanMin),
      FanPosition.fanMax
    );
    this.temperature = Math.min(
      Math.max(temperature, FanPosition.tempMin),
      FanPosition.tempMax
    );
  }

  public getCanvasPos(canWidth: number, canHeight: number) {
    var canPosx = Math.min(
      Math.max((this.temperature!! / FanPosition.tempMax) * canWidth, 0),
      canWidth
    );
    var canPosy = Math.min(
      Math.max((1 - this.fanRPMpercent!! / FanPosition.fanMax) * canHeight, 0),
      canHeight
    );
    return [canPosx, canPosy];
  }

  public isCloseToOther(other: FanPosition, distance: number) {
    var getDis = Math.sqrt(
      Math.pow(other.temperature!! - this.temperature!!, 2) +
        Math.pow(other.fanRPMpercent!! - this.fanRPMpercent!!, 2)
    );
    return getDis <= distance;
  }
  public static createFanPosByCanPos(
    canx: number,
    cany: number,
    canWidth: number,
    canHeight: number
  ) {
    var temperature = Math.min(
      Math.max((canx!! / canWidth) * this.tempMax, this.tempMin),
      this.tempMax
    );
    var fanRPMpercent = Math.min(
      Math.max((1 - cany!! / canHeight) * this.fanMax, this.fanMin),
      this.fanMax
    );
    return new FanPosition(temperature, fanRPMpercent);
  }
}
export const getTextPosByCanvasPos = (
  canPosx: number,
  canPosy: number,
  canWidth: number,
  _canHeight: number,
  textlen = 55
) => {
  var textheight = 12;
  var offsetX = 0;
  var offsetY = 0;
  if (canPosx + textlen / 2 >= canWidth - 5) {
    offsetX = canWidth - textlen - canPosx;
  } else if (canPosx - textlen / 2 <= 5) {
    offsetX = -canPosx;
  } else {
    offsetX = -textlen / 2 + 2;
  }
  if (canPosy - textheight <= 5) {
    offsetY = textheight + 5;
  } else {
    offsetY = -textheight;
  }
  return [canPosx + offsetX, canPosy + offsetY];
};

