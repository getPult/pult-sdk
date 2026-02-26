# @pult/sdk

TypeScript SDK for the [Pult](https://pult.rest) platform. Deploy anything, anywhere.

## Install

```bash
npm install @pult/sdk
```

## Quick Start

```typescript
import { createClient } from '@pult/sdk'

const pult = createClient({
  url: 'https://myapp.pult.rest',
  apiKey: 'your-anon-key',
})
```

## Database

```typescript
const { data, error } = await pult.db.from('posts').select('*')

await pult.db.from('posts').insert({ title: 'Hello', body: 'World' })

await pult.db.from('posts').update({ title: 'Updated' }).eq('id', 1)

await pult.db.from('posts').delete().eq('id', 1)

const filtered = await pult.db
  .from('posts')
  .select('id, title, author(name)')
  .eq('published', true)
  .order('created_at', { ascending: false })
  .limit(10)
```

## Auth

```typescript
await pult.auth.signUp({ email: 'user@example.com', password: 'secret' })

await pult.auth.signIn({ email: 'user@example.com', password: 'secret' })

await pult.auth.signInWithOAuth({ provider: 'github' })

const { data: user } = await pult.auth.getUser()

pult.auth.onAuthStateChange((event, session) => {
  console.log(event, session)
})

await pult.auth.signOut()
```

## Storage

```typescript
await pult.storage.from('avatars').upload('user/avatar.png', file)

const url = pult.storage.from('avatars').getPublicUrl('user/avatar.png', {
  width: 200,
  height: 200,
  format: 'webp',
})

const { data } = await pult.storage.from('avatars').download('user/avatar.png')
```

## Realtime

```typescript
pult.realtime
  .channel('room')
  .on('INSERT', 'messages', (payload) => {
    console.log('New message:', payload)
  })
  .subscribe()

pult.realtime.channel('room').send({
  type: 'broadcast',
  event: 'cursor',
  payload: { x: 100, y: 200 },
})
```

## Redis

```typescript
await pult.redis.set('session:123', JSON.stringify(data), { ex: 3600 })

const { data: value } = await pult.redis.get('session:123')

const sub = await pult.redis.subscribe('notifications', (message) => {
  console.log('Received:', message)
})
```

## Queue

```typescript
await pult.queue.add('email', {
  to: 'user@example.com',
  subject: 'Welcome',
  body: 'Hello!',
})

const worker = await pult.queue.process('email', async (job) => {
  await sendEmail(job.data)
})
```

## Compatibility

Works in all JavaScript runtimes:

- Browsers (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+)
- Node.js 18+
- Deno 1.30+
- Bun 1.0+

## License

MIT
