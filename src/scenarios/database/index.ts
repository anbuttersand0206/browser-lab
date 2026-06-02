export interface DatabaseScenario {
  id: string
  title: string
  description: string
  initialSQL: string
  hints: string[]
  solution: string
}

const scenario1: DatabaseScenario = {
  id: 'basic-crud',
  title: 'はじめてのCRUD',
  description: `## はじめてのCRUD

テーブルの作成、データの挿入、そして検索の基本を学びましょう。

### 課題

以下の手順でSQLを実行してください：

1. **テーブル作成**: \`users\` テーブルを作成する
   - \`id\`: 主キー（SERIAL）
   - \`name\`: 名前（VARCHAR(100)、NOT NULL）
   - \`email\`: メールアドレス（VARCHAR(255)、UNIQUE）
   - \`age\`: 年齢（INTEGER）
   - \`created_at\`: 作成日時（TIMESTAMP、デフォルト現在時刻）

2. **INSERT**: 3人以上のユーザーを挿入する

3. **SELECT**: 以下のクエリを試す
   - 全件取得
   - 年齢が20歳以上のユーザーを取得
   - 名前でソートして取得

### ポイント

- \`CREATE TABLE\` の基本構文
- \`INSERT INTO\` の使い方
- \`SELECT\` + \`WHERE\` + \`ORDER BY\` の組み合わせ
`,
  initialSQL: `-- 1. テーブルを作成してください
CREATE TABLE users (
  -- TODO: カラムを定義してください
);

-- 2. ユーザーを挿入してください
INSERT INTO users (name, email, age) VALUES
  -- TODO: データを挿入してください
;

-- 3. データを確認してください
SELECT * FROM users;
`,
  hints: [
    '主キーは `id SERIAL PRIMARY KEY` で自動採番できます',
    '`NOT NULL` を追加すると NULL 値を禁止できます',
    '`UNIQUE` を追加すると重複を禁止できます',
    '`DEFAULT CURRENT_TIMESTAMP` でデフォルト値を現在時刻にできます',
    'INSERTは `INSERT INTO users (name, email, age) VALUES (\'Alice\', \'alice@example.com\', 25)` です',
  ],
  solution: `-- 1. テーブル作成
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  age INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. データ挿入
INSERT INTO users (name, email, age) VALUES
  ('Alice', 'alice@example.com', 25),
  ('Bob', 'bob@example.com', 17),
  ('Charlie', 'charlie@example.com', 30),
  ('Diana', 'diana@example.com', 22);

-- 3a. 全件取得
SELECT * FROM users;

-- 3b. 20歳以上のみ
SELECT * FROM users WHERE age >= 20;

-- 3c. 名前でソート
SELECT * FROM users ORDER BY name ASC;
`,
}

const scenario2: DatabaseScenario = {
  id: 'index-explain',
  title: 'インデックスの効果を見る',
  description: `## インデックスの効果を見る

\`EXPLAIN ANALYZE\` を使って実行計画を比較し、インデックスの効果を確認しましょう。

### 課題

1. 大量データを持つ \`products\` テーブルを作成する
2. インデックスなしで \`EXPLAIN ANALYZE\` を実行する
3. インデックスを追加する
4. インデックスありで \`EXPLAIN ANALYZE\` を再実行し、比較する

### 手順

まず以下のSQLを実行して10,000件のデータを作成してください：

\`\`\`sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2),
  category TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (name, price, category)
SELECT
  'Product ' || i,
  (random() * 10000)::NUMERIC(10,2),
  (ARRAY['electronics','clothing','food','books'])[floor(random()*4+1)]
FROM generate_series(1, 10000) AS t(i);
\`\`\`

その後、インデックスなし・ありで実行計画を比較してください。

### ポイント

- \`EXPLAIN ANALYZE\` の読み方
- Sequential Scan と Index Scan の違い
- インデックスが効果的なケースとそうでないケース
`,
  initialSQL: `-- Step 1: テーブルとデータを作成
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2),
  category TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (name, price, category)
SELECT
  'Product ' || i,
  (random() * 10000)::NUMERIC(10,2),
  (ARRAY['electronics','clothing','food','books'])[floor(random()*4+1)]
FROM generate_series(1, 10000) AS t(i);

-- Step 2: インデックスなしで実行計画を確認
EXPLAIN ANALYZE SELECT * FROM products WHERE category = 'electronics';

-- Step 3: インデックスを追加
-- TODO: categoryカラムにインデックスを追加してください

-- Step 4: インデックスありで実行計画を再確認
EXPLAIN ANALYZE SELECT * FROM products WHERE category = 'electronics';
`,
  hints: [
    'インデックス作成は `CREATE INDEX idx_products_category ON products(category)` です',
    '`EXPLAIN ANALYZE` の出力で `Seq Scan` と `Index Scan` の違いを見てください',
    '`cost=` の最初の数値は起動コスト、2番目は総コストです',
    '`actual time=` で実際の実行時間（ミリ秒）を確認できます',
    'データ量が少ないとインデックスが使われないことがあります（10,000件以上推奨）',
  ],
  solution: `-- テーブルとデータ作成
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2),
  category TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (name, price, category)
SELECT
  'Product ' || i,
  (random() * 10000)::NUMERIC(10,2),
  (ARRAY['electronics','clothing','food','books'])[floor(random()*4+1)]
FROM generate_series(1, 10000) AS t(i);

-- インデックスなし
EXPLAIN ANALYZE SELECT * FROM products WHERE category = 'electronics';

-- インデックス追加
CREATE INDEX idx_products_category ON products(category);

-- インデックスあり
EXPLAIN ANALYZE SELECT * FROM products WHERE category = 'electronics';

-- priceにもインデックスを追加して比較
CREATE INDEX idx_products_price ON products(price);
EXPLAIN ANALYZE SELECT * FROM products WHERE price < 1000;
`,
}

const scenario3: DatabaseScenario = {
  id: 'join-queries',
  title: 'JOINを使いこなす',
  description: `## JOINを使いこなす

複数テーブルの結合・集計クエリを実践的に学びましょう。

### 課題

EC サイトのデータモデルを使って、様々な JOIN を練習します。

**テーブル構成**:
- \`customers\`: 顧客
- \`orders\`: 注文
- \`order_items\`: 注文明細
- \`products\`: 商品

### 実装する JOIN

1. **INNER JOIN**: 注文のある顧客と注文情報を結合して表示
2. **LEFT JOIN**: 注文がない顧客も含めて表示
3. **集計**: 顧客ごとの注文合計金額を計算
4. **複数 JOIN**: 顧客 → 注文 → 明細 → 商品を結合して明細を表示
5. **サブクエリ**: 平均以上の注文金額の顧客を取得

### ポイント

- INNER JOIN と LEFT JOIN の違い
- \`GROUP BY\` と集計関数（\`SUM\`, \`COUNT\`, \`AVG\`）
- \`HAVING\` 句でグループに条件を付ける
- サブクエリの使い方
`,
  initialSQL: `-- テーブル作成とデータ挿入
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255)
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  price NUMERIC(10,2) NOT NULL
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending'
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL
);

-- データ挿入
INSERT INTO customers (name, email) VALUES
  ('Alice', 'alice@example.com'),
  ('Bob', 'bob@example.com'),
  ('Charlie', 'charlie@example.com'),
  ('Diana', 'diana@example.com');  -- 注文なし

INSERT INTO products (name, price) VALUES
  ('ノートPC', 89800),
  ('マウス', 3500),
  ('キーボード', 12000),
  ('モニター', 45000);

INSERT INTO orders (customer_id, status) VALUES
  (1, 'completed'),
  (1, 'completed'),
  (2, 'pending'),
  (3, 'completed');

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
  (1, 1, 1, 89800),
  (1, 2, 2, 3500),
  (2, 3, 1, 12000),
  (3, 2, 1, 3500),
  (3, 4, 2, 45000),
  (4, 1, 1, 89800),
  (4, 3, 1, 12000);

-- TODO: 1. INNER JOIN で注文のある顧客と注文を表示


-- TODO: 2. LEFT JOIN で注文のない顧客も含めて表示


-- TODO: 3. 顧客ごとの注文合計金額（GROUP BY + SUM）


-- TODO: 4. 顧客→注文→明細→商品の詳細表示


-- TODO: 5. 平均以上の注文金額の顧客（サブクエリまたはHAVING）
`,
  hints: [
    'INNER JOINは両方のテーブルに存在するデータのみ返します',
    'LEFT JOINは左テーブルの全行を返し、右テーブルに一致がなければNULLになります',
    '`GROUP BY customer_id` で顧客ごとにグループ化し、`SUM(unit_price * quantity)` で合計を計算します',
    '4つのテーブルを結合するには `JOIN ... ON ... JOIN ... ON ...` を連続して書きます',
    'サブクエリは `WHERE total >= (SELECT AVG(...) FROM ...)` の形で使えます',
  ],
  solution: `-- セットアップ（上のSQLを実行済みの前提）

-- 1. INNER JOIN
SELECT
  c.name AS 顧客名,
  o.id AS 注文ID,
  o.status AS ステータス,
  o.ordered_at AS 注文日時
FROM customers c
INNER JOIN orders o ON c.id = o.customer_id
ORDER BY c.name, o.id;

-- 2. LEFT JOIN（注文なし顧客も含む）
SELECT
  c.name AS 顧客名,
  COUNT(o.id) AS 注文件数
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name
ORDER BY c.name;

-- 3. 顧客ごとの注文合計金額
SELECT
  c.name AS 顧客名,
  COUNT(DISTINCT o.id) AS 注文件数,
  SUM(oi.quantity * oi.unit_price) AS 合計金額
FROM customers c
INNER JOIN orders o ON c.id = o.customer_id
INNER JOIN order_items oi ON o.id = oi.order_id
GROUP BY c.id, c.name
ORDER BY 合計金額 DESC;

-- 4. 注文明細の詳細表示
SELECT
  c.name AS 顧客名,
  o.id AS 注文ID,
  p.name AS 商品名,
  oi.quantity AS 数量,
  oi.unit_price AS 単価,
  oi.quantity * oi.unit_price AS 小計
FROM customers c
INNER JOIN orders o ON c.id = o.customer_id
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN products p ON oi.product_id = p.id
ORDER BY o.id, p.name;

-- 5. 平均以上の注文金額の顧客
SELECT
  c.name AS 顧客名,
  SUM(oi.quantity * oi.unit_price) AS 合計金額
FROM customers c
INNER JOIN orders o ON c.id = o.customer_id
INNER JOIN order_items oi ON o.id = oi.order_id
GROUP BY c.id, c.name
HAVING SUM(oi.quantity * oi.unit_price) >= (
  SELECT AVG(total) FROM (
    SELECT SUM(oi2.quantity * oi2.unit_price) AS total
    FROM orders o2
    INNER JOIN order_items oi2 ON o2.id = oi2.order_id
    GROUP BY o2.customer_id
  ) sub
)
ORDER BY 合計金額 DESC;
`,
}

const scenario4: DatabaseScenario = {
  id: 'transactions',
  title: 'トランザクションとロールバック',
  description: `## トランザクションとロールバック

\`BEGIN\` / \`COMMIT\` / \`ROLLBACK\` を使い、複数の操作をひとつの単位として扱う方法を学びましょう。
銀行振込のように「引き落としと入金は必ず両方成功する」ことを保証するのがトランザクションの役割です。

### 課題

銀行口座テーブルを使って、以下を実施してください：

1. テーブルとデータを作成する
2. \`BEGIN\` でトランザクションを開始し、送金処理を実行する（コミット）
3. 残高不足を引き起こしてトランザクションをロールバックする
4. \`SAVEPOINT\` で部分的なロールバックを試す

### ポイント

- トランザクション内の変更は \`COMMIT\` するまで他のセッションには見えない
- エラー発生後に \`ROLLBACK\` すると、トランザクション開始前の状態に戻る
- \`SAVEPOINT\` を使うと途中ポイントまで戻ることができる
- PGLite はシングルセッションのため、上記の「他のセッション」という挙動の確認は省略します
`,
  initialSQL: `-- Step 1: テーブル作成とデータ挿入
CREATE TABLE accounts (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  balance NUMERIC(12,2) NOT NULL CHECK (balance >= 0)
);

INSERT INTO accounts (name, balance) VALUES
  ('Alice', 10000),
  ('Bob',    5000);

SELECT * FROM accounts;

-- Step 2: 正常な送金（AliceからBobへ3000円）
-- BEGIN;
--   UPDATE accounts SET balance = balance - 3000 WHERE name = 'Alice';
--   UPDATE accounts SET balance = balance + 3000 WHERE name = 'Bob';
-- COMMIT;
-- SELECT * FROM accounts;

-- Step 3: 残高不足でロールバック
-- BEGIN;
--   UPDATE accounts SET balance = balance - 99999 WHERE name = 'Bob';
--   -- CHECK制約違反が発生→ロールバック
-- ROLLBACK;
-- SELECT * FROM accounts;

-- Step 4: SAVEPOINT
-- BEGIN;
--   UPDATE accounts SET balance = balance - 1000 WHERE name = 'Alice';
--   SAVEPOINT before_bob;
--   UPDATE accounts SET balance = balance - 99999 WHERE name = 'Bob'; -- これを取り消したい
--   ROLLBACK TO SAVEPOINT before_bob;
--   COMMIT;
-- SELECT * FROM accounts;
`,
  hints: [
    '`BEGIN;` でトランザクションを開始します。`COMMIT;` で確定、`ROLLBACK;` で取り消しです',
    'コメントアウトされたブロックを1つずつ有効にして実行すると、トランザクションの動作を段階的に確認できます',
    '`CHECK (balance >= 0)` 制約があるため、残高を負にする UPDATE は自動的にエラーになります',
    '`SAVEPOINT 名前;` で途中ポイントを作成し、`ROLLBACK TO SAVEPOINT 名前;` でそこまで戻せます',
    '`ROLLBACK TO SAVEPOINT` の後も `COMMIT;` または `ROLLBACK;` でトランザクションを終了する必要があります',
  ],
  solution: `-- セットアップ
CREATE TABLE accounts (
  id      SERIAL PRIMARY KEY,
  name    VARCHAR(100) NOT NULL,
  balance NUMERIC(12,2) NOT NULL CHECK (balance >= 0)
);
INSERT INTO accounts (name, balance) VALUES ('Alice', 10000), ('Bob', 5000);

-- 正常な送金：AliceからBobへ3000円
BEGIN;
  UPDATE accounts SET balance = balance - 3000 WHERE name = 'Alice';
  UPDATE accounts SET balance = balance + 3000 WHERE name = 'Bob';
COMMIT;
SELECT * FROM accounts;
-- Alice: 7000 / Bob: 8000

-- 残高不足によるロールバック
BEGIN;
  UPDATE accounts SET balance = balance - 99999 WHERE name = 'Bob';
ROLLBACK;
SELECT * FROM accounts;
-- Bobの残高は変わらず 8000 のまま

-- SAVEPOINTによる部分ロールバック
BEGIN;
  UPDATE accounts SET balance = balance - 1000 WHERE name = 'Alice';
  SAVEPOINT before_bob;
  UPDATE accounts SET balance = balance - 99999 WHERE name = 'Bob';  -- これだけ取り消す
  ROLLBACK TO SAVEPOINT before_bob;
COMMIT;
SELECT * FROM accounts;
-- Alice: 6000（-1000は確定）/ Bob: 8000（変わらず）
`,
}

export const databaseScenarios: DatabaseScenario[] = [
  scenario1,
  scenario2,
  scenario3,
  scenario4,
]
