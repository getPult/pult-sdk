# @pult/sdk

TypeScript SDK for the [Pult](https://pult.rest) platform. Deploy anything, anywhere.

## Install

```bash
npm install @pult/sdk
```

## Control Plane Client

Manage apps, deployments, environment variables, domains, and databases.

```typescript
import { createClient } from '@pult/sdk'

const pult = createClient({
  url: 'https://api.pult.rest',
  apiKey: 'your-api-key',
})
```

### Apps

```typescript
const { data: app } = await pult.apps.create({
  name: 'my-app',
  repo: 'https://github.com/user/repo.git',
  region: 'eu',
})

const { data: apps } = await pult.apps.list()

const { data: app } = await pult.apps.get('app-id')

await pult.apps.delete('app-id')
```

### Deployments

```typescript
const { data: deployment } = await pult.deployments.create('app-id')

const { data: deployments } = await pult.deployments.list('app-id')

const { data: logs } = await pult.deployments.getBuildLogs('app-id', 'deploy-id')

const stream = pult.deployments.streamBuildLogs(
  'app-id',
  'deploy-id',
  (line) => console.log(`[${line.step}] ${line.message}`),
  () => console.log('Build complete'),
)
```

### Runtime Logs

```typescript
const { data: lines } = await pult.logs.get('app-id')

const stream = pult.logs.stream(
  'app-id',
  (line) => console.log(line),
  () => console.log('Stream ended'),
)

stream.close()
```

### Environment Variables

```typescript
await pult.env.set('app-id', {
  NODE_ENV: 'production',
  API_SECRET: 's3cret',
})

const { data: vars } = await pult.env.list('app-id')

const { data: decrypted } = await pult.env.list('app-id', true)

await pult.env.delete('app-id', 'API_SECRET')
```

### Custom Domains

```typescript
const { data } = await pult.domains.add('app-id', { domain: 'example.com' })
console.log(data.dns_instructions)

const { data: domains } = await pult.domains.list('app-id')

const { data: result } = await pult.domains.verify('app-id', 'domain-id')

await pult.domains.delete('app-id', 'domain-id')
```

### Managed Databases

```typescript
const { data: db } = await pult.databases.create('app-id', { size: '5Gi' })

const { data: db } = await pult.databases.get('app-id')

const { data: result } = await pult.databases.query('app-id', {
  sql: 'SELECT * FROM users WHERE active = $1',
  params: [true],
})

await pult.databases.applyMigration('app-id', {
  name: '001_create_users',
  sql: 'CREATE TABLE users (id serial PRIMARY KEY, email text NOT NULL)',
})

const { data: migrations } = await pult.databases.listMigrations('app-id')

await pult.databases.enableExtension('app-id', { name: 'pgvector' })

await pult.databases.createReplica('app-id', { region: 'us' })

await pult.databases.delete('app-id')
```

## Data Plane Client (PostgREST)

Query your app's managed database directly via PostgREST.
Each app has its own PostgREST at `db-{appname}.pult.rest`.

```typescript
import { createDbClient } from '@pult/sdk'

const db = createDbClient({
  url: 'https://db-myapp.pult.rest',
  apiKey: 'your-jwt-token',
})
```

### Queries

```typescript
const { data } = await db.from('posts').select('*')

const { data } = await db.from('posts')
  .select('id, title, author(name)')
  .eq('published', true)
  .order('created_at', { ascending: false })
  .limit(10)

const { data: post } = await db.from('posts').select('*').eq('id', 1).single()

await db.from('posts').insert({ title: 'Hello', body: 'World' })

await db.from('posts').update({ title: 'Updated' }).eq('id', 1)

await db.from('posts').delete().eq('id', 1)
```

### Filters

```typescript
.eq('column', value)       // equals
.neq('column', value)      // not equals
.gt('column', value)       // greater than
.gte('column', value)      // greater than or equal
.lt('column', value)       // less than
.lte('column', value)      // less than or equal
.like('column', '%pattern%')
.ilike('column', '%pattern%')
.is('column', 'null')
.in('column', [1, 2, 3])
```

## Compatibility

- Browsers (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+)
- Node.js 18+
- Deno 1.30+
- Bun 1.0+

## License

MIT
