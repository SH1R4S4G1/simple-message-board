// app.js
const express = require('express');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const bodyParser = require('body-parser');

// 環境変数の読み込み
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// ミドルウェアの設定
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// データベース接続設定
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  }
};

// データベース接続プール作成
let pool;
async function initializePool() {
  try {
    pool = mysql.createPool(dbConfig);
    console.log('Database connection pool initialized');
  } catch (error) {
    console.error('Error initializing database connection pool:', error);
    process.exit(1);
  }
}

// メッセージ取得
async function getMessages() {
  try {
    const [rows] = await pool.execute('SELECT * FROM messages ORDER BY created_at DESC LIMIT 20');
    return rows;
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

// メッセージ追加
async function addMessage(content) {
  try {
    const [result] = await pool.execute(
      'INSERT INTO messages (content, created_at) VALUES (?, NOW())',
      [content]
    );
    return result;
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
}

// ルート設定
app.get('/', async (req, res) => {
  try {
    const messages = await getMessages();
    res.render('index', { messages });
  } catch (error) {
    res.status(500).send('サーバーエラーが発生しました');
  }
});

app.post('/post', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || content.trim() === '') {
      return res.status(400).send('メッセージを入力してください');
    }
    
    await addMessage(content);
    res.redirect('/');
  } catch (error) {
    res.status(500).send('メッセージの投稿に失敗しました');
  }
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// アプリの起動
async function startServer() {
  await initializePool();
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});