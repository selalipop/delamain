import React, { useEffect } from "react";
import { Button, Container, Flex } from "@radix-ui/themes";
import { useImageTranscription } from "./useImageTranscription";
import OpenAI from "openai";
import { useMicVAD, utils } from "@ricky0123/vad-react";
import { set } from "date-fns";
import { useAsyncEffect } from "use-async-effect";
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import AWS from "aws-sdk";

const openai = new OpenAI({
  apiKey: process.env["NEXT_PUBLIC_OPENAI_API_KEY"], // This is the default and can be omitted
  dangerouslyAllowBrowser: true,
});
import { AssemblyAI } from "assemblyai";

const client = new AssemblyAI({
  apiKey: "437df76c4015423c825fa9d816e10ba9",
});

const REGION = "us-east-1"; // e.g. "us-east-1"
const BUCKET_NAME = "delamain-transcripts"; // Replace with your bucket name

const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env["NEXT_PUBLIC_AWS_ACCESS_KEY_ID"]!,
    secretAccessKey: process.env["NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY"]!,
  },
});
AWS.config.update({
  accessKeyId: process.env["NEXT_PUBLIC_AWS_ACCESS_KEY_ID"]!,
  secretAccessKey: process.env["NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY"]!,
  region: REGION,
});

const corsConfig = {
  CORSRules: [
    {
      AllowedOrigins: ["*"],
      AllowedMethods: ["GET", "PUT", "POST", "DELETE"],
      AllowedHeaders: ["*"],
      ExposeHeaders: [],
      MaxAgeSeconds: 3000,
    },
  ],
};

async function main() {
  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: "user", content: "Say this is a test" }],
    model: "gpt-4-turbo-preview",
  });
}

const startTime = new Date().getTime();
const ImageDescription: React.FC = () => {
  const {
    videoRef,
    imageDescription,
    isStreaming,
    startStreaming,
    stopStreaming,
  } = useImageTranscription(5000);
  const [history, setHistory] = React.useState([] as any[]);
  useEffect(() => {
    setHistory((prev) => [
      ...prev,
      {
        event: "time_passed",
        time: `${(new Date().getTime() - startTime) / 1000} seconds`,
        details: `You observed the enviornment and saw ${imageDescription ?? "nothing interesting"}`,
      },
    ]);
  }, [imageDescription]);
  const vad = useMicVAD({
    onSpeechEnd: async (audio) => {
      const arrayBuffer = utils.encodeWAV(audio);
      const base64 = utils.arrayBufferToBase64(arrayBuffer);
      const url = `data:audio/wav;base64,${base64}`;

      const blob = new Blob([arrayBuffer], { type: "wav" });
      const params = {
        Bucket: BUCKET_NAME,
        Key: "transcript-" + new Date().getTime() + ".wav",
        Body: blob,
        ContentType: "wav",
      };
      const s3 = new AWS.S3();

      const result = await s3.upload(params).promise();

      const transcript = await client.transcripts.create({
        audio_url: result.Location,
      });
      console.log("Transcript", transcript);
      setHistory((prev) => [
        ...prev,
        {
          event: "user_spoke",
          time: `${(new Date().getTime() - startTime) / 1000} seconds`,
          details: `${transcript.text} was spoken by the user`,
        },
      ]);
    },
  });
  const [message, setMessage] = React.useState("");
  useAsyncEffect(async () => {
    if (history.at(-1)?.event === "you_spoke_to_user") {
      return;
    }

    const abort = new AbortController();
    const messageList = [
      {
        role: "system",
        content: `
              You're going to be a virtual friendly driver for a rider. You're going to make commentary based on what you see, what the rider says, the persona provided, and what the point in the ride is.

              Then you reply in JSON with the following:
              - timePassed, the time that has passed between the previous two events
              - internalThoughts, internal thoughts processing what was provided to you
              - willSpeak, true if you will speak, false if the situation doesn't call for speaking
              - speak, what you're going to speak with the user and say. You can make quips, ask questions, generally be personable.
              
              You've got a little bit of an edge, and you note the passage of time. For example, you notice if someone is silent, you engage more if they seem chatty, etc.
              You get a couple of events that represent the rider's actions and the environment, and you're going to respond to them.
              - user_spoke, the rider spoke to you
              - time_passed, the time that has passed since the last event
              - you_spoke_to_user, you spoke to the user
              
              Wait for the user to speak with user_spoke before you ever respond. You can't respond to the user until they've spoken.
              `,
      },
      {
        role: "user",
        content: `These are the events that happened so far: \n${history.map(
          (h, i) => `${i}. ${h.event} (${h.details}) occured at ${h.time}`
        ).join("\n")}`,
      },
    ];
    console.log("Sending request", messageList);
    const chatCompletion = await openai.chat.completions.create({
      messages: messageList,
      model: "gpt-3.5-turbo",
    });
    if (!abort.signal.aborted) {
      const content = chatCompletion.choices[0].message.content;
      setHistory((prev) => [
        ...prev,
        {
          event: "you_spoke_to_user",
          time: `${(new Date().getTime() - startTime) / 1000} seconds`,
          details: `You spoke to the user and said ${content}`,
        },
      ]);
      setMessage(content ?? "No Message");
    }
    return () => {
      abort.abort();
    };
  }, [history]);

  return (
    <div className="w-full h-full">
      <Container mx="2">
        <video ref={videoRef} autoPlay playsInline muted />
        <Flex className="w-full" justify={"center"} gap="3">
          <Button
            onClick={startStreaming}
            disabled={isStreaming}
            variant="surface"
          >
            Start
          </Button>
          <Button
            onClick={stopStreaming}
            disabled={!isStreaming}
            variant="surface"
          >
            Stop
          </Button>
        </Flex>
        <div>{imageDescription}</div>
        <div>{message}</div>
      </Container>
    </div>
  );
};

export default ImageDescription;
