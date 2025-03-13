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
- [Voices](#voices)
    - [Get Voices](#get-voices)
    - [Get Voice](#get-voice)
    - [Clone Voice](#clone-voice)
    - [Update Voice](#update-voice)
    - [Delete Voice](#delete-voice)
- [Speech Restoration](#speech-restoration)
    - [Basic Restoration](#basic-restoration)
    - [Get Status of Restoration Job / Retrieve Results](#get-status-of-restoration-job--retrieve-results)
    - [List all Active and Historic Jobs](#list-all-active-and-historic-jobs)
    - [Restoration with a Transcript and Language Code](#restoration-with-a-transcript-and-language-code)
    - [Restoration with a Transcript File](#restoration-with-a-transcript-file)

## Examples
Example applications can be found in a separate repository: https://github.com/neuphonic/neuphonic-js-examples.

## Installation
Install this package into your environment using your chosen package manager:
[README.md](README.md)
```bash
npm install @neuphonic/neuphonic-js
```

### API Key
Get your API key from the [Neuphonic website](https://beta.neuphonic.com).

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
import { createClient } from '@neuphonic/neuphonic-js';
const client = createClient();

console.log(
  await client.voices.clone({
    voiceName: 'Voice name',
    voiceFilePath: __dirname + '/data.wav',
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

console.log(
  await client.voices.update({
    id: '<VOICE_ID>', // you can also use voice 'name' here instead of id  
    newVoiceName: 'New name',
    newVoiceFilePath: __dirname + '/data.wav',
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

## Speech Restoration

Speech restoration involves enhancing and repairing degraded audio to improve its clarity, intelligibility, and overall quality, all while preserving the original content. Follow these simple steps to restore your audio clips:

**Note:** Your audio clip must meet the following criteria: it should be in .mp3 or .wav format, and no larger than 10 MB in size.

### Basic Restoration
To restore an audio clip without additional input, use the following code:

```typescript
import { createClient } from '@neuphonic/neuphonic-js';
const client = createClient();

// Submit a request to restore a degraded file
const jobId = await client.restorations.restore({
  audioPath: __dirname + '/data.wav',
});

// Get the status of the job
console.log(
  await client.restorations.get({
    jobId
  })
);
```
If the job is completed, the status will include the URL where you can access the results (file_url). If the status is 'Not Finished,' please wait a moment before rerunning restorations.get(). Once the status changes to 'Finished,' you will be able to retrieve the results.

### Get Status of Restoration Job / Retrieve Results
Once you queue a job for restoration using the `.restore()` method you will receive an associated job id (uuid) as a member of the response.
To get the status and the link to receive the results of your job you call the `.get()` method as following.

```typescript
import { createClient } from '@neuphonic/neuphonic-js';
const client = createClient();

console.log(await client.restorations.get({
  jobId: '<JOB_ID>'
}));
```

### List all Active and Historic Jobs
To list all your active and previous jobs you can run the `.jobs()` function.

```typescript
import { createClient } from '@neuphonic/neuphonic-js';
const client = createClient();

console.log(await client.restorations.list());
```

### Restoration with a Transcript and Language Code
For better restoration quality, you can provide a transcript of the audio and specify a language code (default is English). Here's how:

```typescript
import { createClient } from '@neuphonic/neuphonic-js';
const client = createClient();

console.log(
  await client.restorations.restore({
    audioPath: __dirname + '/data.wav',
    transcript: 'Example Transcript',
  })
);
```

### Restoration with a Transcript File
If you have the transcript stored in a file, you can use it instead of a transcript string:

```typescript
import { createClient } from '@neuphonic/neuphonic-js';
const client = createClient();

console.log(
  await client.restorations.restore({
    audioPath: __dirname + '/data.wav',
    transcript: __dirname + '/transcript.txt',
    isTranscriptFile: true
  })
);
```

**Note:** You have to set isTranscriptFile to true for the program to read this as a file rather than a string.

**Note:** Providing a transcript significantly improves the restoration quality of your audio clip. If no transcript is provided, the output may not be as refined.

