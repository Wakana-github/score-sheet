// Interface for the score data as it is stored in the database.
export interface ScoreRecord {
  _id: string; // Unique ID generated on the application side (UUID)
  gameTitle: string;
  playerNames: string[];
  scoreItemNames: string[];
  scores: number[][]; // 2D array of numbers
  numPlayers: number;
  numScoreItems: number;
  createdAt: string; // ISO 8601 formatted string (e.g., "2023-10-27T10:00:00.000Z")
  lastSavedAt: string; // ISO 8601 formatted string
  userId: string;
  custom: boolean; 
  groupId?: string | null;
}

// Interface for the state of the score sheet in the form.
// Scores are stored as strings to handle direct user input from text fields.
export interface ScoreData {
  _id: string;
  gameTitle: string;
  playerNames: string[];
  scoreItemNames: string[];
  scores: string[][]; // 2D array of strings for input field values
  numPlayers: number;
  numScoreItems: number;
  createdAt: string;
  lastSavedAt: string;
  userId: string;
  custom: boolean;
  groupId?: string | null;
}

// Interface for groups 
export interface GroupData {
  _id: string; 
  groupName: string;
  members: string[]; 
  userId: string;
}

// Temporary interface for initializing a new sheet from a game template
export interface InitialGameData {
  id: number;
  title: string;
  column: number;
  row: number;
  score_items: string[];
}