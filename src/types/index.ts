
export interface ChatMessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string; // Optional: dataURI of an image associated with the message
  isError?: boolean; // Optional: flag for error messages
}
