export interface ProgrammingScenario {
  id: string
  title: string
  description: string
  files: Record<string, string>
  hints: string[]
  solution: Record<string, string>
}

const scenario1: ProgrammingScenario = {
  id: 'typescript-basics',
  title: 'はじめてのTypeScript',
  description: `## はじめてのTypeScript

TypeScriptの基本的な型定義・関数・インターフェースを学びましょう。

### 課題

以下の要件を満たすコードを完成させてください：

1. \`User\` インターフェースを定義する（id: number, name: string, age: number, email?: string）
2. ユーザー情報を受け取り、自己紹介文を返す \`introduce\` 関数を実装する
3. 年齢が18歳以上かどうかを確認する \`isAdult\` 関数を実装する
4. ユーザーの配列を受け取り、成人のみをフィルタリングする \`filterAdults\` 関数を実装する
5. 関数を呼び出して結果をコンソールに出力する

### ポイント

- TypeScriptの型注釈を正しく使う
- オプショナルプロパティ（\`?\`）の扱い
- 配列操作（\`filter\`）
`,
  files: {
    'index.ts': `// TypeScriptの型定義・関数・インターフェースの基本

// TODO: Userインターフェースを定義してください
// プロパティ: id (number), name (string), age (number), email? (string)


// TODO: introduce関数を実装してください
// 引数: user: User
// 戻り値: string (例: "私はTaroです。年齢は20歳です。")


// TODO: isAdult関数を実装してください
// 引数: user: User
// 戻り値: boolean (18歳以上ならtrue)


// TODO: filterAdults関数を実装してください
// 引数: users: User[]
// 戻り値: User[] (18歳以上のユーザーのみ)


// --- 動作確認 ---
const users = [
  { id: 1, name: "Taro", age: 20, email: "taro@example.com" },
  { id: 2, name: "Hanako", age: 17 },
  { id: 3, name: "Jiro", age: 25, email: "jiro@example.com" },
  { id: 4, name: "Yuki", age: 15 },
];

// TODO: 各ユーザーの自己紹介を出力してください
// TODO: 成人ユーザーのみをフィルタリングして出力してください
`,
    'package.json': JSON.stringify({
      name: 'ts-basics',
      version: '1.0.0',
      type: 'module',
      // バージョンを固定する理由:
      // "latest" は npm install 時点での最新版を取得するため、
      // 悪意ある更新版やタイポスクワットパッケージを引き込む可能性がある。
      // メジャーバージョンを固定することで既知の安定シリーズのみを使用する。
      dependencies: { tsx: '^4.0.0', typescript: '^5.0.0' },
    }, null, 2),
  },
  hints: [
    'インターフェースは `interface User { ... }` の構文で定義します',
    'オプショナルプロパティは `email?: string` のように `?` をつけます',
    '関数の型注釈は `function introduce(user: User): string { ... }` のように書きます',
    '`Array.filter()` を使って条件に合う要素だけを取り出せます',
  ],
  solution: {
    'index.ts': `// TypeScriptの型定義・関数・インターフェースの基本

interface User {
  id: number;
  name: string;
  age: number;
  email?: string;
}

function introduce(user: User): string {
  const emailPart = user.email ? \` (メール: \${user.email})\` : "";
  return \`私は\${user.name}です。年齢は\${user.age}歳です。\${emailPart}\`;
}

function isAdult(user: User): boolean {
  return user.age >= 18;
}

function filterAdults(users: User[]): User[] {
  return users.filter(isAdult);
}

// --- 動作確認 ---
const users: User[] = [
  { id: 1, name: "Taro", age: 20, email: "taro@example.com" },
  { id: 2, name: "Hanako", age: 17 },
  { id: 3, name: "Jiro", age: 25, email: "jiro@example.com" },
  { id: 4, name: "Yuki", age: 15 },
];

console.log("=== 全ユーザーの自己紹介 ===");
users.forEach(user => console.log(introduce(user)));

console.log("\\n=== 成人ユーザーのみ ===");
filterAdults(users).forEach(user => console.log(introduce(user)));
`,
  },
}

const scenario2: ProgrammingScenario = {
  id: 'async-await',
  title: '非同期処理をマスターする',
  description: `## 非同期処理をマスターする

async/await と Promise を使った非同期処理を学びましょう。

### 課題

以下の要件を満たすコードを完成させてください：

1. \`delay\` 関数を実装する（指定したミリ秒待機するPromiseを返す）
2. \`fetchUser\` 関数を実装する（IDに対応するユーザーを非同期で返す、存在しない場合はエラー）
3. \`fetchAllUsers\` 関数を実装する（\`Promise.all\` で複数ユーザーを並列取得）
4. \`fetchWithRetry\` 関数を実装する（失敗した場合に最大3回リトライする）
5. エラーハンドリングを適切に実装する

### ポイント

- \`async/await\` の基本
- \`Promise.all\` による並列処理
- \`try/catch\` でのエラーハンドリング
- リトライロジックの実装
`,
  files: {
    'index.ts': `// async/await と Promise の基本

// サンプルデータ
const userDatabase: Record<number, { id: number; name: string; email: string }> = {
  1: { id: 1, name: "Alice", email: "alice@example.com" },
  2: { id: 2, name: "Bob", email: "bob@example.com" },
  3: { id: 3, name: "Charlie", email: "charlie@example.com" },
};

// TODO: delay関数を実装してください
// 引数: ms (number)
// 戻り値: Promise<void>
// ヒント: new Promise(resolve => setTimeout(resolve, ms))


// TODO: fetchUser関数を実装してください
// 引数: id (number)
// 戻り値: Promise<{id: number, name: string, email: string}>
// ユーザーが存在しない場合は Error をthrowしてください
// 処理に 100ms の遅延を追加してください（delayを使う）


// TODO: fetchAllUsers関数を実装してください
// 引数: ids (number[])
// 戻り値: Promise<...[]>
// Promise.all を使って並列で取得してください


// TODO: fetchWithRetry関数を実装してください
// 引数: id (number), maxRetries (number = 3)
// 戻り値: Promise<...>
// 失敗した場合に最大 maxRetries 回リトライしてください
// リトライの間に 50ms の遅延を入れてください


// --- 動作確認 ---
async function main() {
  console.log("=== 単体ユーザー取得 ===");
  // TODO: fetchUser(1) を呼び出して結果を表示してください

  console.log("\\n=== 存在しないユーザー ===");
  // TODO: fetchUser(99) のエラーをキャッチして表示してください

  console.log("\\n=== 並列ユーザー取得 ===");
  // TODO: fetchAllUsers([1, 2, 3]) を呼び出して結果を表示してください

  console.log("\\n=== リトライ付き取得 ===");
  // TODO: fetchWithRetry(2) を呼び出して結果を表示してください
}

main().catch(console.error);
`,
    'package.json': JSON.stringify({
      name: 'async-await',
      version: '1.0.0',
      type: 'module',
      dependencies: { tsx: '^4.0.0', typescript: '^5.0.0' },
    }, null, 2),
  },
  hints: [
    '`new Promise(resolve => setTimeout(resolve, ms))` で指定時間待つPromiseを作れます',
    '`async function fetchUser(id: number)` のように関数をasyncにするとawaitが使えます',
    '`Promise.all(ids.map(id => fetchUser(id)))` で並列取得できます',
    'リトライはfor文とtry/catchを組み合わせます。最後のエラーはrethrowします',
  ],
  solution: {
    'index.ts': `// async/await と Promise の基本

const userDatabase: Record<number, { id: number; name: string; email: string }> = {
  1: { id: 1, name: "Alice", email: "alice@example.com" },
  2: { id: 2, name: "Bob", email: "bob@example.com" },
  3: { id: 3, name: "Charlie", email: "charlie@example.com" },
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchUser(id: number): Promise<{ id: number; name: string; email: string }> {
  await delay(100);
  const user = userDatabase[id];
  if (!user) throw new Error(\`User \${id} not found\`);
  return user;
}

async function fetchAllUsers(ids: number[]) {
  return Promise.all(ids.map(id => fetchUser(id)));
}

async function fetchWithRetry(id: number, maxRetries = 3) {
  let lastError: Error | null = null;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fetchUser(id);
    } catch (e) {
      lastError = e as Error;
      if (i < maxRetries) {
        console.log(\`  リトライ \${i + 1}/\${maxRetries}...\`);
        await delay(50);
      }
    }
  }
  throw lastError;
}

async function main() {
  console.log("=== 単体ユーザー取得 ===");
  const user1 = await fetchUser(1);
  console.log(user1);

  console.log("\\n=== 存在しないユーザー ===");
  try {
    await fetchUser(99);
  } catch (e) {
    console.log(\`エラー: \${(e as Error).message}\`);
  }

  console.log("\\n=== 並列ユーザー取得 ===");
  const start = Date.now();
  const users = await fetchAllUsers([1, 2, 3]);
  console.log(\`\${users.length}人のユーザーを \${Date.now() - start}ms で取得\`);
  users.forEach(u => console.log(u));

  console.log("\\n=== リトライ付き取得 ===");
  const user2 = await fetchWithRetry(2);
  console.log(user2);
}

main().catch(console.error);
`,
  },
}

const scenario3: ProgrammingScenario = {
  id: 'kysely-crud',
  title: 'ORMでDBを操作する',
  description: `## ORMでDBを操作する

Kysely と PGLite を使い、WebContainer 内のインメモリ PostgreSQL に対して CRUD を実装します。
作成した DB は JSON エクスポートに含まれ、DB 学習コースに読み込んで SQL で直接操作できます。

### 課題

Kyselyを使って以下のCRUD操作を実装してください：

1. \`users\` テーブルを作成する（id, name, email）
2. 複数のユーザーを挿入する（INSERT）
3. 全ユーザーを取得する（SELECT）
4. 特定のユーザーを更新する（UPDATE）
5. ユーザーを削除する（DELETE）

### ポイント

- Kyselyの型安全なクエリビルダーの使い方
- TypeScriptの型定義とDBスキーマの紐付け
- PGLite は WebAssembly 版 PostgreSQL でネイティブアドオン不要
- \`seed.sql\` を置くとDB学習コースのDBを引き継いで起動できる
`,
  files: {
    'index.ts': `import {
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  type DatabaseConnection,
  type CompiledQuery,
  type QueryResult,
  type Generated,
} from 'kysely';
import { PGlite } from '@electric-sql/pglite';
import { existsSync, readFileSync, writeFileSync } from 'fs';

// ============================================================
// PGlite を Kysely の PostgreSQL ダイアレクトに接続するアダプタ。
// PGlite は PostgreSQL 互換のため Postgres 用のアダプタ/コンパイラをそのまま使える。
// ============================================================

class PGliteConnection implements DatabaseConnection {
  constructor(private readonly db: PGlite) {}

  async executeQuery<R>(compiledQuery: CompiledQuery<R>): Promise<QueryResult<R>> {
    const { sql, parameters } = compiledQuery;
    const result = await this.db.query<R>(sql, parameters as unknown[]);
    return {
      rows: result.rows ?? [],
      numAffectedRows: result.affectedRows !== undefined
        ? BigInt(result.affectedRows)
        : undefined,
    };
  }

  async *streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
    throw new Error('ストリーミングはサポートされていません');
  }
}

class PGliteDriver {
  private conn: PGliteConnection | null = null;

  constructor(private readonly db: PGlite) {}

  async init(): Promise<void> { this.conn = new PGliteConnection(this.db); }
  async acquireConnection(): Promise<PGliteConnection> { return this.conn!; }
  async beginTransaction(): Promise<void>   { await this.db.exec('BEGIN'); }
  async commitTransaction(): Promise<void>  { await this.db.exec('COMMIT'); }
  async rollbackTransaction(): Promise<void>{ await this.db.exec('ROLLBACK'); }
  async releaseConnection(): Promise<void>  {}
  async destroy(): Promise<void>            {}
}

class PGliteDialect {
  constructor(private readonly db: PGlite) {}
  createAdapter()                    { return new PostgresAdapter(); }
  createDriver()                     { return new PGliteDriver(this.db); }
  createIntrospector(db: Kysely<any>){ return new PostgresIntrospector(db); }
  createQueryCompiler()              { return new PostgresQueryCompiler(); }
}

// ============================================================
// DB ダンプ生成（コース間でDBを共有するために使う）
// ============================================================

async function generateSqlDump(db: PGlite): Promise<string> {
  const tables = await db.query<{ table_name: string }>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name"
  );
  if (tables.rows.length === 0) return '';

  const lines: string[] = ['-- Browser Lab DB Snapshot', \`-- Generated: \${new Date().toISOString()}\`, ''];

  for (const { table_name } of tables.rows) {
    const cols = await db.query<{
      column_name: string; data_type: string;
      character_maximum_length: number | null;
      is_nullable: string; column_default: string | null;
    }>(
      "SELECT column_name, data_type, character_maximum_length, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",
      [table_name]
    );
    const colDefs = cols.rows.map(c => {
      if (c.column_default?.includes('nextval')) return \`  \${c.column_name} SERIAL PRIMARY KEY\`;
      let t = c.data_type.toUpperCase();
      if (c.character_maximum_length !== null) t += \`(\${c.character_maximum_length})\`;
      let def = \`  \${c.column_name} \${t}\`;
      if (c.is_nullable === 'NO') def += ' NOT NULL';
      if (c.column_default !== null && !c.column_default.includes('nextval')) def += \` DEFAULT \${c.column_default}\`;
      return def;
    });
    lines.push(\`CREATE TABLE IF NOT EXISTS \${table_name} (\`, colDefs.join(',\\n'), ');', '');

    const rows = await db.query<Record<string, unknown>>(\`SELECT * FROM \${table_name}\`);
    for (const row of rows.rows) {
      const keys = Object.keys(row);
      const vals = Object.values(row).map(v => {
        if (v === null) return 'NULL';
        if (typeof v === 'string') return \`'\${v.replace(/'/g, "''")}'\`;
        if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
        return String(v);
      });
      lines.push(\`INSERT INTO \${table_name} (\${keys.join(', ')}) VALUES (\${vals.join(', ')});\`);
    }
    lines.push('');
  }
  return lines.join('\\n');
}

// ============================================================
// DBスキーマの型定義
// ============================================================

interface UsersTable {
  id: Generated<number>;
  name: string;
  email: string;
}

interface DB {
  users: UsersTable;
}

// PGlite の WASM ロードは非同期のためトップレベル await で待機する
const rawDb = new PGlite();
await rawDb.waitReady;

// DB学習コースのJSONをインポートした場合、seed.sql が自動生成されているので実行する
if (existsSync('seed.sql')) {
  const seedSql = readFileSync('seed.sql', 'utf-8');
  await rawDb.exec(seedSql);
  const t = await rawDb.query<{ table_name: string }>("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log('[Seed] seed.sql を実行しました。復元テーブル:', t.rows.map(r => r.table_name).join(', '));
}

const db = new Kysely<DB>({
  dialect: new PGliteDialect(rawDb),
});

async function main() {
  // 1. テーブル作成
  console.log("=== テーブル作成 ===");
  await db.schema
    .createTable('users')
    .ifNotExists()
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('name', 'varchar(100)', col => col.notNull())
    .addColumn('email', 'varchar(255)', col => col.notNull().unique())
    .execute();
  console.log("usersテーブルを作成しました");

  // 2. データ挿入
  console.log("\\n=== INSERT ===");
  // TODO: 以下のユーザーを挿入してください
  // { name: "Alice", email: "alice@example.com" }
  // { name: "Bob", email: "bob@example.com" }
  // { name: "Charlie", email: "charlie@example.com" }


  // 3. 全ユーザー取得
  console.log("\\n=== SELECT ALL ===");
  // TODO: 全ユーザーを取得して表示してください


  // 4. 更新
  console.log("\\n=== UPDATE ===");
  // TODO: Alice のメールアドレスを "alice.new@example.com" に更新してください


  // 5. 削除
  console.log("\\n=== DELETE ===");
  // TODO: Charlie を削除してください

  // 最終確認
  console.log("\\n=== 最終状態 ===");
  // TODO: 残りのユーザーを表示してください

  await db.destroy();

  // DBスナップショットを書き出す。
  // 「JSON保存」ボタンでエクスポートするとDBコースに読み込んでSQLを試せる。
  const dump = await generateSqlDump(rawDb);
  if (dump) {
    writeFileSync('db-dump.sql', dump);
    console.log('\\n[Snapshot] db-dump.sql を生成しました。「JSON保存」→ DBコースで読み込めます。');
  }
}

main().catch(console.error);
`,
    'package.json': JSON.stringify({
      name: 'kysely-pglite-crud',
      version: '1.0.0',
      type: 'module',
      // バージョン固定の理由:
      // "latest" は実行時点の最新版を取得するためサプライチェーン攻撃に弱い。
      // メジャーバージョンを固定（^）し、既知の安定シリーズだけを使う。
      // PGLite は PostgreSQL 互換の WASM 実装でネイティブアドオン不要。
      dependencies: {
        tsx: '^4.0.0',
        typescript: '^5.0.0',
        kysely: '^0.27.0',
        '@electric-sql/pglite': '^0.2.0',
      },
    }, null, 2),
  },
  hints: [
    'INSERTは `db.insertInto("users").values({ name: "...", email: "..." }).execute()` でできます',
    'SELECTは `db.selectFrom("users").selectAll().execute()` で全件取得できます',
    'UPDATEは `db.updateTable("users").set({ email: "..." }).where("name", "=", "Alice").execute()` です',
    'DELETEは `db.deleteFrom("users").where("name", "=", "Charlie").execute()` です',
    '`createTable` は `.ifNotExists()` を付けると seed.sql 実行後でも安全に呼べます',
  ],
  solution: {
    'index.ts': `import {
  Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler,
  type DatabaseConnection, type CompiledQuery, type QueryResult, type Generated,
} from 'kysely';
import { PGlite } from '@electric-sql/pglite';
import { existsSync, readFileSync, writeFileSync } from 'fs';

class PGliteConnection implements DatabaseConnection {
  constructor(private readonly db: PGlite) {}
  async executeQuery<R>(q: CompiledQuery<R>): Promise<QueryResult<R>> {
    const r = await this.db.query<R>(q.sql, q.parameters as unknown[]);
    return { rows: r.rows ?? [], numAffectedRows: r.affectedRows !== undefined ? BigInt(r.affectedRows) : undefined };
  }
  async *streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> { throw new Error('not supported'); }
}

class PGliteDriver {
  private conn: PGliteConnection | null = null;
  constructor(private readonly db: PGlite) {}
  async init()                           { this.conn = new PGliteConnection(this.db); }
  async acquireConnection()              { return this.conn!; }
  async beginTransaction()               { await this.db.exec('BEGIN'); }
  async commitTransaction()              { await this.db.exec('COMMIT'); }
  async rollbackTransaction()            { await this.db.exec('ROLLBACK'); }
  async releaseConnection()              {}
  async destroy()                        {}
}

class PGliteDialect {
  constructor(private readonly db: PGlite) {}
  createAdapter()                    { return new PostgresAdapter(); }
  createDriver()                     { return new PGliteDriver(this.db); }
  createIntrospector(db: Kysely<any>){ return new PostgresIntrospector(db); }
  createQueryCompiler()              { return new PostgresQueryCompiler(); }
}

async function generateSqlDump(db: PGlite): Promise<string> {
  const tables = await db.query<{ table_name: string }>("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name");
  if (tables.rows.length === 0) return '';
  const lines: string[] = ['-- Browser Lab DB Snapshot', \`-- Generated: \${new Date().toISOString()}\`, ''];
  for (const { table_name } of tables.rows) {
    const cols = await db.query<{ column_name: string; data_type: string; character_maximum_length: number | null; is_nullable: string; column_default: string | null }>(
      "SELECT column_name, data_type, character_maximum_length, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position", [table_name]
    );
    const colDefs = cols.rows.map(c => {
      if (c.column_default?.includes('nextval')) return \`  \${c.column_name} SERIAL PRIMARY KEY\`;
      let t = c.data_type.toUpperCase();
      if (c.character_maximum_length !== null) t += \`(\${c.character_maximum_length})\`;
      let def = \`  \${c.column_name} \${t}\`;
      if (c.is_nullable === 'NO') def += ' NOT NULL';
      if (c.column_default && !c.column_default.includes('nextval')) def += \` DEFAULT \${c.column_default}\`;
      return def;
    });
    lines.push(\`CREATE TABLE IF NOT EXISTS \${table_name} (\`, colDefs.join(',\\n'), ');', '');
    const rows = await db.query<Record<string, unknown>>(\`SELECT * FROM \${table_name}\`);
    for (const row of rows.rows) {
      const keys = Object.keys(row);
      const vals = Object.values(row).map(v => v === null ? 'NULL' : typeof v === 'string' ? \`'\${v.replace(/'/g, "''")}'\` : typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : String(v));
      lines.push(\`INSERT INTO \${table_name} (\${keys.join(', ')}) VALUES (\${vals.join(', ')});\`);
    }
    lines.push('');
  }
  return lines.join('\\n');
}

interface UsersTable { id: Generated<number>; name: string; email: string; }
interface DB { users: UsersTable; }

const rawDb = new PGlite();
await rawDb.waitReady;

if (existsSync('seed.sql')) {
  const seedSql = readFileSync('seed.sql', 'utf-8');
  await rawDb.exec(seedSql);
  const t = await rawDb.query<{ table_name: string }>("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log('[Seed] seed.sql を実行しました。復元テーブル:', t.rows.map(r => r.table_name).join(', '));
}

const db = new Kysely<DB>({ dialect: new PGliteDialect(rawDb) });

async function main() {
  console.log("=== テーブル作成 ===");
  await db.schema.createTable('users').ifNotExists()
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('name', 'varchar(100)', col => col.notNull())
    .addColumn('email', 'varchar(255)', col => col.notNull().unique())
    .execute();
  console.log("usersテーブルを作成しました");

  console.log("\\n=== INSERT ===");
  await db.insertInto('users').values([
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob', email: 'bob@example.com' },
    { name: 'Charlie', email: 'charlie@example.com' },
  ]).execute();
  console.log("3人のユーザーを挿入しました");

  console.log("\\n=== SELECT ALL ===");
  const allUsers = await db.selectFrom('users').selectAll().execute();
  allUsers.forEach(u => console.log(\`  [\${u.id}] \${u.name} <\${u.email}>\`));

  console.log("\\n=== UPDATE ===");
  await db.updateTable('users').set({ email: 'alice.new@example.com' }).where('name', '=', 'Alice').execute();
  const alice = await db.selectFrom('users').selectAll().where('name', '=', 'Alice').executeTakeFirst();
  console.log("Aliceのメール更新:", alice?.email);

  console.log("\\n=== DELETE ===");
  await db.deleteFrom('users').where('name', '=', 'Charlie').execute();
  console.log("Charlieを削除しました");

  console.log("\\n=== 最終状態 ===");
  const remaining = await db.selectFrom('users').selectAll().execute();
  remaining.forEach(u => console.log(\`  [\${u.id}] \${u.name} <\${u.email}>\`));

  await db.destroy();

  const dump = await generateSqlDump(rawDb);
  if (dump) {
    writeFileSync('db-dump.sql', dump);
    console.log('\\n[Snapshot] db-dump.sql を生成しました。「JSON保存」→ DBコースで読み込めます。');
  }
}

main().catch(console.error);
`,
  },
}

export const programmingScenarios: ProgrammingScenario[] = [
  scenario1,
  scenario2,
  scenario3,
]
