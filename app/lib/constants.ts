// Max limits for players and score items to prevent excessive data size
export const MAX_SCORE_ITEMS = 15;
export const MAX_PLAYERS = 10;
export const MAX_TITLE_LENGTH = 35;
export const MAX_NAME_LENGTH = 30;
export const MAX_GROUP_NAME_LENGTH = 30;


// Regular expressions for input validation
export const allowedTitleRegex = /^[a-zA-Z0-9Ａ-Ｚａ-ｚ０-９\sぁ-んァ-ヶ一-龠ー\-_\.\/\(\)]*$/; 
export const allowedNameRegex = /^[a-zA-Z0-9Ａ-Ｚａ-ｚ０-９\sぁ-んァ-ヶ一-龠ー\-_\.\/\(\)\u{3000}-\u{303F}\u{3040}-\u{309F}\u{30A0}-\u{30FF}\u{4E00}-\u{9FFF}\u{FF01}-\u{FF5E}\u{1F000}-\u{1FA6F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F300}-\u{1F5FF}\u{25A0}-\u{25FF}\u{2B00}-\u{2BFF}\u{FE0F}]*$/u;
export const allowedScoreRegex = /^[0-9\-]*$/;
export const allowedGroupRegex = /^[a-zA-Z0-9Ａ-Ｚａ-ｚ０-９\sぁ-んァ-ヶ一-龠ー\-_\.\/\(\)]*$/; 

// Record limit (records.ts)
export const MAX_FREE_RECORDS = 5;
export const MAX_ACTIVE_RECORDS = 500;
export const PAGENATION_LIMIT = 10;

