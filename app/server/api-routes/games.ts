// import express, { Request, Response, Router } from 'express';
// import Game from '../models/game.ts';

// //API endpoint that fetches game data.

// const router = express.Router();

// router.get('/', async (req: Request, res: Response) => {
//   try {
//     const games = await Game.find().sort({ title: 1 });
//     res.status(200).json(games);
//   } catch (error) {
//     console.error('Error fetching games:', error);
//     res.status(500).json({ message: 'Failed to fetch game data' });
//   }
// });

// export default router;