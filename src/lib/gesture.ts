import { GestureRecognizer, FilesetResolver } from '@mediapipe/tasks-vision';

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface GestureResult {
  gesture: string;
  score: number;
}

export const initGestureRecognizer = async (): Promise<GestureRecognizer> => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );
  
  return await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numHands: 1
  });
};

export const detectGesture = (
  video: HTMLVideoElement,
  gestureRecognizer: GestureRecognizer
): {
  handPresent: boolean;
  landmarks?: Landmark[][];
  detectedGesture?: string;
  confidenceScore?: number;
} => {
  const nowInMs = Date.now();
  const results = gestureRecognizer.recognizeForVideo(video, nowInMs);
  
  const handPresent = results.landmarks && results.landmarks.length > 0;
  
  if (!handPresent) {
    return { handPresent };
  }
  
  let detectedGesture, confidenceScore;
  
  if (results.gestures && results.gestures.length > 0) {
    detectedGesture = results.gestures[0][0].categoryName;
    confidenceScore = Math.round(results.gestures[0][0].score * 100);
  }
  
  return {
    handPresent,
    landmarks: results.landmarks,
    detectedGesture,
    confidenceScore
  };
};

export const mapGestureToGameSymbol = (gesture: string | null): string => {
  if (!gesture) return null; // Default to rock
  
  switch (gesture) {
    case 'Open_Palm':
      return '✋'; // Paper
    case 'Victory':
    case 'ILoveYou':
      return '✌️'; // Scissors
    case 'Closed_Fist':
      return '✊'; // Rock
    default:
      return null;
  }
};

export const drawHandLandmarks = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  landmarks: Landmark[][]
) => {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Define hand connections
  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4],  // thumb
    [0, 5], [5, 6], [6, 7], [7, 8],  // index finger
    [0, 9], [9, 10], [10, 11], [11, 12],  // middle finger
    [0, 13], [13, 14], [14, 15], [15, 16],  // ring finger
    [0, 17], [17, 18], [18, 19], [19, 20],  // pinky
    [0, 5], [5, 9], [9, 13], [13, 17]  // palm
  ];
  
  landmarks.forEach(handLandmarks => {
    // Draw connections
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 3;
    
    for (const [idx1, idx2] of connections) {
      const landmark1 = handLandmarks[idx1];
      const landmark2 = handLandmarks[idx2];
      
      if (landmark1 && landmark2) {
        ctx.beginPath();
        ctx.moveTo(landmark1.x * canvas.width, landmark1.y * canvas.height);
        ctx.lineTo(landmark2.x * canvas.width, landmark2.y * canvas.height);
        ctx.stroke();
      }
    }
    
    // Draw landmark points
    ctx.fillStyle = '#FF0000';
    handLandmarks.forEach(landmark => {
      ctx.beginPath();
      ctx.arc(
        landmark.x * canvas.width,
        landmark.y * canvas.height,
        5,
        0,
        2 * Math.PI
      );
      ctx.fill();
    });
  });
};
