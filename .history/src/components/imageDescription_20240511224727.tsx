import React, { useEffect } from "react";
import { Button, Container, Flex } from "@radix-ui/themes";
import { useImageTranscription } from "./useImageTranscription";
import OpenAI from "openai";
import { useMicVAD, utils } from "@ricky0123/vad-react";
import { set } from "date-fns";

const openai = new OpenAI({
  apiKey: process.env["NEXT_PUBLIC_OPENAI_API_KEY"], // This is the default and can be omitted
  dangerouslyAllowBrowser: true,
});

async function main() {
  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: "user", content: "Say this is a test" }],
    model: "gpt-3.5-turbo",
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
        details: `You observed the enviornment and saw ${imageDescription}`,
      },
    ]);
  }, [imageDescription]);
  const vad = useMicVAD({
    onSpeechEnd: (audio) => {
      const wavBuffer = utils.encodeWAV(audio);
      const base64 = utils.arrayBufferToBase64(wavBuffer);
      const url = `data:audio/wav;base64,${base64}`;
      setHistory((prev) => [
        ...prev,
        {
          event: "speech_end",
          time: `${(new Date().getTime() - startTime) / 1000} seconds`,
          details: "User said something but you didn't hear it",
        },
      ]);
    },
  });
  const [message, setMessage] = React.useState("");
  useEffect( () => {
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
              
              You've got a little bit of an edge, and you note the passage of time. For example, you notice if someone is silent, you engage more if they seem chatty, etc.`,
        ...history.map((h) => ({
          role: "user",
          content: `${h.event} (${h.details}) occured at ${h.time} `,
        })),
      },
    ];
    console.log("Sending request", messageList);
    const chatCompletion = await openai.chat.completions.create({
      messages: messageList,
      model: "gpt-3.5-turbo",
    });
    if (interval) {
      const content = chatCompletion.choices[0].message.content;
      setHistory((prev) => [
        ...prev,
        {
          event: "time_passed",
          time: `${(new Date().getTime() - startTime) / 1000} seconds`,
        },
      ]);
      setMessage(content ?? "No Message");
    }
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
