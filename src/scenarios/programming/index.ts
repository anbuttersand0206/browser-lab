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

const scenario4: ProgrammingScenario = {
  id: 'array-methods',
  title: '配列の高階関数をマスターする',
  description: `## 配列の高階関数をマスターする

\`map\`・\`filter\`・\`reduce\` などの高階関数を使いこなしましょう。
命令型の for ループより宣言的に書け、処理の「意図」が読み手に伝わりやすくなります。

### 課題

商品リストを使って、以下の関数を実装してください：

1. \`getNames\`: 商品名のみの配列を返す（\`map\`）
2. \`filterByCategory\`: カテゴリ名でフィルタリングする（\`filter\`）
3. \`totalPrice\`: 合計金額を計算する（\`reduce\`）
4. \`cheapestInCategory\`: カテゴリ内の最安値商品を返す（\`filter\` + \`reduce\`）
5. \`summarize\`: カテゴリごとの件数と合計金額をオブジェクトにまとめる（\`reduce\`）

### ポイント

- \`map\` は全要素を変換した新しい配列を返す（元の配列は変更しない）
- \`filter\` は条件を満たす要素だけの新しい配列を返す
- \`reduce\` は配列を1つの値（数値・オブジェクト・配列など）にたたみ込む
- 関数を組み合わせることで複雑な処理を短く書ける
`,
  files: {
    'index.ts': `// 配列の高階関数（map / filter / reduce）

interface Product {
  id: number
  name: string
  price: number
  category: string
}

const products: Product[] = [
  { id: 1, name: 'ノートPC',     price: 89800, category: 'electronics' },
  { id: 2, name: 'マウス',       price:  3500, category: 'electronics' },
  { id: 3, name: 'キーボード',   price: 12000, category: 'electronics' },
  { id: 4, name: 'デスク',       price: 45000, category: 'furniture' },
  { id: 5, name: 'チェア',       price: 38000, category: 'furniture' },
  { id: 6, name: 'TypeScript本', price:  3200, category: 'books' },
  { id: 7, name: 'SQL本',        price:  2800, category: 'books' },
]

// TODO: 商品名のみの配列を返す関数を実装してください
function getNames(products: Product[]): string[] {
  // ヒント: map を使います
}

// TODO: カテゴリ名でフィルタリングする関数を実装してください
function filterByCategory(products: Product[], category: string): Product[] {
  // ヒント: filter を使います
}

// TODO: 合計金額を計算する関数を実装してください
function totalPrice(products: Product[]): number {
  // ヒント: reduce を使います
}

// TODO: カテゴリ内の最安値商品を返す関数を実装してください
// カテゴリが空の場合は undefined を返してください
function cheapestInCategory(products: Product[], category: string): Product | undefined {
  // ヒント: filter してから reduce で最小値を探します
}

// TODO: カテゴリごとの件数と合計金額をまとめる関数を実装してください
// 戻り値の型: Record<string, { count: number; total: number }>
function summarize(products: Product[]): Record<string, { count: number; total: number }> {
  // ヒント: reduce の初期値を {} にして、カテゴリごとに集計します
}

// --- 動作確認 ---
console.log('=== 商品名一覧 ===')
// TODO: getNames を呼び出して結果を出力してください

console.log('\\n=== electronics カテゴリ ===')
// TODO: filterByCategory を呼び出して結果を出力してください

console.log('\\n=== 合計金額 ===')
// TODO: totalPrice を呼び出して結果を出力してください

console.log('\\n=== furniture の最安値 ===')
// TODO: cheapestInCategory を呼び出して結果を出力してください

console.log('\\n=== カテゴリ別サマリー ===')
// TODO: summarize を呼び出して結果を出力してください
`,
    'package.json': JSON.stringify({
      name: 'array-methods',
      version: '1.0.0',
      type: 'module',
      dependencies: { tsx: '^4.0.0', typescript: '^5.0.0' },
    }, null, 2),
  },
  hints: [
    '`products.map(p => p.name)` で name のみの配列を作れます',
    '`products.filter(p => p.category === category)` でカテゴリ一致の要素を絞り込めます',
    '`products.reduce((sum, p) => sum + p.price, 0)` で合計を計算できます。第2引数の `0` が初期値です',
    '`cheapestInCategory` は `filter` で対象商品を絞り込んでから `reduce((min, p) => p.price < min.price ? p : min)` で最小値を探せます',
    '`summarize` の reduce 初期値は `{} as Record<string, { count: number; total: number }>` にします。各カテゴリが未登録なら `{ count: 0, total: 0 }` で初期化してから加算します',
  ],
  solution: {
    'index.ts': `// 配列の高階関数（map / filter / reduce）

interface Product {
  id: number
  name: string
  price: number
  category: string
}

const products: Product[] = [
  { id: 1, name: 'ノートPC',     price: 89800, category: 'electronics' },
  { id: 2, name: 'マウス',       price:  3500, category: 'electronics' },
  { id: 3, name: 'キーボード',   price: 12000, category: 'electronics' },
  { id: 4, name: 'デスク',       price: 45000, category: 'furniture' },
  { id: 5, name: 'チェア',       price: 38000, category: 'furniture' },
  { id: 6, name: 'TypeScript本', price:  3200, category: 'books' },
  { id: 7, name: 'SQL本',        price:  2800, category: 'books' },
]

function getNames(products: Product[]): string[] {
  return products.map(p => p.name)
}

function filterByCategory(products: Product[], category: string): Product[] {
  return products.filter(p => p.category === category)
}

function totalPrice(products: Product[]): number {
  return products.reduce((sum, p) => sum + p.price, 0)
}

function cheapestInCategory(products: Product[], category: string): Product | undefined {
  const inCategory = products.filter(p => p.category === category)
  if (inCategory.length === 0) return undefined
  return inCategory.reduce((min, p) => p.price < min.price ? p : min)
}

function summarize(products: Product[]): Record<string, { count: number; total: number }> {
  return products.reduce<Record<string, { count: number; total: number }>>((acc, p) => {
    const entry = acc[p.category] ?? { count: 0, total: 0 }
    return { ...acc, [p.category]: { count: entry.count + 1, total: entry.total + p.price } }
  }, {})
}

// --- 動作確認 ---
console.log('=== 商品名一覧 ===')
console.log(getNames(products))

console.log('\\n=== electronics カテゴリ ===')
filterByCategory(products, 'electronics').forEach(p => console.log(\`  \${p.name}: ¥\${p.price.toLocaleString()}\`))

console.log('\\n=== 合計金額 ===')
console.log(\`¥\${totalPrice(products).toLocaleString()}\`)

console.log('\\n=== furniture の最安値 ===')
const cheapest = cheapestInCategory(products, 'furniture')
console.log(cheapest ? \`\${cheapest.name}: ¥\${cheapest.price.toLocaleString()}\` : 'なし')

console.log('\\n=== カテゴリ別サマリー ===')
const summary = summarize(products)
Object.entries(summary).forEach(([cat, { count, total }]) =>
  console.log(\`  \${cat}: \${count}件, 合計 ¥\${total.toLocaleString()}\`)
)
`,
  },
}

const scenario5: ProgrammingScenario = {
  id: 'classes',
  title: 'クラスと継承を理解する',
  description: `## クラスと継承を理解する

TypeScript のクラス構文・継承・アクセス修飾子を学びましょう。
関数だけで書けることも多いですが、状態と振る舞いをまとめて管理したい場合にクラスは有効です。

### 課題

図形（Shape）の抽象クラスを基底に、具体的な図形クラスを実装してください：

1. \`Shape\` 抽象クラスを定義する（\`area()\` と \`perimeter()\` を抽象メソッドにする）
2. \`Circle\`（円）クラスを実装する
3. \`Rectangle\`（長方形）クラスを実装する
4. \`Triangle\`（三角形）クラスを実装する（3辺から面積を求める）
5. \`printShapeInfo\` 関数で多態性（ポリモーフィズム）を確認する

### ポイント

- \`abstract class\` は直接インスタンス化できない基底クラスを定義する
- \`extends\` でクラスを継承し、\`super()\` で親クラスのコンストラクタを呼ぶ
- \`abstract\` メソッドはサブクラスで必ず実装しなければならない
- \`private\` / \`protected\` / \`public\` でアクセス範囲を制限する
- \`instanceof\` で実行時に型を判定できる
`,
  files: {
    'index.ts': `// クラス・継承・抽象クラス

// TODO: Shape 抽象クラスを定義してください
// - コンストラクタで name (string) を受け取る
// - area(): number を抽象メソッドにする
// - perimeter(): number を抽象メソッドにする
// - describe(): string を実装済みメソッドにする
//   例: "Circle: area=78.54, perimeter=31.42"


// TODO: Circle クラスを Shape から継承して実装してください
// - コンストラクタで radius (number) を受け取る
// - area = π × r²
// - perimeter = 2 × π × r


// TODO: Rectangle クラスを Shape から継承して実装してください
// - コンストラクタで width (number) と height (number) を受け取る
// - area = width × height
// - perimeter = 2 × (width + height)


// TODO: Triangle クラスを Shape から継承して実装してください
// - コンストラクタで a, b, c (3辺の長さ) を受け取る
// - area はヘロンの公式で計算する
//   s = (a + b + c) / 2
//   area = √(s × (s-a) × (s-b) × (s-c))
// - perimeter = a + b + c


// TODO: 図形情報を出力する関数を実装してください
// Shape 型の配列を受け取り、各図形の describe() を出力する
function printShapeInfo(shapes: Shape[]): void {
  // ヒント: forEach または for...of で回せます
}


// --- 動作確認 ---
const shapes: Shape[] = [
  new Circle(5),
  new Rectangle(4, 6),
  new Triangle(3, 4, 5),
]

printShapeInfo(shapes)

console.log('\\n=== instanceof チェック ===')
for (const shape of shapes) {
  // TODO: instanceof を使って型を判定し、型ごとのメッセージを出力してください
}
`,
    'package.json': JSON.stringify({
      name: 'classes',
      version: '1.0.0',
      type: 'module',
      dependencies: { tsx: '^4.0.0', typescript: '^5.0.0' },
    }, null, 2),
  },
  hints: [
    '`abstract class Shape { constructor(protected readonly name: string) {} }` で基底クラスを作ります。`protected` にするとサブクラスから参照できます',
    '`abstract area(): number;` のように本体なしで宣言すると抽象メソッドになります',
    '`class Circle extends Shape { constructor(private readonly radius: number) { super("Circle") } }` のように `super()` で親クラスを初期化します',
    'ヘロンの公式: `const s = (a + b + c) / 2; return Math.sqrt(s * (s - a) * (s - b) * (s - c))`',
    '`instanceof` は `shape instanceof Circle` のように使います。型ガードとしても機能します',
  ],
  solution: {
    'index.ts': `// クラス・継承・抽象クラス

abstract class Shape {
  constructor(protected readonly name: string) {}

  abstract area(): number
  abstract perimeter(): number

  describe(): string {
    return \`\${this.name}: area=\${this.area().toFixed(2)}, perimeter=\${this.perimeter().toFixed(2)}\`
  }
}

class Circle extends Shape {
  constructor(private readonly radius: number) {
    super('Circle')
  }

  area(): number {
    return Math.PI * this.radius ** 2
  }

  perimeter(): number {
    return 2 * Math.PI * this.radius
  }
}

class Rectangle extends Shape {
  constructor(
    private readonly width: number,
    private readonly height: number,
  ) {
    super('Rectangle')
  }

  area(): number {
    return this.width * this.height
  }

  perimeter(): number {
    return 2 * (this.width + this.height)
  }
}

class Triangle extends Shape {
  constructor(
    private readonly a: number,
    private readonly b: number,
    private readonly c: number,
  ) {
    super('Triangle')
  }

  area(): number {
    // ヘロンの公式：3辺の長さから面積を求める
    const s = (this.a + this.b + this.c) / 2
    return Math.sqrt(s * (s - this.a) * (s - this.b) * (s - this.c))
  }

  perimeter(): number {
    return this.a + this.b + this.c
  }
}

function printShapeInfo(shapes: Shape[]): void {
  shapes.forEach(shape => console.log(shape.describe()))
}

// --- 動作確認 ---
const shapes: Shape[] = [
  new Circle(5),
  new Rectangle(4, 6),
  new Triangle(3, 4, 5),
]

printShapeInfo(shapes)

console.log('\\n=== instanceof チェック ===')
for (const shape of shapes) {
  if (shape instanceof Circle) {
    console.log(\`\${shape.describe()} → Circle です\`)
  } else if (shape instanceof Rectangle) {
    console.log(\`\${shape.describe()} → Rectangle です\`)
  } else if (shape instanceof Triangle) {
    console.log(\`\${shape.describe()} → Triangle です\`)
  }
}
`,
  },
}

const scenario6: ProgrammingScenario = {
  id: 'express-server',
  title: 'Expressでシンプルなサーバーを作る',
  description: `## Expressでシンプルなサーバーを作る

Express を使って Node.js の HTTP サーバーを作り、
下部の **プレビュータブ** でリアルタイムに動作確認しましょう。

### 課題

1. ルートパス（\`/\`）にアクセスするとスタイル付きの HTML ページを返す
2. \`/hello/:name\` で「こんにちは、{name}さん！」を返す
3. \`/api/users\` に JSON を返す REST エンドポイントを追加する
4. すべてのリクエストをコンソールにログ出力するミドルウェアを追加する

### ポイント

- \`app.get(path, handler)\` でルートを定義する
- \`res.send()\` は文字列や HTML、\`res.json()\` は JSON レスポンスを返す
- \`req.params.name\` で URL パスパラメータを取得する
- \`app.use()\` でミドルウェア（全ルートに適用される処理）を登録する
- サーバーが起動するとコンソールに「プレビュータブで確認できます」と表示される
- パネルの境界をドラッグしてプレビュー領域を大きくできます
`,
  files: {
    'index.ts': `import express from 'express'

const app = express()
const PORT = 3000

// TODO: 1. すべてのリクエストをログに出力するミドルウェアを追加してください
// ヒント: app.use((req, res, next) => { ... next() })
// req.method と req.url を console.log で出力します


// TODO: 2. GET / にアクセスしたときにスタイル付きの HTML を返してください
// res.send('<html>...') で HTML を返せます
app.get('/', (req, res) => {
  res.send(\`
    <html>
      <head>
        <style>
          body { font-family: sans-serif; padding: 2rem; background: #1e1e1e; color: #d4d4d4; }
          h1   { color: #4ec9b0; }
          a    { color: #569cd6; }
        </style>
      </head>
      <body>
        <h1>🚀 Browser Lab Express サーバー</h1>
        <p>ルートが定義できたら、他のページも試してみましょう：</p>
        <ul>
          <li><a href="/hello/Taro">/hello/Taro</a></li>
          <li><a href="/api/users">/api/users</a></li>
        </ul>
      </body>
    </html>
  \`)
})

// TODO: 3. GET /hello/:name に対して「こんにちは、{name}さん！」を返してください
// req.params.name でパスパラメータを取得できます


// TODO: 4. GET /api/users に JSON レスポンスを返してください
// res.json() で JSON を返せます
// ユーザーのリスト（id, name, role）を返しましょう


app.listen(PORT, () => {
  console.log(\`サーバー起動: http://localhost:\${PORT}\`)
})
`,
    'package.json': JSON.stringify({
      name: 'express-server',
      version: '1.0.0',
      type: 'module',
      // バージョン固定の理由:
      // 実行時最新版は不審な更新を引き込む可能性があるため、
      // メジャーバージョンを固定して既知の安定シリーズのみを使う。
      dependencies: {
        tsx: '^4.0.0',
        typescript: '^5.0.0',
        express: '^4.18.0',
        '@types/express': '^4.17.0',
      },
    }, null, 2),
  },
  hints: [
    'ミドルウェアは `app.use((req, res, next) => { console.log(req.method, req.url); next() })` のように書きます。`next()` を呼ばないと次のハンドラに進めません',
    '`app.get("/hello/:name", (req, res) => { const { name } = req.params; res.send(\`こんにちは、${name}さん！\`) })` でパスパラメータを使えます',
    '`res.json()` の引数にオブジェクトや配列を渡すと JSON レスポンスになります。`Content-Type: application/json` も自動で付与されます',
    'ミドルウェアはルートより前に `app.use()` で登録すると全リクエストに適用されます。順序が重要です',
  ],
  solution: {
    'index.ts': `import express from 'express'

const app = express()
const PORT = 3000

// すべてのリクエストをログに出力するミドルウェア
app.use((req, res, next) => {
  console.log(\`\${req.method} \${req.url}\`)
  next()
})

app.get('/', (req, res) => {
  res.send(\`
    <html>
      <head>
        <style>
          body { font-family: sans-serif; padding: 2rem; background: #1e1e1e; color: #d4d4d4; }
          h1   { color: #4ec9b0; }
          a    { color: #569cd6; }
        </style>
      </head>
      <body>
        <h1>🚀 Browser Lab Express サーバー</h1>
        <p>ルートが定義できたら、他のページも試してみましょう：</p>
        <ul>
          <li><a href="/hello/Taro">/hello/Taro</a></li>
          <li><a href="/api/users">/api/users</a></li>
        </ul>
      </body>
    </html>
  \`)
})

app.get('/hello/:name', (req, res) => {
  const { name } = req.params
  res.send(\`<h1 style="font-family:sans-serif;color:#4ec9b0;">こんにちは、\${name}さん！</h1>\`)
})

app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: 'Alice', role: 'admin' },
    { id: 2, name: 'Bob',   role: 'user' },
    { id: 3, name: 'Carol', role: 'user' },
  ])
})

app.listen(PORT, () => {
  console.log(\`サーバー起動: http://localhost:\${PORT}\`)
})
`,
  },
}

const scenario7: ProgrammingScenario = {
  id: 'generics',
  title: 'Genericsで型安全な汎用コードを書く',
  description: `## Genericsで型安全な汎用コードを書く

**Generics（型パラメータ）** を使うと、具体的な型を固定せずに型安全な汎用コードを書けます。
\`any\` で型安全性を捨てるのではなく、\`<T>\` で「後から型を決める」のが Generics の本質です。

### 課題

以下を実装してください：

1. **identity関数**: 受け取った値をそのまま返す（最もシンプルな Generics）
2. **Stack<T>クラス**: push / pop / peek を持つ型安全なスタック
3. **pick関数**: オブジェクトから指定キーのみを抽出する（\`keyof\` と組み合わせ）
4. **Result<T, E>型**: 成功か失敗かを型で表現する union 型（不正状態を型で排除）
5. **zip関数**: 2つの配列を組み合わせて \`[A, B][]\` を返す

### ポイント

- \`<T>\` は「この関数を呼ぶ時点で型を決める」というプレースホルダー
- \`K extends keyof T\` で「T のキーでなければならない」という制約を付ける
- \`Result<T, E>\` のような union 型は「不正な状態を型レベルで排除」する設計
- 戻り値の型は推論に任せられることが多い（型注釈を省いても型安全）
`,
  files: {
    'index.ts': `// Generics（型パラメータ）の基本

// TODO: 1. identity 関数を実装してください
// 任意の型 T を受け取り、そのまま返す関数
// function identity<T>(value: T): T { ... }


// TODO: 2. Stack<T> クラスを実装してください
// メソッド: push(item: T): void
//          pop(): T | undefined  （空の場合は undefined）
//          peek(): T | undefined （取り出さずに先頭を見る）
//          get size(): number
// class Stack<T> { ... }


// TODO: 3. pick 関数を実装してください
// オブジェクト obj から keys に含まれるキーのみを持つ新しいオブジェクトを返す
// 型制約: K extends keyof T
// function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> { ... }


// TODO: 4. Result<T, E> 型を定義してください
// 成功: { ok: true; value: T }
// 失敗: { ok: false; error: E }
// この型を使って divide 関数（ゼロ除算を Result で返す）も実装してください
// type Result<T, E = Error> = ...


// TODO: 5. zip 関数を実装してください
// 2つの配列を組み合わせて [A, B][] を返す
// 長さが異なる場合は短い方に合わせる
// function zip<A, B>(a: A[], b: B[]): [A, B][] { ... }


// --- 動作確認 ---
console.log('=== identity ===')
// TODO: identity を文字列・数値・オブジェクトで呼び出して確認してください

console.log('\\n=== Stack<number> ===')
// TODO: Stack を作成し、push/pop/peek を確認してください

console.log('\\n=== pick ===')
const user = { id: 1, name: 'Alice', email: 'alice@example.com', age: 25 }
// TODO: pick(user, ['id', 'name']) を呼び出して確認してください

console.log('\\n=== Result ===')
// TODO: divide(10, 2) と divide(10, 0) の結果を確認してください

console.log('\\n=== zip ===')
// TODO: zip([1, 2, 3], ['a', 'b', 'c']) を呼び出して確認してください
`,
    'package.json': JSON.stringify({
      name: 'generics',
      version: '1.0.0',
      type: 'module',
      dependencies: { tsx: '^4.0.0', typescript: '^5.0.0' },
    }, null, 2),
  },
  hints: [
    '`function identity<T>(value: T): T { return value }` — T は呼び出し時の型から推論されます',
    'Stack は `private readonly items: T[] = []` をフィールドに持ち、push は `items.push(item)`、pop は `items.pop()` で実装します',
    '`pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>` の実装は `Object.fromEntries(keys.map(k => [k, obj[k]]))` で作れますが、型アサーションが必要です',
    'Result 型: `type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E }` — divide は `if (b === 0) return { ok: false, error: new Error(...) }` で返します',
    'zip は `Array.from({ length: Math.min(a.length, b.length) }, (_, i) => [a[i], b[i]] as [A, B])` で実装できます',
  ],
  solution: {
    'index.ts': `// Generics（型パラメータ）の基本

// 1. identity 関数
function identity<T>(value: T): T {
  return value
}

// 2. Stack<T> クラス
class Stack<T> {
  private readonly items: T[] = []

  push(item: T): void {
    this.items.push(item)
  }

  pop(): T | undefined {
    return this.items.pop()
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1]
  }

  get size(): number {
    return this.items.length
  }
}

// 3. pick 関数
function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  return Object.fromEntries(keys.map((k) => [k, obj[k]])) as Pick<T, K>
}

// 4. Result<T, E> 型
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E }

function divide(a: number, b: number): Result<number> {
  // ゼロ除算は数学的に未定義のため Error を返す
  if (b === 0) return { ok: false, error: new Error('ゼロ除算は許可されていません') }
  return { ok: true, value: a / b }
}

// 5. zip 関数
function zip<A, B>(a: A[], b: B[]): [A, B][] {
  const length = Math.min(a.length, b.length)
  return Array.from({ length }, (_, i) => [a[i], b[i]])
}

// --- 動作確認 ---
console.log('=== identity ===')
console.log(identity('hello'))    // string
console.log(identity(42))         // number
console.log(identity({ x: 1 }))  // object

console.log('\\n=== Stack<number> ===')
const stack = new Stack<number>()
stack.push(1)
stack.push(2)
stack.push(3)
console.log('size:', stack.size)
console.log('peek:', stack.peek())
console.log('pop:', stack.pop())
console.log('size after pop:', stack.size)

console.log('\\n=== pick ===')
const user = { id: 1, name: 'Alice', email: 'alice@example.com', age: 25 }
console.log(pick(user, ['id', 'name']))        // { id: 1, name: 'Alice' }
console.log(pick(user, ['email', 'age']))      // { email: '...', age: 25 }

console.log('\\n=== Result ===')
const r1 = divide(10, 2)
if (r1.ok) console.log('10 / 2 =', r1.value)

const r2 = divide(10, 0)
if (!r2.ok) console.log('エラー:', r2.error.message)

console.log('\\n=== zip ===')
const pairs = zip([1, 2, 3], ['a', 'b', 'c'])
console.log(pairs)
console.log(zip([1, 2], ['x', 'y', 'z']))  // 短い方に合わせる
`,
  },
}

const scenario8: ProgrammingScenario = {
  id: 'type-guards',
  title: '型ガードで安全に型を絞り込む',
  description: `## 型ガードで安全に型を絞り込む

TypeScript の union 型 (\`A | B\`) は、実行時にどちらの型かを確認してから安全に使う必要があります。
**型ガード** はその確認ロジックを型システムに伝える仕組みです。

### 型ガードの 3 つのパターン

1. **typeof ガード**: \`typeof x === 'string'\`
2. **instanceof ガード**: \`x instanceof MyClass\`
3. **ユーザー定義型ガード**: \`function isXxx(x: unknown): x is Xxx\`

### 課題

以下を実装してください：

1. **typeof ガード**: \`string | number | boolean\` を受け取り、型ごとに処理を分岐する
2. **instanceof ガード**: カスタムエラークラスを判定して適切なメッセージを返す
3. **ユーザー定義型ガード**: API レスポンス（\`unknown\`）を型安全に検証する
4. **判別可能 union**: \`kind\` フィールドで絞り込む discriminated union の面積計算

### ポイント

- \`x is T\` を戻り値型に書くと、TypeScript が if ブロック内で T として扱う
- \`unknown\` 型は \`any\` より安全で、型ガードなしでは中身を操作できない
- discriminated union の \`kind\` プロパティは、コンパイラが網羅性をチェックできる
`,
  files: {
    'index.ts': `// 型ガード（type predicates）

// ===== 1. typeof ガード =====

// TODO: printValue 関数を実装してください
// 引数 value: string | number | boolean
// string → "文字列: (値)"
// number → "数値: (値)" （小数点第2位まで表示）
// boolean → "真偽値: (はい/いいえ)"
function printValue(value: string | number | boolean): void {
  // ヒント: typeof value === 'string' などで分岐
}

// ===== 2. instanceof ガード =====

class NetworkError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message)
    this.name = 'NetworkError'
  }
}

class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

// TODO: handleError 関数を実装してください
// NetworkError → "ネットワークエラー (statusCode): message"
// ValidationError → "バリデーションエラー (field): message"
// その他の Error → "エラー: message"
function handleError(error: Error): string {
  // ヒント: instanceof で分岐
}

// ===== 3. ユーザー定義型ガード =====

interface ApiUser {
  id: number
  name: string
  email: string
}

// TODO: isApiUser 型ガード関数を実装してください
// 戻り値型: value is ApiUser
// id が number、name と email が string であることを確認する
function isApiUser(value: unknown): value is ApiUser {
  // ヒント: typeof value === 'object' && value !== null &&
  //        'id' in value && typeof (value as any).id === 'number' ...
}

// TODO: parseApiResponse 関数を実装してください
// JSON文字列を受け取り、ApiUser であれば返す。
// そうでない場合は Error を throw する。
function parseApiResponse(json: string): ApiUser {
  // ヒント: JSON.parse → isApiUser で検証
}

// ===== 4. 判別可能 union =====

// TODO: Shape 型と area 関数を実装してください
// Shape は kind フィールドで判別する discriminated union
// circle: { kind: 'circle'; radius: number }
// rectangle: { kind: 'rectangle'; width: number; height: number }
// triangle: { kind: 'triangle'; base: number; height: number }
type Shape = never  // ← ここを置き換えてください

function area(shape: Shape): number {
  // ヒント: switch (shape.kind) で分岐
  // TypeScript は全ケースをカバーしていないと警告する
  throw new Error('未実装')
}

// --- 動作確認 ---
console.log('=== typeof ガード ===')
// TODO: printValue を様々な型で呼び出して確認してください

console.log('\\n=== instanceof ガード ===')
// TODO: handleError を各エラータイプで呼び出して確認してください

console.log('\\n=== ユーザー定義型ガード ===')
// TODO: parseApiResponse で正常・異常なJSONを試してください

console.log('\\n=== 判別可能 union ===')
// TODO: 各図形の面積を計算して確認してください
`,
    'package.json': JSON.stringify({
      name: 'type-guards',
      version: '1.0.0',
      type: 'module',
      dependencies: { tsx: '^4.0.0', typescript: '^5.0.0' },
    }, null, 2),
  },
  hints: [
    '`typeof value === \'string\'` などで分岐します。number の表示は `value.toFixed(2)` が使えます',
    '`instanceof` は `error instanceof NetworkError` のように使います。サブクラスを先に判定してください',
    '型ガード関数: `function isApiUser(v: unknown): v is ApiUser { return typeof v === \'object\' && v !== null && \'id\' in v && typeof (v as Record<string,unknown>).id === \'number\' && ... }`',
    '`parseApiResponse`: `const data: unknown = JSON.parse(json); if (!isApiUser(data)) throw new Error(...); return data;`',
    '`switch (shape.kind) { case \'circle\': return Math.PI * shape.radius ** 2; ... }` — TypeScript はカバーされていないケースを `never` で検知します',
  ],
  solution: {
    'index.ts': `// 型ガード（type predicates）

// 1. typeof ガード
function printValue(value: string | number | boolean): void {
  if (typeof value === 'string') {
    console.log(\`文字列: \${value}\`)
  } else if (typeof value === 'number') {
    console.log(\`数値: \${value.toFixed(2)}\`)
  } else {
    // boolean の網羅性はコンパイラが保証するため else で安全に扱える
    console.log(\`真偽値: \${value ? 'はい' : 'いいえ'}\`)
  }
}

// 2. instanceof ガード
class NetworkError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message)
    this.name = 'NetworkError'
  }
}

class ValidationError extends Error {
  constructor(message: string, public readonly field: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

function handleError(error: Error): string {
  // サブクラスを先に判定しないと親クラスの Error に吸収されてしまう
  if (error instanceof NetworkError) {
    return \`ネットワークエラー (\${error.statusCode}): \${error.message}\`
  }
  if (error instanceof ValidationError) {
    return \`バリデーションエラー (\${error.field}): \${error.message}\`
  }
  return \`エラー: \${error.message}\`
}

// 3. ユーザー定義型ガード
interface ApiUser {
  id: number
  name: string
  email: string
}

function isApiUser(value: unknown): value is ApiUser {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'number' &&
    typeof v.name === 'string' &&
    typeof v.email === 'string'
  )
}

function parseApiResponse(json: string): ApiUser {
  const data: unknown = JSON.parse(json)
  if (!isApiUser(data)) {
    throw new Error('APIレスポンスの形式が正しくありません')
  }
  return data
}

// 4. 判別可能 union
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rectangle'; width: number; height: number }
  | { kind: 'triangle'; base: number; height: number }

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2
    case 'rectangle':
      return shape.width * shape.height
    case 'triangle':
      return (shape.base * shape.height) / 2
    // default 不要: 全ケースを網羅していることを TypeScript が検査する
  }
}

// --- 動作確認 ---
console.log('=== typeof ガード ===')
printValue('Hello, TypeScript!')
printValue(3.14159)
printValue(true)

console.log('\\n=== instanceof ガード ===')
console.log(handleError(new NetworkError('タイムアウト', 408)))
console.log(handleError(new ValidationError('メールアドレスが無効', 'email')))
console.log(handleError(new Error('予期しないエラー')))

console.log('\\n=== ユーザー定義型ガード ===')
const validJson = '{"id":1,"name":"Alice","email":"alice@example.com"}'
const user = parseApiResponse(validJson)
console.log('パース成功:', user)

try {
  parseApiResponse('{"id":"文字列ID","name":"Bob"}')  // id が string なので失敗
} catch (e) {
  console.log('パース失敗:', (e as Error).message)
}

console.log('\\n=== 判別可能 union ===')
const shapes: Shape[] = [
  { kind: 'circle', radius: 5 },
  { kind: 'rectangle', width: 4, height: 6 },
  { kind: 'triangle', base: 3, height: 8 },
]
shapes.forEach((s) => {
  console.log(\`\${s.kind}: 面積 = \${area(s).toFixed(2)}\`)
})
`,
  },
}

export const programmingScenarios: ProgrammingScenario[] = [
  scenario1,
  scenario2,
  scenario3,
  scenario4,
  scenario5,
  scenario6,
  scenario7,
  scenario8,
]
