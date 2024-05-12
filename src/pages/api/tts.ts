export async function playTextToSpeech(text: string, voiceId: string) {
  const apiUrl = "https://api.fakeyou.com/tts/inference";
  const uuid = generateUUID(); // Implement this function or use a library to generate UUIDs
  const ttsModelToken = voiceId;

  // Step 1: Make the TTS request
  const body = JSON.stringify({
    tts_model_token: ttsModelToken,
    uuid_idempotency_token: uuid,
    inference_text: text,
  });
  const ttsResponse = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body,
  });

  const ttsData = await ttsResponse.json();
  if (!ttsData.success) {
    console.error("TTS job polling failed", ttsData, body);
    throw new Error("TTS request failed");
  }

  const jobToken = ttsData.inference_job_token;
  const jobUrl = `https://api.fakeyou.com/tts/job/${jobToken}`;

  // Step 2: Poll for job completion
  let jobStatus = "pending";
  let audioPath = null;
  while (jobStatus !== "complete_success") {
    const jobResponse = await fetch(jobUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    const jobData = await jobResponse.json();
    if (!jobData.success) {
      console.error("TTS job polling failed", jobData);
      throw new Error("TTS job polling failed");
    }

    jobStatus = jobData.state.status;
    audioPath = jobData.state.maybe_public_bucket_wav_audio_path;

    if (jobStatus === "complete_failure" || jobStatus === "dead") {
      console.error("TTS job polling failed", jobData);
      throw new Error("TTS job failed");
    }

    if (jobStatus !== "complete_success") {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second before polling again
    }
  }

  if (!audioPath) {
    throw new Error("No audio path found");
  }

  // Step 3: Play the audio
  return `https://storage.googleapis.com/vocodes-public${audioPath}`;
}

// Helper function to generate UUID (version 4)
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
  url: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const text = req.body.text;
  const voice = req.body.voiceId;
  const url = await playTextToSpeech(text, voice);
  res.status(200).json({ url: url });
}
