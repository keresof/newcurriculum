export const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
