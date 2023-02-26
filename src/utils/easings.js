const Easings = {
  Linear: (t) => {
    return t;
  },
  InQuad: (t) => {
    return t * t;
  },
  OutQuad: (t) => {
    return t * (2 - t);
  },
  InOutQuad: (t) => {
    if ((t *= 2) < 1) {
      return 0.5 * t * t;
    }
    return -0.5 * (--t * (t - 2) - 1);
  },
  InCubic: (t) => {
    return t * t * t;
  },
  OutCubic: (t) => {
    return --t * t * t + 1;
  },
  InOutCubic: (t) => {
    if ((t *= 2) < 1) {
      return 0.5 * t * t * t;
    }
    return 0.5 * ((t -= 2) * t * t + 2);
  },
  InQuart: (t) => {
    return t * t * t * t;
  },
  OutQuart: (t) => {
    return 1 - --t * t * t * t;
  },
  InOutQuart: (t) => {
    if ((t *= 2) < 1) {
      return 0.5 * t * t * t * t;
    }
    return 0.5 * ((t -= 2) * t * t * t - 2);
  },
  InQuint: (t) => {
    return t * t * t * t * t;
  },
  OutQuint: (t) => {
    return --t * t * t * t * t + 1;
  },
  InOutQuint: (t) => {
    if ((t *= 2) < 1) return 0.5 * t * t * t * t * t;
    return 0.5 * ((t -= 2) * t * t * t * t + 2);
  },
  InSine: (t) => {
    return 1 - Math.cos((t * Math.PI) / 2);
  },
  OutSine: (t) => {
    return Math.sin((t * Math.PI) / 2);
  },
  InOutSine: (t) => {
    return 0.5 * (1 - Math.cos(Math.PI * t));
  },
  InBounce: (t) => {
    return 1 - outBounce(1 - t);
  },
  OutBounce: (t) => {
    if (t < 0.36363636363636365) {
      return 7.5625 * t * t;
    } else if (t < 0.7272727272727273) {
      t = t - 0.5454545454545454;
      return 7.5625 * t * t + 0.75;
    } else if (t < 0.9090909090909091) {
      t = t - 0.8181818181818182;
      return 7.5625 * t * t + 0.9375;
    } else {
      t = t - 0.9545454545454546;
      return 7.5625 * t * t + 0.984375;
    }
  },
  InOutBounce: (t) => {
    if (t < 0.5) {
      return Easings.InBounce(t * 2) * 0.5;
    }
    return Easings.OutBounce(t * 2 - 1) * 0.5 + 1 * 0.5;
  },
  InElastic: (t, amplitude, period) => {
    if (typeof period == "undefined") {
      period = 0;
    }
    if (typeof amplitude == "undefined") {
      amplitude = 1;
    }
    var offset = 1.70158;

    if (t == 0) return 0;
    if (t == 1) return 1;

    if (!period) {
      period = 0.3;
    }

    if (amplitude < 1) {
      amplitude = 1;
      offset = period / 4;
    } else {
      offset = (period / (2 * Math.PI)) * Math.asin(1 / amplitude);
    }

    return -(
      amplitude *
      Math.pow(2, 10 * (t -= 1)) *
      Math.sin(((t - offset) * (Math.PI * 2)) / period)
    );
  },
  OutElastic: (t, amplitude, period) => {
    if (typeof period == "undefined") {
      period = 0;
    }
    if (typeof amplitude == "undefined") {
      amplitude = 1;
    }
    var offset = 1.70158;

    if (t == 0) return 0;
    if (t == 1) return 1;

    if (!period) {
      period = 0.3;
    }

    if (amplitude < 1) {
      amplitude = 1;
      offset = period / 4;
    } else {
      offset = (period / (2 * Math.PI)) * Math.asin(1 / amplitude);
    }

    return (
      amplitude *
        Math.pow(2, -10 * t) *
        Math.sin(((t - offset) * (Math.PI * 2)) / period) +
      1
    );
  },
  InOutElastic: (t, amplitude, period) => {
    var offset;
    t = t / 2 - 1;
    // escape early for 0 and 1
    if (t === 0 || t === 1) {
      return t;
    }
    if (!period) {
      period = 0.44999999999999996;
    }
    if (!amplitude) {
      amplitude = 1;
      offset = period / 4;
    } else {
      offset = (period / (Math.PI * 2.0)) * Math.asin(1 / amplitude);
    }
    return (
      (amplitude *
        Math.pow(2, 10 * t) *
        Math.sin(((t - offset) * (Math.PI * 2)) / period)) /
      -2
    );
  },
  InExpo: (t) => {
    return Math.pow(2, 10 * (t - 1));
  },
  OutExpo: (t) => {
    return -Math.pow(2, -10 * t) + 1;
  },
  InOutExpo: (t) => {
    if (t == 0) return 0;
    if (t == 1) return 1;
    if ((t /= 0.5) < 1) return 0.5 * Math.pow(2, 10 * (t - 1));
    return 0.5 * (-Math.pow(2, -10 * --t) + 2);
  },
  InCirc: (t) => {
    return -1 * (Math.sqrt(1 - t * t) - 1);
  },
  OutCirc: (t) => {
    t = t - 1;
    return Math.sqrt(1 - t * t);
  },
  InOutCirc: (t) => {
    var c = 1;
    if ((t /= 0.5) < 1) return -0.5 * (Math.sqrt(1 - t * t) - 1);
    return 0.5 * (Math.sqrt(1 - (t -= 2) * t) + 1);
  },
  InBack: (t, overshoot) => {
    if (!overshoot && overshoot !== 0) {
      overshoot = 1.70158;
    }
    return 1 * t * t * ((overshoot + 1) * t - overshoot);
  },
  OutBack: (t, overshoot) => {
    if (!overshoot && overshoot !== 0) {
      overshoot = 1.70158;
    }
    t = t - 1;
    return t * t * ((overshoot + 1) * t + overshoot) + 1;
  },
  InOutBack: (t, overshoot) => {
    if (overshoot == undefined) overshoot = 1.70158;
    if ((t /= 0.5) < 1)
      return 0.5 * (t * t * (((overshoot *= 1.525) + 1) * t - overshoot));
    return (
      0.5 * ((t -= 2) * t * (((overshoot *= 1.525) + 1) * t + overshoot) + 2)
    );
  },
};

const outBounce = Easings.OutBounce;

export { Easings };
