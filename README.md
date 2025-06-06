Neuphonic Typescript SDK
========================

The official Neuphonic Typescript (Javascript) library providing simple, convenient access to the 
Neuphonic text-to-speech websocket API from any Node.js or browser application.

For comprehensive guides and official documentation, check out [https://docs.neuphonic.com](https://docs.neuphonic.com).
For the Python SDK visit [PyNeuphonic](https://github.com/neuphonic/pyneuphonic).
If you need support or want to join the community, visit our [Discord](https://discord.gg/G258vva7gZ)!

- [Examples](#Examples)
- [Installation](#installation)
  - [API Key](#api-key)
- [Server side](#server-side)
  - [Audio Generation](#audio-generation)
    - [Configure the Text-to-Speech Synthesis](#configure-the-text-to-speech-synthesis)
    - [SSE (Server Side Events)](#sse-server-side-events)
  - [Voices](#voices)
    - [Get Voices](#get-voices)
    - [Get Voice](#get-voice)
    - [Clone Voice](#clone-voice)
    - [Update Voice](#update-voice)
    - [Delete Voice](#delete-voice)
  - [Agents](#agents)
    - [Create agent](#create-agent)
    - [List agents](#list-agents)
    - [Get agent](#get-agent)
    - [Delete agent](#delete-agent)
    - [Websocket](#websocket)
- [Client side](#client-side)
  - [Authentication](#authentication)
  - [Using agents](#using-agents)

## Examples
Example applications can be found in a separate repository: https://github.com/neuphonic/neuphonic-js-examples.

## Installation
Install this package into your environment using your chosen package manager:
```bash
npm install @neuphonic/neuphonic-js
```

### API Key
Get your API key from the [Neuphonic website](https://beta.neuphonic.com).

#### Server side

The following API requires an `API key` and is primarily intended for server-side use.

## Audio Generation

### Configure the Text-to-Speech Synthesis
The following parameters are examples of parameters which can be adjusted. Ensure that the selected combination of model, language, and voice is valid. For details on supported combinations, refer to the [Models](https://docs.neuphonic.com/resources/models) and [Voices](https://docs.neuphonic.com/resources/voices) pages.

- **`lang_code`**
  Language code for the desired language.

  **Default**: `'en'` **Examples**: `'en'`, `'es'`, `'de'`, `'nl'`

- **`voice_id`**
  The voice ID for the desired voice. Ensure this voice ID is available for the selected model and language.

  **Default**: `None` **Examples**: `'8e9c4bc8-3979-48ab-8626-df53befc2090'`

- **`speed`**
  Playback speed of the audio.

  **Default**: `1.0`
  **Examples**: `0.7`, `1.0`, `1.5`

### SSE (Server Side Events)
```typescript
import fs from 'fs';
import { createClient, toWav } from '@neuphonic/neuphonic-js';
const client = createClient();

const msg = `Hello how are you?<STOP>`;

const sse = await client.tts.sse({
  speed: 1.15,
  lang_code: 'en'
});

const res = await sse.send(msg);

// Saving data to file
const wav = toWav(res.audio);
fs.writeFileSync(__dirname + 'sse.wav', wav);
```

### Websocket
```typescript
import fs from 'fs';
import { createClient, toWav } from '@neuphonic/neuphonic-js';
const client = createClient();

const msg = `Hello how are you?<STOP>`;

const ws = await client.tts.websocket({
  speed: 1.15,
  lang_code: 'en' 
});

let byteLen = 0;
const chunks = [];

// Websocket allow us to get chunk of the data as soon as they ready
// which can make API more responsve 
for await (const chunk of ws.send(msg)) {
  // here you can send the data to the client
  // or collect it in array and save as a file
  chunks.push(chunk.audio);
  byteLen += chunk.audio.byteLength;
}

// Merging all chunks into single Uint8Array array
let offset = 0;
const allAudio = new Uint8Array(byteLen);
chunks.forEach(chunk => {
  allAudio.set(chunk, offset);
  offset += chunk.byteLength;
})

// Saving data to file
const wav = toWav(allAudio);
fs.writeFileSync(__dirname + '/data/ws.wav', wav);

await ws.close(); // closing the socket if we don't want to send anything
```

#### Client side

The client-side API enables you to build applications with Neuphonic directly in the browser.

## Authentication

Client-side authentication is handled using JWT tokens. To obtain a token, use the server-side client as follows:

```typescript
import { createClient } from '@neuphonic/neuphonic-js';
const client = createClient();

console.log(
  await client.jwt()
);
```

## Voices

### Get Voices
To get all available voices you can run the following snippet.

```typescript
import { createClient } from '@neuphonic/neuphonic-js';
const client = createClient();

console.log(await client.voices.list());
```

### Get Voice
To get information about an existing voice please call.

```typescript
import { createClient } from '@neuphonic/neuphonic-js';
const client = createClient();

console.log(
  await client.voices.get({ id: '<VOICE_ID>' })
);
```

### Clone Voice

To clone a voice based on a audio file, you can run the following snippet.

```typescript
import fs from 'fs';
import { createClient } from '@neuphonic/neuphonic-js';
const client = createClient();

// Providing the file name
console.log(
  await client.voices.clone({
    voiceName: 'Voice name',
    voiceFilePath: __dirname + '/data.wav',
    voiceTags: ['Tag 1']
  })
);

// Providing the readable stream
const voiceStream = fs.createReadStream(__dirname + '/data.wav');

console.log(
  await client.voices.clone({
    voiceName: 'Voice name',
    voiceFilePath: voiceStream,
    voiceFileName: 'data.wav',
    voiceTags: ['Tag 1']
  })
);
```

If you have successfully cloned a voice, the voice id will be returned.
Once cloned, you can use this voice just like any of the standard voices when calling the TTS (Text-to-Speech) service.

To see a list of all available voices, including cloned ones, use `client.voices.list()`.

**Note:** Your voice reference clip must meet the following criteria: it should be at least 6
seconds long, in .mp3 or .wav format, and no larger than 10 MB in size.

### Update Voice

You can update any of the attributes of a voice: name, tags and the reference audio file the voice
was cloned on.
You can select which voice to update using either it's `voice_id` or it's name.

```typescript
import { createClient } from '@neuphonic/neuphonic-js';
const client = createClient();

// Providing the file name 
console.log(
  await client.voices.update({
    id: '<VOICE_ID>', // you can also use voice 'name' here instead of id  
    newVoiceName: 'New name',
    newVoiceFilePath: __dirname + '/data.wav',
    newVoiceTags: ['Tag 2']
  })
);

// Providing the readable stream
const voiceStream = fs.createReadStream(__dirname + '/data.wav');

console.log(
  await client.voices.update({
    id: '<VOICE_ID>', // you can also use voice 'name' here instead of id  
    newVoiceName: 'New name',
    newVoiceFilePath: voiceStream,
    newVoiceFileName: 'data.wav'
    newVoiceTags: ['Tag 2']
  })
);
```
**Note:** Your voice reference clip must meet the following criteria: it should be at least 6 seconds long, in .mp3 or .wav format, and no larger than 10 MB in size.

### Delete Voice
To delete a cloned voice:

```typescript
import { createClient } from '@neuphonic/neuphonic-js';
const client = createClient();

console.log(
  await client.voices.delete({
    id: '<VOICE_ID>'
  })
);
```

## Agents

With Agents, you can create, manage, and interact with intelligent AI assistants. 

### Create agent

```typescript
import { createClient } from '@neuphonic/neuphonic-js';
const client = createClient();

console.log(
  await client.agents.create({
    name: 'My Agent',
    prompt: 'Hey',
    greeting: 'Greet',
  })
);
```

### List agents
```typescript
import { createClient } from '@neuphonic/neuphonic-js';
const client = createClient();

console.log(
  await client.agents.list()
);
```

### Get agent
```typescript
import { createClient } from '@neuphonic/neuphonic-js';
const client = createClient();

console.log(
   await client.agents.get({ id: '<AGENT ID>' })
);
```

### Delete agent
```typescript
import { createClient } from '@neuphonic/neuphonic-js';
const client = createClient();

console.log(
  await client.agents.delete({
    id: '<AGENT ID>'
  })
);
```

## Using agents

The Agent API allows you to build real-time voice communication applications directly in the browser.

```typescript
import { createBrowserClient } from '@neuphonic/neuphonic-js/browser';
const client = createBrowserClient();

// Pass the token from the server
client.jwt('<JWT TOKEN>');

const agent = client.createAgent({ agent_id: '<AGENT ID>' });

// The Agent will try to access the mic and listen
const chat = await agent.current.start();

// Transcribed messages and agent replies are available through the onText callback.
chat.onText((role, text) => {
  addMessage(text, role);
});

// Event triggered upon audio playback start or stop
chat.onAudio(async (audio) => {
  // Indicates whether audio is currently playing (true) or not (false)
  console.log(audio);
});
```