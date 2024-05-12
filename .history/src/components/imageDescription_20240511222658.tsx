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
  } = useImageTranscription(1000);
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
            This is the history of the current scene ${history}. 
            Say something to the user based on what they're doing`,
            },
          ],
          model: "gpt-3.5-turbo",
        });
        if (interval.hasRef()) {
          setMessage(chatCompletion.choices[0].message.content ?? "No Message");
        }
      }
    }, 10000);
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
