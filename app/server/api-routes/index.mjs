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


// update an existing record by ID
router.put('/:id', async (req, res) => {
  try {
    const { id: recordId } = req.params; // URLパスからIDを取得
    const { gameTitle, playerNames, scoreItemNames, scores, numPlayers, numScoreItems, createdAt } = req.body; // リクエストボディから更新データを取得

    // Mongooseの findByIdAndUpdate を使用してレコードを更新
    // `id` フィールドで検索し、更新データを適用
    // `{ new: true }` は、更新後のドキュメントを返すように指定します
    const updatedRecord = await ScoreRecord.findOneAndUpdate(
      { id: recordId }, // 検索条件
      {
        gameTitle,
        playerNames,
        scoreItemNames,
        scores,
        numPlayers,
        numScoreItems,
        createdAt: createdAt, // createdAt は通常変更しないが、念のためボディから渡されたものを適用
        lastSavedAt: new Date(), // 更新日時を最新に設定
      },
      { new: true } // 更新後のドキュメントを返す
    );

    if (!updatedRecord) {
      return res.status(404).json({ message: 'Score record not found.' });
    }

    res.status(200).json({ message: 'Record updated successfully!', record: updatedRecord });
  } catch (error) {
    console.error('Error updating score record:', error);
    res.status(500).json({ message: 'Failed to update score record.', error: error.message });
  }
});

// POST /api/scores
// save new record
// Note: This route should only handle NEW record creation.
//       Updating existing records should be handled by the PUT /:id route.
router.post('/', async (req, res) => {
  try {
    // 新規レコードであることを前提に処理
    const { id, gameTitle, playerNames, scoreItemNames, scores, numPlayers, numScoreItems, createdAt, lastSavedAt } = req.body;

    // `id` が既に存在するかどうかはここではチェックせず、常に新しいレコードとして保存
    // フロントエンドで既にUUIDが生成されている前提
    const record = new ScoreRecord({
      id,
      gameTitle,
      playerNames,
      scoreItemNames,
      scores,
      numPlayers,
      numScoreItems,
      createdAt: createdAt || new Date(), // フロントエンドから提供されなければ現在時刻
      lastSavedAt: new Date() // 保存日時を最新に設定
    });
    await record.save(); // 新しいレコードを保存
    res.status(201).json({ message: 'Record saved successfully', record });
  } catch (error) {
    console.error('Error saving new record:', error);
    // MongoDBのE11000 duplicate key error をチェックし、より具体的なメッセージを返す
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A record with this ID already exists. Please try again with a new ID or use PUT to update.', error: error.message });
    }
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