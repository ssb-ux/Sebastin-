export interface Message {
  role: 'user' | 'model';
  text: string;
  image?: string; // base64
  video?: string; // base64
  timestamp: number;
}

export interface ChatSession {
  id: string;
  messages: Message[];
}

export type Exercise = {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  completed: boolean;
};

export type Goal = 'Strength' | 'Hypertrophy' | 'Endurance' | 'Weight Loss';
