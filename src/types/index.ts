
export interface BoundingBox {
  x: number; // Normalized top-left x-coordinate (0.0 to 1.0)
  y: number; // Normalized top-left y-coordinate (0.0 to 1.0)
  width: number; // Normalized width (0.0 to 1.0)
  height: number; // Normalized height (0.0 to 1.0)
}

export interface CountedObjectInstance {
  boundingBox: BoundingBox;
}

export interface CountedObject {
  name: string;
  count: number;
  instances: CountedObjectInstance[];
}

export interface ChatMessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string; // Optional: dataURI of an image associated with the message
  isError?: boolean; // Optional: flag for error messages
  countedObjects?: CountedObject[]; // Optional: for messages containing object counting results
}

export interface CameraFeedRefType {
  captureCurrentFrame: () => string | null;
  toggleFacingMode: () => void; // Added method to toggle camera facing mode
  drawHighlights: (objects: CountedObject[] | null) => void; // Method to draw/clear highlights
}

