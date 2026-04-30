const VISION_API_KEY = process.env.EXPO_PUBLIC_VISION_API_KEY;

export const VISION_URL = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`;
