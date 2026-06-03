import type { DbClearCriteria } from '../../lib/clearJudge'

export interface DatabaseScenario {
  id: string
  title: string
  description: string
  initialSQL: string
  hints: string[]
  solution: string
  // 自動採点の判定条件。未定義のシナリオはクリア判定を行わない。
  clearCriteria?: DbClearCriteria
}

export type { DbClearCriteria }

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
  // 3人以上挿入して SELECT できていればクリア（Alice・Bob・Charlie 全員の名前が見えること）
  clearCriteria: { minRowCount: 3, requiredCellValues: ['Alice', 'Bob'] },
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
  // EXPLAIN 結果に "Index Scan" が含まれていればインデックスが機能しているクリア証拠
  clearCriteria: { requiredCellValues: ['Index Scan'] },
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
  // JOIN が正しく動作していれば Alice・Charlie 等の顧客名が複数行で取得できる
  clearCriteria: { minRowCount: 2, requiredCellValues: ['Alice'] },
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
  // トランザクション後に SELECT * FROM accounts で Alice・Bob の残高が確認できていればクリア
  clearCriteria: { minRowCount: 2, requiredCellValues: ['Alice', 'Bob'] },
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

const scenario5: DatabaseScenario = {
  id: 'window-functions',
  title: 'ウィンドウ関数を使いこなす',
  description: `## ウィンドウ関数を使いこなす

\`OVER\` 句を使ったウィンドウ関数は、グループ集計では消えてしまう行の詳細を保ちながら、
順位・累計・前後の値などを計算できる強力な機能です。

### 課題

売上データを使って、以下を実装してください：

1. **ROW_NUMBER**: 全体の売上を高い順に並べ、通し番号を付ける
2. **RANK / DENSE_RANK**: カテゴリ内での売上ランキング（同率の扱いを比較する）
3. **SUM OVER**: 月ごとの売上に加え、累計売上を同時に表示する
4. **LAG / LEAD**: 前月・翌月の売上を隣に並べて前後比較できるようにする
5. **PARTITION BY**: カテゴリごとに独立したランキングを付ける

### ポイント

- \`OVER()\` だけで全行を対象にしたウィンドウになる
- \`PARTITION BY\` でグループを分けても行は消えない（GROUP BY との違い）
- \`ORDER BY\` を \`OVER\` の中に書くと順位・累計の計算基準になる
- \`ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\` で累計を計算する
`,
  initialSQL: `-- テーブル作成とデータ挿入
CREATE TABLE sales (
  id         SERIAL PRIMARY KEY,
  month      DATE NOT NULL,
  category   TEXT NOT NULL,
  amount     NUMERIC(12,2) NOT NULL
);

INSERT INTO sales (month, category, amount) VALUES
  ('2024-01-01', 'electronics', 120000),
  ('2024-01-01', 'furniture',    45000),
  ('2024-01-01', 'books',         8000),
  ('2024-02-01', 'electronics',  98000),
  ('2024-02-01', 'furniture',    62000),
  ('2024-02-01', 'books',        11000),
  ('2024-03-01', 'electronics', 145000),
  ('2024-03-01', 'furniture',    38000),
  ('2024-03-01', 'books',         9500);

-- TODO: 1. 全体の売上を高い順に並べて ROW_NUMBER で通し番号を付ける


-- TODO: 2. カテゴリ内で RANK と DENSE_RANK を比較する（同率が発生するようにデータを工夫して）


-- TODO: 3. 月ごとの売上と、その時点までの累計売上を SUM OVER で表示する


-- TODO: 4. 月・カテゴリごとに前月の売上を LAG で隣に並べる


-- TODO: 5. PARTITION BY category で、カテゴリ内ランキングを付ける
`,
  hints: [
    '`ROW_NUMBER() OVER (ORDER BY amount DESC)` で売上の高い順に番号が振られます',
    '`RANK` は同率に同じ番号を振り次を飛ばします（1,1,3）。`DENSE_RANK` は飛ばしません（1,1,2）',
    '累計は `SUM(amount) OVER (ORDER BY month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)` で計算できます',
    '`LAG(amount, 1) OVER (PARTITION BY category ORDER BY month)` で前の行の値を取得できます',
    '`PARTITION BY category ORDER BY amount DESC` とすると、カテゴリごとに独立したランキングになります',
  ],
  // 9件の売上データすべてを含むウィンドウ関数の結果が得られていればクリア
  clearCriteria: { minRowCount: 9 },
  solution: `-- テーブル作成（省略）

-- 1. ROW_NUMBER：全体の通し番号
SELECT
  ROW_NUMBER() OVER (ORDER BY amount DESC) AS row_num,
  month,
  category,
  amount
FROM sales
ORDER BY amount DESC;

-- 2. RANK vs DENSE_RANK の比較
SELECT
  category,
  amount,
  RANK()       OVER (ORDER BY amount DESC) AS rank,
  DENSE_RANK() OVER (ORDER BY amount DESC) AS dense_rank
FROM sales
ORDER BY amount DESC;

-- 3. 月ごとの売上と累計（全カテゴリ合算）
SELECT
  month,
  SUM(amount) AS monthly_total,
  SUM(SUM(amount)) OVER (
    ORDER BY month
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS cumulative_total
FROM sales
GROUP BY month
ORDER BY month;

-- 4. 前月との比較（LAG）
SELECT
  month,
  category,
  amount,
  LAG(amount, 1) OVER (PARTITION BY category ORDER BY month) AS prev_month_amount,
  amount - COALESCE(LAG(amount, 1) OVER (PARTITION BY category ORDER BY month), 0) AS diff
FROM sales
ORDER BY category, month;

-- 5. カテゴリ内ランキング
SELECT
  category,
  month,
  amount,
  RANK() OVER (PARTITION BY category ORDER BY amount DESC) AS rank_in_category
FROM sales
ORDER BY category, rank_in_category;
`,
}

const scenario6: DatabaseScenario = {
  id: 'cte-with',
  title: 'CTEで複雑なクエリを整理する',
  description: `## CTEで複雑なクエリを整理する

\`WITH\` 句（Common Table Expression）を使うと、複雑なクエリを「名前付きの一時ビュー」に分割して
可読性を高められます。サブクエリのネストが深くなりそうなときに特に有効です。

### 課題

売上データを使って、以下のクエリを CTE で実装してください：

1. **基本 CTE**: 月ごとの売上合計を CTE で定義し、さらに絞り込む
2. **CTE の連鎖**: 「売上上位カテゴリ」と「月別平均」を別々の CTE に定義して結合する
3. **再帰 CTE**: 1〜10 の連番を再帰 CTE で生成する（番外編）

### ポイント

- CTE は \`WITH cte_name AS (SELECT ...)\` の形で定義する
- 複数の CTE は \`,\` で区切って並べられる
- CTE は定義した \`SELECT\` の中でのみ使える（一時的なスコープ）
- サブクエリをネストするより CTE で名前を付けた方が読み手の理解コストが下がる
- 再帰 CTE は \`WITH RECURSIVE\` を使う
`,
  initialSQL: `-- テーブル作成とデータ挿入（実行してから課題に進んでください）
CREATE TABLE sales_data (
  id        SERIAL PRIMARY KEY,
  sale_date DATE NOT NULL,
  category  TEXT NOT NULL,
  amount    NUMERIC(12,2) NOT NULL,
  region    TEXT NOT NULL
);

INSERT INTO sales_data (sale_date, category, amount, region) VALUES
  ('2024-01-15', 'electronics',  120000, 'tokyo'),
  ('2024-01-20', 'furniture',     45000, 'osaka'),
  ('2024-01-25', 'books',          8000, 'tokyo'),
  ('2024-02-10', 'electronics',   98000, 'tokyo'),
  ('2024-02-14', 'furniture',     62000, 'nagoya'),
  ('2024-02-28', 'books',         11000, 'osaka'),
  ('2024-03-05', 'electronics',  145000, 'tokyo'),
  ('2024-03-12', 'furniture',     38000, 'tokyo'),
  ('2024-03-20', 'books',          9500, 'nagoya'),
  ('2024-03-25', 'electronics',   76000, 'osaka');

-- TODO: 1. 月ごとの売上合計を CTE で定義し、合計が 100,000 以上の月のみ取得する
-- ヒント: WITH monthly_totals AS (SELECT DATE_TRUNC('month', sale_date) AS month, ...)


-- TODO: 2. 「カテゴリ別合計」と「全体平均」を別々の CTEに定義し、
--       平均以上の売上を持つカテゴリだけを取得する


-- TODO: 3. 再帰 CTE で 1〜10 の連番を生成する
-- ヒント: WITH RECURSIVE nums AS (SELECT 1 AS n UNION ALL SELECT n+1 FROM nums WHERE n < 10)
`,
  hints: [
    '`WITH monthly AS (SELECT DATE_TRUNC(\'month\', sale_date) AS month, SUM(amount) AS total FROM sales_data GROUP BY 1)` のように定義します',
    '複数CTEは `WITH cte1 AS (...), cte2 AS (...)` と「,」で続けて書きます',
    '平均との比較: `HAVING SUM(amount) >= (SELECT AVG(total) FROM cte_name)` の形で使えます',
    '再帰CTE: `WITH RECURSIVE nums AS (SELECT 1 AS n UNION ALL SELECT n+1 FROM nums WHERE n < 10) SELECT * FROM nums`',
  ],
  // CTE が正しく動作していれば月別合計や再帰結果など少なくとも 1 行以上が返る
  clearCriteria: { minRowCount: 1 },
  solution: `-- テーブル・データ作成は省略（上のSQLを実行済みの前提）

-- 1. 月ごとの売上合計（CTE）→ 10万以上の月だけ抽出
WITH monthly_totals AS (
  SELECT
    DATE_TRUNC('month', sale_date) AS month,
    SUM(amount) AS total
  FROM sales_data
  GROUP BY DATE_TRUNC('month', sale_date)
)
SELECT
  TO_CHAR(month, 'YYYY-MM') AS 年月,
  total AS 売上合計
FROM monthly_totals
WHERE total >= 100000
ORDER BY month;

-- 2. カテゴリ別合計と全体平均を並べ、平均以上のカテゴリを取得
WITH category_totals AS (
  SELECT
    category,
    SUM(amount) AS total
  FROM sales_data
  GROUP BY category
),
overall_avg AS (
  SELECT AVG(total) AS avg_total
  FROM category_totals
)
SELECT
  ct.category AS カテゴリ,
  ct.total    AS 売上合計,
  ROUND(oa.avg_total, 2) AS 全体平均
FROM category_totals ct
CROSS JOIN overall_avg oa
WHERE ct.total >= oa.avg_total
ORDER BY ct.total DESC;

-- 3. 再帰CTEで1〜10の連番を生成
WITH RECURSIVE nums AS (
  SELECT 1 AS n          -- 初期行
  UNION ALL
  SELECT n + 1           -- 再帰ステップ
  FROM nums
  WHERE n < 10           -- 終了条件（これがないと無限ループ）
)
SELECT n FROM nums;
`,
}

const scenario7: DatabaseScenario = {
  id: 'views',
  title: 'VIEWでクエリを再利用する',
  description: `## VIEWでクエリを再利用する

\`VIEW\`（ビュー）は、クエリに名前を付けて保存し、テーブルのように使える仮想テーブルです。
複雑な JOIN や集計を何度も書く代わりにビューに定義し、シンプルな \`SELECT\` で再利用できます。

### 課題

社員・部署データを使って、以下を実装してください：

1. **基本VIEW**: 部署名を含む社員一覧ビューを作成する
2. **集計VIEW**: 部署ごとの人数・平均給与を集計するビューを作成する
3. **ビューの更新**: \`CREATE OR REPLACE VIEW\` でビューを更新する
4. **ビューの削除**: \`DROP VIEW\` で不要なビューを削除する

### ポイント

- ビューの実体はクエリ定義であり、データはテーブル側に保持される
- \`CREATE OR REPLACE VIEW\` で SELECT リストの列数・順序を保ったまま更新できる
  （列の追加・削除は互換性がないため、その場合は DROP → CREATE が必要）
- 単純なビューは UPDATE / DELETE が通ることもあるが、集計ビューは読み取り専用
`,
  initialSQL: `-- テーブル作成とデータ挿入
CREATE TABLE departments (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  budget NUMERIC(12,2)
);

CREATE TABLE employees (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  department_id INTEGER REFERENCES departments(id),
  salary        NUMERIC(10,2) NOT NULL,
  hired_at      DATE DEFAULT CURRENT_DATE,
  is_active     BOOLEAN DEFAULT TRUE
);

INSERT INTO departments (name, budget) VALUES
  ('エンジニアリング', 5000000),
  ('マーケティング',   2000000),
  ('人事',             1500000),
  ('営業',             3000000);

INSERT INTO employees (name, department_id, salary, hired_at) VALUES
  ('Alice',   1, 650000, '2021-04-01'),
  ('Bob',     1, 580000, '2022-07-15'),
  ('Charlie', 1, 720000, '2020-01-10'),
  ('Diana',   2, 520000, '2022-04-01'),
  ('Eve',     2, 480000, '2023-10-01'),
  ('Frank',   3, 450000, '2021-09-01'),
  ('Grace',   4, 600000, '2020-06-01'),
  ('Hiro',    4, 550000, '2023-01-15');

-- TODO: 1. 部署名を含む社員一覧ビューを作成してください
-- ビュー名: v_employee_details
-- 含める列: 社員ID, 社員名, 部署名, 給与, 入社日


-- TODO: 2. 部署ごとの人数と平均給与を集計するビューを作成してください
-- ビュー名: v_dept_summary
-- 含める列: 部署名, 社員数, 平均給与（小数点以下2桁）, 予算


-- TODO: 3. v_employee_details を使って、給与 600,000 以上の社員を検索してください


-- TODO: 4. CREATE OR REPLACE VIEW で v_dept_summary に予算消化率を追加してください
-- 予算消化率 = (社員数 × 平均給与) / 予算 × 100

`,
  hints: [
    '`CREATE VIEW v_employee_details AS SELECT e.id, e.name, d.name AS dept_name, e.salary, e.hired_at FROM employees e JOIN departments d ON e.department_id = d.id` でビューを作れます',
    '集計ビュー: `CREATE VIEW v_dept_summary AS SELECT d.name, COUNT(e.id) AS headcount, ROUND(AVG(e.salary),2) AS avg_salary FROM departments d LEFT JOIN employees e ON d.id = e.department_id GROUP BY d.id, d.name, d.budget`',
    'ビューはテーブルと同じように `SELECT * FROM v_employee_details WHERE salary >= 600000` で使えます',
    '`CREATE OR REPLACE VIEW` は既存ビューの SELECT リストの列数・型を変えずに定義を更新できます。列を追加する場合は末尾に追加するか DROP してから CREATE します',
  ],
  // ビューが正しく作成されていれば社員名（Alice 等）が含まれる行が 3 件以上取得できる
  clearCriteria: { minRowCount: 3, requiredCellValues: ['Alice'] },
  solution: `-- 1. 社員詳細ビュー（部署名JOIN込み）
CREATE VIEW v_employee_details AS
SELECT
  e.id,
  e.name      AS 社員名,
  d.name      AS 部署名,
  e.salary    AS 給与,
  e.hired_at  AS 入社日
FROM employees e
JOIN departments d ON e.department_id = d.id
WHERE e.is_active = TRUE;

-- 2. 部署別集計ビュー
CREATE VIEW v_dept_summary AS
SELECT
  d.name                          AS 部署名,
  COUNT(e.id)                     AS 社員数,
  ROUND(AVG(e.salary), 2)         AS 平均給与,
  d.budget                        AS 予算
FROM departments d
LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = TRUE
GROUP BY d.id, d.name, d.budget
ORDER BY d.name;

-- 3. ビューを使った検索
SELECT * FROM v_employee_details
WHERE 給与 >= 600000
ORDER BY 給与 DESC;

SELECT * FROM v_dept_summary;

-- 4. ビューに予算消化率列を追加（末尾への追加なので OR REPLACE で OK）
CREATE OR REPLACE VIEW v_dept_summary AS
SELECT
  d.name                                    AS 部署名,
  COUNT(e.id)                               AS 社員数,
  ROUND(AVG(e.salary), 2)                   AS 平均給与,
  d.budget                                  AS 予算,
  ROUND(COUNT(e.id) * AVG(e.salary) / d.budget * 100, 1) AS 予算消化率
FROM departments d
LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = TRUE
GROUP BY d.id, d.name, d.budget
ORDER BY d.name;

SELECT * FROM v_dept_summary;

-- 不要になったビューの削除
-- DROP VIEW v_dept_summary;
-- DROP VIEW v_employee_details;
`,
}

const scenario8: DatabaseScenario = {
  id: 'case-expressions',
  title: 'CASE式で条件分岐を実装する',
  description: `## CASE式で条件分岐を実装する

\`CASE\` 式はSQL における条件分岐で、プログラミング言語の \`if-else\` に相当します。
SELECT の列値の変換、ORDER BY の並び順制御、集計の条件付きカウントなど幅広く使えます。

### CASE の 2 つの構文

**単純 CASE**（値との比較）
\`\`\`sql
CASE status
  WHEN 'active'   THEN '有効'
  WHEN 'inactive' THEN '無効'
  ELSE '不明'
END
\`\`\`

**検索 CASE**（条件式）
\`\`\`sql
CASE
  WHEN score >= 90 THEN 'A'
  WHEN score >= 70 THEN 'B'
  ELSE 'C'
END
\`\`\`

### 課題

学生の試験結果データを使って以下を実装してください：

1. **成績ランク付け**: 点数に応じて S/A/B/C/D のランクを付ける
2. **ピボット集計**: 科目別の合格・不合格数を横並びで集計する（CASE + SUM）
3. **ORDER BY での活用**: 特定のカテゴリを先頭に並べる
4. **NULL 安全な変換**: \`COALESCE\` と組み合わせた NULL 処理
`,
  initialSQL: `-- テーブル作成とデータ挿入
CREATE TABLE students (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE exam_results (
  id         SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id),
  subject    TEXT NOT NULL,
  score      INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  taken_at   DATE DEFAULT CURRENT_DATE
);

INSERT INTO students (name) VALUES
  ('Alice'), ('Bob'), ('Charlie'), ('Diana'), ('Eve');

INSERT INTO exam_results (student_id, subject, score) VALUES
  (1, 'math',    92), (1, 'english', 88), (1, 'science', 76),
  (2, 'math',    65), (2, 'english', 71), (2, 'science', 58),
  (3, 'math',    48), (3, 'english', 55), (3, 'science', 91),
  (4, 'math',    83), (4, 'english', 90), (4, 'science', 79),
  (5, 'math',    77), (5, 'english', 62), (5, 'science', 85);

-- TODO: 1. 各生徒の科目・点数に加えて、点数帯に応じたランクを表示する
-- S(90以上) / A(80以上) / B(70以上) / C(60以上) / D(60未満)


-- TODO: 2. 科目ごとに「合格(>=60)」と「不合格(<60)」の人数を横並びで集計する
-- 結果イメージ: subject | 合格数 | 不合格数


-- TODO: 3. ORDER BY で math を先頭に、english を2番目に、それ以外は末尾に並べる


-- TODO: 4. 各生徒の math スコアを取得し、未受験(NULL)の場合は「未受験」と表示する
-- ヒント: LEFT JOIN と COALESCE、CASE を組み合わせる
`,
  hints: [
    '`CASE WHEN score >= 90 THEN \'S\' WHEN score >= 80 THEN \'A\' ... ELSE \'D\' END AS ランク` で成績ランクを付けられます',
    'ピボット集計: `SUM(CASE WHEN score >= 60 THEN 1 ELSE 0 END) AS 合格数` のように CASE と集計関数を組み合わせます',
    'ORDER BY での CASE: `ORDER BY CASE subject WHEN \'math\' THEN 1 WHEN \'english\' THEN 2 ELSE 3 END` で任意順に並べます',
    'NULL 処理: `COALESCE(score::TEXT, \'未受験\')` だと型が合わないので `CASE WHEN score IS NULL THEN \'未受験\' ELSE score::TEXT END` を使います',
  ],
  // CASE 式が機能していれば 5 人分のランク行が取得でき、Alice(数学92点)の 'S' が含まれる
  clearCriteria: { minRowCount: 5, requiredCellValues: ['S'] },
  solution: `-- 1. 成績ランク付け
SELECT
  s.name AS 生徒名,
  r.subject AS 科目,
  r.score AS 点数,
  CASE
    WHEN r.score >= 90 THEN 'S'
    WHEN r.score >= 80 THEN 'A'
    WHEN r.score >= 70 THEN 'B'
    WHEN r.score >= 60 THEN 'C'
    ELSE 'D'
  END AS ランク
FROM students s
JOIN exam_results r ON s.id = r.student_id
ORDER BY s.name, r.subject;

-- 2. ピボット集計（科目ごとの合格・不合格数）
SELECT
  subject AS 科目,
  SUM(CASE WHEN score >= 60 THEN 1 ELSE 0 END) AS 合格数,
  SUM(CASE WHEN score < 60  THEN 1 ELSE 0 END) AS 不合格数,
  COUNT(*) AS 受験者数
FROM exam_results
GROUP BY subject
ORDER BY subject;

-- 3. ORDER BY での CASE（mathを先頭に）
SELECT
  s.name    AS 生徒名,
  r.subject AS 科目,
  r.score   AS 点数
FROM students s
JOIN exam_results r ON s.id = r.student_id
ORDER BY
  CASE r.subject
    WHEN 'math'    THEN 1
    WHEN 'english' THEN 2
    ELSE 3
  END,
  s.name;

-- 4. NULL安全な変換（LEFT JOINで未受験を検出）
SELECT
  s.name AS 生徒名,
  CASE
    WHEN r.score IS NULL THEN '未受験'
    ELSE r.score::TEXT
  END AS math点数
FROM students s
LEFT JOIN exam_results r
  ON s.id = r.student_id AND r.subject = 'math'
ORDER BY s.name;
`,
}

export const databaseScenarios: DatabaseScenario[] = [
  scenario1,
  scenario2,
  scenario3,
  scenario4,
  scenario5,
  scenario6,
  scenario7,
  scenario8,
]
