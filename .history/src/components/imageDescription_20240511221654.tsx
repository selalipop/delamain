import React, { useEffect } from "react";
import { Button, Container, Flex } from "@radix-ui/themes";
import { useImageTranscription } from "./useImageTranscription";

const ImageDescription: React.FC = () => {
  const {
    videoRef,
    imageDescription,
    isStreaming,
    startStreaming,
    stopStreaming,
  } = useImageTranscription();
  useEffect(() => {
    return () => {
      setInterval(() => {
        if (isStreaming) {
        }
      }, 1000);
    };
  }, [stopStreaming]);
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
      </Container>
    </div>
  );
};

export default ImageDescription;
