import React, { useEffect } from "react";
import { Button, Container, Flex } from "@radix-ui/themes";
import { useImageTranscription } from "./useImageTranscription";
import OpenAI from "openai";

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

main();
const ImageDescription: React.FC = () => {
  const {
    videoRef,
    imageDescription,
    isStreaming,
    startStreaming,
    stopStreaming,
  } = useImageTranscription(5000);
  const [history, setHistory] = React.useState([] as string[]);
  useEffect(() => {
    setHistory((prev) => [...prev, imageDescription]);
  }, [imageDescription]);
  const [message, setMessage] = React.useState("");
  useEffect(() => {
    const interval = setInterval(async () => {
      if (isStreaming) {
        const chatCompletion = await openai.chat.completions.create({
          messages: [
            {
              role: "user",
              content: `
              You're going to be a virtual friendly driver for a rider. You're going to make commentary based on what you see, what the rider says, the persona provided, and what the point in the ride is.

              Then you reply in JSON with the following:
              - internalThoughts, internal thoughts processing what was provided to you
              - willSpeak, true if you will speak, false if the situation doesn't call for speaking
              - speak, what you're going to speak with the user and say. You can make quips, ask questions, generally be personable.
              
              You've got a little bit of an edge, and you note the passage of time. For example, you notice if someone is silent, you engage more if they seem chatty, etc. 
              
          `,
            },
          ],
          model: "gpt-3.5-turbo",
        });
        if (interval) {
          setMessage(chatCompletion.choices[0].message.content ?? "No Message");
        }
      }
    }, 4000);
    return () => {
      clearInterval(interval);
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
