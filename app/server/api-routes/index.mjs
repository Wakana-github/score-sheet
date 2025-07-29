import express from 'express';
import ScoreRecord from '../models/score-record.mjs'; // ScoreRecord モデルをインポート

const router = express.Router();

// --- Define API End Pont ---

// GET /api/scores
// get all score records, sord by recent date 
router.get('/', async (req, res) => {
  try {
    const records = await ScoreRecord.find().sort({ lastSavedAt: -1 });
    res.status(200).json(records);
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/scores
// save new record, or update existed record 
router.post('/', async (req, res) => {
  try {
    const { id, gameTitle, playerNames, scoreItemNames, scores, numPlayers, numScoreItems, createdAt, lastSavedAt } = req.body;

    // check existed record with `id` 
    let record = await ScoreRecord.findOne({ id: id });

    if (record) {
      // update data if the record exist
      record.gameTitle = gameTitle;
      record.playerNames = playerNames;
      record.scoreItemNames = scoreItemNames;
      record.scores = scores;
      record.numPlayers = numPlayers;
      record.numScoreItems = numScoreItems;
      record.lastSavedAt = new Date(); // set current time updated 更新日時を最新に設定
      await record.save(); // save change
      res.status(200).json({ message: 'Record updated successfully', record });
    } else {
      // create new record when it doesn't exist
      record = new ScoreRecord({
        id,
        gameTitle,
        playerNames,
        scoreItemNames,
        scores,
        numPlayers,
        numScoreItems,
        createdAt: createdAt || new Date(), 
        lastSavedAt: new Date() // 
      });
      await record.save(); // save new record
      res.status(201).json({ message: 'Record saved successfully', record });
    }
  } catch (error) {
    console.error('Error saving/updating record:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/scores/:id
// / get a score record by ID
router.get('/:id', async (req, res) => {
  try {
    const record = await ScoreRecord.findOne({ id: req.params.id });
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.status(200).json(record);
  } catch (error) {
    console.error('Error fetching single record:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/scores/:id
//  delete a score record by IDす。
router.delete('/:id', async (req, res) => {
  try {
    const result = await ScoreRecord.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.status(200).json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router; 