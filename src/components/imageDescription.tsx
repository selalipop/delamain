import React, { useEffect, useRef } from "react";
import {
  Button,
  Card,
  Container,
  Flex,
  Text,
  ScrollArea,
  DataList,
  Badge,
} from "@radix-ui/themes";
import { useImageTranscription } from "./useImageTranscription";
import OpenAI from "openai";
import { useMicVAD, utils } from "@ricky0123/vad-react";
import { set } from "date-fns";
import { useAsyncEffect } from "use-async-effect";
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import AWS from "aws-sdk";
export const extractOutermostJSON = (input: string): string | null => {
  const match = input.match(/{[^{}]*(?:{[^{}]*}[^{}]*)*}/);
  return match ? match[0].trim() : null;
};
import {
  initialize,
  SessionManager,
  DecodingOptionsBuilder,
  Segment,
  AvailableModels,
  Task,
  InferenceSession,
} from "whisper-turbo";
const openai = new OpenAI({
  apiKey: process.env["NEXT_PUBLIC_OPENAI_API_KEY"], // This is the default and can be omitted
  dangerouslyAllowBrowser: true,
});
import { AssemblyAI } from "assemblyai";
import { playTextToSpeech } from "./tts";
import { analyzeImage } from "./peopleAnalysis";

const client = new AssemblyAI({
  apiKey: "437df76c4015423c825fa9d816e10ba9",
});

const REGION = "us-east-1"; // e.g. "us-east-1"
const BUCKET_NAME = "delamain-transcripts"; // Replace with your bucket name
const transcriber = client.realtime.transcriber({
  sampleRate: 16_000,
});

transcriber.on("open", ({ sessionId }) => {
  console.log(`Session opened with ID: ${sessionId}`);
});

transcriber.on("error", (error: Error) => {
  console.error("Error:", error);
});

transcriber.on("close", (code: number, reason: string) => {
  console.log("Session closed:", code, reason);
});
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

const startTime = new Date().getTime();
function ObservationCard({
  isStreaming,
  peopleEmotions,
  peopleFaces,
  peopleInfo,
  peoplePose,
}: {
  isStreaming: boolean;
  peopleEmotions: string;
  peopleFaces: string;
  peopleInfo: string;
  peoplePose: string;
}) {
  return (
    <Card>
      <DataList.Root>
        <DataList.Item align="center">
          <DataList.Label minWidth="88px">Status</DataList.Label>
          <DataList.Value>
            {isStreaming ? (
              <Badge color="jade" variant="soft" radius="full">
                Observing
              </Badge>
            ) : (
              <Badge color="red" variant="soft" radius="full">
                Not Observing
              </Badge>
            )}
          </DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label minWidth="88px">Emotions</DataList.Label>
          <DataList.Value>{peopleEmotions}</DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label minWidth="88px">Faces Detected</DataList.Label>
          <DataList.Value>{peopleFaces}</DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label minWidth="88px">Person Information</DataList.Label>
          <DataList.Value>{peopleInfo}</DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label minWidth="88px">Estimated Pose</DataList.Label>
          <DataList.Value>{peoplePose}</DataList.Value>
        </DataList.Item>
      </DataList.Root>
    </Card>
  );
}
const ImageDescription: React.FC = () => {
  const {
    videoRef,
    imageDescription,
    isStreaming,
    startStreaming,
    stopStreaming,
  } = useImageTranscription(10000);
  const [history, setHistory] = React.useState([] as any[]);
  const [thoughts, setThoughts] = React.useState([] as any[]);
  useEffect(() => {
    if (history.at(-1)?.event === "user_spoke") {
      return;
    }
    setHistory((prev) => [
      ...prev,
      {
        event: "time_elapsed",
        time: `${(new Date().getTime() - startTime) / 1000} seconds`,
        details: `Some time has passed. Do not speak unless at least 30 seconds have passed since the last user_spoke event. This is an internal event.`,
      },
    ]);
  }, [imageDescription]);
  const vad = useMicVAD({
    positiveSpeechThreshold: 0.9,
    negativeSpeechThreshold: 0.5,
    onSpeechEnd: async (audio) => {
      if (!session) {
        return;
      }
      const arrayBuffer = utils.encodeWAV(audio);
      const base64 = utils.arrayBufferToBase64(arrayBuffer);
      const url = `data:audio/wav;base64,${base64}`;

      let options = new DecodingOptionsBuilder()
        .setTask(Task.Transcribe)
        .build();

      let text = "";
      await session.transcribe(
        new Uint8Array(arrayBuffer),
        true,
        options,
        (segment: Segment) => {
          text += segment.text;
        }
      );
      console.log("Transcript", text);
      setHistory((prev) => [
        ...prev,
        {
          event: "user_spoke",
          time: getElapsedTime(),
          details: `${text} was spoken by the user. The current scene is ${imageDescription}`,
        },
      ]);
    },
  });
  const [session, setSession] = React.useState(null as InferenceSession | null);
  const [messages, setMessages] = React.useState([] as string[]);
  const abortRef = useRef<AbortController | null>(null);
  const [lastAddressedHistoryIndex, setLastAddressedHistoryIndex] =
    React.useState(-1);
  useAsyncEffect(async () => {
    await initialize();
    const session = await new SessionManager().loadModel(
      AvailableModels.WHISPER_BASE,
      () => {
        console.log("Model loaded successfully");
      },
      (p: number) => {
        console.log(`Loading: ${p}%`);
      }
    );
    if (!session.isOk) {
      console.error("Failed to load model", session.error);
      return;
    }
    setSession(session.value);
  }, []);
  useAsyncEffect(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const abort = new AbortController();
    abortRef.current = abort;

    if (!history.slice(0, lastAddressedHistoryIndex)) {
      console.log("No new events to process");
      return;
    }

    const messageList = [
      {
        role: "system",
        content: `
              You're going to be a virtual friendly driver for a rider. You're going to make commentary based on what you see, what the rider says, the persona provided, and what the point in the ride is.

              Then you reply in JSON with the following:
              - timePassedSinceUserSpoke, the time that has passed since the user speaking (The current time is ${getElapsedTime()})
              - internalThoughts, internal thoughts processing what was provided to you. Think about what the user is doing. Are they looking at you? Looking outside? Busy?
              - allowedToSpeak, only true if the user spoke to you and you have not spoken back, false otherwise. For example, if you spoke to the user, you can't speak until at least 30 seconds have passed or they speak to you again
              - willSpeak, true if you will speak, false if the situation doesn't call for speaking
              - speak, what you're going to speak with the user and say. You can make quips, ask questions, generally be personable.
              
              You've got a little bit of an edge, and you note the passage of time. For example, you notice if someone is silent, you engage more if they seem chatty, etc.
              You get a couple of events that represent the rider's actions and the environment, and you're going to respond to them.
              - user_spoke, the rider spoke to you
              - time_elapsed, this is a special event that simply indicates time that has passed since the last event
              - you_spoke_to_user, you spoke to the user
              
              Wait for the user to speak with user_spoke before you ever respond. You can't respond to the user until they've spoken.

              You must adhere to the user_spoke/you_spoke cadence. You can't speak to the user until they've spoken to you.

              You avoid drilling to deep into their personal lives, sometimes it's ok to just make a quip and end things there.

              You're also acting as Harry Potter, so make quips and references to the Harry Potter franchise. Your internal thoughts and speech should reflect this.
              `,
      },
      {
        role: "user",
        content: `These are the events that happened so far: \n${history
          .filter((h) => h.event !== "you_spoke_to_user")
          .map((h, i) => `${i}. ${h.event} (${h.details}) occured at ${h.time}`)
          .join("\n")}
          The most recent thing you said to the rider was ${messages.at(-1)}`,
      },
    ];
    console.log("Sending request", messageList);

    if (abort.signal.aborted) {
      return;
    }
    const chatCompletion = await openai.chat.completions.create({
      messages: messageList,
      model: "gpt-4-turbo-preview",
      response_format: { type: "json_object" },
    });

    if (abort.signal.aborted) {
      console.log("Aborted");
      return;
    }
    const content = chatCompletion.choices[0].message.content;
    const jsonString = extractOutermostJSON(content!);
    const parsed = JSON.parse(jsonString!);
    console.log("Received response", parsed);

    if (abort.signal.aborted) {
      console.log("Aborted");
      return;
    }
    setThoughts((prev) => [...prev, parsed.internalThoughts]);
    if (parsed.speak) {
      setMessages((prev) => [...prev, parsed.speak]);
    }
    if (parsed.speak) {
      playTextToSpeech(parsed.speak, "weight_2qbzp2nmrbbsxrxq7m53y4zan")
        .then(() => console.log("Audio is playing"))
        .catch((error) => console.error("Error:", error));
    }
    setLastAddressedHistoryIndex(history.length);
    return () => {
      abort.abort();
    };
  }, [history]);
  const { peopleEmotions, peopleFaces, peopleInfo, peoplePose } =
    analyzeImage(imageDescription);
  return (
    <div className="w-full h-full m-5">
      <Container mx="2">
        <Flex height={"30rem"} position={"relative"}>
          <div className="w-full h-full m-3" style={{ borderRadius: "1rem" }}>
            <Flex justify={"center"} height={"100%"} align={"center"}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ borderRadius: "1rem" }}
              />
            </Flex>
          </div>
          <div className="w-full h-full">
            <ScrollArea className="h-full w-full">
              <Flex direction={"column-reverse"} gap={"3"}>
                {thoughts.map((t, i) => (
                  <Card key={i} className={i == thoughts.length - 1 ? "animate-pulse" : ""}>{t}</Card>
                ))}
              </Flex>
            </ScrollArea>
          </div>
        </Flex>
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
        <ObservationCard
          isStreaming={isStreaming}
          peopleEmotions={peopleEmotions}
          peopleFaces={peopleFaces}
          peopleInfo={peopleInfo}
          peoplePose={peoplePose}
        />
        <Flex direction={"column"}>
          {messages.map((m, i) => (
            <Card key={i}>{m}</Card>
          ))}
        </Flex>
      </Container>
    </div>
  );
};

export default ImageDescription;
function getElapsedTime() {
  return `${(new Date().getTime() - startTime) / 1000} seconds`;
}
